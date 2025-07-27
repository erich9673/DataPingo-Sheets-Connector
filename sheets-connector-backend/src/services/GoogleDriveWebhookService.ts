import { google } from 'googleapis';
import { safeLog, safeError } from '../utils/logger';
import { WebSocketService } from './WebSocketService';

export class GoogleDriveWebhookService {
    private static watchChannels: Map<string, any> = new Map();
    private static drive: any = null;

    static initialize() {
        try {
            // Initialize Google Drive API
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    project_id: process.env.GOOGLE_PROJECT_ID,
                },
                scopes: [
                    'https://www.googleapis.com/auth/drive.readonly',
                    'https://www.googleapis.com/auth/spreadsheets.readonly'
                ],
            });

            this.drive = google.drive({ version: 'v3', auth });
            safeLog('🔔 Google Drive Webhook Service initialized');
        } catch (error) {
            safeError('Failed to initialize Google Drive Webhook Service:', error);
        }
    }

    static async setupSheetWatch(sheetId: string, jobId: string): Promise<boolean> {
        if (!this.drive) {
            safeError('Google Drive service not initialized');
            return false;
        }

        try {
            // Check if already watching this sheet
            if (this.watchChannels.has(sheetId)) {
                safeLog(`📊 Already watching sheet: ${sheetId}`);
                return true;
            }

            // Set up push notification for the sheet
            const watchResponse = await this.drive.files.watch({
                fileId: sheetId,
                requestBody: {
                    id: `sheet-watch-${Date.now()}`,
                    type: 'web_hook',
                    address: `${process.env.BASE_URL || 'http://localhost:3001'}/api/webhook/google-drive`,
                    token: jobId, // Use jobId as token to identify the source
                    expiration: (Date.now() + 24 * 60 * 60 * 1000).toString(), // 24 hours from now
                }
            });

            // Store the watch channel info
            this.watchChannels.set(sheetId, {
                channelId: watchResponse.data.id,
                resourceId: watchResponse.data.resourceId,
                jobId: jobId,
                expiration: watchResponse.data.expiration,
                createdAt: new Date().toISOString()
            });

            safeLog(`🔔 Set up real-time monitoring for sheet: ${sheetId}`);
            
            // Broadcast setup success
            WebSocketService.broadcastSystemStatus({
                type: 'success',
                message: `Real-time monitoring enabled for sheet ${sheetId}`,
                timestamp: new Date().toISOString(),
                details: { sheetId, jobId }
            });

            return true;
        } catch (error) {
            safeError(`Failed to set up sheet watch for ${sheetId}:`, error);
            
            // Broadcast setup failure
            WebSocketService.broadcastSystemStatus({
                type: 'warning',
                message: `Could not enable real-time monitoring for sheet ${sheetId}. Using polling fallback.`,
                timestamp: new Date().toISOString(),
                details: { sheetId, error: error.message }
            });

            return false;
        }
    }

    static async removeSheetWatch(sheetId: string): Promise<boolean> {
        if (!this.drive) {
            return false;
        }

        const watchInfo = this.watchChannels.get(sheetId);
        if (!watchInfo) {
            return true; // Already removed or never existed
        }

        try {
            // Stop the watch channel
            await this.drive.channels.stop({
                requestBody: {
                    id: watchInfo.channelId,
                    resourceId: watchInfo.resourceId
                }
            });

            this.watchChannels.delete(sheetId);
            safeLog(`🔕 Removed real-time monitoring for sheet: ${sheetId}`);
            return true;
        } catch (error) {
            safeError(`Failed to remove sheet watch for ${sheetId}:`, error);
            return false;
        }
    }

    static handleWebhookNotification(headers: any, body: any): {
        sheetId?: string;
        jobId?: string;
        changeType: string;
        timestamp: string;
    } {
        const channelId = headers['x-goog-channel-id'];
        const resourceState = headers['x-goog-resource-state'];
        const resourceId = headers['x-goog-resource-id'];
        const token = headers['x-goog-channel-token']; // This should be our jobId

        safeLog('📡 Received Google Drive webhook notification:', {
            channelId,
            resourceState,
            resourceId,
            token
        });

        // Find the sheet being watched
        let sheetId: string | undefined;
        for (const [sid, watchInfo] of this.watchChannels.entries()) {
            if (watchInfo.channelId === channelId) {
                sheetId = sid;
                break;
            }
        }

        const notification = {
            sheetId,
            jobId: token,
            changeType: resourceState || 'update',
            timestamp: new Date().toISOString()
        };

        if (sheetId && resourceState === 'update') {
            // Broadcast the change detection immediately
            WebSocketService.broadcastSheetChange({
                sheetId,
                sheetTitle: `Sheet ${sheetId.substring(0, 8)}...`,
                changeType: 'Real-time update detected',
                timestamp: notification.timestamp,
                jobId: token
            });

            safeLog(`⚡ Real-time change detected in sheet: ${sheetId}`);
        }

        return notification;
    }

    static getActiveWatches(): Array<{
        sheetId: string;
        channelId: string;
        jobId: string;
        createdAt: string;
        expiration: string;
    }> {
        return Array.from(this.watchChannels.entries()).map(([sheetId, info]) => ({
            sheetId,
            channelId: info.channelId,
            jobId: info.jobId,
            createdAt: info.createdAt,
            expiration: info.expiration
        }));
    }

    static async refreshExpiredWatches(): Promise<void> {
        const now = Date.now();
        const expiredSheets: string[] = [];

        // Find expired watches
        for (const [sheetId, watchInfo] of this.watchChannels.entries()) {
            if (watchInfo.expiration && parseInt(watchInfo.expiration) < now) {
                expiredSheets.push(sheetId);
            }
        }

        // Refresh expired watches
        for (const sheetId of expiredSheets) {
            const watchInfo = this.watchChannels.get(sheetId);
            if (watchInfo) {
                safeLog(`🔄 Refreshing expired watch for sheet: ${sheetId}`);
                await this.removeSheetWatch(sheetId);
                await this.setupSheetWatch(sheetId, watchInfo.jobId);
            }
        }
    }
}
