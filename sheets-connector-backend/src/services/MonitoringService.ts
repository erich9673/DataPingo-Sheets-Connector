import { GoogleSheetsService } from './GoogleSheetsService';
import { SlackService } from './SlackService';
import { safeLog, safeError } from '../utils/logger';

// Enhanced condition types with range support
interface MonitoringCondition {
    type: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains' | 'changed';
    value?: string | number;
    threshold?: number;
    enabled: boolean;
    cellRef?: string; // New field to support cell ranges in conditions
}

interface MonitoringJob {
    id: string;
    sheetId: string;
    cellRange: string;
    frequencyMinutes: number;
    webhookUrl: string;
    userMention?: string;
    conditions: MonitoringCondition[];
    intervalId?: NodeJS.Timeout;
    isActive: boolean;
    lastChecked?: Date;
    createdAt: Date;
    currentValues?: any[][];
    spreadsheetName?: string;
    // New fields for uploaded files
    fileId?: string;
    sourceType?: 'google_sheets' | 'uploaded_file';
    // User isolation - use email instead of auth token for persistence
    userId?: string; // Keep for backward compatibility
    userEmail?: string; // New persistent identifier
    // Store user credentials with the job
    userCredentials?: any; // Google OAuth credentials for this user
}

export class MonitoringService {
    private googleSheetsService: GoogleSheetsService;
    private previousValues: Map<string, any[][]> = new Map();
    private spreadsheetNames: Map<string, string> = new Map();
    private activeJobs: Map<string, MonitoringJob> = new Map();
    
    // Network-safe caching and rate limiting - Adjusted for faster monitoring
    private valueCache: Map<string, { values: any[][], timestamp: number }> = new Map();
    private readonly CACHE_TTL = 30000; // Reduced to 30 seconds for faster monitoring
    private lastApiCall: Map<string, number> = new Map(); // Track last API call per sheet
    private readonly MIN_API_INTERVAL = 25000; // Reduced to 25 seconds to allow 30-second monitoring
    private apiInProgress: Set<string> = new Set(); // Prevent concurrent API calls

    // Uploaded file data access
    private uploadedFiles: Map<string, any>;

    constructor(googleSheetsService: GoogleSheetsService, uploadedFiles?: Map<string, any>) {
        this.googleSheetsService = googleSheetsService;
        this.uploadedFiles = uploadedFiles || new Map();
    }

    // Set uploaded files reference (for dependency injection)
    setUploadedFiles(uploadedFiles: Map<string, any>): void {
        this.uploadedFiles = uploadedFiles;
    }

    // Get values from either Google Sheets or uploaded file
    private async getValues(job: MonitoringJob): Promise<any[][]> {
        if (job.sourceType === 'uploaded_file' && job.fileId) {
            return this.getUploadedFileValues(job.fileId, job.cellRange);
        } else {
            // Use job-specific credentials for Google Sheets
            return this.getGoogleSheetsValues(job.sheetId, job.cellRange, job.userCredentials);
        }
    }

    // Set credentials for Google Sheets API calls
    setCredentials(credentials: any): void {
        if (this.googleSheetsService && credentials) {
            this.googleSheetsService.setCredentials(credentials);
            safeLog('✅ Google Sheets credentials updated for monitoring service');
        }
    }

    // Get values from uploaded file
    private getUploadedFileValues(fileId: string, cellRange: string): any[][] {
        const fileData = this.uploadedFiles.get(fileId);
        if (!fileData || !fileData.data) {
            throw new Error(`File data not found for fileId: ${fileId}`);
        }

        const data = fileData.data;
        
        // Parse cell range (e.g., "A1:C3" or "Sheet1!A1:C3")
        const range = this.parseCellRange(cellRange, data.length, data[0]?.length || 0);
        
        // Extract the requested range from the data
        const result: any[][] = [];
        for (let row = range.startRow; row <= range.endRow; row++) {
            if (row < data.length) {
                const rowData: any[] = [];
                for (let col = range.startCol; col <= range.endCol; col++) {
                    if (col < data[row].length) {
                        rowData.push(data[row][col]);
                    } else {
                        rowData.push('');
                    }
                }
                result.push(rowData);
            }
        }
        
        return result;
    }

    // Parse cell range string to row/column indices
    private parseCellRange(cellRange: string, maxRows: number, maxCols: number): {
        startRow: number;
        endRow: number;
        startCol: number;
        endCol: number;
    } {
        // Remove sheet name if present (e.g., "Sheet1!A1:C3" -> "A1:C3")
        const range = cellRange.includes('!') ? cellRange.split('!')[1] : cellRange;
        
        if (range.includes(':')) {
            const [start, end] = range.split(':');
            const startPos = this.cellRefToIndices(start);
            const endPos = this.cellRefToIndices(end);
            
            return {
                startRow: startPos.row,
                endRow: Math.min(endPos.row, maxRows - 1),
                startCol: startPos.col,
                endCol: Math.min(endPos.col, maxCols - 1)
            };
        } else {
            // Single cell
            const pos = this.cellRefToIndices(range);
            return {
                startRow: pos.row,
                endRow: pos.row,
                startCol: pos.col,
                endCol: pos.col
            };
        }
    }

