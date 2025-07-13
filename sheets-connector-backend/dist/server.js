"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const googleapis_1 = require("googleapis");
const GoogleSheetsService_1 = require("./services/GoogleSheetsService");
const SlackService_1 = require("./services/SlackService");
const MonitoringService_1 = require("./services/MonitoringService");
const logger_1 = require("./utils/logger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Serve static files from public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Initialize services with error handling
let googleSheetsService;
let slackService;
let monitoringService;
try {
    googleSheetsService = new GoogleSheetsService_1.GoogleSheetsService();
    slackService = new SlackService_1.SlackService('dummy'); // We'll pass the real URL when using it
    monitoringService = new MonitoringService_1.MonitoringService(googleSheetsService);
    (0, logger_1.safeLog)('✅ Services initialized successfully');
}
catch (error) {
    (0, logger_1.safeError)('⚠️ Service initialization failed, continuing with basic server:', error);
    // Create minimal fallback services
    googleSheetsService = null;
    slackService = null;
    monitoringService = null;
}
// Performance optimization: Clean up cache every 5 minutes
setInterval(() => {
    if (monitoringService && monitoringService.cleanupCache) {
        monitoringService.cleanupCache();
    }
}, 5 * 60 * 1000);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development'
    });
});
// Simple ping endpoint
app.get('/ping', (req, res) => {
    res.send('pong');
});
// Google Sheets Authentication
app.get('/api/auth/google/url', async (req, res) => {
    try {
        const forceConsent = req.query.force === 'true';
        
        // Always create fresh OAuth client to avoid caching issues
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirect_uri = process.env.NODE_ENV === 'production'
            ? process.env.GOOGLE_REDIRECT_URI || 'https://web-production-a261.up.railway.app/auth/callback'
            : 'http://localhost:3001/auth/callback';
        
        if (!clientId || !clientSecret) {
            throw new Error('Google credentials not found in environment variables');
        }
        
        const freshAuth = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirect_uri);
        
        const authUrl = freshAuth.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive.metadata.readonly'
            ],
            prompt: forceConsent ? 'consent' : 'select_account'
        });
        
        res.json({ success: true, url: authUrl });
    }
    catch (error) {
        (0, logger_1.safeError)('Auth URL error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Authorization code required' });
        }
        const result = await googleSheetsService.setAuthCode(code);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Auth callback error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Handle OAuth callback redirect (GET)
