import { GoogleSheetsService } from './GoogleSheetsService';
import { SlackService } from './SlackService';
import { safeLog, safeError } from '../utils/logger';

// Simplified condition types
interface MonitoringCondition {
    type: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains' | 'changed';
    value?: string | number;
    threshold?: number;
    enabled: boolean;
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
}

export class MonitoringService {
    private googleSheetsService: GoogleSheetsService;
    private previousValues: Map<string, any[][]> = new Map();
    private spreadsheetNames: Map<string, string> = new Map();
    private activeJobs: Map<string, MonitoringJob> = new Map();
    
    // Network-safe caching and rate limiting
    private valueCache: Map<string, { values: any[][], timestamp: number }> = new Map();
    private readonly CACHE_TTL = 60000; // Increased to 60 seconds to reduce network load
    private lastApiCall: Map<string, number> = new Map(); // Track last API call per sheet
    private readonly MIN_API_INTERVAL = 45000; // Minimum 45 seconds between API calls for same sheet
    private apiInProgress: Set<string> = new Set(); // Prevent concurrent API calls

    constructor(googleSheetsService: GoogleSheetsService) {
        this.googleSheetsService = googleSheetsService;
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

    // Simplified condition checking
    private shouldNotify(oldValue: any, newValue: any, conditions: MonitoringCondition[]): boolean {
        if (!conditions || conditions.length === 0) {
            return oldValue !== newValue;
        }

        for (const condition of conditions) {
            if (!condition.enabled) continue;

            switch (condition.type) {
                case 'changed':
                    if (oldValue !== newValue) return true;
                    break;
                case 'greater_than':
                    const numValueGt = parseFloat(String(newValue));
                    if (!isNaN(numValueGt) && condition.threshold !== undefined && numValueGt > condition.threshold) return true;
                    break;
                case 'less_than':
                    const numValueLt = parseFloat(String(newValue));
                    if (!isNaN(numValueLt) && condition.threshold !== undefined && numValueLt < condition.threshold) return true;
                    break;
                case 'equals':
                    if (String(newValue) === String(condition.value)) return true;
                    break;
                case 'not_equals':
                    if (String(newValue) !== String(condition.value)) return true;
                    break;
                case 'contains':
                    if (condition.value && String(newValue).includes(String(condition.value))) return true;
                    break;
            }
        }
        return false;
    }

    async startMonitoring(jobId: string, sheetId: string, cellRange: string, frequencyMinutes: number, webhookUrl: string, userMention?: string, conditions: MonitoringCondition[] = []): Promise<{ success: boolean; error?: string }> {
        try {
            // Stop existing job if it exists
            if (this.activeJobs.has(jobId)) {
                await this.stopMonitoring(jobId);
            }
            
            // Get spreadsheet info (with timeout)
            const spreadsheetInfo = await Promise.race([
                this.googleSheetsService.getSpreadsheetInfo(sheetId),
                new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout getting spreadsheet info')), 5000))
            ]);
            
            if (spreadsheetInfo.success && spreadsheetInfo.name) {
                this.spreadsheetNames.set(sheetId, spreadsheetInfo.name);
            }
            
            // Get initial values (with timeout)
            const initialValues = await Promise.race([
                this.googleSheetsService.getCellValues(sheetId, cellRange),
                new Promise<any[][]>((_, reject) => setTimeout(() => reject(new Error('Timeout getting initial values')), 5000))
            ]);
            
            const key = `${sheetId}:${cellRange}`;
            this.previousValues.set(key, initialValues);
            
            // Minimum 2 minutes interval to prevent network overload
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, 120000); // Minimum 2 minutes
            
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
                currentValues: initialValues,
                spreadsheetName: spreadsheetInfo.success ? spreadsheetInfo.name : sheetId
            };
            
            // Simple interval - no complex scheduling
            job.intervalId = setInterval(async () => {
                await this.checkForChanges(job);
            }, intervalMs);
            
            this.activeJobs.set(jobId, job);
            
            safeLog(`✅ Monitoring started for ${job.spreadsheetName} every ${frequencyMinutes} minute(s)`);
            return { success: true };
        } catch (error) {
            safeError('Error starting monitoring:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    // Network-safe change checking
    private async checkForChanges(job: MonitoringJob): Promise<void> {
        const key = `${job.sheetId}:${job.cellRange}`;
        
        try {
            // Prevent concurrent API calls for same sheet
            if (this.apiInProgress.has(key)) {
                safeLog(`⏳ API call already in progress for ${job.spreadsheetName}, skipping`);
                return;
            }

            // Check cache first
            const cached = this.valueCache.get(key);
            const now = Date.now();
            
            let currentValues: any[][];
            
            if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
                // Use cached values - no network call needed
                currentValues = cached.values;
                safeLog(`📋 Using cached values for ${job.spreadsheetName}`);
            } else {
                // Check if enough time has passed since last API call
                const lastCall = this.lastApiCall.get(key) || 0;
                const timeSinceLastCall = now - lastCall;
                
                if (timeSinceLastCall < this.MIN_API_INTERVAL) {
                    safeLog(`🚫 Rate limiting: waiting ${Math.ceil((this.MIN_API_INTERVAL - timeSinceLastCall) / 1000)}s for ${job.spreadsheetName}`);
                    return; // Skip this check to prevent network overload
                }

                // Mark API call in progress
                this.apiInProgress.add(key);
                
                try {
                    // Get fresh values with network-safe timeout
                    currentValues = await Promise.race([
                        this.googleSheetsService.getCellValues(job.sheetId, job.cellRange),
                        new Promise<any[][]>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 10000))
                    ]);
                    
                    // Update cache and last call time
                    this.valueCache.set(key, { values: currentValues, timestamp: now });
                    this.lastApiCall.set(key, now);
                    
                    safeLog(`🌐 Fresh data fetched for ${job.spreadsheetName}`);
                } finally {
                    // Always remove from in-progress set
                    this.apiInProgress.delete(key);
                }
            }
            
            const previousValues = this.previousValues.get(key);
            job.lastChecked = new Date();
            
            if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                safeLog(`📊 Changes detected in ${job.spreadsheetName}`);
                
                // Find changes - simplified
                const changes = this.findChangedCells(previousValues, currentValues, job.cellRange);
                
                // Send notification immediately - no complex batching
                if (changes.length > 0) {
                    await this.sendNotification(job, changes[0]); // Send for first change only to avoid spam
                }
                
                // Update stored values
                this.previousValues.set(key, currentValues);
                job.currentValues = currentValues;
            }
            
        } catch (error) {
            safeError(`Error checking changes for job ${job.id}:`, error);
            job.lastChecked = new Date();
        }
    }

    // Simplified change detection
    private findChangedCells(oldValues: any[][], newValues: any[][], cellRange: string): Array<{cellRange: string, oldValue: any, newValue: any}> {
        const changes: Array<{cellRange: string, oldValue: any, newValue: any}> = [];
        
        for (let i = 0; i < Math.max(oldValues.length, newValues.length); i++) {
            const oldRow = oldValues[i] || [];
            const newRow = newValues[i] || [];
            
            for (let j = 0; j < Math.max(oldRow.length, newRow.length); j++) {
                const oldValue = oldRow[j] || '';
                const newValue = newRow[j] || '';
                
                if (oldValue !== newValue) {
                    changes.push({
                        cellRange: `${cellRange} (Row ${i + 1}, Col ${j + 1})`,
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

    // Simplified notification sending
    private async sendNotification(job: MonitoringJob, change: {cellRange: string, oldValue: any, newValue: any}): Promise<void> {
        try {
            if (!this.shouldNotify(change.oldValue, change.newValue, job.conditions)) {
                return;
            }

            const spreadsheetName = this.spreadsheetNames.get(job.sheetId) || 'Unknown Spreadsheet';
            const slackService = new SlackService(job.webhookUrl);
            
            // Simple notification - no complex retry logic that can cause delays
            const result = await slackService.sendNotification(
                'Google Sheets change detected',
                job.sheetId,
                change.cellRange,
                change.oldValue,
                change.newValue,
                spreadsheetName,
                job.userMention || '@channel'
            );
            
            if (result.success) {
                safeLog(`✅ Notification sent for ${change.cellRange}`);
            } else {
                safeError(`❌ Notification failed: ${result.error}`);
            }
        } catch (error) {
            safeError('Error sending notification:', error);
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

    getActiveJobsCount(): number {
        return this.activeJobs.size;
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
}
