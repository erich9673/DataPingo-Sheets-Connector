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
        // Optimized caching and rate limiting for faster response times
        this.valueCache = new Map();
        this.CACHE_TTL = 15000; // Reduced to 15 seconds for faster response
        this.lastApiCall = new Map(); // Track last API call per sheet
        this.MIN_API_INTERVAL = 20000; // Minimum 20 seconds between API calls for same sheet
        this.apiInProgress = new Set(); // Prevent concurrent API calls
        // Store push notification channel info for cleanup
        this.pushChannels = new Map();
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
            // Optimized minimum interval - allow 30 second minimum for faster response times
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, 30000); // Minimum 30 seconds
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
    // Network-safe change checking
    async checkForChanges(job) {
        const key = `${job.sheetId}:${job.cellRange}`;
        try {
            // Prevent concurrent API calls for same sheet
            if (this.apiInProgress.has(key)) {
                (0, logger_1.safeLog)(`⏳ API call already in progress for ${job.spreadsheetName}, skipping`);
                return;
            }
            // Check cache first
            const cached = this.valueCache.get(key);
            const now = Date.now();
            let currentValues;
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
                        this.googleSheetsService.getCellValues(job.sheetId, job.cellRange),
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
