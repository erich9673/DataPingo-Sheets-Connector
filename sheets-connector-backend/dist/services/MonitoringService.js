"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const SlackService_1 = require("./SlackService");
const logger_1 = require("../utils/logger");
class MonitoringService {
    constructor(googleSheetsService, uploadedFiles) {
        this.previousValues = new Map();
        this.spreadsheetNames = new Map();
        this.activeJobs = new Map();
        // Network-safe caching and rate limiting - Adjusted for faster monitoring
        this.valueCache = new Map();
        this.CACHE_TTL = 30000; // Reduced to 30 seconds for faster monitoring
        this.lastApiCall = new Map(); // Track last API call per sheet
        this.MIN_API_INTERVAL = 25000; // Reduced to 25 seconds to allow 30-second monitoring
        this.apiInProgress = new Set(); // Prevent concurrent API calls
        // Store push notification channel info for cleanup
        this.pushChannels = new Map();
        this.googleSheetsService = googleSheetsService;
        this.uploadedFiles = uploadedFiles || new Map();
    }
    // Set uploaded files reference (for dependency injection)
    setUploadedFiles(uploadedFiles) {
        this.uploadedFiles = uploadedFiles;
    }
    // Get values from either Google Sheets or uploaded file
    async getValues(job) {
        if (job.sourceType === 'uploaded_file' && job.fileId) {
            return this.getUploadedFileValues(job.fileId, job.cellRange);
        }
        else {
            // Use existing Google Sheets logic
            return this.getGoogleSheetsValues(job.sheetId, job.cellRange);
        }
    }
    // Set credentials for Google Sheets API calls
    setCredentials(credentials) {
        if (this.googleSheetsService && credentials) {
            this.googleSheetsService.setCredentials(credentials);
            (0, logger_1.safeLog)('✅ Google Sheets credentials updated for monitoring service');
        }
    }
    // Get values from uploaded file
    getUploadedFileValues(fileId, cellRange) {
        const fileData = this.uploadedFiles.get(fileId);
        if (!fileData || !fileData.data) {
            throw new Error(`File data not found for fileId: ${fileId}`);
        }
        const data = fileData.data;
        // Parse cell range (e.g., "A1:C3" or "Sheet1!A1:C3")
        const range = this.parseCellRange(cellRange, data.length, data[0]?.length || 0);
        // Extract the requested range from the data
        const result = [];
        for (let row = range.startRow; row <= range.endRow; row++) {
            if (row < data.length) {
                const rowData = [];
                for (let col = range.startCol; col <= range.endCol; col++) {
                    if (col < data[row].length) {
                        rowData.push(data[row][col]);
                    }
                    else {
                        rowData.push('');
                    }
                }
                result.push(rowData);
            }
        }
        return result;
    }
    // Parse cell range string to row/column indices
    parseCellRange(cellRange, maxRows, maxCols) {
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
        }
        else {
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
    cellRefToIndices(cellRef) {
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
    async getGoogleSheetsValues(sheetId, cellRange) {
        const key = `${sheetId}:${cellRange}`;
        // Check cache first
        const cached = this.valueCache.get(key);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
            return cached.values;
        }
        // Get fresh values with timeout
        const currentValues = await Promise.race([
            this.googleSheetsService.getCellValues(sheetId, cellRange),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 10000))
        ]);
        // Update cache
        this.valueCache.set(key, { values: currentValues, timestamp: now });
        return currentValues;
    }
    // Simplified change detection
    hasValuesChanged(oldValues, newValues) {
        if (!oldValues || !newValues)
            return true;
        if (oldValues.length !== newValues.length)
            return true;
        for (let i = 0; i < oldValues.length; i++) {
            const oldRow = oldValues[i] || [];
            const newRow = newValues[i] || [];
            if (oldRow.length !== newRow.length)
                return true;
            for (let j = 0; j < Math.max(oldRow.length, newRow.length); j++) {
                if ((oldRow[j] || '') !== (newRow[j] || '')) {
                    return true;
                }
            }
        }
        return false;
    }
    // Enhanced condition checking with range support
    shouldNotify(oldValue, newValue, conditions, allOldValues, allNewValues, cellRange) {
        if (!conditions || conditions.length === 0) {
            return oldValue !== newValue;
        }
        for (const condition of conditions) {
            if (!condition.enabled)
                continue;
            // Check if this is a range-based condition
            if (condition.cellRef && condition.cellRef.includes(':')) {
                // Range-based condition - check against all values
                if (allOldValues && allNewValues && cellRange && this.checkRangeCondition(condition, allOldValues, allNewValues, cellRange)) {
                    return true;
                }
            }
            else if (condition.cellRef) {
                // Single cell condition - get specific cell value
                if (allOldValues && allNewValues && cellRange && this.checkSingleCellCondition(condition, allOldValues, allNewValues, cellRange)) {
                    return true;
                }
            }
            else {
                // Legacy condition checking (for current cell change)
                if (this.checkLegacyCondition(condition, oldValue, newValue)) {
                    return true;
                }
            }
        }
        return false;
    }
    // Check range-based conditions (e.g., F11:F20 > 55)
    checkRangeCondition(condition, oldValues, newValues, monitoringRange) {
        if (!condition.cellRef)
            return false;
        try {
            const conditionRange = this.parseCellRange(condition.cellRef, newValues.length, newValues[0]?.length || 0);
            // Check each cell in the condition range
            for (let row = conditionRange.startRow; row <= conditionRange.endRow; row++) {
                for (let col = conditionRange.startCol; col <= conditionRange.endCol; col++) {
                    if (row < newValues.length && col < (newValues[row]?.length || 0)) {
                        const cellValue = newValues[row][col];
                        const oldCellValue = oldValues[row] && oldValues[row][col];
                        if (this.checkLegacyCondition(condition, oldCellValue, cellValue)) {
                            (0, logger_1.safeLog)(`🎯 Range condition met: ${condition.cellRef} at row ${row + 1}, col ${col + 1} = ${cellValue}`);
                            return true;
                        }
                    }
                }
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error checking range condition:', error);
        }
        return false;
    }
    // Check single cell conditions (e.g., F11 > 55)
    checkSingleCellCondition(condition, oldValues, newValues, monitoringRange) {
        if (!condition.cellRef)
            return false;
        try {
            const cellPos = this.cellRefToIndices(condition.cellRef);
            if (cellPos.row < newValues.length && cellPos.col < (newValues[cellPos.row]?.length || 0)) {
                const cellValue = newValues[cellPos.row][cellPos.col];
                const oldCellValue = oldValues[cellPos.row] && oldValues[cellPos.row][cellPos.col];
                if (this.checkLegacyCondition(condition, oldCellValue, cellValue)) {
                    (0, logger_1.safeLog)(`🎯 Single cell condition met: ${condition.cellRef} = ${cellValue}`);
                    return true;
                }
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error checking single cell condition:', error);
        }
        return false;
    }
    // Legacy condition checking for individual values
    checkLegacyCondition(condition, oldValue, newValue) {
        switch (condition.type) {
            case 'changed':
                return oldValue !== newValue;
            case 'greater_than':
                const numValueGt = parseFloat(String(newValue));
                return !isNaN(numValueGt) && condition.threshold !== undefined && numValueGt > condition.threshold;
            case 'less_than':
                const numValueLt = parseFloat(String(newValue));
                return !isNaN(numValueLt) && condition.threshold !== undefined && numValueLt < condition.threshold;
            case 'equals':
                return String(newValue) === String(condition.value);
            case 'not_equals':
                return String(newValue) !== String(condition.value);
            case 'contains':
                return condition.value && String(newValue).includes(String(condition.value));
            default:
                return false;
        }
    }
    async startMonitoring(jobId, sheetId, cellRange, frequencyMinutes, webhookUrl, userMention, conditions = [], fileId) {
        try {
            // Stop existing job if it exists
            if (this.activeJobs.has(jobId)) {
                await this.stopMonitoring(jobId);
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
                (0, logger_1.safeLog)(`Starting monitoring for uploaded file: ${spreadsheetName}`);
            }
            else {
                // Get Google Sheets info (with timeout)
                try {
                    const spreadsheetInfo = await Promise.race([
                        this.googleSheetsService.getSpreadsheetInfo(sheetId),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getting spreadsheet info')), 5000))
                    ]);
                    if (spreadsheetInfo.success && spreadsheetInfo.name) {
                        this.spreadsheetNames.set(sheetId, spreadsheetInfo.name);
                        spreadsheetName = spreadsheetInfo.name;
                    }
                }
                catch (error) {
                    (0, logger_1.safeError)('Error getting spreadsheet info:', error);
                    // Continue with sheetId as name
                }
                (0, logger_1.safeLog)(`Starting monitoring for Google Sheets: ${spreadsheetName}`);
            }
            const job = {
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
                sourceType
            };
            // Get initial values (with timeout)
            try {
                const initialValues = await Promise.race([
                    this.getValues(job),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getting initial values')), 5000))
                ]);
                const key = sourceType === 'uploaded_file' ? `file:${fileId}:${cellRange}` : `${sheetId}:${cellRange}`;
                this.previousValues.set(key, initialValues);
                job.currentValues = initialValues;
            }
            catch (error) {
                (0, logger_1.safeError)('Error getting initial values:', error);
                return { success: false, error: `Failed to get initial values: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
            // Minimum interval adjusted for 30-second monitoring
            // For uploaded files, allow more frequent monitoring since there's no API limit
            const minInterval = sourceType === 'uploaded_file' ? 30000 : 30000; // 30 seconds for both now
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, minInterval);
            // Simple interval - no complex scheduling
            job.intervalId = setInterval(async () => {
                await this.checkForChanges(job);
            }, intervalMs);
            this.activeJobs.set(jobId, job);
            (0, logger_1.safeLog)(`✅ Monitoring started for ${job.spreadsheetName} (${sourceType}) every ${frequencyMinutes} minute(s)`);
            return { success: true };
        }
        catch (error) {
            (0, logger_1.safeError)('Error starting monitoring:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    // Network-safe change checking
    async checkForChanges(job) {
        const key = job.sourceType === 'uploaded_file' ? `file:${job.fileId}:${job.cellRange}` : `${job.sheetId}:${job.cellRange}`;
        try {
            let currentValues;
            if (job.sourceType === 'uploaded_file') {
                // For uploaded files, get values directly (no network calls or caching needed)
                currentValues = await this.getValues(job);
                (0, logger_1.safeLog)(`📋 Checking uploaded file data for ${job.spreadsheetName}`);
            }
            else {
                // For Google Sheets, use existing network-safe logic
                if (this.apiInProgress.has(key)) {
                    (0, logger_1.safeLog)(`⏳ API call already in progress for ${job.spreadsheetName}, skipping`);
                    return;
                }
                // Check cache first
                const cached = this.valueCache.get(key);
                const now = Date.now();
                if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
                    // Use cached values - no network call needed
                    currentValues = cached.values;
                    (0, logger_1.safeLog)(`📋 Using cached values for ${job.spreadsheetName}`);
                }
                else {
                    // Check if enough time has passed since last API call
                    const lastCall = this.lastApiCall.get(key) || 0;
                    const timeSinceLastCall = now - lastCall;
                    if (timeSinceLastCall < this.MIN_API_INTERVAL) {
                        (0, logger_1.safeLog)(`🚫 Rate limiting: waiting ${Math.ceil((this.MIN_API_INTERVAL - timeSinceLastCall) / 1000)}s for ${job.spreadsheetName}`);
                        return; // Skip this check to prevent network overload
                    }
                    // Mark API call in progress
                    this.apiInProgress.add(key);
                    try {
                        // Get fresh values with network-safe timeout
                        currentValues = await Promise.race([
                            this.getValues(job),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 10000))
                        ]);
                        // Update cache and last call time
                        this.valueCache.set(key, { values: currentValues, timestamp: now });
                        this.lastApiCall.set(key, now);
                        (0, logger_1.safeLog)(`🌐 Fresh data fetched for ${job.spreadsheetName}`);
                    }
                    finally {
                        // Always remove from in-progress set
                        this.apiInProgress.delete(key);
                    }
                }
            }
            const previousValues = this.previousValues.get(key);
            job.lastChecked = new Date();
            // Debug logging
            (0, logger_1.safeLog)(`🔍 Checking for changes in ${job.spreadsheetName}:`);
            (0, logger_1.safeLog)(`   Previous values exist: ${!!previousValues}`);
            (0, logger_1.safeLog)(`   Current values: ${JSON.stringify(currentValues).substring(0, 200)}...`);
            if (previousValues) {
                (0, logger_1.safeLog)(`   Previous values: ${JSON.stringify(previousValues).substring(0, 200)}...`);
            }
            if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                (0, logger_1.safeLog)(`� CHANGES DETECTED in ${job.spreadsheetName} (${job.sourceType})`);
                // Find changes - simplified
                const changes = this.findChangedCells(previousValues, currentValues, job.cellRange);
                (0, logger_1.safeLog)(`   Found ${changes.length} changed cells:`, changes);
                // Send notification with enhanced condition checking
                if (changes.length > 0) {
                    (0, logger_1.safeLog)(`📤 Checking conditions for ${job.spreadsheetName}...`);
                    // Check if any condition is met (either cell-specific or range-based)
                    const shouldSendNotification = this.shouldNotify(changes[0].oldValue, changes[0].newValue, job.conditions, previousValues, currentValues, job.cellRange);
                    if (shouldSendNotification) {
                        (0, logger_1.safeLog)(`📤 Conditions met, sending notification for ${job.spreadsheetName}...`);
                        await this.sendNotification(job, changes[0], previousValues, currentValues);
                        (0, logger_1.safeLog)(`✅ Notification sent for ${job.spreadsheetName}`);
                    }
                    else {
                        (0, logger_1.safeLog)(`🚫 Conditions not met, skipping notification for ${job.spreadsheetName}`);
                    }
                }
                // Update stored values
                this.previousValues.set(key, currentValues);
                job.currentValues = currentValues;
            }
            else {
                (0, logger_1.safeLog)(`✅ No changes detected in ${job.spreadsheetName}`);
            }
        }
        catch (error) {
            (0, logger_1.safeError)(`Error checking changes for job ${job.id}:`, error);
            job.lastChecked = new Date();
        }
    }
    // Convert column number to letter (A=1, B=2, etc.)
    columnNumberToLetter(colNum) {
        let result = '';
        while (colNum > 0) {
            colNum--; // Convert to 0-based
            result = String.fromCharCode(65 + (colNum % 26)) + result;
            colNum = Math.floor(colNum / 26);
        }
        return result;
    }
    // Parse cell range to extract sheet name and starting position
    parseCellRangeForNotification(cellRange) {
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
    findChangedCells(oldValues, newValues, cellRange) {
        const changes = [];
        
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
                    if (changes.length >= 3)
                        break;
                }
            }
            if (changes.length >= 3)
                break;
        }
        return changes;
    }
    // Enhanced notification sending with full data context
    async sendNotification(job, change, oldValues, newValues) {
        try {
            (0, logger_1.safeLog)(`🔔 Processing notification for change: ${change.oldValue} → ${change.newValue}`);
            const spreadsheetName = job.spreadsheetName || this.spreadsheetNames.get(job.sheetId) || 'Unknown Spreadsheet';
            (0, logger_1.safeLog)(`📤 Creating Slack service with webhook: ${job.webhookUrl.substring(0, 50)}...`);
            const slackService = new SlackService_1.SlackService(job.webhookUrl);
            (0, logger_1.safeLog)(`📩 Sending notification to Slack...`);
            // Simple notification - no complex retry logic that can cause delays
            const result = await slackService.sendNotification('Google Sheets change detected', job.sheetId, change.cellRange, change.oldValue, change.newValue, spreadsheetName, job.userMention || undefined);
            if (result.success) {
                (0, logger_1.safeLog)(`✅ Notification sent successfully for ${change.cellRange}`);
            }
            else {
                (0, logger_1.safeError)(`❌ Notification failed: ${result.error}`);
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error sending notification:', error);
        }
    }
    async stopMonitoring(jobId) {
        try {
            const job = this.activeJobs.get(jobId);
            if (job && job.intervalId) {
                clearInterval(job.intervalId);
                job.isActive = false;
                this.activeJobs.delete(jobId);
                (0, logger_1.safeLog)(`Monitoring stopped for job ${jobId}`);
                return { success: true };
            }
            return { success: false, error: 'Job not found' };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    getActiveJobs() {
        return Array.from(this.activeJobs.values());
    }
    getActiveJobsCount() {
        return this.activeJobs.size;
    }
    // Get specific job
    getJob(jobId) {
        return this.activeJobs.get(jobId);
    }
    // Public method to manually check for changes
    async checkForChangesPublic(job) {
        await this.checkForChanges(job);
        return { success: true };
    }
    // Stop all monitoring jobs
    stopAllJobs() {
        for (const [jobId] of this.activeJobs) {
            this.stopMonitoring(jobId);
        }
    }
    // Network-safe cache cleanup
    cleanupCache() {
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
    async handleRealtimeUpdate(resourceId) {
        try {
            (0, logger_1.safeLog)(`Processing real-time update for resource: ${resourceId}`);
            // Find all monitoring jobs for this spreadsheet
            const affectedJobs = Array.from(this.activeJobs.values()).filter(job => job.sheetId === resourceId);
            if (affectedJobs.length === 0) {
                (0, logger_1.safeLog)(`No monitoring jobs found for resource: ${resourceId}`);
                return;
            }
            (0, logger_1.safeLog)(`Found ${affectedJobs.length} monitoring jobs for real-time update`);
            // Process each affected job immediately
            for (const job of affectedJobs) {
                try {
                    (0, logger_1.safeLog)(`Processing real-time update for job: ${job.id}`);
                    // Clear cache to force fresh data retrieval
                    const cacheKey = `${job.sheetId}_${job.cellRange}`;
                    this.valueCache.delete(cacheKey);
                    this.lastApiCall.delete(job.sheetId);
                    this.apiInProgress.delete(job.sheetId);
                    // Check for changes immediately
                    await this.checkForChanges(job);
                    (0, logger_1.safeLog)(`Real-time update processed for job: ${job.id}`);
                }
                catch (error) {
                    (0, logger_1.safeError)(`Error processing real-time update for job ${job.id}:`, error);
                }
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error handling real-time update:', error);
        }
    }
    async storePushNotificationChannel(sheetId, channelId, resourceId) {
        try {
            (0, logger_1.safeLog)(`Storing push notification channel for sheet ${sheetId}: ${channelId}`);
            this.pushChannels.set(sheetId, { channelId, resourceId });
        }
        catch (error) {
            (0, logger_1.safeError)('Error storing push notification channel:', error);
        }
    }
    // Clean up push notification channels when monitoring stops
    async cleanupPushNotifications(sheetId) {
        try {
            const channelInfo = this.pushChannels.get(sheetId);
            if (channelInfo) {
                (0, logger_1.safeLog)(`Cleaning up push notifications for sheet ${sheetId}`);
                // Stop the push notification channel
                await this.googleSheetsService.stopPushNotifications(channelInfo.channelId, channelInfo.resourceId);
                this.pushChannels.delete(sheetId);
                (0, logger_1.safeLog)(`Push notifications cleaned up for sheet ${sheetId}`);
            }
        }
        catch (error) {
            (0, logger_1.safeError)(`Error cleaning up push notifications for sheet ${sheetId}:`, error);
        }
    }
    // Get push notification status
    getPushNotificationStatus(sheetId) {
        return this.pushChannels.has(sheetId);
    }
}
exports.MonitoringService = MonitoringService;
