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
            
            // Use localhost redirect for OAuth
            const redirect_uri = 'http://localhost:3000/auth/callback';
            
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

    async authenticate(forceConsent: boolean = false) {
        try {
            safeLog('Starting authentication process...');
            
            if (!this.auth) {
                throw new Error('OAuth2 client not initialized');
            }
            
            const authUrl = this.auth.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/spreadsheets.readonly',
                    'https://www.googleapis.com/auth/drive.readonly'
                ],
                prompt: 'select_account'
            });
            
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
            this.auth.setCredentials(tokens);
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
            
            // Test if we have the necessary permissions
            try {
                safeLog('Testing Drive API access...');
                const response = await this.drive.files.list({
                    q: "mimeType='application/vnd.google-apps.spreadsheet'",
                    fields: 'files(id, name, modifiedTime, webViewLink)',
                    orderBy: 'modifiedTime desc',
                    pageSize: 10 // Start with a small number to test
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
}
