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
        this.lastApiCall = new Map(); // Rate limiting per sheet
        this.apiCallQueue = new Map(); // Prevent duplicate API calls
        this.googleSheetsService = googleSheetsService;
    }
    // Check if a value change should trigger a notification based on conditions
    shouldNotify(oldValue, newValue, conditions) {
        // If no conditions are set, notify on any change (default behavior)
        if (!conditions || conditions.length === 0) {
            return oldValue !== newValue;
        }
        // Check each condition
        for (const condition of conditions) {
            if (!condition.enabled)
                continue;
            switch (condition.type) {
                case 'changed':
                    if (oldValue !== newValue)
                        return true;
                    break;
                case 'greater_than':
                    if (condition.threshold !== undefined) {
                        const numValue = parseFloat(String(newValue));
                        if (!isNaN(numValue) && numValue > condition.threshold)
                            return true;
                    }
                    break;
                case 'less_than':
                    if (condition.threshold !== undefined) {
                        const numValue = parseFloat(String(newValue));
                        if (!isNaN(numValue) && numValue < condition.threshold)
                            return true;
                    }
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
            (0, logger_1.safeLog)(`Starting monitoring job ${jobId} for sheet ${sheetId}, range ${cellRange}, frequency ${frequencyMinutes} minutes`);
            // Stop existing job if it exists
            if (this.activeJobs.has(jobId)) {
                await this.stopMonitoring(jobId);
            }
            // Get spreadsheet info including name
            const spreadsheetInfo = await this.googleSheetsService.getSpreadsheetInfo(sheetId);
            if (spreadsheetInfo.success && spreadsheetInfo.name) {
                this.spreadsheetNames.set(sheetId, spreadsheetInfo.name);
            }
            // Get initial values
            const initialValues = await this.googleSheetsService.getCellValues(sheetId, cellRange);
            const key = `${sheetId}:${cellRange}`;
            this.previousValues.set(key, initialValues);
            // Convert to milliseconds - minimum 1 minute for optimal performance
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, 60000); // Minimum 1 minute
            (0, logger_1.safeLog)(`Setting monitoring interval to ${intervalMs}ms (${intervalMs / 60000} minutes)`);
            // Create monitoring job
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
            // Set up interval monitoring
            job.intervalId = setInterval(async () => {
                (0, logger_1.safeLog)(`🔄 Running scheduled check for job ${job.id} (${job.spreadsheetName})`);
                await this.checkForChangesInternal(job);
            }, intervalMs);
            this.activeJobs.set(jobId, job);
            (0, logger_1.safeLog)(`✅ Monitoring job ${jobId} started successfully for "${job.spreadsheetName}" with ${intervalMs / 60000}-minute intervals`);
            return { success: true };
        }
        catch (error) {
            (0, logger_1.safeError)('Error starting monitoring:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async checkForChangesInternal_OLD(job) {
        try {
            (0, logger_1.safeLog)(`Checking for changes in job ${job.id}, sheet: ${job.sheetId}`);
            const currentValues = await this.googleSheetsService.getCellValues(job.sheetId, job.cellRange);
            const key = `${job.sheetId}:${job.cellRange}`;
            const previousValues = this.previousValues.get(key);
            // Update last checked time
            job.lastChecked = new Date();
            if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                (0, logger_1.safeLog)(`Changes detected in job ${job.id}!`);
                // Get spreadsheet name
                const spreadsheetName = this.spreadsheetNames.get(job.sheetId) || 'Unknown Spreadsheet';
                // Find the specific cells that changed
                const changes = this.findChangedCells(previousValues, currentValues);
                // Send notification for each change
                const slackService = new SlackService_1.SlackService(job.webhookUrl);
                for (const change of changes) {
                    // Check if notification should be sent based on conditions
                    if (this.shouldNotify(change.oldValue, change.newValue, job.conditions)) {
                        // Use retry logic for better reliability
                        const result = await slackService.sendNotificationWithRetry('Google Sheets change detected', job.sheetId, change.cellRange, change.oldValue, change.newValue, spreadsheetName, job.userMention || '@channel');
                        if (!result.success) {
                            (0, logger_1.safeError)(`Failed to send notification for ${change.cellRange} in job ${job.id}: ${result.error}`);
                        }
                    }
                    else {
                        (0, logger_1.safeLog)(`Change in ${change.cellRange} did not meet notification conditions for job ${job.id}`);
                    }
                }
                // Update stored values
                this.previousValues.set(key, currentValues);
                // Update job with current values
                job.currentValues = currentValues;
                job.lastChecked = new Date();
                return { success: true, changesDetected: true };
            }
            else {
                (0, logger_1.safeLog)(`No changes detected in job ${job.id}`);
                // Still update job with current values and last checked time
                job.currentValues = currentValues;
                job.lastChecked = new Date();
                return { success: true, changesDetected: false };
            }
        }
        catch (error) {
            (0, logger_1.safeError)(`Error checking for changes in job ${job.id}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Check if values have changed between previous and current
     */
    hasValuesChanged(previousValues, currentValues) {
        if (!previousValues || !currentValues) {
            return true;
        }
        if (previousValues.length !== currentValues.length) {
            return true;
        }
        for (let i = 0; i < previousValues.length; i++) {
            const prevRow = previousValues[i] || [];
            const currRow = currentValues[i] || [];
            if (prevRow.length !== currRow.length) {
                return true;
            }
            for (let j = 0; j < Math.max(prevRow.length, currRow.length); j++) {
                if ((prevRow[j] || '') !== (currRow[j] || '')) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Find specific cells that have changed
     */
    findChangedCells(previousValues, currentValues) {
        const changes = [];
        const maxRows = Math.max(previousValues?.length || 0, currentValues?.length || 0);
        for (let i = 0; i < maxRows; i++) {
            const prevRow = previousValues?.[i] || [];
            const currRow = currentValues?.[i] || [];
            const maxCols = Math.max(prevRow.length, currRow.length);
            for (let j = 0; j < maxCols; j++) {
                const oldValue = prevRow[j] || '';
                const newValue = currRow[j] || '';
                if (oldValue !== newValue) {
                    // Convert to A1 notation (approximate)
                    const cellRange = this.indexToCellRange(i, j);
                    changes.push({
                        cellRange,
                        oldValue,
                        newValue
                    });
                }
            }
        }
        return changes;
    }
    /**
     * Convert row/column indices to A1 notation
     */
    indexToCellRange(row, col) {
        let columnName = '';
        let colIndex = col;
        while (colIndex >= 0) {
            columnName = String.fromCharCode(65 + (colIndex % 26)) + columnName;
            colIndex = Math.floor(colIndex / 26) - 1;
        }
        return `${columnName}${row + 1}`;
    }
    async stopMonitoring(jobId) {
        try {
            const job = this.activeJobs.get(jobId);
            if (!job) {
                return { success: false, error: `Job ${jobId} not found` };
            }
            if (job.intervalId) {
                clearInterval(job.intervalId);
                job.intervalId = undefined;
            }
            job.isActive = false;
            this.activeJobs.delete(jobId);
            (0, logger_1.safeLog)(`Monitoring job ${jobId} stopped`);
            return { success: true };
        }
        catch (error) {
            (0, logger_1.safeError)(`Error stopping monitoring job ${jobId}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    getActiveJobs() {
        return Array.from(this.activeJobs.values()).map(job => {
            // Create a serializable copy without the intervalId
            const { intervalId, ...serializableJob } = job;
            return serializableJob;
        });
    }
    getJob(jobId) {
        const job = this.activeJobs.get(jobId);
        if (job) {
            // Create a serializable copy without the intervalId
            const { intervalId, ...serializableJob } = job;
            return serializableJob;
        }
        return undefined;
    }
    getActiveJobsCount() {
        return this.activeJobs.size;
    }
    // Public method to manually trigger a check for a specific job
    async checkForChanges(job) {
        return await this.checkForChangesInternal(job);
    }
    // Private method for internal change checking - OPTIMIZED VERSION
    async checkForChangesInternal(job) {
        const jobKey = `${job.sheetId}:${job.cellRange}`;
        try {
            // Performance optimization: Prevent multiple API calls for same sheet/range
            if (this.apiCallQueue.has(jobKey)) {
                (0, logger_1.safeLog)(`Reusing pending API call for job ${job.id}`);
                await this.apiCallQueue.get(jobKey);
                job.lastChecked = new Date();
                return { success: true, changesDetected: false, cached: true };
            }
            // Rate limiting: Ensure minimum 30 seconds between API calls for same sheet (optimized for 1-min intervals)
            const lastCall = this.lastApiCall.get(jobKey) || 0;
            const timeSinceLastCall = Date.now() - lastCall;
            const minInterval = 30000; // 30 seconds minimum between API calls
            if (timeSinceLastCall < minInterval) {
                const waitTime = minInterval - timeSinceLastCall;
                (0, logger_1.safeLog)(`Rate limiting: waiting ${waitTime}ms for job ${job.id}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            (0, logger_1.safeLog)(`🔍 Checking for changes in job ${job.id}, sheet: ${job.sheetId}, range: ${job.cellRange}`);
            // Create and cache the API promise to prevent duplicate calls
            const apiPromise = this.optimizedGetCellValues(job.sheetId, job.cellRange);
            this.apiCallQueue.set(jobKey, apiPromise);
            try {
                const currentValues = await apiPromise;
                this.lastApiCall.set(jobKey, Date.now());
                const previousValues = this.previousValues.get(jobKey);
                (0, logger_1.safeLog)(`📊 Current values for ${job.id}:`, currentValues);
                (0, logger_1.safeLog)(`📋 Previous values for ${job.id}:`, previousValues);
                // Update last checked time
                job.lastChecked = new Date();
                if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                    (0, logger_1.safeLog)(`Changes detected in job ${job.id}`);
                    // Get spreadsheet name for notifications
                    const spreadsheetName = this.spreadsheetNames.get(job.sheetId) || job.sheetId;
                    // Find what changed - optimized diff
                    const changes = this.findChangedCells(previousValues, currentValues);
                    // Intelligent notification batching: group similar changes
                    const batchedChanges = this.batchSimilarChanges(changes);
                    // Limit notifications to prevent spam (max 3 batches per check)
                    const limitedBatches = batchedChanges.slice(0, 3);
                    if (batchedChanges.length > 3) {
                        (0, logger_1.safeLog)(`Batching notifications: ${changes.length} changes into ${limitedBatches.length} notifications for job ${job.id}`);
                    }
                    // Send optimized notifications
                    for (const batch of limitedBatches) {
                        if (this.shouldNotifyForBatch(batch, job.conditions)) {
                            await this.sendOptimizedNotification(batch, job, spreadsheetName);
                        }
                    }
                    // Update stored values
                    this.previousValues.set(jobKey, currentValues);
                    job.currentValues = currentValues;
                    return { success: true, changesDetected: true, changesCount: changes.length };
                }
                else {
                    (0, logger_1.safeLog)(`No changes detected in job ${job.id}`);
                    // Still update job with current values and last checked time
                    job.currentValues = currentValues;
                    return { success: true, changesDetected: false };
                }
            }
            finally {
                // Clean up the API call queue
                this.apiCallQueue.delete(jobKey);
            }
        }
        catch (error) {
            this.apiCallQueue.delete(jobKey); // Clean up on error
            (0, logger_1.safeError)(`Error checking changes for job ${job.id}:`, error);
            // Enhanced error handling with backoff strategies
            if (error instanceof Error) {
                // Rate limiting - implement exponential backoff
                if (error.message.includes('quota') || error.message.includes('rate limit')) {
                    (0, logger_1.safeError)(`API rate limit hit for job ${job.id}, implementing backoff`);
                    const backoffTime = Math.min(300000, (job.frequencyMinutes * 60 * 1000) * 2); // Max 5 min backoff
                    this.lastApiCall.set(jobKey, Date.now() + backoffTime);
                }
                // Timeout handling
                if (error.message.includes('timeout')) {
                    (0, logger_1.safeError)(`API timeout for job ${job.id}, will retry next cycle`);
                }
                // Authentication errors
                if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
                    (0, logger_1.safeError)(`Authentication error for job ${job.id}, consider re-authenticating`);
                }
            }
            // Update last checked time even on error to prevent rapid retries
            job.lastChecked = new Date();
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    // Optimized cell value retrieval with timeout and caching
    async optimizedGetCellValues(sheetId, cellRange) {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Google Sheets API timeout')), 10000) // Reduced to 10s for faster response
        );
        return Promise.race([
            this.googleSheetsService.getCellValues(sheetId, cellRange),
            timeoutPromise
        ]);
    }
    // Batch similar changes to reduce notification spam
    batchSimilarChanges(changes) {
        const batches = [];
        const batchSize = 5; // Max 5 changes per notification
        for (let i = 0; i < changes.length; i += batchSize) {
            batches.push(changes.slice(i, i + batchSize));
        }
        return batches;
    }
    // Check if a batch of changes should trigger notification
    shouldNotifyForBatch(batch, conditions) {
        // If no conditions, notify for any change
        if (!conditions || conditions.length === 0) {
            return true;
        }
        // Check if any change in the batch meets conditions
        return batch.some(change => this.shouldNotify(change.oldValue, change.newValue, conditions));
    }
    // Send optimized notification for a batch of changes
    async sendOptimizedNotification(batch, job, spreadsheetName) {
        try {
            const slackService = new SlackService_1.SlackService(job.webhookUrl);
            if (batch.length === 1) {
                // Single change notification
                const change = batch[0];
                await slackService.sendNotification(job.webhookUrl, `📊 Sheet Change: ${change.cellRange}`, `**${change.cellRange}** changed from \`${change.oldValue}\` to \`${change.newValue}\``, spreadsheetName, job.userMention || '@channel');
            }
            else {
                // Batch notification
                const changeList = batch.map(change => `• **${change.cellRange}**: \`${change.oldValue}\` → \`${change.newValue}\``).join('\n');
                await slackService.sendNotification(job.webhookUrl, `📊 Multiple Sheet Changes (${batch.length})`, `**${batch.length} changes detected:**\n${changeList}`, spreadsheetName, job.userMention || '@channel');
            }
        }
        catch (error) {
            (0, logger_1.safeError)(`Failed to send optimized notification for job ${job.id}:`, error);
        }
    }
    stopAllJobs() {
        for (const jobId of this.activeJobs.keys()) {
            this.stopMonitoring(jobId);
        }
    }
}
exports.MonitoringService = MonitoringService;
