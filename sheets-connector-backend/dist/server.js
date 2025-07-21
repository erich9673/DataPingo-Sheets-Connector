"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const fs_1 = require("fs");
const csv_parser_1 = __importDefault(require("csv-parser"));
const uuid_1 = require("uuid");
const express_session_1 = __importDefault(require("express-session"));
const GoogleSheetsService_1 = require("./services/GoogleSheetsService");
const SlackService_1 = require("./services/SlackService");
const MonitoringService_1 = require("./services/MonitoringService");
const logger_1 = require("./utils/logger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;
// Auto-approval configuration
let AUTO_APPROVE_USERS = process.env.AUTO_APPROVE_USERS === 'true' || false;
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3002', // Local development
        'http://127.0.0.1:3002', // Local development
        'https://web-production-aafd.up.railway.app', // Old Railway URL
        'https://datapingo-sheets-connector-production.up.railway.app', // Current Railway URL
        /\.railway\.app$/ // Allow any Railway subdomain
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'datapingo-session-secret-' + Math.random(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Allow cross-site requests
    }
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Serve static files from public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// File upload configuration
const upload = (0, multer_1.default)({
    dest: path_1.default.join(__dirname, '../uploads/'),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.oasis.opendocument.spreadsheet'
        ];
        const allowedExtensions = ['.csv', '.xls', '.xlsx', '.ods', '.tsv'];
        const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only CSV, Excel, and OpenDocument files are allowed.'));
        }
    }
});
// Store uploaded file data in memory (in production, use a database)
const uploadedFiles = new Map();
// Store auth tokens for cross-domain authentication
const authTokens = new Map();
// Store Google credentials per session
const sessionCredentials = new Map();
// Global Google credentials storage (for sharing between sessions and tokens)
let globalGoogleCredentials = null;
// Initialize services with error handling
let googleSheetsService;
let slackService;
let monitoringService;
try {
    googleSheetsService = new GoogleSheetsService_1.GoogleSheetsService();
    slackService = new SlackService_1.SlackService('dummy'); // We'll pass the real URL when using it
    monitoringService = new MonitoringService_1.MonitoringService(googleSheetsService, uploadedFiles);
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
        const result = await googleSheetsService.authenticate(forceConsent);
        res.json({ success: true, url: result.authUrl });
    }
    catch (error) {
        (0, logger_1.safeError)('Auth URL error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Slack installation endpoint - redirects to complete installation in Slack
app.get('/slack/install', (req, res) => {
    try {
        // Slack App Store requires this endpoint to redirect to slack.com with 302
        // After installation, users will be directed to our app via the landing page
        const appId = 'A095BR1R14J';
        const team = req.query.team || '';
        const slackRedirectUrl = `https://slack.com/app_redirect?app=${appId}${team ? '&team=' + team : ''}`;
        (0, logger_1.safeLog)(`Redirecting Slack installation to: ${slackRedirectUrl}`);
        res.redirect(302, slackRedirectUrl);
    }
    catch (error) {
        (0, logger_1.safeError)('Slack install error:', error);
        res.redirect(302, `https://slack.com/app_redirect?app=A095BR1R14J&error=install_failed`);
    }
});
// Landing page for post-Slack installation
app.get('/installed', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>DataPingo Sheets Connector - Installation Complete</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        min-height: 100vh; color: white;
                    }
                    .container { 
                        background: white; color: #333; padding: 40px; border-radius: 12px; 
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                    }
                    .success { color: #28a745; font-size: 48px; margin-bottom: 20px; }
                    .next-steps { 
                        background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; 
                        text-align: left; 
                    }
                    .cta-button { 
                        display: inline-block; background: #4285f4; color: white; 
                        padding: 15px 30px; text-decoration: none; border-radius: 6px; 
                        font-weight: bold; margin: 10px; 
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">🎉</div>
                    <h1>DataPingo Sheets Connector Installed!</h1>
                    <p>Great! The app has been added to your Slack workspace.</p>
                    
                    <div class="next-steps">
                        <h3>📋 Next Steps:</h3>
                        <ol>
                            <li><strong>Set up Google Sheets access</strong> - Connect your Google account</li>
                            <li><strong>Configure Slack notifications</strong> - Set up your webhook</li>
                            <li><strong>Start monitoring</strong> - Choose what to track</li>
                        </ol>
                    </div>
                    
                    <a href="/" class="cta-button">🚀 Start Setup</a>
                    <a href="/support" class="cta-button">📚 Get Help</a>
                </div>
            </body>
        </html>
    `);
});
// Google OAuth callback - handle both GET (from Google redirect) and POST (from frontend)
app.get('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Authorization code required' });
        }
        const result = await googleSheetsService.setAuthCode(code);
        if (result.success) {
            // Clear all existing auth tokens to prevent account mixing
            (0, logger_1.safeLog)(`🔄 Clearing ${authTokens.size} existing auth tokens for new login`);
            authTokens.clear();
            // Generate auth token for frontend authentication
            const authToken = (0, uuid_1.v4)();
            // Store credentials for this session/token
            const credentials = googleSheetsService.getCredentials();
            authTokens.set(authToken, {
                timestamp: Date.now(),
                authenticated: true,
                hasRefreshToken: true,
                googleCredentials: credentials
            });
            if (credentials) {
                (0, logger_1.safeLog)(`Stored Google credentials for new user with token: ${authToken.substring(0, 8)}...`);
            }
            // Clean up old tokens (older than 24 hours) - keeping this for regular maintenance
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            for (const [token, data] of authTokens.entries()) {
                if (data.timestamp < oneDayAgo) {
                    authTokens.delete(token);
                }
            }
            // Redirect back to frontend with success
            res.redirect(`/?auth=success&authToken=${authToken}`);
        }
        else {
            res.redirect('/?auth=error&message=' + encodeURIComponent(result.error || 'Authentication failed'));
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Google OAuth callback error:', error);
        res.redirect('/?auth=error&message=' + encodeURIComponent('Authentication failed'));
    }
});
app.post('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Authorization code required' });
        }
        const result = await googleSheetsService.setAuthCode(code);
        if (result.success) {
            // Clear all existing auth tokens to prevent account mixing
            (0, logger_1.safeLog)(`🔄 Clearing ${authTokens.size} existing auth tokens for new login`);
            authTokens.clear();
            // Generate auth token for frontend authentication
            const authToken = (0, uuid_1.v4)();
            // Store credentials for this session/token
            const credentials = googleSheetsService.getCredentials();
            authTokens.set(authToken, {
                timestamp: Date.now(),
                authenticated: true,
                hasRefreshToken: true,
                googleCredentials: credentials
            });
            if (credentials) {
                (0, logger_1.safeLog)(`Stored Google credentials for new user with token: ${authToken.substring(0, 8)}...`);
            }
            // Clean up old tokens (older than 24 hours) - keeping this for regular maintenance
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            for (const [token, data] of authTokens.entries()) {
                if (data.timestamp < oneDayAgo) {
                    authTokens.delete(token);
                }
            }
            result.authToken = authToken;
        }
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
        const { code, state } = req.query;
        // Check if this is a Slack OAuth flow (for App Store distribution)
        if (state === 'slack_install') {
            // For Slack App Store installations, redirect back to Slack
            if (code) {
                // Process the authorization code
                try {
                    const result = await googleSheetsService.setAuthCode(code);
                    if (result.success) {
                        // Redirect back to Slack with success
                        return res.redirect(302, 'https://slack.com/app_redirect?app=A095BR1R14J&team=' + (req.query.team || ''));
                    }
                }
                catch (error) {
                    (0, logger_1.safeError)('OAuth processing error:', error);
                }
            }
            // Redirect back to Slack with error
            return res.redirect(302, 'https://slack.com/app_redirect?app=A095BR1R14J&error=oauth_error');
        }
        // Regular OAuth flow (for direct users)
        if (!code) {
            return res.send(`
                <html>
                    <body>
                        <h2>❌ Authorization Error</h2>
                        <p>No authorization code received.</p>
                        <p><a href="/">Return to app</a></p>
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
                            body: JSON.stringify({ code: '${code}' })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                document.body.innerHTML = \`
                                    <h2>🎉 Authentication Complete!</h2>
                                    <p>You can now close this window and return to the app.</p>
                                    <p><a href="/" target="_parent">Return to DataPingo Sheets Connector</a></p>
                                \`;
                                // Store auth token and redirect
                                const authToken = data.authToken;
                                
                                // Determine the correct frontend URL
                                let baseUrl;
                                if (window.location.hostname === 'localhost') {
                                    baseUrl = 'http://localhost:3002';
                                } else if (window.location.hostname.includes('railway.app')) {
                                    // For Railway, use the same domain (frontend served from same domain)
                                    baseUrl = window.location.origin;
                                } else {
                                    baseUrl = window.location.origin;
                                }
                                
                                const redirectUrl = authToken 
                                    ? \`\${baseUrl}?authToken=\${authToken}\`
                                    : \`\${baseUrl}?auth=success\`;
                                    
                                setTimeout(() => {
                                    window.location.href = redirectUrl;
                                }, 2000);
                            } else {
                                document.body.innerHTML = \`
                                    <h2>❌ Authentication Failed</h2>
                                    <p>Error: \${data.error}</p>
                                    <p><a href="/">Return to app to try again</a></p>
                                \`;
                            }
                        })
                        .catch(error => {
                            // Determine the correct frontend URL for error redirect
                            let baseUrl;
                            if (window.location.hostname === 'localhost') {
                                baseUrl = 'http://localhost:3002';
                            } else {
                                baseUrl = window.location.origin;
                            }
                            
                            document.body.innerHTML = \`
                                <h2>❌ Error</h2>
                                <p>Failed to submit authorization: \${error.message}</p>
                                <p><a href="\${baseUrl}">Return to app to try again</a></p>
                            \`;
                        });
                    </script>
                </body>
            </html>
        `);
    }
    catch (error) {
        (0, logger_1.safeError)('OAuth callback error:', error);
        res.send(`
            <html>
                <body>
                    <h2>❌ Error</h2>
                    <p>Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
                    <p><a href="javascript:history.back()">Return to app</a></p>
                </body>
            </html>
        `);
    }
});
// Manual approval system for user access control
const pendingRequests = new Map();
const approvedUsers = new Set();
// Request access endpoint
app.post('/api/auth/request-access', (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: 'Valid email address required'
            });
        }
        // Check if already approved
        if (approvedUsers.has(email)) {
            return res.json({
                success: true,
                message: 'User already approved',
                status: 'approved'
            });
        }
        // Check if already pending
        if (pendingRequests.has(email)) {
            return res.json({
                success: true,
                message: 'Access request already pending',
                status: 'pending'
            });
        }
        // Add to pending requests
        pendingRequests.set(email, {
            email,
            timestamp: new Date(),
            approved: false
        });
        (0, logger_1.safeLog)(`📧 New access request from: ${email}`);
        // Auto-approve if enabled
        if (AUTO_APPROVE_USERS) {
            approvedUsers.add(email);
            const request = pendingRequests.get(email);
            if (request) {
                request.approved = true;
            }
            (0, logger_1.safeLog)(`🚀 Auto-approved user: ${email}`);
            return res.json({
                success: true,
                message: 'Access request auto-approved!',
                status: 'approved'
            });
        }
        res.json({
            success: true,
            message: 'Access request submitted successfully',
            status: 'pending'
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Request access error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Approve user endpoint (admin only)
app.post('/api/auth/approve-user', (req, res) => {
    try {
        const { email, approved } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email required'
            });
        }
        const request = pendingRequests.get(email);
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }
        if (approved) {
            // Approve user
            approvedUsers.add(email);
            request.approved = true;
            (0, logger_1.safeLog)(`✅ User approved: ${email}`);
        }
        else {
            // Deny user
            pendingRequests.delete(email);
            (0, logger_1.safeLog)(`❌ User denied: ${email}`);
        }
        res.json({
            success: true,
            message: approved ? 'User approved' : 'User denied'
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Approve user error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get pending requests endpoint (admin only)
app.get('/api/auth/pending-requests', (req, res) => {
    try {
        const pending = Array.from(pendingRequests.values())
            .filter(req => !req.approved)
            .map(req => ({
            email: req.email,
            timestamp: req.timestamp,
            timeAgo: Math.floor((Date.now() - req.timestamp.getTime()) / (1000 * 60)) + ' minutes ago'
        }));
        res.json({
            success: true,
            requests: pending,
            count: pending.length
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get pending requests error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get user activity endpoint (admin only) - shows actual user sessions instead of pending requests
app.get('/api/auth/user-activity', (req, res) => {
    try {
        // Convert auth tokens to user activity data
        const sessions = Array.from(authTokens.entries()).map(([tokenId, data]) => {
            const ageMinutes = Math.floor((Date.now() - data.timestamp) / (1000 * 60));
            return {
                tokenId: tokenId.substring(0, 8) + '...', // Partial token for privacy
                loginTime: new Date(data.timestamp).toISOString(),
                lastActive: `${ageMinutes} minutes ago`,
                authenticated: data.authenticated,
                hasRefreshToken: data.hasRefreshToken,
                ageMinutes: ageMinutes
            };
        });
        // Sort by most recent first
        sessions.sort((a, b) => a.ageMinutes - b.ageMinutes);
        res.json({
            success: true,
            sessions: sessions,
            totalUsers: sessions.length,
            activeTokens: sessions.filter(s => s.ageMinutes < 60).length, // Active in last hour
            activeInLast24h: sessions.filter(s => s.ageMinutes < 1440).length // Active in last 24 hours
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get user activity error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Check auth status with manual approval support
app.get('/api/auth/status', async (req, res) => {
    try {
        const { email } = req.query;
        // If email provided, check manual approval status
        if (email) {
            if (approvedUsers.has(email)) {
                return res.json({
                    success: true,
                    authenticated: true,
                    user: { email: email },
                    authMethod: 'manual'
                });
            }
            else if (pendingRequests.has(email)) {
                return res.json({
                    success: true,
                    authenticated: false,
                    pending: true,
                    email: email
                });
            }
            else {
                return res.json({
                    success: true,
                    authenticated: false,
                    pending: false
                });
            }
        }
        // Fallback to Google Sheets auth status
        const status = await googleSheetsService.getAuthStatus();
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
// Original auth status endpoint (keeping for backward compatibility)
app.get('/api/auth/google-status', async (req, res) => {
    try {
        const status = await googleSheetsService.getAuthStatus();
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
// Auto-approval settings endpoints (admin only)
app.get('/api/auth/auto-approval-status', (req, res) => {
    try {
        res.json({
            success: true,
            autoApprovalEnabled: AUTO_APPROVE_USERS
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get auto-approval status error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/auth/toggle-auto-approval', (req, res) => {
    try {
        const { enabled } = req.body;
        // Update the runtime auto-approval setting
        AUTO_APPROVE_USERS = Boolean(enabled);
        (0, logger_1.safeLog)(`🔧 Auto-approval ${enabled ? 'enabled' : 'disabled'} by admin`);
        res.json({
            success: true,
            autoApprovalEnabled: Boolean(enabled),
            message: `Auto-approval ${enabled ? 'enabled' : 'disabled'}`
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Toggle auto-approval error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Debug endpoint to test auth token functionality
app.get('/api/debug/test-token-auth', async (req, res) => {
    try {
        const authToken = req.query.authToken;
        if (!authToken) {
            return res.json({
                success: false,
                error: 'No auth token provided',
                help: 'Add ?authToken=YOUR_TOKEN to test'
            });
        }
        // Check token
        const tokenData = authTokens.get(authToken);
        if (!tokenData) {
            return res.json({
                success: false,
                error: 'Invalid auth token',
                tokenCount: authTokens.size
            });
        }
        // Test Google Sheets service
        const googleStatus = await googleSheetsService.getAuthStatus();
        res.json({
            success: true,
            tokenValid: true,
            tokenData: {
                timestamp: tokenData.timestamp,
                authenticated: tokenData.authenticated,
                hasRefreshToken: tokenData.hasRefreshToken
            },
            googleAuthStatus: googleStatus,
            tokenCount: authTokens.size
        });
    }
    catch (error) {
        res.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tokenCount: authTokens.size
        });
    }
});
// Google Sheets Operations
app.get('/api/sheets/spreadsheets', async (req, res) => {
    try {
        // Check for auth token in query params or headers
        const authToken = req.query.authToken || req.headers['x-auth-token'];
        if (authToken) {
            // Verify token first
            const tokenData = authTokens.get(authToken);
            if (!tokenData || !tokenData.authenticated) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired auth token'
                });
            }
            // Use token-specific credentials
            if (tokenData.googleCredentials) {
                console.log('Using token-based authentication with stored credentials');
                // Temporarily set the credentials for this request
                googleSheetsService.setCredentials(tokenData.googleCredentials);
            }
            else {
                return res.status(401).json({
                    success: false,
                    error: 'No Google credentials found for this token'
                });
            }
        }
        // Try to get spreadsheets (will work with either session or token auth)
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
// Auth token verification endpoint
app.post('/api/auth/verify-token', (req, res) => {
    try {
        const { authToken } = req.body;
        if (!authToken) {
            return res.status(400).json({
                success: false,
                error: 'Auth token required'
            });
        }
        const tokenData = authTokens.get(authToken);
        if (!tokenData) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired auth token'
            });
        }
        // Check if token is expired (24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (tokenData.timestamp < oneDayAgo) {
            authTokens.delete(authToken);
            return res.status(401).json({
                success: false,
                error: 'Auth token expired'
            });
        }
        res.json({
            success: true,
            authenticated: tokenData.authenticated,
            hasRefreshToken: tokenData.hasRefreshToken
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Token verification error:', error);
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
// Google Sheets listing with manual approval support
app.get('/api/sheets/list', async (req, res) => {
    try {
        const { email } = req.query;
        // Check if user is manually approved
        if (email && approvedUsers.has(email)) {
            // For manually approved users, we need Google OAuth for actual sheet access
            const status = await googleSheetsService.getAuthStatus();
            if (!status.authenticated) {
                return res.json({
                    success: false,
                    error: 'Google authentication required for sheet access',
                    needsGoogleAuth: true
                });
            }
            // Get sheets from Google
            const result = await googleSheetsService.getUserSpreadsheets();
            return res.json(result);
        }
        // Fallback to regular Google auth check
        const result = await googleSheetsService.getUserSpreadsheets();
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Get sheets list error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Sheet data with manual approval support
app.get('/api/sheets/:spreadsheetId/data', async (req, res) => {
    try {
        const { spreadsheetId } = req.params;
        const { email } = req.query;
        // Check if user is manually approved
        if (email && !approvedUsers.has(email)) {
            return res.status(403).json({
                success: false,
                error: 'User not approved for access'
            });
        }
        // Get sheet data
        const infoResult = await googleSheetsService.getSpreadsheetInfo(spreadsheetId);
        if (!infoResult.success) {
            return res.json(infoResult);
        }
        // Get data from first sheet
        const firstSheet = infoResult.sheets[0];
        const range = `${firstSheet.properties.title}!A1:Z1000`;
        const valuesResult = await googleSheetsService.getCellValues(spreadsheetId, range);
        // Convert values to structured data
        const values = valuesResult || [];
        const columns = values[0] || [];
        const data = values.slice(1).map(row => {
            const rowObj = {};
            columns.forEach((col, index) => {
                rowObj[col] = row[index] || '';
            });
            return rowObj;
        });
        res.json({
            success: true,
            data: data,
            columns: columns,
            rawValues: values
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get sheet data error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Session management for manual approval
app.post('/api/auth/set-session', (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !approvedUsers.has(email)) {
            return res.status(403).json({
                success: false,
                error: 'User not approved'
            });
        }
        // In a real app, you'd set a proper session cookie here
        // For now, we'll just confirm the user is approved
        res.json({
            success: true,
            message: 'Session set',
            user: { email }
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Set session error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    try {
        const { authToken } = req.body;
        // Clear specific auth token if provided
        if (authToken && authTokens.has(authToken)) {
            authTokens.delete(authToken);
            (0, logger_1.safeLog)(`🔓 Cleared auth token: ${authToken.substring(0, 8)}...`);
        }
        // For security, clear all auth tokens on logout
        const tokenCount = authTokens.size;
        authTokens.clear();
        (0, logger_1.safeLog)(`🔄 Logout: Cleared ${tokenCount} auth tokens to prevent account mixing`);
        // Clear the global GoogleSheetsService credentials
        try {
            if (googleSheetsService && googleSheetsService.clearCredentials) {
                googleSheetsService.clearCredentials();
                (0, logger_1.safeLog)('🔓 Cleared GoogleSheetsService credentials');
            }
        }
        catch (clearError) {
            (0, logger_1.safeLog)('Note: Could not clear GoogleSheetsService credentials (method may not exist)');
        }
        res.json({
            success: true,
            message: 'Logged out successfully',
            clearedTokens: tokenCount
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Logout error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Monitoring Operations
app.post('/api/monitoring/start', async (req, res) => {
    try {
        const { sheetId, cellRange, webhookUrl, frequencyMinutes, userMention, conditions, fileId } = req.body;
        // Enhanced debugging for auth token
        const authToken = req.query.authToken || req.body.authToken;
        (0, logger_1.safeLog)('🔍 Monitoring start request received:', {
            hasSheetId: !!sheetId,
            hasFileId: !!fileId,
            authTokenSource: req.query.authToken ? 'query' : req.body.authToken ? 'body' : 'none',
            authTokenPresent: !!authToken,
            authTokenLength: authToken ? authToken.length : 0,
            totalStoredTokens: authTokens.size,
            requestHeaders: Object.keys(req.headers),
            hasCredentials: req.headers.cookie ? 'yes' : 'no'
        });
        // Get credentials for Google Sheets monitoring
        let userCredentials = null;
        if (!fileId) { // Only for Google Sheets, not uploaded files
            (0, logger_1.safeLog)(`🔍 Monitoring start - Auth token received: ${authToken ? authToken.substring(0, 8) + '...' : 'none'}`);
            (0, logger_1.safeLog)(`🔍 Total stored auth tokens: ${authTokens.size}`);
            if (authToken && authTokens.has(authToken)) {
                const tokenData = authTokens.get(authToken);
                (0, logger_1.safeLog)(`🔍 Token data found:`, {
                    hasCredentials: !!(tokenData && tokenData.googleCredentials),
                    authenticated: tokenData?.authenticated,
                    hasRefreshToken: tokenData?.hasRefreshToken,
                    age: tokenData ? Math.round((Date.now() - tokenData.timestamp) / 1000 / 60) + ' minutes' : 'unknown'
                });
                if (tokenData && tokenData.googleCredentials) {
                    userCredentials = tokenData.googleCredentials;
                    (0, logger_1.safeLog)('🔑 Using stored credentials for monitoring job');
                }
                else {
                    (0, logger_1.safeLog)('❌ No Google credentials found in token data');
                    return res.status(401).json({
                        success: false,
                        error: 'No Google credentials found. Please reconnect to Google Sheets.'
                    });
                }
            }
            else {
                (0, logger_1.safeLog)('❌ Auth token not found or invalid');
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required for Google Sheets monitoring. Please include authToken.'
                });
            }
        }
        // Check if this is for an uploaded file or Google Sheets
        const isUploadedFile = !!fileId;
        if (isUploadedFile) {
            // For uploaded files, require fileId and cellRange
            if (!fileId || !cellRange || !webhookUrl || !frequencyMinutes) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields for file monitoring: fileId, cellRange, webhookUrl, frequencyMinutes'
                });
            }
            // Verify file exists
            const fileData = uploadedFiles.get(fileId);
            if (!fileData) {
                return res.status(404).json({
                    success: false,
                    error: `Uploaded file not found: ${fileId}`
                });
            }
        }
        else {
            // For Google Sheets, require sheetId
            if (!sheetId || !cellRange || !webhookUrl || !frequencyMinutes) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields for Google Sheets monitoring: sheetId, cellRange, webhookUrl, frequencyMinutes'
                });
            }
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
                enabled: true,
                cellRef: condition.cellRef // Pass through the cell reference for range support
            };
        });
        // Set credentials for Google Sheets monitoring
        if (userCredentials) {
            monitoringService.setCredentials(userCredentials);
        }
        const result = await monitoringService.startMonitoring(jobId, sheetId || `file_${fileId}`, // Use fileId as sheetId for uploaded files
        cellRange, frequencyMinutes, webhookUrl, userMention, convertedConditions, fileId);
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
// Test Slack connection endpoint
app.post('/api/slack/test-connection', async (req, res) => {
    try {
        const { webhookUrl } = req.body;
        if (!webhookUrl) {
            return res.status(400).json({ success: false, error: 'Webhook URL required' });
        }
        // Validate Slack webhook URL format
        if (!SlackService_1.SlackService.isValidSlackWebhook(webhookUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Slack webhook URL format. Must start with https://hooks.slack.com/services/'
            });
        }
        const testSlackService = new SlackService_1.SlackService(webhookUrl);
        const result = await testSlackService.testConnection();
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Slack test connection error:', error);
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
// Error handling middleware
app.use((err, req, res, next) => {
    (0, logger_1.safeError)('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Legal pages routes (required for Slack App Store)
app.get('/privacy', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/privacy.html'));
});
app.get('/terms', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/terms.html'));
});
app.get('/support', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/support.html'));
});
app.get('/sub-processors', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/sub-processors.html'));
});
app.get('/beta', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/beta.html'));
});
// Start server only if not being imported
if (!process.env.SKIP_SERVER_START) {
    app.listen(PORT, () => {
        (0, logger_1.safeLog)(`🚀 Sheets Connector Backend Server running on port ${PORT}`);
        (0, logger_1.safeLog)(`📊 API Base URL: http://localhost:${PORT}/api`);
        (0, logger_1.safeLog)(`🔍 Health Check: http://localhost:${PORT}/health`);
    });
}
// File Upload Endpoint
app.post('/api/upload/spreadsheet', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        const file = req.file;
        const fileId = (0, uuid_1.v4)();
        const filePath = file.path;
        const fileName = file.originalname;
        const fileExtension = path_1.default.extname(fileName).toLowerCase();
        (0, logger_1.safeLog)(`Processing uploaded file: ${fileName} (${fileExtension})`);
        let data = [];
        let columns = [];
        try {
            if (fileExtension === '.csv' || fileExtension === '.tsv') {
                // Parse CSV/TSV files
                const delimiter = fileExtension === '.tsv' ? '\t' : ',';
                data = await parseCSVFile(filePath, delimiter);
            }
            else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
                // Parse Excel files
                data = await parseExcelFile(filePath);
            }
            else if (fileExtension === '.ods') {
                // Parse OpenDocument files (using xlsx library which supports ODS)
                data = await parseExcelFile(filePath);
            }
            else {
                throw new Error(`Unsupported file format: ${fileExtension}`);
            }
            if (data.length === 0) {
                throw new Error('File appears to be empty or could not be parsed');
            }
            // Extract columns from first row
            columns = Object.keys(data[0]);
            // Store file data
            const fileData = {
                id: fileId,
                name: fileName,
                type: 'uploaded',
                sheets: ['Sheet1'],
                data: data,
                columns: columns,
                rows: data.length,
                uploadedAt: new Date().toISOString()
            };
            uploadedFiles.set(fileId, fileData);
            (0, logger_1.safeLog)(`Successfully processed file ${fileName}: ${data.length} rows, ${columns.length} columns`);
            res.json({
                success: true,
                fileId: fileId,
                name: fileName,
                sheets: ['Sheet1'],
                data: data.slice(0, 25), // Return first 25 rows for preview (enough for 20 + headers)
                columns: columns,
                rows: data.length
            });
        }
        catch (parseError) {
            (0, logger_1.safeError)('File parsing error:', parseError);
            res.status(400).json({
                success: false,
                error: `Failed to parse file: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`
            });
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
        });
    }
});
// Helper function to parse CSV files
function parseCSVFile(filePath, delimiter = ',') {
    return new Promise((resolve, reject) => {
        const results = [];
        (0, fs_1.createReadStream)(filePath)
            .pipe((0, csv_parser_1.default)({ separator: delimiter }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}
// Helper function to parse Excel files
function parseExcelFile(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
        }
        catch (error) {
            reject(error);
        }
    });
}
// Get uploaded file data
app.get('/api/upload/file/:fileId', (req, res) => {
    try {
        const { fileId } = req.params;
        const fileData = uploadedFiles.get(fileId);
        if (!fileData) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        res.json({
            success: true,
            ...fileData
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get file error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get file data by range (for monitoring)
app.get('/api/upload/file/:fileId/values/:range', (req, res) => {
    try {
        const { fileId, range } = req.params;
        const fileData = uploadedFiles.get(fileId);
        if (!fileData) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        // Parse range (simple implementation for now)
        // Range format: "A1:C10" or "Sheet1!A1:C10"
        const data = fileData.data;
        let values = data;
        // For now, return all data - could implement actual range parsing
        res.json({
            success: true,
            values: values
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get file range error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Google Sheets Authentication Routes
app.get('/api/google/auth-url', async (req, res) => {
    try {
        const authUrl = await googleSheetsService.getAuthUrl();
        res.json({
            success: true,
            authUrl: authUrl
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Failed to get Google auth URL:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate authentication URL'
        });
    }
});
app.get('/api/google/oauth/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
            throw new Error('No authorization code provided');
        }
        await googleSheetsService.handleAuthCallback(code);
        res.send(`
            <html>
                <body>
                    <script>
                        window.close();
                    </script>
                    <p>Authentication successful! You can close this window.</p>
                </body>
            </html>
        `);
    }
    catch (error) {
        (0, logger_1.safeError)('OAuth callback error:', error);
        res.status(500).send(`
            <html>
                <body>
                    <script>
                        window.close();
                    </script>
                    <p>Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}</p>
                </body>
            </html>
        `);
    }
});
app.get('/api/google/auth-status', async (req, res) => {
    try {
        const isAuthenticated = await googleSheetsService.isAuthenticated();
        res.json({
            authenticated: isAuthenticated
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Auth status check error:', error);
        res.json({
            authenticated: false
        });
    }
});
app.get('/api/google/sheets', async (req, res) => {
    try {
        const sheets = await googleSheetsService.listSpreadsheets();
        res.json({
            success: true,
            sheets: sheets
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Failed to list Google Sheets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load Google Sheets'
        });
    }
});
app.get('/api/google/sheets/:sheetId/data', async (req, res) => {
    try {
        const { sheetId } = req.params;
        const data = await googleSheetsService.getSheetData(sheetId);
        res.json({
            success: true,
            data: data.values,
            columns: data.columns,
            rows: data.rows
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Failed to get sheet data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load sheet data'
        });
    }
});
// Export the app for integration with main server (must be at the end after all routes)
module.exports = app;
