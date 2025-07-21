export declare class SlackService {
    private webhookUrl;
    constructor(webhookUrl: string);
    /**
     * Calculate the delta between old and new values
     * @param oldValue - The previous value
     * @param newValue - The current value
     * @returns String representation of the change
     */
    private calculateValueDelta;
    /**
     * Validate if the provided webhook URL is a valid Slack webhook
     * @param webhookUrl - The webhook URL to validate
     * @returns boolean indicating if the URL is valid
     */
    static isValidSlackWebhook(webhookUrl: string): boolean;
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
    sendNotificationWithRetry(message: string, sheetId: string, cellRange: string, oldValue: any, newValue: any, spreadsheetName?: string, userMention?: string, retryCount?: number): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendNotification(message: string, sheetId: string, cellRange: string, oldValue: any, newValue: any, spreadsheetName?: string, userMention?: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    testConnection(): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
}
