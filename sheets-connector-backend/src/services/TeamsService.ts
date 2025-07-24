import { safeLog, safeError } from '../utils/logger';

export class TeamsService {
    static async sendMessage(webhookUrl: string, message: any): Promise<boolean> {
        try {
            const teamsMessage = {
                "@type": "MessageCard",
                "@context": "https://schema.org/extensions",
                "summary": message.text || "Sheets Connector Alert",
                "themeColor": "0078D4",
                "sections": [{
                    "activityTitle": "📊 Google Sheets Update",
                    "activitySubtitle": message.text || "Sheet monitoring alert",
                    "facts": message.attachments?.[0]?.fields?.map((field: any) => ({
                        "name": field.title,
                        "value": field.value
                    })) || [],
                    "markdown": true
                }]
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(teamsMessage)
            });

            if (!response.ok) {
                throw new Error(`Teams API error: ${response.status} ${response.statusText}`);
            }

            safeLog('Teams message sent successfully');
            return true;

        } catch (error) {
            safeError('Failed to send Teams message:', error);
            return false;
        }
    }

    static validateWebhookUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        
        const teamsWebhookPattern = /^https:\/\/.*\.webhook\.office\.com\/webhookb2\/.*$/i;
        const outlookWebhookPattern = /^https:\/\/outlook\.office\.com\/webhook\/.*$/i;
        
        return teamsWebhookPattern.test(url) || outlookWebhookPattern.test(url);
    }

    static async testConnection(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.validateWebhookUrl(webhookUrl)) {
                return { 
                    success: false, 
                    error: 'Invalid Teams webhook URL format. Must be an Outlook/Office 365 webhook URL' 
                };
            }

            const testMessage = {
                text: "🧪 Test message from Sheets Connector for Microsoft Teams\n\nThis confirms your webhook is working correctly!"
            };

            const success = await this.sendMessage(webhookUrl, testMessage);
            
            return success 
                ? { success: true }
                : { success: false, error: 'Failed to send test message' };

        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
}