app.get('/auth/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://web-production-a261.up.railway.app'
            : 'http://localhost:3002';
            
        if (!code) {
            return res.send(`
                <html>
                    <body>
                        <h2>❌ Authorization Error</h2>
                        <p>No authorization code received.</p>
                        <p><a href="` + baseUrl + `">Return to app</a></p>
                    </body>
                </html>
            `);
        }
        // Auto-submit the code to the backend
        res.send(`
            <html>
                <head><title>Authentication Success</title></head>
                <body>
                    <h2>✅ Authentication Successful!</h2>
                    <p>Authorization code received. Submitting to DataPingo...</p>
                    <script>
                        // Auto-submit the code
                        fetch('/api/auth/google/callback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: '` + code + `' })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                document.body.innerHTML = \`
                                    <h2>🎉 Authentication Complete!</h2>
                                    <p>You can now close this window and return to the app.</p>
                                    <p><a href="` + baseUrl + `" target="_parent">Return to DataPingo Sheets Connector</a></p>
                                \`;
                                // Auto-redirect after 3 seconds
                                setTimeout(() => {
                                    window.location.href = '` + baseUrl + `';
                                }, 3000);
                            } else {
                                document.body.innerHTML = \`
                                    <h2>❌ Authentication Failed</h2>
                                    <p>Error: \${data.error}</p>
                                    <p><a href="` + baseUrl + `">Return to app to try again</a></p>
                                \`;
                            }
                        })
                        .catch(error => {
                            document.body.innerHTML = \`
                                <h2>❌ Error</h2>
                                <p>Failed to submit authorization: \${error.message}</p>
                                <p><a href="` + baseUrl + `">Return to app to try again</a></p>
                            \`;
                        });
                    </script>
                                <p><a href="${baseUrl}">Return to app to try again</a></p>
                            \`;
                        });
                    </script>
                </body>
            </html>
        `);
    }
    catch (error) {
        (0, logger_1.safeError)('OAuth callback error:', error);
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://web-production-a261.up.railway.app'
            : 'http://localhost:3002';
        res.send(`
            <html>
                <body>
                    <h2>❌ Error</h2>
                    <p>Authentication error: ` + (error instanceof Error ? error.message : 'Unknown error') + `</p>
                    <p><a href="` + baseUrl + `">Return to app</a></p>
                </body>
            </html>
        `);
    }
});
app.get('/api/auth/status', (req, res) => {
    try {
        const status = googleSheetsService.getAuthStatus();
        res.json({ success: true, ...status });
    }
    catch (error) {
        (0, logger_1.safeError)('Auth status error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Google Sheets Operations
app.get('/api/sheets/spreadsheets', async (req, res) => {
    try {
        const result = await googleSheetsService.getUserSpreadsheets();
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Get spreadsheets error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/sheets/:spreadsheetId/info', async (req, res) => {
    try {
        const { spreadsheetId } = req.params;
        const result = await googleSheetsService.getSpreadsheetInfo(spreadsheetId);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Get spreadsheet info error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/sheets/:spreadsheetId/values/:range', async (req, res) => {
    try {
        const { spreadsheetId, range } = req.params;
        const result = await googleSheetsService.getCellValues(spreadsheetId, range);
        res.json({ success: true, values: result });
    }
    catch (error) {
        (0, logger_1.safeError)('Get cell values error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Slack Operations
app.post('/api/slack/test', async (req, res) => {
    try {
        const { webhookUrl } = req.body;
        if (!webhookUrl) {
            return res.status(400).json({ success: false, error: 'Webhook URL required' });
        }
        const testSlackService = new SlackService_1.SlackService(webhookUrl);
        const result = await testSlackService.testConnection();
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Slack test error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Monitoring Operations
app.post('/api/monitoring/start', async (req, res) => {
    try {
        const { sheetId, cellRange, webhookUrl, frequencyMinutes, userMention, conditions } = req.body;
        if (!sheetId || !cellRange || !webhookUrl || !frequencyMinutes) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: sheetId, cellRange, webhookUrl, frequencyMinutes'
            });
        }
        const jobId = (0, uuid_1.v4)();
        // Convert frontend conditions to backend format
        const convertedConditions = (conditions || []).map((condition) => {
            let type;
            let threshold;
            switch (condition.operator) {
                case '>':
                    type = 'greater_than';
                    threshold = parseFloat(condition.value);
                    break;
                case '<':
                    type = 'less_than';
                    threshold = parseFloat(condition.value);
                    break;
                case '=':
                case '==':
                    type = 'equals';
                    threshold = parseFloat(condition.value);
                    break;
                case '!=':
                    type = 'not_equals';
                    threshold = parseFloat(condition.value);
                    break;
                case 'contains':
                    type = 'contains';
                    break;
                default:
                    type = 'changed';
            }
            return {
                type,
                value: condition.value,
                threshold,
                enabled: true
            };
        });
        const result = await monitoringService.startMonitoring(jobId, sheetId, cellRange, frequencyMinutes, webhookUrl, userMention, convertedConditions);
        if (result.success) {
            res.json({ success: true, jobId });
        }
        else {
            res.status(500).json(result);
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Start monitoring error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/monitoring/jobs', (req, res) => {
    try {
        const jobs = monitoringService.getActiveJobs();
        // Remove circular references (intervalId) before sending JSON
        const safeJobs = jobs.map(job => ({
            id: job.id,
            sheetId: job.sheetId,
            cellRange: job.cellRange,
            frequencyMinutes: job.frequencyMinutes,
            webhookUrl: job.webhookUrl,
            userMention: job.userMention,
            conditions: job.conditions,
            isActive: job.isActive,
            createdAt: job.createdAt,
            lastChecked: job.lastChecked,
            spreadsheetName: job.spreadsheetName
            // Intentionally exclude intervalId and currentValues
        }));
        res.json({ success: true, jobs: safeJobs });
    }
    catch (error) {
        (0, logger_1.safeError)('Get jobs error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/monitoring/jobs/:jobId', (req, res) => {
    try {
        const { jobId } = req.params;
        const job = monitoringService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        // Create safe job object without circular references
        const safeJob = {
            id: job.id,
            sheetId: job.sheetId,
            cellRange: job.cellRange,
            frequencyMinutes: job.frequencyMinutes,
            webhookUrl: job.webhookUrl,
            userMention: job.userMention,
            conditions: job.conditions,
            isActive: job.isActive,
            createdAt: job.createdAt,
            lastChecked: job.lastChecked,
            spreadsheetName: job.spreadsheetName
        };
        res.json({ success: true, job: safeJob });
    }
    catch (error) {
        (0, logger_1.safeError)('Get job error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/monitoring/jobs/:jobId/refresh', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = monitoringService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        // Manually trigger a check for this job
        const result = await monitoringService.checkForChangesPublic(job);
        // Create safe job object without circular references
        const safeJob = {
            id: job.id,
            sheetId: job.sheetId,
            cellRange: job.cellRange,
            frequencyMinutes: job.frequencyMinutes,
            webhookUrl: job.webhookUrl,
            userMention: job.userMention,
            conditions: job.conditions,
            isActive: job.isActive,
            createdAt: job.createdAt,
            lastChecked: job.lastChecked,
            spreadsheetName: job.spreadsheetName
        };
        res.json({ success: true, result, job: safeJob });
    }
    catch (error) {
        (0, logger_1.safeError)('Refresh job error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/monitoring/stop/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await monitoringService.stopMonitoring(jobId);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Stop monitoring error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/monitoring/stop-all', async (req, res) => {
    try {
        const jobCount = monitoringService.getActiveJobsCount();
        monitoringService.stopAllJobs();
        res.json({ success: true, message: 'All monitoring jobs stopped', stoppedCount: jobCount });
    }
    catch (error) {
        (0, logger_1.safeError)('Stop all jobs error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Debug Endpoints (for troubleshooting)
app.get('/api/debug/monitoring-jobs', (req, res) => {
    try {
        const activeJobs = monitoringService.getActiveJobs();
        // Remove circular references (intervalId) before sending JSON
        const jobsInfo = activeJobs.map(job => ({
            id: job.id,
            sheetId: job.sheetId,
            cellRange: job.cellRange,
            frequencyMinutes: job.frequencyMinutes,
            isActive: job.isActive,
            createdAt: job.createdAt,
            lastChecked: job.lastChecked,
            spreadsheetName: job.spreadsheetName
            // Intentionally exclude intervalId and other complex objects
        }));
        res.json({ success: true, activeJobs: jobsInfo, count: activeJobs.length });
    }
    catch (error) {
        (0, logger_1.safeError)('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/debug/test-notification', async (req, res) => {
    try {
        const { webhookUrl, sheetId, message } = req.body;
        if (!webhookUrl || !sheetId) {
            return res.status(400).json({ success: false, error: 'Webhook URL and Sheet ID required' });
        }
        const testSlackService = new SlackService_1.SlackService(webhookUrl);
        const result = await testSlackService.sendNotification(message || 'Debug test notification', sheetId, 'A1', 'old value', 'new value', 'Test Spreadsheet', '@channel');
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Debug test notification error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Google Drive Webhook Handler for Real-time Push Notifications
app.post('/api/webhook/google-drive', async (req, res) => {
    try {
        (0, logger_1.safeLog)('Received Google Drive webhook notification');
        (0, logger_1.safeLog)('Headers:', req.headers);
        (0, logger_1.safeLog)('Body:', req.body);
        // Verify the webhook notification
        const isValid = googleSheetsService.verifyWebhookNotification(req.headers);
        if (!isValid) {
            (0, logger_1.safeError)('Invalid webhook notification received');
            return res.status(400).json({
                success: false,
                error: 'Invalid webhook notification'
            });
        }
        // Extract information from headers
        const channelId = req.headers['x-goog-channel-id'];
        const resourceId = req.headers['x-goog-resource-id'];
        const resourceState = req.headers['x-goog-resource-state'];
        const eventType = req.headers['x-goog-resource-uri'];
        (0, logger_1.safeLog)(`Webhook notification - Channel: ${channelId}, Resource: ${resourceId}, State: ${resourceState}`);
        // Only process 'update' events (file changes)
        if (resourceState === 'update') {
            (0, logger_1.safeLog)('Processing real-time update notification');
            // Trigger immediate monitoring check for this specific spreadsheet
            await monitoringService.handleRealtimeUpdate(resourceId);
            (0, logger_1.safeLog)('Real-time update processed successfully');
        }
        else {
            (0, logger_1.safeLog)(`Ignoring webhook state: ${resourceState}`);
        }
        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ success: true, processed: resourceState === 'update' });
    }
    catch (error) {
        (0, logger_1.safeError)('Error processing webhook notification:', error);
        // Still return 200 to avoid Google retrying
        res.status(200).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Setup push notifications for a monitoring job
app.post('/api/monitoring/setup-push', async (req, res) => {
    try {
        const { sheetId, webhookUrl } = req.body;
        if (!sheetId) {
            return res.status(400).json({
                success: false,
                error: 'Sheet ID is required'
            });
        }
        // Use production webhook URL or default
        const actualWebhookUrl = webhookUrl || `${req.protocol}://${req.get('host')}/api/webhook/google-drive`;
        (0, logger_1.safeLog)(`Setting up push notifications for sheet: ${sheetId}`);
        (0, logger_1.safeLog)(`Webhook URL: ${actualWebhookUrl}`);
        // Check if we're in local development (localhost)
        const isLocalhost = actualWebhookUrl.includes('localhost') || actualWebhookUrl.includes('127.0.0.1');
        if (isLocalhost) {
            (0, logger_1.safeLog)('Local development detected, using polling instead of webhooks');
            // For localhost, we'll use polling instead since Google requires HTTPS for webhooks
            return res.json({
                success: true,
                mode: 'polling',
                message: 'Real-time monitoring enabled with polling (local development mode)',
                channelId: `polling-${sheetId}-${Date.now()}`,
                resourceId: sheetId
            });
        }
        const result = await googleSheetsService.setupPushNotifications(sheetId, actualWebhookUrl);
        if (result.success) {
            // Store the channel info for cleanup later
            await monitoringService.storePushNotificationChannel(sheetId, result.channelId, result.resourceId);
            // Add mode information
            res.json({
                ...result,
                mode: 'webhooks'
            });
        }
        else {
            res.json(result);
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Error setting up push notifications:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test endpoint to verify OAuth credentials
app.get('/api/test/oauth', async (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirect_uri = process.env.GOOGLE_REDIRECT_URI || 'https://web-production-a261.up.railway.app/auth/callback';
        
        res.json({
            success: true,
            clientId: clientId ? clientId.substring(0, 20) + '...' : 'NOT_SET',
            clientSecret: clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT_SET',
            redirectUri: redirect_uri,
            nodeEnv: process.env.NODE_ENV
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    (0, logger_1.safeError)('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
    const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://web-production-a261.up.railway.app` 
        : `http://localhost:${PORT}`;
    
    (0, logger_1.safeLog)(`🚀 Sheets Connector Backend Server running on port ${PORT}`);
    (0, logger_1.safeLog)(`📊 API Base URL: ${baseUrl}/api`);
    (0, logger_1.safeLog)(`🔍 Health Check: ${baseUrl}/health`);
    (0, logger_1.safeLog)(`🌐 Frontend: ${baseUrl}`);
});
exports.default = app;
