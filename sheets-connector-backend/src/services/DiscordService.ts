import { safeLog, safeError } from '../utils/logger';

export class DiscordService {
    static async sendMessage(webhookUrl: string, message: any): Promise<boolean> {
        try {
            let discordMessage: any;

            // Check if this is already a Discord-native message (has embeds property)
            if (message.embeds || message.content) {
                // Use the message as-is (Discord-native format)
                discordMessage = {
                    username: "Sheets Connector",
                    avatar_url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chart%20increasing/3D/chart_increasing_3d.png",
                    ...message
                };
            } else {
                // Convert Slack-style message to Discord format
                discordMessage = {
                    content: message.text || "📊 Google Sheets Update",
                    username: "Sheets Connector",
                    avatar_url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chart%20increasing/3D/chart_increasing_3d.png"
                };

                // Convert Slack attachments to Discord embeds
                if (message.attachments && message.attachments.length > 0) {
                    const attachment = message.attachments[0];
                    
                    discordMessage.embeds = [{
                        title: "📊 Sheet Monitoring Alert",
                        description: attachment.text || message.text,
                        color: 0x4285f4, // Google Blue
                        timestamp: new Date().toISOString(),
                        fields: attachment.fields?.map((field: any) => ({
                            name: field.title,
                            value: field.value,
                            inline: field.short || false
                        })) || [],
                        footer: {
                            text: "Sheets Connector for Discord",
                            icon_url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chart%20increasing/3D/chart_increasing_3d.png"
                        }
                    }];
                }
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(discordMessage)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            safeLog('Discord message sent successfully');
            return true;

        } catch (error) {
            safeError('Failed to send Discord message:', error);
            return false;
        }
    }

    static validateWebhookUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        
        // Discord webhook URL pattern
        const discordWebhookPattern = /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i;
        
        return discordWebhookPattern.test(url);
    }

    static async testConnection(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.validateWebhookUrl(webhookUrl)) {
                return { 
                    success: false, 
                    error: 'Invalid Discord webhook URL format. Must be a Discord webhook URL (https://discord.com/api/webhooks/...)' 
                };
            }

            const testMessage = {
                content: "🧪 **Test message from Sheets Connector for Discord**\n\nThis confirms your webhook is working correctly! 🎉",
                username: "Sheets Connector",
                avatar_url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chart%20increasing/3D/chart_increasing_3d.png",
                embeds: [{
                    title: "✅ Connection Test Successful",
                    description: "Your Discord webhook is properly configured and ready to receive Google Sheets notifications!",
                    color: 0x00ff00, // Green
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Sheets Connector for Discord"
                    }
                }]
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
