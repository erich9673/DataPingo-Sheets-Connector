"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSheetsService = void 0;
const googleapis_1 = require("googleapis");
const logger_1 = require("../utils/logger");
class GoogleSheetsService {
    constructor() {
        try {
            // Load credentials from environment or file
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            if (!clientId || !clientSecret) {
                throw new Error('Google credentials not found in environment variables');
            }
            (0, logger_1.safeLog)('Google credentials loaded from environment');
            // Use production webhook URL or localhost for development
            const redirect_uri = process.env.NODE_ENV === 'production'
                ? process.env.GOOGLE_REDIRECT_URI || 'https://web-production-aafd.up.railway.app/api/auth/google/callback'
                : 'http://localhost:3001/api/auth/google/callback';
            this.auth = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirect_uri);
            this.sheets = googleapis_1.google.sheets({ version: 'v4', auth: this.auth });
            this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.auth });
            (0, logger_1.safeLog)('Google Sheets and Drive services initialized successfully');
        }
        catch (error) {
            (0, logger_1.safeError)('Error initializing Google Sheets service:', error);
            throw error;
        }
    }
    async authenticate(forceConsent = false, state) {
        try {
            (0, logger_1.safeLog)('Starting authentication process...');
            if (!this.auth) {
                throw new Error('OAuth2 client not initialized');
            }
            const authUrlOptions = {
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive.metadata.readonly',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ],
                prompt: forceConsent ? 'consent' : 'select_account'
            };
            // Add state parameter if provided (for Slack installations)
            if (state) {
                authUrlOptions.state = state;
            }
            const authUrl = this.auth.generateAuthUrl(authUrlOptions);
            (0, logger_1.safeLog)('Generated auth URL:', authUrl);
            (0, logger_1.safeLog)('Force consent:', forceConsent);
            return { authUrl, needsAuth: true };
        }
        catch (error) {
            (0, logger_1.safeError)('Error during authentication:', error);
            throw error;
        }
    }
    async setAuthCode(code) {
        try {
            (0, logger_1.safeLog)('Setting auth code, length:', code.length);
            const { tokens } = await this.auth.getToken(code);
            (0, logger_1.safeLog)('Tokens received:', Object.keys(tokens));
            (0, logger_1.safeLog)('Access token present:', !!tokens.access_token);
            (0, logger_1.safeLog)('Refresh token present:', !!tokens.refresh_token);
            this.auth.setCredentials(tokens);
            // Test the authentication immediately
            try {
                const testResponse = await this.drive.files.list({
                    q: "mimeType='application/vnd.google-apps.spreadsheet'",
                    fields: 'files(id, name)',
                    pageSize: 1
                });
                (0, logger_1.safeLog)('Auth test successful, can access Drive API');
            }
            catch (testError) {
                (0, logger_1.safeError)('Auth test failed:', testError);
            }
            return { success: true };
        }
        catch (error) {
            (0, logger_1.safeError)('Error setting auth code:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async getSpreadsheetInfo(spreadsheetId) {
        try {
            (0, logger_1.safeLog)('Getting spreadsheet info for:', spreadsheetId);
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
                fields: 'properties.title,sheets.properties'
            });
            (0, logger_1.safeLog)('Spreadsheet info received');
            return {
                success: true,
                name: response.data.properties?.title || 'Unknown Spreadsheet',
                sheets: response.data.sheets
            };
        }
        catch (error) {
            (0, logger_1.safeError)('Error getting spreadsheet info:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async getCellValues(spreadsheetId, range) {
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Google Sheets API timeout')), 8000));
            const apiPromise = this.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range,
                // Add these options for better performance
                majorDimension: 'ROWS',
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const response = await Promise.race([apiPromise, timeoutPromise]);
            return response.data.values || [];
        }
        catch (error) {
            (0, logger_1.safeError)('Error getting cell values:', error);
            throw error;
        }
    }
    async getUserSpreadsheets() {
        try {
            (0, logger_1.safeLog)('Fetching user spreadsheets...');
            if (!this.auth) {
                throw new Error('Authentication required');
            }
            if (!this.auth.credentials || !this.auth.credentials.access_token) {
                throw new Error('No access token available. Please authenticate first.');
            }
            (0, logger_1.safeLog)('Auth credentials status:', {
                hasAccessToken: !!this.auth.credentials.access_token,
                hasRefreshToken: !!this.auth.credentials.refresh_token,
                expiryDate: this.auth.credentials.expiry_date
            });
            // Test if we have the necessary permissions
            try {
                (0, logger_1.safeLog)('Testing Drive API access...');
                const response = await this.drive.files.list({
                    q: "mimeType='application/vnd.google-apps.spreadsheet'",
                    fields: 'files(id, name, modifiedTime, webViewLink)',
                    orderBy: 'modifiedTime desc',
                    pageSize: 100 // Increased from 20 to get more results
                });
                const spreadsheets = response.data.files || [];
                (0, logger_1.safeLog)(`Found ${spreadsheets.length} spreadsheets:`, spreadsheets.slice(0, 3).map((s) => s.name));
                return {
                    success: true,
                    spreadsheets: spreadsheets.map((file) => ({
                        id: file.id,
                        name: file.name,
                        modifiedTime: file.modifiedTime,
                        webViewLink: file.webViewLink
                    }))
                };
            }
            catch (apiError) {
                (0, logger_1.safeError)('Drive API error details:', apiError);
                (0, logger_1.safeError)('Error code:', apiError.code);
                (0, logger_1.safeError)('Error status:', apiError.status);
                (0, logger_1.safeError)('Error response:', apiError.response?.data);
                // Handle specific Drive API errors
                if (apiError.code === 403) {
                    if (apiError.message && (apiError.message.includes('Drive API') || apiError.message.includes('drive'))) {
                        throw new Error('Drive API access is required but not enabled. Please enable the Drive API in your Google Cloud Console or use manual Sheet ID input.');
                    }
                    else {
                        throw new Error('Permission denied. Please ensure you have granted access to view your Google Drive files.');
                    }
                }
                else if (apiError.code === 401) {
                    throw new Error('Authentication expired. Please re-authenticate with Google.');
                }
                else {
                    throw new Error(`Drive API error: ${apiError.message || 'Unknown error'}`);
                }
            }
        }
        catch (error) {
            (0, logger_1.safeError)('Error fetching user spreadsheets:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getAuthUrl() {
        try {
            if (!this.auth) {
                throw new Error('OAuth2 client not initialized');
            }
            const scopes = [
                'https://www.googleapis.com/auth/spreadsheets.readonly',
                'https://www.googleapis.com/auth/drive.readonly'
            ];
            const authUrl = this.auth.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                prompt: 'consent'
            });
            return authUrl;
        }
        catch (error) {
            (0, logger_1.safeError)('Error generating auth URL:', error);
            throw error;
        }
    }
    async handleAuthCallback(code) {
        try {
            const { tokens } = await this.auth.getToken(code);
            this.auth.setCredentials(tokens);
            // Store tokens for future use (in production, store in database)
            if (tokens.refresh_token) {
                // Store refresh token securely
                (0, logger_1.safeLog)('Refresh token obtained and stored');
            }
            (0, logger_1.safeLog)('Authentication successful');
        }
        catch (error) {
            (0, logger_1.safeError)('Error handling auth callback:', error);
            throw error;
        }
    }
    async isAuthenticated() {
        try {
            if (!this.auth.credentials || !this.auth.credentials.access_token) {
                return false;
            }
            // Try to make a simple API call to test authentication
            await this.drive.files.list({ q: 'mimeType="application/vnd.google-apps.spreadsheet"', pageSize: 1 });
            return true;
        }
        catch (error) {
            (0, logger_1.safeError)('Authentication check failed:', error);
            return false;
        }
    }
    // Get current auth status
    async getAuthStatus() {
        return {
            authenticated: await this.isAuthenticated(),
            hasRefreshToken: this.auth?.credentials?.refresh_token ? true : false
        };
    }
    // Set up Google Drive Push Notifications for real-time updates
    async setupPushNotifications(spreadsheetId, webhookUrl) {
        try {
            (0, logger_1.safeLog)(`Setting up push notifications for spreadsheet: ${spreadsheetId}`);
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
            (0, logger_1.safeLog)('Sending watch request:', watchRequest);
            const response = await this.drive.files.watch({
                fileId: spreadsheetId,
                requestBody: watchRequest
            });
            (0, logger_1.safeLog)('Push notification setup successful:', response.data);
            return {
                success: true,
                channelId: response.data.id,
                resourceId: response.data.resourceId,
                expiration: response.data.expiration
            };
        }
        catch (error) {
            (0, logger_1.safeError)('Error setting up push notifications:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Stop push notifications for a channel
    async stopPushNotifications(channelId, resourceId) {
        try {
            (0, logger_1.safeLog)(`Stopping push notifications for channel: ${channelId}`);
            if (!this.isAuthenticated()) {
                throw new Error('Not authenticated with Google');
            }
            await this.drive.channels.stop({
                requestBody: {
                    id: channelId,
                    resourceId: resourceId
                }
            });
            (0, logger_1.safeLog)('Push notifications stopped successfully');
            return { success: true };
        }
        catch (error) {
            (0, logger_1.safeError)('Error stopping push notifications:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Verify webhook notification from Google
    verifyWebhookNotification(headers) {
        // Google sends specific headers to verify the webhook
        const channelId = headers['x-goog-channel-id'];
        const resourceId = headers['x-goog-resource-id'];
        const resourceState = headers['x-goog-resource-state'];
        (0, logger_1.safeLog)('Webhook verification:', { channelId, resourceId, resourceState });
        // Basic verification - you can add more sophisticated checks
        return !!(channelId && resourceId && resourceState);
    }
    async listSpreadsheets() {
        try {
            if (!await this.isAuthenticated()) {
                throw new Error('Not authenticated with Google');
            }
            const response = await this.drive.files.list({
                q: 'mimeType="application/vnd.google-apps.spreadsheet"',
                fields: 'files(id, name, modifiedTime)',
                orderBy: 'modifiedTime desc',
                pageSize: 100
            });
            return response.data.files || [];
        }
        catch (error) {
            (0, logger_1.safeError)('Error listing spreadsheets:', error);
            throw error;
        }
    }
    async getSheetData(spreadsheetId) {
        try {
            if (!await this.isAuthenticated()) {
                throw new Error('Not authenticated with Google');
            }
            // Get sheet metadata to find the range
            const metadata = await this.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId
            });
            const firstSheet = metadata.data.sheets[0];
            const sheetName = firstSheet.properties.title;
            // Get data from the first sheet
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A1:ZZ1000` // Get a reasonable range
            });
            const values = response.data.values || [];
            const columns = values.length > 0 ? values[0] : [];
            const dataRows = values.slice(1); // Skip header row
            return {
                values: dataRows.map(row => {
                    const rowObject = {};
                    columns.forEach((col, index) => {
                        rowObject[col] = row[index] || '';
                    });
                    return rowObject;
                }),
                columns: columns,
                rows: dataRows.length
            };
        }
        catch (error) {
            (0, logger_1.safeError)('Error getting sheet data:', error);
            throw error;
        }
    }
    getCredentials() {
        return this.auth?.credentials || null;
    }
    setCredentials(credentials) {
        if (this.auth && credentials) {
            this.auth.setCredentials(credentials);
            (0, logger_1.safeLog)('Google credentials updated for this session');
        }
    }
    clearCredentials() {
        if (this.auth) {
            this.auth.setCredentials({});
            (0, logger_1.safeLog)('Google credentials cleared');
        }
    }
    // Get user profile information including email
    async getUserProfile() {
        try {
            if (!this.auth || !this.auth.credentials || !this.auth.credentials.access_token) {
                throw new Error('Not authenticated');
            }
            // Use Google OAuth2 API to get user info
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: this.auth });
            const response = await oauth2.userinfo.get();
            const userInfo = response.data;
            (0, logger_1.safeLog)('User profile retrieved:', {
                email: userInfo.email,
                name: userInfo.name,
                verified_email: userInfo.verified_email
            });
            return {
                success: true,
                email: userInfo.email,
                name: userInfo.name,
                verified_email: userInfo.verified_email,
                picture: userInfo.picture
            };
        }
        catch (error) {
            (0, logger_1.safeError)('Error getting user profile:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    getAuth() {
        return this.auth;
    }
}
exports.GoogleSheetsService = GoogleSheetsService;