    // Convert cell reference (e.g., "A1") to row/column indices
    private cellRefToIndices(cellRef: string): { row: number; col: number } {
        const match = cellRef.match(/([A-Z]+)(\d+)/);
        if (!match) {
            throw new Error(`Invalid cell reference: ${cellRef}`);
        }
        
        const colStr = match[1];
        const rowStr = match[2];
        
        // Convert column letters to index (A=0, B=1, ..., Z=25, AA=26, etc.)
        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
            col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        col -= 1; // Convert to 0-based index
        
        const row = parseInt(rowStr) - 1; // Convert to 0-based index
        
        return { row, col };
    }

    // Simplified Google Sheets value retrieval (with basic caching, no duplicate progress tracking)
    private async getGoogleSheetsValues(sheetId: string, cellRange: string, userCredentials?: any): Promise<any[][]> {
        const key = `${sheetId}:${cellRange}`;
        
        // Check cache first
        const cached = this.valueCache.get(key);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
            return cached.values;
        }

        // Temporarily set credentials if provided
        if (userCredentials) {
            this.googleSheetsService.setCredentials(userCredentials);
        }

        try {
            // Get fresh values with timeout
            const currentValues = await Promise.race([
                this.googleSheetsService.getCellValues(sheetId, cellRange),
                new Promise<any[][]>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 10000))
            ]);
            
            // Update cache
            this.valueCache.set(key, { values: currentValues, timestamp: now });
            
            return currentValues;
        } catch (error) {
            safeError(`Error getting Google Sheets values for ${sheetId}:`, error);
            throw error;
        }
    }

    // Simplified change detection
    private hasValuesChanged(oldValues: any[][], newValues: any[][]): boolean {
        if (!oldValues || !newValues) return true;
        if (oldValues.length !== newValues.length) return true;
        
        for (let i = 0; i < oldValues.length; i++) {
            const oldRow = oldValues[i] || [];
            const newRow = newValues[i] || [];
            
            if (oldRow.length !== newRow.length) return true;
            
            for (let j = 0; j < Math.max(oldRow.length, newRow.length); j++) {
                if ((oldRow[j] || '') !== (newRow[j] || '')) {
                    return true;
                }
            }
        }
        return false;
    }

    // Enhanced condition checking with range support
    private shouldNotify(oldValue: any, newValue: any, conditions: MonitoringCondition[], allOldValues?: any[][], allNewValues?: any[][], cellRange?: string): boolean {
        safeLog(`🔍 Condition check: oldValue=${oldValue}, newValue=${newValue}, conditions=${JSON.stringify(conditions)}`);
        
        if (!conditions || conditions.length === 0) {
            const result = oldValue !== newValue;
            safeLog(`📋 No conditions set, change detected: ${result}`);
            return result;
        }

        for (const condition of conditions) {
            if (!condition.enabled) continue;

            // Check if this is a range-based condition
            if (condition.cellRef && condition.cellRef.includes(':')) {
                // Range-based condition - check against all values
                if (allOldValues && allNewValues && cellRange && this.checkRangeCondition(condition, allOldValues, allNewValues, cellRange)) {
                    return true;
                }
            } else if (condition.cellRef) {
                // Single cell condition - get specific cell value
                if (allOldValues && allNewValues && cellRange && this.checkSingleCellCondition(condition, allOldValues, allNewValues, cellRange)) {
                    return true;
                }
            } else {
                // Legacy condition checking (for current cell change)
                if (this.checkLegacyCondition(condition, oldValue, newValue)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check range-based conditions (e.g., F11:F20 > 55)
    private checkRangeCondition(condition: MonitoringCondition, oldValues: any[][], newValues: any[][], monitoringRange: string): boolean {
        if (!condition.cellRef) return false;
        
        try {
            // Calculate max columns across all rows (not just first row)
            const maxCols = Math.max(...newValues.map(row => (row || []).length), 0);
            const conditionRange = this.parseCellRange(condition.cellRef, newValues.length, maxCols);
            
            // Check each cell in the condition range
            for (let row = conditionRange.startRow; row <= conditionRange.endRow; row++) {
                for (let col = conditionRange.startCol; col <= conditionRange.endCol; col++) {
                    if (row < newValues.length && col < (newValues[row]?.length || 0)) {
                        const cellValue = newValues[row][col];
                        const oldCellValue = oldValues[row] && oldValues[row][col];
                        
                        if (this.checkLegacyCondition(condition, oldCellValue, cellValue)) {
                            safeLog(`🎯 Range condition met: ${condition.cellRef} at row ${row + 1}, col ${col + 1} = ${cellValue}`);
                            return true;
                        }
                    }
                }
            }
        } catch (error) {
            safeError('Error checking range condition:', error);
        }
        
        return false;
    }

    // Check single cell conditions (e.g., F11 > 55)
    private checkSingleCellCondition(condition: MonitoringCondition, oldValues: any[][], newValues: any[][], monitoringRange: string): boolean {
        if (!condition.cellRef) return false;
        
        safeLog(`🔍 Single cell condition check: cellRef=${condition.cellRef}`);
        
        try {
            const cellPos = this.cellRefToIndices(condition.cellRef);
            safeLog(`📍 Cell position: row=${cellPos.row}, col=${cellPos.col}`);
            safeLog(`📊 Array dimensions: newValues.length=${newValues.length}, newValues[0]?.length=${newValues[0]?.length}`);
            
            if (cellPos.row < newValues.length && cellPos.col < (newValues[cellPos.row]?.length || 0)) {
                const cellValue = newValues[cellPos.row][cellPos.col];
                const oldCellValue = oldValues[cellPos.row] && oldValues[cellPos.row][cellPos.col];
                
                safeLog(`📊 Cell values: old=${oldCellValue}, new=${cellValue}`);
                
                if (this.checkLegacyCondition(condition, oldCellValue, cellValue)) {
                    safeLog(`🎯 Single cell condition met: ${condition.cellRef} = ${cellValue}`);
                    return true;
                } else {
                    safeLog(`❌ Single cell condition NOT met: ${condition.cellRef} = ${cellValue}`);
                }
            } else {
                safeLog(`❌ Cell position out of bounds: row=${cellPos.row}, col=${cellPos.col}, maxRow=${newValues.length-1}, maxCol=${(newValues[cellPos.row]?.length || 0)-1}`);
            }
        } catch (error) {
            safeError('Error checking single cell condition:', error);
        }
        
        return false;
    }

    // Legacy condition checking for individual values
    private checkLegacyCondition(condition: MonitoringCondition, oldValue: any, newValue: any): boolean {
        safeLog(`🔍 Legacy condition check: type=${condition.type}, oldValue=${oldValue}, newValue=${newValue}, threshold=${condition.threshold}, value=${condition.value}`);
        
        switch (condition.type) {
            case 'changed':
                const changedResult = oldValue !== newValue;
                safeLog(`📋 Changed result: ${changedResult}`);
                return changedResult;
            case 'greater_than':
                const numValueGt = parseFloat(String(newValue));
                // Use threshold if available, otherwise fall back to value
                const thresholdGt = condition.threshold !== undefined ? condition.threshold : parseFloat(String(condition.value || 0));
                const gtResult = !isNaN(numValueGt) && !isNaN(thresholdGt) && numValueGt > thresholdGt;
                safeLog(`📊 Greater than check: ${numValueGt} > ${thresholdGt} = ${gtResult} (numValid: ${!isNaN(numValueGt)}, thresholdValid: ${!isNaN(thresholdGt)})`);
                return gtResult;
            case 'less_than':
                const numValueLt = parseFloat(String(newValue));
                // Use threshold if available, otherwise fall back to value
                const thresholdLt = condition.threshold !== undefined ? condition.threshold : parseFloat(String(condition.value || 0));
                const ltResult = !isNaN(numValueLt) && !isNaN(thresholdLt) && numValueLt < thresholdLt;
                safeLog(`📊 Less than check: ${numValueLt} < ${thresholdLt} = ${ltResult} (numValid: ${!isNaN(numValueLt)}, thresholdValid: ${!isNaN(thresholdLt)})`);
                return ltResult;
            case 'equals':
                const equalsResult = String(newValue) === String(condition.value);
                safeLog(`📊 Equals check: "${String(newValue)}" === "${String(condition.value)}" = ${equalsResult}`);
                return equalsResult;
            case 'not_equals':
                const notEqualsResult = String(newValue) !== String(condition.value);
                safeLog(`📊 Not equals check: "${String(newValue)}" !== "${String(condition.value)}" = ${notEqualsResult}`);
                return notEqualsResult;
            case 'contains':
                const containsResult = condition.value && String(newValue).includes(String(condition.value));
                safeLog(`📊 Contains check: "${String(newValue)}".includes("${String(condition.value)}") = ${containsResult}`);
                return containsResult;
            default:
                safeLog(`❌ Unknown condition type: ${condition.type}`);
                return false;
        }
    }

    async startMonitoring(
        jobId: string, 
        sheetId: string, 
        cellRange: string, 
        frequencyMinutes: number, 
        webhookUrl: string, 
        userMention?: string, 
        conditions: MonitoringCondition[] = [],
        fileId?: string,
        userId?: string,
        userEmail?: string,
        userCredentials?: any
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Stop existing job if it exists
            if (this.activeJobs.has(jobId)) {
                await this.stopMonitoring(jobId);
            }
            
            // DUPLICATE PREVENTION: Check for existing jobs with same parameters
            const existingJob = Array.from(this.activeJobs.values()).find(job => 
                job.sheetId === sheetId && 
                job.cellRange === cellRange && 
                job.webhookUrl === webhookUrl &&
                (job.userEmail === userEmail || job.userId === userId)
            );
            
            if (existingJob) {
                safeLog(`⚠️ Preventing duplicate job creation. Existing job ${existingJob.id} already monitors same sheet/range/webhook`);
                return { success: false, error: `Duplicate job prevented: Job ${existingJob.id} already monitors this sheet/range combination` };
            }
            
            // Determine source type
            const sourceType = fileId ? 'uploaded_file' : 'google_sheets';
            let spreadsheetName = sheetId;
            
            if (sourceType === 'uploaded_file') {
                // Get uploaded file info
                const fileData = this.uploadedFiles.get(fileId);
                if (!fileData) {
                    return { success: false, error: `Uploaded file not found: ${fileId}` };
                }
                spreadsheetName = fileData.name || `File ${fileId}`;
                safeLog(`Starting monitoring for uploaded file: ${spreadsheetName}`);
            } else {
                // Get Google Sheets info (with timeout)
                try {
                    const spreadsheetInfo = await Promise.race([
                        this.googleSheetsService.getSpreadsheetInfo(sheetId),
                        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout getting spreadsheet info')), 5000))
                    ]);
                    
                    if (spreadsheetInfo.success && spreadsheetInfo.name) {
                        this.spreadsheetNames.set(sheetId, spreadsheetInfo.name);
                        spreadsheetName = spreadsheetInfo.name;
                    }
                } catch (error) {
                    safeError('Error getting spreadsheet info:', error);
                    // Continue with sheetId as name
                }
                safeLog(`Starting monitoring for Google Sheets: ${spreadsheetName}`);
            }
            
            const job: MonitoringJob = {
                id: jobId,
                sheetId,
                cellRange,
                frequencyMinutes,
                webhookUrl,
                userMention,
                conditions,
                isActive: true,
                createdAt: new Date(),
                spreadsheetName,
                fileId,
                sourceType,
                userId,
                userEmail,
                userCredentials // Store user credentials with the job
            };
            
            // Get initial values (with timeout)
            try {
                const initialValues = await Promise.race([
                    this.getValues(job),
                    new Promise<any[][]>((_, reject) => setTimeout(() => reject(new Error('Timeout getting initial values')), 5000))
                ]);
                
                const key = sourceType === 'uploaded_file' ? `file:${fileId}:${cellRange}` : `${sheetId}:${cellRange}`;
                this.previousValues.set(key, initialValues);
                job.currentValues = initialValues;
                
            } catch (error) {
                safeError('Error getting initial values:', error);
                return { success: false, error: `Failed to get initial values: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
            
            // Minimum interval adjusted for 30-second monitoring
            // For uploaded files, allow more frequent monitoring since there's no API limit
            const minInterval = sourceType === 'uploaded_file' ? 30000 : 30000; // 30 seconds for both now
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, minInterval);
            
            // Simple interval - no complex scheduling
            job.intervalId = setInterval(async () => {
                safeLog(`🔄 [INTERVAL TRIGGERED] Checking job ${jobId} (${job.spreadsheetName}) - every ${frequencyMinutes} minutes`);
                const startTime = Date.now();
                try {
                    await this.checkForChanges(job);
                    const duration = Date.now() - startTime;
                    safeLog(`✅ [INTERVAL COMPLETE] Job ${jobId} check completed in ${duration}ms`);
                } catch (error) {
                    const duration = Date.now() - startTime;
                    safeError(`❌ [INTERVAL ERROR] Job ${jobId} check failed after ${duration}ms:`, error);
                }
            }, intervalMs);
            
            this.activeJobs.set(jobId, job);
            
            safeLog(`✅ Monitoring started for ${job.spreadsheetName} (${sourceType}) every ${frequencyMinutes} minute(s)`);
            return { success: true };
        } catch (error) {
            safeError('Error starting monitoring:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    // Network-safe change checking
    private async checkForChanges(job: MonitoringJob): Promise<void> {
        const key = job.sourceType === 'uploaded_file' ? `file:${job.fileId}:${job.cellRange}` : `${job.sheetId}:${job.cellRange}`;
        
        safeLog(`🔍 [CHECK START] Job ${job.id} - ${job.spreadsheetName} (${job.sourceType})`);
        safeLog(`    📋 Range: ${job.cellRange}`);
        safeLog(`    🔗 Webhook: ${job.webhookUrl.substring(0, 50)}...`);
        safeLog(`    👤 User: ${job.userEmail || job.userId || 'Unknown'}`);
        
        try {
            let currentValues: any[][];
            
            if (job.sourceType === 'uploaded_file') {
                // For uploaded files, get values directly (no network calls or caching needed)
                currentValues = await this.getValues(job);
                safeLog(`📋 [FILE DATA] Retrieved uploaded file data for ${job.spreadsheetName}: ${JSON.stringify(currentValues).substring(0, 100)}...`);
            } else {
                // For Google Sheets, use existing network-safe logic
                if (this.apiInProgress.has(key)) {
                    safeLog(`⏳ [SKIP] API call already in progress for ${job.spreadsheetName}, skipping`);
                    return;
                }

                // Check cache first
                const cached = this.valueCache.get(key);
                const now = Date.now();
                
                if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
                    // Use cached values - no network call needed
                    currentValues = cached.values;
                    safeLog(`📋 [CACHED] Using cached values for ${job.spreadsheetName}: ${JSON.stringify(currentValues).substring(0, 100)}...`);
                } else {
                    // Check if enough time has passed since last API call
                    const lastCall = this.lastApiCall.get(key) || 0;
                    const timeSinceLastCall = now - lastCall;
                    
                    if (timeSinceLastCall < this.MIN_API_INTERVAL) {
                        safeLog(`🚫 [RATE LIMIT] Waiting ${Math.ceil((this.MIN_API_INTERVAL - timeSinceLastCall) / 1000)}s for ${job.spreadsheetName}`);
                        return; // Skip this check to prevent network overload
                    }

                    // Mark API call in progress
                    this.apiInProgress.add(key);
                    
                    try {
                        safeLog(`🌐 [API CALL] Fetching fresh data for ${job.spreadsheetName}...`);
                        // Get fresh values with network-safe timeout
                        currentValues = await Promise.race([
                            this.getValues(job),
                            new Promise<any[][]>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 10000))
                        ]);
                        
                        // Update cache and last call time
                        this.valueCache.set(key, { values: currentValues, timestamp: now });
                        this.lastApiCall.set(key, now);
                        
                        safeLog(`🌐 [API SUCCESS] Fresh data fetched for ${job.spreadsheetName}: ${JSON.stringify(currentValues).substring(0, 100)}...`);
                    } finally {
                        // Always remove from in-progress set
                        this.apiInProgress.delete(key);
                    }
                }
            }
            
            const previousValues = this.previousValues.get(key);
            job.lastChecked = new Date();
            
            // Enhanced debug logging for value comparison
            safeLog(`� [VALUE COMPARISON] Job ${job.id} - ${job.spreadsheetName}:`);
            safeLog(`    📝 Current values: ${JSON.stringify(currentValues)}`);
            safeLog(`    📝 Previous values: ${JSON.stringify(previousValues)}`);
            safeLog(`    🔍 Has previous values: ${!!previousValues}`);
            safeLog(`    🔍 Values are different: ${previousValues ? this.hasValuesChanged(previousValues, currentValues) : 'N/A (no previous values)'}`);
            
            
            if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                safeLog(`🚨 [CHANGE DETECTED] Changes found in ${job.spreadsheetName} (${job.sourceType})`);
                
                // Find changes - simplified
                const changes = this.findChangedCells(previousValues, currentValues, job.cellRange);
                safeLog(`    📍 Changed cells: ${changes.length} cells changed`);
                for (let i = 0; i < changes.length; i++) {
                    const change = changes[i];
                    safeLog(`        Cell ${i + 1}: ${change.cellRange} changed from "${change.oldValue}" to "${change.newValue}"`);
                }
                
                // Send notification with enhanced condition checking
                if (changes.length > 0) {
                    const firstChange = changes[0];
                    safeLog(`🎯 [CONDITION CHECK] Checking conditions for job ${job.id}:`);
                    safeLog(`    📋 Conditions: ${JSON.stringify(job.conditions)}`);
                    
                    // Check if any condition is met (either cell-specific or range-based)
                    const shouldSendNotification = this.shouldNotify(
                        firstChange.oldValue, 
                        firstChange.newValue, 
                        job.conditions,
                        previousValues,
                        currentValues,
                        job.cellRange
                    );
                    
                    safeLog(`    🎯 Should notify: ${shouldSendNotification}`);
                    
                    if (shouldSendNotification) {
                        safeLog(`📤 [NOTIFICATION] Conditions met, sending notification for ${job.spreadsheetName}...`);
                        await this.sendNotification(job, firstChange, previousValues, currentValues);
                        safeLog(`✅ [NOTIFICATION SUCCESS] Notification sent for ${job.spreadsheetName}`);
                    } else {
                        safeLog(`🚫 [NOTIFICATION SKIP] Conditions not met, skipping notification for ${job.spreadsheetName}`);
                    }
                }
                
                // Update stored values
                this.previousValues.set(key, currentValues);
                job.currentValues = currentValues;
                safeLog(`💾 [STORAGE] Updated stored values for ${job.spreadsheetName}`);
            } else if (!previousValues) {
                safeLog(`📥 [FIRST RUN] No previous values for ${job.spreadsheetName}, storing initial values`);
                this.previousValues.set(key, currentValues);
                job.currentValues = currentValues;
            } else {
                safeLog(`✅ [NO CHANGE] No changes detected in ${job.spreadsheetName}`);
            }
            
        } catch (error) {
            safeError(`Error checking changes for job ${job.id}:`, error);
            job.lastChecked = new Date();
        }
    }

    // Convert column number to letter (A=1, B=2, etc.)
    private columnNumberToLetter(colNum: number): string {
        let result = '';
        while (colNum > 0) {
            colNum--; // Convert to 0-based
            result = String.fromCharCode(65 + (colNum % 26)) + result;
            colNum = Math.floor(colNum / 26);
        }
        return result;
    }

    // Parse cell range to extract sheet name and starting position
    private parseCellRangeForNotification(cellRange: string): { sheetName?: string, startRow: number, startCol: number } {
        // Handle ranges like "Sheet4!A1:Z1000" or "A1:Z1000"
        const parts = cellRange.split('!');
        const sheetName = parts.length > 1 ? parts[0] : undefined;
        const range = parts.length > 1 ? parts[1] : parts[0];
        
        // Extract starting cell (e.g., "A1" from "A1:Z1000")
        const startCell = range.split(':')[0];
        
        // Parse the starting cell (e.g., "A1" -> row=1, col=1)
        const match = startCell.match(/([A-Z]+)(\d+)/);
        if (!match) {
            return { sheetName, startRow: 1, startCol: 1 };
        }
        
        const colLetters = match[1];
        const rowNum = parseInt(match[2]);
        
        // Convert column letters to number
        let colNum = 0;
        for (let i = 0; i < colLetters.length; i++) {
            colNum = colNum * 26 + (colLetters.charCodeAt(i) - 64);
        }
        
        return { sheetName, startRow: rowNum, startCol: colNum };
    }

    // Simplified change detection with proper cell notation
    private findChangedCells(oldValues: any[][], newValues: any[][], cellRange: string): Array<{cellRange: string, oldValue: any, newValue: any}> {
        const changes: Array<{cellRange: string, oldValue: any, newValue: any}> = [];
        
        // Parse the original cell range to get starting position and sheet name
        const { sheetName, startRow, startCol } = this.parseCellRangeForNotification(cellRange);
        
        for (let i = 0; i < Math.max(oldValues.length, newValues.length); i++) {
            const oldRow = oldValues[i] || [];
            const newRow = newValues[i] || [];
            
            for (let j = 0; j < Math.max(oldRow.length, newRow.length); j++) {
                const oldValue = oldRow[j] || '';
                const newValue = newRow[j] || '';
                
                if (oldValue !== newValue) {
                    // Calculate actual row and column in the spreadsheet
                    const actualRow = startRow + i;
                    const actualCol = startCol + j;
                    const colLetter = this.columnNumberToLetter(actualCol);
                    
                    // Format as proper spreadsheet cell reference
                    const cellRef = sheetName ? `${sheetName}!${colLetter}${actualRow}` : `${colLetter}${actualRow}`;
                    
                    changes.push({
                        cellRange: cellRef,
                        oldValue,
                        newValue
                    });
                    
                    // Only return first few changes to avoid spam
                    if (changes.length >= 3) break;
                }
            }
            if (changes.length >= 3) break;
        }
        
        return changes;
    }

    // Enhanced notification sending with full data context
    private async sendNotification(job: MonitoringJob, change: {cellRange: string, oldValue: any, newValue: any}, oldValues?: any[][], newValues?: any[][]): Promise<void> {
        try {
            safeLog(`🔔 [NOTIFICATION START] Processing notification for job ${job.id}`);
            safeLog(`    📍 Change: Cell ${change.cellRange} changed from "${change.oldValue}" to "${change.newValue}"`);
            safeLog(`    🏢 Spreadsheet: ${job.spreadsheetName || 'Unknown'}`);
            safeLog(`    🔗 Webhook URL: ${job.webhookUrl.substring(0, 60)}...`);
            safeLog(`    👤 User mention: ${job.userMention || 'None'}`);

            const spreadsheetName = job.spreadsheetName || this.spreadsheetNames.get(job.sheetId) || 'Unknown Spreadsheet';
            
            // Detect webhook type and use appropriate service
            let result: { success: boolean; error?: string };
            
            if (job.webhookUrl.includes('discord.com/api/webhooks')) {
                safeLog(`📤 [DISCORD SERVICE] Using Discord service for webhook...`);
                const { DiscordService } = await import('./DiscordService');
                
                // Create Discord message format with Google Sheets link
                const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${job.sheetId}/edit`;
                
                // Convert @channel to Discord format (remove bell emoji)
                let discordMention = '';
                if (job.userMention) {
                    if (job.userMention.includes('@channel')) {
                        discordMention = `\n\n@everyone`; // Discord uses @everyone instead of @channel
                    } else if (job.userMention.includes('@here')) {
                        discordMention = `\n\n@here`; // @here works in Discord
                    } else {
                        discordMention = `\n\n${job.userMention}`; // Keep other mentions as-is
                    }
                }
                
                const discordMessage = {
                    content: `📊 **Google Sheets Change Detected!**\n\n**Spreadsheet:** [${spreadsheetName}](${googleSheetsUrl})\n**Cell:** ${change.cellRange}\n**Change:** \`${change.oldValue || 'Empty'}\` → \`${change.newValue}\`\n**Time:** ${new Date().toLocaleString()}\n**🔗 Sheet Link:** ${googleSheetsUrl}${discordMention}`,
                    embeds: [{
                        title: "📈 Google Sheets Update",
                        description: `Changes detected in **${spreadsheetName}**`,
                        color: 0x4285f4, // Google blue
                        fields: [
                            {
                                name: "📍 Cell",
                                value: change.cellRange,
                                inline: true
                            },
                            {
                                name: "📊 Old Value",
                                value: change.oldValue || "Empty",
                                inline: true
                            },
                            {
                                name: "📊 New Value", 
                                value: String(change.newValue),
                                inline: true
                            },
                            {
                                name: "🔗 Open Google Sheet",
                                value: googleSheetsUrl,
                                inline: false
                            }
                        ],
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: "Sheets Connector for Discord"
                        }
                    }]
                };
                
                const success = await DiscordService.sendMessage(job.webhookUrl, discordMessage);
                result = success ? { success: true } : { success: false, error: 'Failed to send Discord message' };
                
            } else if (job.webhookUrl.includes('webhook.office.com') || job.webhookUrl.includes('outlook.office.com')) {
                safeLog(`� [TEAMS SERVICE] Using Teams service for webhook...`);
                const { TeamsService } = await import('./TeamsService');
                
                // Create Google Sheets URL for clickable link
                const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${job.sheetId}/edit`;
                
                // Create Teams message format with improved layout and clickable spreadsheet name
                const oldValueFormatted = change.oldValue || "Empty";
                let newValueFormatted = String(change.newValue);
                
                // Add + or - prefix for numeric values
                if (change.oldValue !== undefined && change.newValue !== undefined) {
                    const oldNum = parseFloat(String(change.oldValue || 0));
                    const newNum = parseFloat(String(change.newValue));
                    
                    if (!isNaN(oldNum) && !isNaN(newNum)) {
                        const diff = newNum - oldNum;
                        if (diff > 0) {
                            newValueFormatted = `+ ${newNum}`;
                        } else if (diff < 0) {
                            newValueFormatted = `- ${Math.abs(newNum)}`;
                        } else {
                            newValueFormatted = String(newNum);
                        }
                    }
                }
                
                const teamsMessage = {
                    text: `📊 Change Detected in [${spreadsheetName}](${googleSheetsUrl})\n\n🕒 Time: ${new Date().toLocaleString()}\n\n📍 Cell: ${change.cellRange}\n\nOld Value: ${oldValueFormatted}\n\nNew Value: ${newValueFormatted}${job.userMention ? `\n\n🔔 ${job.userMention}` : ''}`
                };
                
                const success = await TeamsService.sendMessage(job.webhookUrl, teamsMessage);
                result = success ? { success: true } : { success: false, error: 'Failed to send Teams message' };
                
            } else {
                // Default to Slack for backwards compatibility
                safeLog(`📤 [SLACK SERVICE] Using Slack service for webhook...`);
                const { SlackService } = await import('./SlackService');
                const slackService = new SlackService(job.webhookUrl);
                
                result = await slackService.sendNotification(
                    'Google Sheets change detected',
                    job.sheetId,
                    change.cellRange,
                    change.oldValue,
                    change.newValue,
                    spreadsheetName,
                    job.userMention || undefined
                );
            }
            
            safeLog(`📊 [NOTIFICATION RESULT] API response:`, result);
            
            if (result.success) {
                safeLog(`✅ [NOTIFICATION SUCCESS] Notification sent successfully for ${change.cellRange}`);
            } else {
                safeError(`❌ [NOTIFICATION FAILED] Notification failed: ${result.error}`);
            }
        } catch (error) {
            safeError(`💥 [NOTIFICATION ERROR] Error sending notification for job ${job.id}:`, error);
        }
    }

    async stopMonitoring(jobId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const job = this.activeJobs.get(jobId);
            if (job && job.intervalId) {
                clearInterval(job.intervalId);
                job.isActive = false;
                this.activeJobs.delete(jobId);
                safeLog(`Monitoring stopped for job ${jobId}`);
                return { success: true };
            }
            return { success: false, error: 'Job not found' };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    getActiveJobs(): MonitoringJob[] {
        return Array.from(this.activeJobs.values());
    }

    // Get jobs filtered by user ID (auth token)
    getActiveJobsForUser(userId: string): MonitoringJob[] {
        return Array.from(this.activeJobs.values()).filter(job => job.userId === userId);
    }

    // Get jobs filtered by user email (persistent across login sessions)
    getActiveJobsForUserEmail(userEmail: string): MonitoringJob[] {
        return Array.from(this.activeJobs.values()).filter(job => 
            job.userEmail === userEmail || 
            (!job.userEmail && job.userId) // fallback for old jobs without userEmail
        );
    }

    // Get jobs for current user (check both auth token and email)
    getActiveJobsForCurrentUser(authToken: string, userEmail?: string): MonitoringJob[] {
        return Array.from(this.activeJobs.values()).filter(job => {
            // Match by auth token (current session)
            if (job.userId === authToken) return true;
            // Match by email (persistent across sessions)
            if (userEmail && job.userEmail === userEmail) return true;
            return false;
        });
    }

    getActiveJobsCount(): number {
        return this.activeJobs.size;
    }

    // Get active jobs count for a specific user
    getActiveJobsCountForUser(userId: string): number {
        return this.getActiveJobsForUser(userId).length;
    }

    // Get active jobs count for a specific user email
    getActiveJobsCountForUserEmail(userEmail: string): number {
        return this.getActiveJobsForUserEmail(userEmail).length;
    }

    // Get specific job
    getJob(jobId: string): MonitoringJob | undefined {
        return this.activeJobs.get(jobId);
    }

    // Public method to manually check for changes
    async checkForChangesPublic(job: MonitoringJob): Promise<any> {
        await this.checkForChanges(job);
        return { success: true };
    }

    // Stop all monitoring jobs
    stopAllJobs(): void {
        for (const [jobId] of this.activeJobs) {
            this.stopMonitoring(jobId);
        }
    }

    // Network-safe cache cleanup
    public cleanupCache(): void {
        const now = Date.now();
        
        // Clean up old cache entries
        for (const [key, cache] of this.valueCache.entries()) {
            if (now - cache.timestamp > this.CACHE_TTL * 3) {
                this.valueCache.delete(key);
            }
        }
        
        // Clean up old API call timestamps
        for (const [key, timestamp] of this.lastApiCall.entries()) {
            if (now - timestamp > this.MIN_API_INTERVAL * 2) {
                this.lastApiCall.delete(key);
            }
        }
        
        // Clear any stuck API progress markers
        this.apiInProgress.clear();
    }

    // Handle real-time updates from Google Drive webhook
    async handleRealtimeUpdate(resourceId: string): Promise<void> {
        try {
            safeLog(`Processing real-time update for resource: ${resourceId}`);
            
            // Find all monitoring jobs for this spreadsheet
            const affectedJobs = Array.from(this.activeJobs.values()).filter(
                job => job.sheetId === resourceId
            );
            
            if (affectedJobs.length === 0) {
                safeLog(`No monitoring jobs found for resource: ${resourceId}`);
                return;
            }
            
            safeLog(`Found ${affectedJobs.length} monitoring jobs for real-time update`);
            
            // Process each affected job immediately
            for (const job of affectedJobs) {
                try {
                    safeLog(`Processing real-time update for job: ${job.id}`);
                    
                    // Clear cache to force fresh data retrieval
                    const cacheKey = `${job.sheetId}_${job.cellRange}`;
                    this.valueCache.delete(cacheKey);
                    this.lastApiCall.delete(job.sheetId);
                    this.apiInProgress.delete(job.sheetId);
                    
                    // Check for changes immediately
                    await this.checkForChanges(job);
                    
                    safeLog(`Real-time update processed for job: ${job.id}`);
                } catch (error) {
                    safeError(`Error processing real-time update for job ${job.id}:`, error);
                }
            }
            
        } catch (error) {
            safeError('Error handling real-time update:', error);
        }
    }

    // Store push notification channel info for cleanup
    private pushChannels: Map<string, { channelId: string; resourceId: string }> = new Map();

    async storePushNotificationChannel(sheetId: string, channelId: string, resourceId: string): Promise<void> {
        try {
            safeLog(`Storing push notification channel for sheet ${sheetId}: ${channelId}`);
            this.pushChannels.set(sheetId, { channelId, resourceId });
        } catch (error) {
            safeError('Error storing push notification channel:', error);
        }
    }

    // Clean up push notification channels when monitoring stops
    async cleanupPushNotifications(sheetId: string): Promise<void> {
        try {
            const channelInfo = this.pushChannels.get(sheetId);
            if (channelInfo) {
                safeLog(`Cleaning up push notifications for sheet ${sheetId}`);
                
                // Stop the push notification channel
                await this.googleSheetsService.stopPushNotifications(
                    channelInfo.channelId, 
                    channelInfo.resourceId
                );
                
                this.pushChannels.delete(sheetId);
                safeLog(`Push notifications cleaned up for sheet ${sheetId}`);
            }
        } catch (error) {
            safeError(`Error cleaning up push notifications for sheet ${sheetId}:`, error);
        }
    }

    // Get push notification status
    getPushNotificationStatus(sheetId: string): boolean {
        return this.pushChannels.has(sheetId);
    }
}
