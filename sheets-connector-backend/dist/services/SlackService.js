"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackService = void 0;
const logger_1 = require("../utils/logger");
const url_1 = require("url");
class SlackService {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
    /**
     * Calculate the delta between old and new values
     * @param oldValue - The previous value
     * @param newValue - The current value
     * @returns String representation of the change with emoji
     */
    calculateValueDelta(oldValue, newValue) {
        try {
            // Handle empty/null values
            if (oldValue === null || oldValue === undefined || oldValue === '') {
                if (newValue === null || newValue === undefined || newValue === '') {
                    return '➖ No change';
                }
                return `➕ Added: ${newValue}`;
            }
            if (newValue === null || newValue === undefined || newValue === '') {
                return `➖ Removed: ${oldValue}`;
            }
            // Try to parse as numbers
            const oldNum = parseFloat(String(oldValue).replace(/[^\d.-]/g, ''));
            const newNum = parseFloat(String(newValue).replace(/[^\d.-]/g, ''));
            // If both are valid numbers, calculate numeric delta
            if (!isNaN(oldNum) && !isNaN(newNum)) {
                const delta = newNum - oldNum;
                if (delta === 0) {
                    return '➖ No change';
                }
                const emoji = delta > 0 ? '📈' : '📉';
                const sign = delta > 0 ? '+' : '';
                return `${emoji} ${sign}${delta}`;
            }
            // For text changes, indicate it's a text modification
            return '🔄 Text change';
        }
        catch (error) {
            (0, logger_1.safeError)('Error calculating delta:', error);
            return '❓ Error calculating';
        }
    }
    /**
     * Validate if the provided webhook URL is a valid Slack webhook
     * @param webhookUrl - The webhook URL to validate
     * @returns boolean indicating if the URL is valid
     */
    static isValidSlackWebhook(webhookUrl) {
        try {
            const url = new url_1.URL(webhookUrl);
            return url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/');
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Simple HTTP POST request using Node.js built-in modules
     */
    async postToSlack(payload) {
        return new Promise((resolve) => {
            const https = require('https');
            const url = new url_1.URL(this.webhookUrl);
            const data = JSON.stringify(payload);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true });
                    }
                    else {
                        resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
                    }
                });
            });
            req.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });
            req.write(data);
            req.end();
        });
    }
    /**
     * Send a notification with retry logic
     * @param message - The message to send
     * @param sheetId - The sheet ID
     * @param cellRange - The cell range that changed
     * @param oldValue - The old value
     * @param newValue - The new value
     * @param spreadsheetName - The spreadsheet name
     * @param userMention - User mention string (e.g., "<!channel>", "<!here>", "<@U123456>")
     * @param retryCount - Number of retries (default: 3)
     */
    async sendNotificationWithRetry(message, sheetId, cellRange, oldValue, newValue, spreadsheetName, userMention, retryCount = 3) {
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            const result = await this.sendNotification(message, sheetId, cellRange, oldValue, newValue, spreadsheetName, userMention);
            if (result.success) {
                return result;
            }
            (0, logger_1.safeLog)(`Attempt ${attempt} failed, retrying...`);
            if (attempt < retryCount) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        return { success: false, error: `Failed after ${retryCount} attempts` };
    }
    async sendNotification(message, sheetId, cellRange, oldValue, newValue, spreadsheetName, userMention) {
        try {
            (0, logger_1.safeLog)('SlackService.sendNotification called for:', cellRange);
            // Calculate value delta for numeric values
            const delta = this.calculateValueDelta(oldValue, newValue);
            (0, logger_1.safeLog)('Calculated delta:', delta);
            // Format user mention for Slack - convert @channel to <!channel>, @here to <!here>
            let formattedMention = '';
            if (userMention) {
                if (userMention === '@channel') {
                    formattedMention = '<!channel>';
                }
                else if (userMention === '@here') {
                    formattedMention = '<!here>';
                }
                else if (userMention.startsWith('@') && !userMention.startsWith('<@')) {
                    // Custom username mention - keep as is for now
                    formattedMention = userMention;
                }
                else {
                    // Already formatted mention like <@U123456>
                    formattedMention = userMention;
                }
            }
            // Add user mention if provided
            const mentionText = formattedMention ? `\n\n🔔 ${formattedMention}` : '';
            const payload = {
                text: "📊 Google Sheets Change Detected!",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*📊 Google Sheets Change Detected!*\n*Spreadsheet Name:* ${spreadsheetName || 'Unknown'}\n*Value Changed:* ${delta}\n*Time:* ${new Date().toLocaleString()}\n*Old Value:* ${oldValue || 'Empty'}\n*New Value:* ${newValue || 'Empty'}\n*Cell Range:* ${cellRange}${mentionText}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "📋 View Sheet"
                                },
                                url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
                            }
                        ]
                    }
                ]
            };
            (0, logger_1.safeLog)('Sending payload to Slack...');
            const result = await this.postToSlack(payload);
            if (result.success) {
                (0, logger_1.safeLog)('Slack notification sent successfully');
                return { success: true };
            }
            else {
                throw new Error(result.error || 'Unknown error');
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error sending Slack notification:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async testConnection() {
        try {
            const testPayload = {
                text: "🔔 This is a connection test",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "*🔔 This is a connection test*\n\nYour DataPingo Sheets Connector is successfully connected to Slack! 🎉\n\n*Status:* ✅ Connected\n*Time:* " + new Date().toLocaleString() + "\n\nYou can now set up monitoring for your Google Sheets."
                        }
                    }
                ]
            };
            (0, logger_1.safeLog)('Sending test connection payload to Slack...');
            const result = await this.postToSlack(testPayload);
            if (result.success) {
                (0, logger_1.safeLog)('Slack test connection sent successfully');
                return { success: true };
            }
            else {
                throw new Error(result.error || 'Unknown error');
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error sending Slack test connection:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
exports.SlackService = SlackService;
