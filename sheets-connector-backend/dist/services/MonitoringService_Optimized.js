"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const SlackService_1 = require("./SlackService");
const logger_1 = require("../utils/logger");
class MonitoringService {
    constructor(googleSheetsService) {
        this.previousValues = new Map();
        this.spreadsheetNames = new Map();
        this.activeJobs = new Map();
        // Simple caching - no complex rate limiting
        this.valueCache = new Map();
        this.CACHE_TTL = 30000; // 30 seconds cache
        this.googleSheetsService = googleSheetsService;
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
    // Simplified condition checking
    shouldNotify(oldValue, newValue, conditions) {
        if (!conditions || conditions.length === 0) {
            return oldValue !== newValue;
        }
        for (const condition of conditions) {
            if (!condition.enabled)
                continue;
            switch (condition.type) {
                case 'changed':
                    if (oldValue !== newValue)
                        return true;
                    break;
                case 'greater_than':
                    const numValueGt = parseFloat(String(newValue));
                    if (!isNaN(numValueGt) && condition.threshold !== undefined && numValueGt > condition.threshold)
                        return true;
                    break;
                case 'less_than':
                    const numValueLt = parseFloat(String(newValue));
                    if (!isNaN(numValueLt) && condition.threshold !== undefined && numValueLt < condition.threshold)
                        return true;
                    break;
                case 'equals':
                    if (String(newValue) === String(condition.value))
                        return true;
                    break;
                case 'not_equals':
                    if (String(newValue) !== String(condition.value))
                        return true;
                    break;
                case 'contains':
                    if (condition.value && String(newValue).includes(String(condition.value)))
                        return true;
                    break;
            }
        }
        return false;
    }
    async startMonitoring(jobId, sheetId, cellRange, frequencyMinutes, webhookUrl, userMention, conditions = []) {
        try {
            // Stop existing job if it exists
            if (this.activeJobs.has(jobId)) {
                await this.stopMonitoring(jobId);
            }
            // Get spreadsheet info (with timeout)
            const spreadsheetInfo = await Promise.race([
                this.googleSheetsService.getSpreadsheetInfo(sheetId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getting spreadsheet info')), 5000))
            ]);
            if (spreadsheetInfo.success && spreadsheetInfo.name) {
                this.spreadsheetNames.set(sheetId, spreadsheetInfo.name);
            }
            // Get initial values (with timeout)
            const initialValues = await Promise.race([
                this.googleSheetsService.getCellValues(sheetId, cellRange),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getting initial values')), 5000))
            ]);
            const key = `${sheetId}:${cellRange}`;
            this.previousValues.set(key, initialValues);
            // Minimum 1 minute interval, no complex calculations
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, 60000);
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
                currentValues: initialValues,
                spreadsheetName: spreadsheetInfo.success ? spreadsheetInfo.name : sheetId
            };
            // Simple interval - no complex scheduling
            job.intervalId = setInterval(async () => {
                await this.checkForChanges(job);
            }, intervalMs);
            this.activeJobs.set(jobId, job);
            (0, logger_1.safeLog)(`✅ Monitoring started for ${job.spreadsheetName} every ${frequencyMinutes} minute(s)`);
            return { success: true };
        }
        catch (error) {
            (0, logger_1.safeError)('Error starting monitoring:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    // Simplified change checking - MUCH FASTER
    async checkForChanges(job) {
        const key = `${job.sheetId}:${job.cellRange}`;
        try {
            // Simple caching check
            const cached = this.valueCache.get(key);
            const now = Date.now();
            let currentValues;
            if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
                currentValues = cached.values;
            }
            else {
                // Get fresh values with short timeout
                currentValues = await Promise.race([
                    this.googleSheetsService.getCellValues(job.sheetId, job.cellRange),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 8000))
                ]);
                // Update cache
                this.valueCache.set(key, { values: currentValues, timestamp: now });
            }
            const previousValues = this.previousValues.get(key);
            job.lastChecked = new Date();
            if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                (0, logger_1.safeLog)(`📊 Changes detected in ${job.spreadsheetName}`);
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
        }
        catch (error) {
            (0, logger_1.safeError)(`Error checking changes for job ${job.id}:`, error);
            job.lastChecked = new Date();
        }
    }
    // Simplified change detection
    findChangedCells(oldValues, newValues, cellRange) {
        const changes = [];
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
                    if (changes.length >= 3)
                        break;
                }
            }
            if (changes.length >= 3)
                break;
        }
        return changes;
    }
    // Simplified notification sending
    async sendNotification(job, change) {
        try {
            if (!this.shouldNotify(change.oldValue, change.newValue, job.conditions)) {
                return;
            }
            const spreadsheetName = this.spreadsheetNames.get(job.sheetId) || 'Unknown Spreadsheet';
            const slackService = new SlackService_1.SlackService(job.webhookUrl);
            // Simple notification - no complex retry logic that can cause delays
            const result = await slackService.sendNotification('Google Sheets change detected', job.sheetId, change.cellRange, change.oldValue, change.newValue, spreadsheetName, job.userMention || '@channel');
            if (result.success) {
                (0, logger_1.safeLog)(`✅ Notification sent for ${change.cellRange}`);
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
    // Clean up cache periodically
    cleanupCache() {
        const now = Date.now();
        for (const [key, cache] of this.valueCache.entries()) {
            if (now - cache.timestamp > this.CACHE_TTL * 2) {
                this.valueCache.delete(key);
            }
        }
    }
}
exports.MonitoringService = MonitoringService;
