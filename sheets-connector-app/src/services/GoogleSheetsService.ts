import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';
import { shell } from 'electron';
import { safeLog, safeError } from '../utils/logger';

export class GoogleSheetsService {
    private sheets: any;
    private drive: any; // Add Drive API support
    private auth: any;
    private credentials: any;

    constructor() {
        try {
            // Path to your OAuth credentials file
            const credentialsPath = path.join(__dirname, '../../oauth-credentials.json');
            safeLog('Looking for credentials at:', credentialsPath);
            
            // Check if file exists
            if (!fs.existsSync(credentialsPath)) {
                throw new Error(`Credentials file not found at: ${credentialsPath}`);
            }
            
            // Read and parse credentials
            const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
            safeLog('Credentials file content length:', credentialsContent.length);
            
            this.credentials = JSON.parse(credentialsContent);
            safeLog('Credentials parsed successfully');
            
            // Handle both "web" and "installed" formats
            const creds = this.credentials.web || this.credentials.installed;
            if (!creds) {
                throw new Error('Invalid credentials format: missing "web" or "installed" property');
            }
            
            const { client_id, client_secret } = creds;
            
            safeLog('Client ID:', client_id ? 'Present' : 'Missing');
            safeLog('Client Secret:', client_secret ? 'Present' : 'Missing');
            
            if (!client_id || !client_secret) {
                throw new Error('Invalid credentials: missing required fields');
            }
            
            // Use the manual/out-of-band flow
            const redirect_uri = 'urn:ietf:wg:oauth:2.0:oob';
            
            this.auth = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uri
            );
            
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            this.drive = google.drive({ version: 'v3', auth: this.auth }); // Initialize Drive API
            safeLog('Google Sheets and Drive services initialized successfully');
            
        } catch (error) {
            safeError('Error initializing Google Sheets service:', error);
            throw error;
        }
    }

    async authenticate() {
        try {
            safeLog('Starting authentication process...');
            
            if (!this.auth) {
                throw new Error('OAuth2 client not initialized');
            }
            
            // Generate the auth URL with simplified parameters
            const authUrl = this.auth.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/spreadsheets.readonly',
                    'https://www.googleapis.com/auth/drive.readonly'
                ],
                prompt: 'select_account'  // Force account selection
            });
            
            safeLog('Generated auth URL:', authUrl);
            
            // Open the browser with the authentication URL
            await shell.openExternal(authUrl);
            
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
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range
            });
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
            
            const response = await this.drive.files.list({
                q: "mimeType='application/vnd.google-apps.spreadsheet'",
                fields: 'files(id, name, modifiedTime, webViewLink)',
                orderBy: 'modifiedTime desc',
                pageSize: 50 // Limit to 50 most recent spreadsheets
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
        } catch (error) {
            safeError('Error fetching user spreadsheets:', error);
            
            // Check if it's a Drive API access error
            if (error instanceof Error && error.message.includes('Google Drive API has not been used')) {
                return { 
                    success: false, 
                    error: 'Google Drive API is not enabled. Please use the manual Sheet ID option instead.',
                    spreadsheets: []
                };
            }
            
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error',
                spreadsheets: []
            };
        }
    }

    /**
     * Get instructions for enabling Google Drive API
     */
    getDriveApiInstructions() {
        return {
            success: false,
            error: 'Google Drive API not enabled',
            instructions: [
                '1. Go to Google Cloud Console: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=60189191818',
                '2. Click "Enable API"',
                '3. Wait a few minutes for the API to activate',
                '4. Restart the app and authenticate again',
                '5. The spreadsheet dropdown will then work automatically'
            ],
            fallback: 'You can always use the manual Sheet ID option which works immediately'
        };
    }

    async testConnection() {
        try {
            // Test with a simple spreadsheet access
            const testSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
            const info = await this.getSpreadsheetInfo(testSpreadsheetId);
            return { success: true, sheets: info };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}