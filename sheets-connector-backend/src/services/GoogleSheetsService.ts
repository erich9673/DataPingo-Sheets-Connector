import { google } from 'googleapis';
import * as fs from 'fs';
import { safeLog, safeError } from '../utils/logger';

export class GoogleSheetsService {
    private sheets: any;
    private drive: any;
    private auth: any;
    private credentials: any;

    constructor() {
        try {
            // Load credentials from environment or file
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            
            if (!clientId || !clientSecret) {
                throw new Error('Google credentials not found in environment variables');
            }
            
            safeLog('Google credentials loaded from environment');
            
            // Use production webhook URL or localhost for development
            const redirect_uri = process.env.NODE_ENV === 'production' 
                ? process.env.GOOGLE_REDIRECT_URI || 'https://web-production-a261.up.railway.app/auth/callback'
                : 'http://localhost:3001/auth/callback';
            
            this.auth = new google.auth.OAuth2(
                clientId,
                clientSecret,
                redirect_uri
            );
            
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            this.drive = google.drive({ version: 'v3', auth: this.auth });
            
            safeLog('Google Sheets and Drive services initialized successfully');
        } catch (error) {
            safeError('Error initializing Google Sheets service:', error);
            throw error;
        }
    }

    async authenticate(forceConsent: boolean = false, state?: string) {
        try {
            safeLog('Starting authentication process...');
            
            if (!this.auth) {
                throw new Error('OAuth2 client not initialized');
            }
            
            const authUrlOptions: any = {
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive.metadata.readonly'
                ],
                prompt: forceConsent ? 'consent' : 'select_account'
            };
            
            // Add state parameter if provided (for Slack installations)
            if (state) {
                authUrlOptions.state = state;
            }
            
            const authUrl = this.auth.generateAuthUrl(authUrlOptions);
            
            safeLog('Generated auth URL:', authUrl);
            safeLog('Force consent:', forceConsent);
            
            return { authUrl, needsAuth: true };
        } catch (error) {
            safeError('Error during authentication:', error);
            throw error;
        }
    }

    async setAuthCode(code: string) {
        try {
            safeLog('Setting auth code, length:', code.length);
            const { tokens } = await this.auth.getToken(code);
            safeLog('Tokens received:', Object.keys(tokens));
            safeLog('Access token present:', !!tokens.access_token);
            safeLog('Refresh token present:', !!tokens.refresh_token);
            this.auth.setCredentials(tokens);
            
            // Test the authentication immediately
            try {
                const testResponse = await this.drive.files.list({
                    q: "mimeType='application/vnd.google-apps.spreadsheet'",
                    fields: 'files(id, name)',
                    pageSize: 1
                });
                safeLog('Auth test successful, can access Drive API');
            } catch (testError) {
                safeError('Auth test failed:', testError);
            }
            
            return { success: true };
        } catch (error) {
            safeError('Error setting auth code:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async getSpreadsheetInfo(spreadsheetId: string) {
        try {
            safeLog('Getting spreadsheet info for:', spreadsheetId);
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
                fields: 'properties.title,sheets.properties'
            });
            safeLog('Spreadsheet info received');
            return { 
                success: true, 
                name: response.data.properties?.title || 'Unknown Spreadsheet',
                sheets: response.data.sheets 
            };
        } catch (error) {
            safeError('Error getting spreadsheet info:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async getCellValues(spreadsheetId: string, range: string) {
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Google Sheets API timeout')), 8000)
            );

            const apiPromise = this.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range,
                // Add these options for better performance
                majorDimension: 'ROWS',
                valueRenderOption: 'UNFORMATTED_VALUE'
            });

            const response = await Promise.race([apiPromise, timeoutPromise]);
            return response.data.values || [];
        } catch (error) {
            safeError('Error getting cell values:', error);
            throw error;
        }
    }

    async getUserSpreadsheets() {
        try {
            safeLog('Fetching user spreadsheets...');
            
            if (!this.auth) {
                throw new Error('Authentication required');
            }
            
            if (!this.auth.credentials || !this.auth.credentials.access_token) {
                throw new Error('No access token available. Please authenticate first.');
            }
            
            safeLog('Auth credentials status:', {
                hasAccessToken: !!this.auth.credentials.access_token,
                hasRefreshToken: !!this.auth.credentials.refresh_token,
                expiryDate: this.auth.credentials.expiry_date
            });
            
            // Test if we have the necessary permissions
            try {
                safeLog('Testing Drive API access...');
                const response = await this.drive.files.list({
                    q: "mimeType='application/vnd.google-apps.spreadsheet'",
                    fields: 'files(id, name, modifiedTime, webViewLink)',
                    orderBy: 'modifiedTime desc',
                    pageSize: 20 // Increase to get more results
                });

                const spreadsheets = response.data.files || [];
                safeLog(`Found ${spreadsheets.length} spreadsheets:`, spreadsheets.slice(0, 3).map((s: any) => s.name));
                
                return {
                    success: true,
                    spreadsheets: spreadsheets.map((file: any) => ({
                        id: file.id,
                        name: file.name,
                        modifiedTime: file.modifiedTime,
                        webViewLink: file.webViewLink
                    }))
                };
            } catch (apiError: any) {
                safeError('Drive API error details:', apiError);
                safeError('Error code:', apiError.code);
                safeError('Error status:', apiError.status);
                safeError('Error response:', apiError.response?.data);
                
                // Handle specific Drive API errors
                if (apiError.code === 403) {
                    if (apiError.message && (apiError.message.includes('Drive API') || apiError.message.includes('drive'))) {
                        throw new Error('Drive API access is required but not enabled. Please enable the Drive API in your Google Cloud Console or use manual Sheet ID input.');
                    } else {
                        throw new Error('Permission denied. Please ensure you have granted access to view your Google Drive files.');
                    }
                } else if (apiError.code === 401) {
                    throw new Error('Authentication expired. Please re-authenticate with Google.');
                } else {
                    throw new Error(`Drive API error: ${apiError.message || 'Unknown error'}`);
                }
            }
        } catch (error) {
            safeError('Error fetching user spreadsheets:', error);
            
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Check if the service is authenticated
    isAuthenticated(): boolean {
        return this.auth && this.auth.credentials && this.auth.credentials.access_token;
    }

    // Get current auth status
    getAuthStatus() {
        return {
            authenticated: this.isAuthenticated(),
            hasRefreshToken: this.auth?.credentials?.refresh_token ? true : false
        };
    }

    // Set up Google Drive Push Notifications for real-time updates
    async setupPushNotifications(spreadsheetId: string, webhookUrl: string) {
        try {
            safeLog(`Setting up push notifications for spreadsheet: ${spreadsheetId}`);
            
            if (!this.isAuthenticated()) {
                throw new Error('Not authenticated with Google');
            }

            // Create a unique channel ID for this spreadsheet
            const channelId = `datapingo-${spreadsheetId}-${Date.now()}`;
            
            const watchRequest = {
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                resourceId: spreadsheetId,
                params: {
                    ttl: 3600 * 1000 // 1 hour in milliseconds
                }
            };

            safeLog('Sending watch request:', watchRequest);

            const response = await this.drive.files.watch({
                fileId: spreadsheetId,
                requestBody: watchRequest
            });

            safeLog('Push notification setup successful:', response.data);

            return {
                success: true,
                channelId: response.data.id,
                resourceId: response.data.resourceId,
                expiration: response.data.expiration
            };

        } catch (error) {
            safeError('Error setting up push notifications:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Stop push notifications for a channel
    async stopPushNotifications(channelId: string, resourceId: string) {
        try {
            safeLog(`Stopping push notifications for channel: ${channelId}`);
            
            if (!this.isAuthenticated()) {
                throw new Error('Not authenticated with Google');
            }

            await this.drive.channels.stop({
                requestBody: {
                    id: channelId,
                    resourceId: resourceId
                }
            });

            safeLog('Push notifications stopped successfully');
            return { success: true };

        } catch (error) {
            safeError('Error stopping push notifications:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Verify webhook notification from Google
    verifyWebhookNotification(headers: any): boolean {
        // Google sends specific headers to verify the webhook
        const channelId = headers['x-goog-channel-id'];
        const resourceId = headers['x-goog-resource-id'];
        const resourceState = headers['x-goog-resource-state'];
        
        safeLog('Webhook verification:', { channelId, resourceId, resourceState });
        
        // Basic verification - you can add more sophisticated checks
        return !!(channelId && resourceId && resourceState);
    }
}
