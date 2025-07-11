import { safeLog, safeError } from '../utils/logger';

export class SlackService {
    private webhookUrl: string;

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    /**
     * Calculate the delta between old and new values
     * @param oldValue - The previous value
     * @param newValue - The current value
     * @returns String representation of the change
     */
    private calculateValueDelta(oldValue: any, newValue: any): string {
        try {
            // Handle empty/null values
            if (oldValue === null || oldValue === undefined || oldValue === '') {
                if (newValue === null || newValue === undefined || newValue === '') {
                    return 'N/A (No change)';
                }
                return `N/A (Added: ${newValue})`;
            }
            
            if (newValue === null || newValue === undefined || newValue === '') {
                return `N/A (Removed: ${oldValue})`;
            }
            
            // Try to parse as numbers
            const oldNum = parseFloat(String(oldValue).replace(/[^\d.-]/g, ''));
            const newNum = parseFloat(String(newValue).replace(/[^\d.-]/g, ''));
            
            // If both are valid numbers, calculate numeric delta
            if (!isNaN(oldNum) && !isNaN(newNum)) {
                const delta = newNum - oldNum;
                if (delta === 0) {
                    return 'N/A (No change)';
                }
                return delta > 0 ? `+${delta}` : `${delta}`;
            }
            
            // For text changes, indicate it's a text modification
            return 'N/A (Text change)';
        } catch (error) {
            safeError('Error calculating delta:', error);
            return 'N/A (Error calculating)';
        }
    }

    /**
     * Validate if the provided webhook URL is a valid Slack webhook
     * @param webhookUrl - The webhook URL to validate
     * @returns boolean indicating if the URL is valid
     */
    static isValidSlackWebhook(webhookUrl: string): boolean {
        try {
            const url = new URL(webhookUrl);
            return url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/');
        } catch (error) {
            return false;
        }
    }

    /**
     * Send a notification with retry logic
     * @param message - The message to send
     * @param sheetId - The sheet ID
     * @param cellRange - The cell range that changed
     * @param oldValue - The old value
     * @param newValue - The new value
     * @param spreadsheetName - The spreadsheet name
     * @param userMention - User mention string (e.g., "@channel", "@here", "<@U123456>")
     * @param retryCount - Number of retries (default: 3)
     */
    async sendNotificationWithRetry(message: string, sheetId: string, cellRange: string, oldValue: any, newValue: any, spreadsheetName?: string, userMention?: string, retryCount: number = 3): Promise<{ success: boolean; error?: string }> {
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            const result = await this.sendNotification(message, sheetId, cellRange, oldValue, newValue, spreadsheetName, userMention);
            
            if (result.success) {
                return result;
            }
            
            safeLog(`Attempt ${attempt} failed, retrying...`);
            
            if (attempt < retryCount) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        
        return { success: false, error: `Failed after ${retryCount} attempts` };
    }

    async sendNotification(message: string, sheetId: string, cellRange: string, oldValue: any, newValue: any, spreadsheetName?: string, userMention?: string) {
        try {
            safeLog('SlackService.sendNotification called for:', cellRange);
            
            // Calculate value delta for numeric values
            const delta = this.calculateValueDelta(oldValue, newValue);
            safeLog('Calculated delta:', delta);
            
            // Add user mention if provided
            const mentionText = userMention ? `\n\n🔔 ${userMention}` : '';
            
            const payload = {
                text: "📊 Google Sheets Change Detected!",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*📊 Google Sheets Change Detected!*\n\n*Spreadsheet Name:* ${spreadsheetName || 'Unknown'}\n*Value Changed:* ${delta}\n*Time:* ${new Date().toLocaleString()}\n*Old Value:* ${oldValue || 'Empty'}\n*New Value:* ${newValue || 'Empty'}\n*Cell Range:* ${cellRange}${mentionText}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View Sheet"
                                },
                                url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
                            }
                        ]
                    }
                ]
            };

            safeLog('Sending payload to Slack...');

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            safeLog('Slack response status:', response.status);
            safeLog('Slack response ok:', response.ok);

            if (!response.ok) {
                const responseText = await response.text();
                safeError('Slack webhook error response:', responseText);
                throw new Error(`Slack webhook failed: ${response.status} - ${responseText}`);
            }

            safeLog('Slack notification sent successfully');
            return { success: true };
        } catch (error) {
            safeError('Error sending Slack notification:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async testConnection() {
        try {
            const testPayload = {
                text: "🔔 Sheets Connector Test",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: "*🔔 Sheets Connector Test*\n\nYour Slack integration is working! 🎉\n\n*Time:* " + new Date().toLocaleString()
                        }
                    }
                ]
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload)
            });

            if (!response.ok) {
                throw new Error(`Slack test failed: ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}