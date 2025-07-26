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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const GoogleSheetsService_1 = require("./services/GoogleSheetsService");
const MonitoringService_1 = require("./services/MonitoringService");
const SlackService_1 = require("./services/SlackService");
// Debug: Check if services directory exists before importing TeamsService
console.log('🔍 Debug: Checking services directory...');
try {
    const fs = require('fs');
    const path = require('path');
    const servicesPath = path.join(__dirname, 'services');
    console.log('Services path:', servicesPath);
    if (fs.existsSync(servicesPath)) {
        console.log('✅ Services directory exists');
        const files = fs.readdirSync(servicesPath);
        console.log('Available service files:', files);
    }
    else {
        console.log('❌ Services directory missing!');
    }
}
catch (error) {
    console.log('Debug error:', error.message);
}
const TeamsService_1 = require("./services/TeamsService");
const logger_1 = require("./utils/logger");
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
// Load environment variables
dotenv_1.default.config();
// Environment variable validation and debugging
console.log('🔍 Environment Check at Startup:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || 'NOT SET');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'MISSING');
// Critical environment variables check
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:', missingVars);
    console.error('   Please set these in Railway dashboard or local .env file');
    process.exit(1);
}
console.log('✅ All required environment variables found');
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Admin password protection middleware
const adminPassword = process.env.ADMIN_PASSWORD || '2sNjR4aDz5@y!';
const adminFiles = ['/admin.html', '/oauth-debug.html', '/frontend-debug.html', '/manual-entry.html', '/test-auth.html', '/beta.html'];
app.use((req, res, next) => {
    // Check if this is an admin file
    if (adminFiles.includes(req.path)) {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
            return res.status(401).send('Authentication required');
        }
        const credentials = Buffer.from(auth.slice(6), 'base64').toString().split(':');
        const username = credentials[0];
        const password = credentials[1];
        if (username !== 'admin' || password !== adminPassword) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
            return res.status(401).send('Invalid credentials');
        }
    }
    // Add security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
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
let monitoringService;
try {
    googleSheetsService = new GoogleSheetsService_1.GoogleSheetsService();
    monitoringService = new MonitoringService_1.MonitoringService(googleSheetsService, uploadedFiles);
    (0, logger_1.safeLog)('✅ Services initialized successfully');
}
catch (error) {
    (0, logger_1.safeError)('⚠️ Service initialization failed, continuing with basic server:', error);
    // Create minimal fallback services
    googleSheetsService = null;
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
// Slack installation endpoint for App Store distribution
app.get('/slack/install', (req, res) => {
    try {
        (0, logger_1.safeLog)('🔗 [SLACK INSTALL] Slack install endpoint accessed');
        // Get the team ID if provided by Slack
        const teamId = req.query.team;
        // Build Google OAuth URL with slack_install state
        const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
            (process.env.NODE_ENV === 'production' ?
                'https://web-production-aafd.up.railway.app/auth/callback' :
                'http://localhost:3001/auth/callback');
        const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets.readonly')}&` +
            `access_type=offline&` +
            `prompt=consent&` +
            `state=slack_install` +
            (teamId ? `&team=${teamId}` : '');
        (0, logger_1.safeLog)(`🔗 [SLACK INSTALL] Redirecting to Google OAuth with state=slack_install`);
        // Redirect to Google OAuth with slack_install state
        res.redirect(authUrl);
    }
    catch (error) {
        (0, logger_1.safeError)('❌ [SLACK INSTALL ERROR]:', error);
        res.status(500).send(`
            <html>
                <body>
                    <h2>❌ Installation Error</h2>
                    <p>Sorry, there was an error starting the installation process.</p>
                    <p>Please try again or contact support.</p>
                </body>
            </html>
        `);
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
            // Get user profile to capture Gmail address
            const userProfile = await googleSheetsService.getUserProfile();
            const userEmail = userProfile.success ? userProfile.email : null;
            (0, logger_1.safeLog)(`📧 Captured user email: ${userEmail ? userEmail.substring(0, 5) + '***' : 'none'}`);
            // Generate auth token for frontend authentication
            const authToken = crypto_1.default.randomBytes(16).toString("hex");
            // Store credentials for this session/token
            const credentials = googleSheetsService.getCredentials();
            authTokens.set(authToken, {
                timestamp: Date.now(),
                authenticated: true,
                hasRefreshToken: true,
                googleCredentials: credentials,
                email: userEmail // Store Gmail address for CSV exports
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
            // Determine the correct frontend URL based on environment
            const frontendUrl = process.env.NODE_ENV === 'production'
                ? 'https://web-production-aafd.up.railway.app'
                : 'http://localhost:3002';
            (0, logger_1.safeLog)(`🔄 OAuth redirect to: ${frontendUrl}/?auth=success&authToken=${authToken.substring(0, 8)}...`);
            // Redirect back to frontend with success
            res.redirect(`${frontendUrl}/?auth=success&authToken=${authToken}`);
        }
        else {
            const frontendUrl = process.env.NODE_ENV === 'production'
                ? 'https://web-production-aafd.up.railway.app'
                : 'http://localhost:3002';
            res.redirect(`${frontendUrl}/?auth=error&message=` + encodeURIComponent(result.error || 'Authentication failed'));
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Google OAuth callback error:', error);
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? 'https://web-production-aafd.up.railway.app'
            : 'http://localhost:3002';
        res.redirect(`${frontendUrl}/?auth=error&message=` + encodeURIComponent('Authentication failed'));
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
            // Get user profile to capture Gmail address
            const userProfile = await googleSheetsService.getUserProfile();
            const userEmail = userProfile.success ? userProfile.email : null;
            (0, logger_1.safeLog)(`📧 Captured user email: ${userEmail ? userEmail.substring(0, 5) + '***' : 'none'}`);
            // Generate auth token for frontend authentication
            const authToken = crypto_1.default.randomBytes(16).toString("hex");
            // Store credentials for this session/token
            const credentials = googleSheetsService.getCredentials();
            authTokens.set(authToken, {
                timestamp: Date.now(),
                authenticated: true,
                hasRefreshToken: true,
                googleCredentials: credentials,
                email: userEmail // Store Gmail address for CSV exports
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
            (0, logger_1.safeLog)('🔗 [SLACK OAUTH] Processing Slack app installation OAuth callback');
            // For Slack App Store installations, redirect back to Slack
            if (code) {
                // Process the authorization code
                try {
                    const result = await googleSheetsService.setAuthCode(code);
                    if (result.success) {
                        (0, logger_1.safeLog)('✅ [SLACK OAUTH] Google OAuth successful, redirecting back to Slack');
                        // Redirect back to Slack with success
                        const teamParam = req.query.team ? `&team=${req.query.team}` : '';
                        return res.redirect(302, `https://slack.com/app_redirect?app=A095BR1R14J${teamParam}`);
                    }
                }
                catch (error) {
                    (0, logger_1.safeError)('❌ [SLACK OAUTH] OAuth processing error:', error);
                }
            }
            // Redirect back to Slack with error
            (0, logger_1.safeError)('❌ [SLACK OAUTH] Failed to process authorization, redirecting to Slack with error');
            const teamParam = req.query.team ? `&team=${req.query.team}` : '';
            return res.redirect(302, `https://slack.com/app_redirect?app=A095BR1R14J&error=oauth_error${teamParam}`);
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
                email: data.email || 'No email captured', // Gmail address for CSV export
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
// Simple admin test endpoint
app.get('/api/admin/test', (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Admin routes are working',
            timestamp: new Date().toISOString(),
            authTokensCount: authTokens.size,
            monitoringServiceExists: !!monitoringService
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get all monitoring jobs endpoint (admin only)
app.get('/api/admin/monitoring-jobs', (req, res) => {
    try {
        const allJobs = monitoringService.getActiveJobs();
        (0, logger_1.safeLog)(`🔍 [ADMIN] Getting all monitoring jobs: ${allJobs.length} total jobs found`);
        // Log basic info about each job for debugging
        allJobs.forEach((job, index) => {
            (0, logger_1.safeLog)(`   Job ${index + 1}: ${job.spreadsheetName} (User: ${job.userEmail || job.userId || 'Unknown'}) - Active: ${job.isActive}`);
        });
        const jobsData = allJobs.map(job => {
            const ageMinutes = Math.floor((Date.now() - job.createdAt.getTime()) / (1000 * 60));
            const lastCheckedMinutes = job.lastChecked
                ? Math.floor((Date.now() - job.lastChecked.getTime()) / (1000 * 60))
                : null;
            return {
                id: job.id.substring(0, 12) + '...', // Truncated for privacy
                fullJobId: job.id, // Add full ID for debugging
                spreadsheetName: job.spreadsheetName || 'Unknown',
                cellRange: job.cellRange,
                frequencyMinutes: job.frequencyMinutes,
                sourceType: job.sourceType || 'google_sheets',
                webhookUrl: job.webhookUrl.substring(0, 50) + '...', // Truncated for security
                userEmail: job.userEmail || 'No email',
                userId: job.userId ? job.userId.substring(0, 8) + '...' : 'No userId', // Add userId for debugging
                userMention: job.userMention || 'None',
                conditions: job.conditions || [],
                conditionsCount: (job.conditions || []).length,
                conditionTypes: (job.conditions || []).map(c => c.type).join(', '),
                isActive: job.isActive,
                hasInterval: !!job.intervalId,
                createdAt: job.createdAt.toISOString(),
                createdAgo: `${ageMinutes} minutes ago`,
                lastChecked: job.lastChecked ? job.lastChecked.toISOString() : 'Never',
                lastCheckedAgo: lastCheckedMinutes ? `${lastCheckedMinutes} minutes ago` : 'Never',
                ageMinutes: ageMinutes
            };
        });
        // Sort by most recent first
        jobsData.sort((a, b) => a.ageMinutes - b.ageMinutes);
        (0, logger_1.safeLog)(`📋 [ADMIN] Returning ${jobsData.length} jobs to admin dashboard`);
        res.json({
            success: true,
            jobs: jobsData,
            totalJobs: jobsData.length,
            activeJobs: jobsData.filter(job => job.isActive).length,
            googleSheetsJobs: jobsData.filter(job => job.sourceType === 'google_sheets').length,
            uploadedFileJobs: jobsData.filter(job => job.sourceType === 'uploaded_file').length,
            serverTime: new Date().toISOString()
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Get monitoring jobs error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get all users endpoint (admin only) - combines active sessions + users with monitoring jobs
app.get('/api/admin/all-users', (req, res) => {
    try {
        // Get all current active sessions
        const activeSessions = Array.from(authTokens.entries()).map(([tokenId, data]) => {
            const ageMinutes = Math.floor((Date.now() - data.timestamp) / (1000 * 60));
            return {
                type: 'active_session',
                tokenId: tokenId.substring(0, 8) + '...',
                email: data.email || 'No email captured',
                userId: null,
                loginTime: new Date(data.timestamp).toISOString(),
                lastActive: `${ageMinutes} minutes ago`,
                ageMinutes: ageMinutes,
                authenticated: data.authenticated,
                hasRefreshToken: data.hasRefreshToken,
                monitoringJobs: 0 // Will be calculated below
            };
        });
        // Get all monitoring jobs to extract users
        const allJobs = monitoringService.getActiveJobs();
        // Extract unique users from monitoring jobs
        const usersFromJobs = new Map();
        allJobs.forEach(job => {
            const userKey = job.userEmail || job.userId;
            if (userKey) {
                if (!usersFromJobs.has(userKey)) {
                    usersFromJobs.set(userKey, {
                        type: 'monitoring_user',
                        email: job.userEmail || 'No email',
                        userId: job.userId ? job.userId.substring(0, 8) + '...' : null,
                        fullUserId: job.userId, // For matching purposes
                        loginTime: job.createdAt.toISOString(),
                        lastActive: job.lastChecked ? job.lastChecked.toISOString() : 'Never checked',
                        ageMinutes: Math.floor((Date.now() - job.createdAt.getTime()) / (1000 * 60)),
                        authenticated: true, // Must be authenticated to create jobs
                        hasRefreshToken: true, // Must have token to create jobs
                        monitoringJobs: 0,
                        activeJobs: 0,
                        inactiveJobs: 0,
                        isCurrentlyActive: false
                    });
                }
                const userData = usersFromJobs.get(userKey);
                userData.monitoringJobs++;
                if (job.isActive) {
                    userData.activeJobs++;
                }
                else {
                    userData.inactiveJobs++;
                }
            }
        });
        // Calculate monitoring job counts for active sessions
        activeSessions.forEach(session => {
            if (session.email && session.email !== 'No email captured') {
                // Find the full token ID from the truncated version
                const fullTokenId = Array.from(authTokens.keys()).find(tokenId => tokenId.startsWith(session.tokenId.replace('...', '')));
                const jobCount = allJobs.filter(job => job.userEmail === session.email ||
                    (job.userId && fullTokenId && job.userId === fullTokenId)).length;
                session.monitoringJobs = jobCount;
            }
        });
        // Mark users from jobs as currently active if they have an active session
        const activeEmails = new Set(activeSessions.map(s => s.email).filter(e => e !== 'No email captured'));
        usersFromJobs.forEach((userData, userKey) => {
            if (userData.email && activeEmails.has(userData.email)) {
                userData.isCurrentlyActive = true;
            }
        });
        // Combine all users
        const allUsers = [
            ...activeSessions,
            ...Array.from(usersFromJobs.values()).filter(user => !user.isCurrentlyActive)
        ];
        // Sort by most recent activity
        allUsers.sort((a, b) => a.ageMinutes - b.ageMinutes);
        (0, logger_1.safeLog)(`🔍 [ADMIN] Getting all users: ${allUsers.length} total users (${activeSessions.length} active sessions, ${usersFromJobs.size} from monitoring jobs)`);
        res.json({
            success: true,
            users: allUsers,
            stats: {
                totalUsers: allUsers.length,
                activeSessionUsers: activeSessions.length,
                monitoringJobUsers: usersFromJobs.size,
                usersWithJobs: allUsers.filter(u => u.monitoringJobs > 0).length,
                totalMonitoringJobs: allJobs.length,
                activeJobs: allJobs.filter(j => j.isActive).length
            }
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Failed to get all users:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Verify auth token endpoint (for frontend token validation)
app.post('/api/auth/verify-token', async (req, res) => {
    try {
        const { authToken } = req.body;
        if (!authToken) {
            return res.status(400).json({
                success: false,
                error: 'Auth token required'
            });
        }
        // Check if token exists in our auth tokens map
        const tokenData = authTokens.get(authToken);
        if (!tokenData) {
            return res.status(401).json({
                success: false,
                error: 'Invalid auth token'
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
        // Get Google auth status using stored credentials
        let googleAuthStatus = { authenticated: false, hasRefreshToken: false };
        if (tokenData.googleCredentials) {
            try {
                // Temporarily set credentials to check status
                googleSheetsService.setCredentials(tokenData.googleCredentials);
                googleAuthStatus = await googleSheetsService.getAuthStatus();
            }
            catch (error) {
                (0, logger_1.safeError)('Error checking Google auth status:', error);
            }
        }
        res.json({
            success: true,
            authenticated: tokenData.authenticated && googleAuthStatus.authenticated,
            hasRefreshToken: tokenData.hasRefreshToken,
            email: tokenData.email,
            googleAuth: googleAuthStatus,
            tokenAge: Math.floor((Date.now() - tokenData.timestamp) / (1000 * 60)) // minutes
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Verify token error:', error);
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
        // Check if token is expired (24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (tokenData.timestamp < oneDayAgo) {
            authTokens.delete(authToken);
            return res.status(401).json({
                success: false,
                error: 'Auth token expired'
            });
        }
        // Test Google Sheets service
        const googleStatus = await googleSheetsService.getAuthStatus();
        res.json({
            success: true,
            tokenValid: true,
            authenticated: tokenData.authenticated,
            hasRefreshToken: tokenData.hasRefreshToken,
            googleSheetsStatus: googleStatus
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
// Alternative endpoint name for frontend compatibility
app.get('/api/sheets/spreadsheets', async (req, res) => {
    try {
        const { email, authToken } = req.query;
        // Use the same logic as /api/sheets/list
        if (email && approvedUsers.has(email)) {
            const status = await googleSheetsService.getAuthStatus();
            if (!status.authenticated) {
                return res.json({
                    success: false,
                    error: 'Google authentication required for sheet access',
                    needsGoogleAuth: true
                });
            }
        }
        // Set credentials if authToken provided
        if (authToken) {
            const tokenData = authTokens.get(authToken);
            if (tokenData && tokenData.googleCredentials) {
                googleSheetsService.setCredentials(tokenData.googleCredentials);
            }
        }
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
        // Clear the global GoogleSheetsService credentials (but keep other users' tokens)
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
            clearedTokens: authToken ? 1 : 0
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
        // Get credentials and user email for Google Sheets monitoring
        let userCredentials = null;
        let userEmail = null;
        if (!fileId) { // Only for Google Sheets, not uploaded files
            (0, logger_1.safeLog)(`🔍 Monitoring start - Auth token received: ${authToken ? authToken.substring(0, 8) + '...' : 'none'}`);
            (0, logger_1.safeLog)(`🔍 Total stored auth tokens: ${authTokens.size}`);
            if (authToken && authTokens.has(authToken)) {
                const tokenData = authTokens.get(authToken);
                (0, logger_1.safeLog)(`🔍 Token data found:`, {
                    hasCredentials: !!(tokenData && tokenData.googleCredentials),
                    authenticated: tokenData?.authenticated,
                    hasRefreshToken: tokenData?.hasRefreshToken,
                    hasEmail: !!(tokenData && tokenData.email),
                    age: tokenData ? Math.round((Date.now() - tokenData.timestamp) / 1000 / 60) + ' minutes' : 'unknown'
                });
                if (tokenData && tokenData.googleCredentials) {
                    userCredentials = tokenData.googleCredentials;
                    userEmail = tokenData.email; // Get user email for persistent job association
                    (0, logger_1.safeLog)('🔑 Using stored credentials for monitoring job');
                    (0, logger_1.safeLog)(`📧 User email for job: ${userEmail ? userEmail.substring(0, 5) + '***' : 'none'}`);
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
        const jobId = crypto_1.default.randomBytes(16).toString("hex");
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
        cellRange, frequencyMinutes, webhookUrl, userMention, convertedConditions, fileId, authToken, // Pass authToken as userId for backward compatibility
        userEmail, // Pass userEmail for persistent job association
        userCredentials // Pass user credentials for persistent access
        );
        if (result.success) {
            // Save jobs to persistence after successful creation
            saveJobsToPersistence();
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
        // Check for auth token to filter jobs by user
        const authToken = req.query.authToken || req.headers['x-auth-token'];
        let jobs;
        let userEmail;
        if (authToken) {
            // Get user email from auth token for persistent job association
            const tokenData = authTokens.get(authToken);
            if (tokenData && tokenData.email) {
                userEmail = tokenData.email;
            }
            // Filter jobs by current user (both auth token and email)
            jobs = monitoringService.getActiveJobsForCurrentUser(authToken, userEmail);
            const emailInfo = userEmail ? ` (${userEmail.substring(0, 5)}***)` : '';
            (0, logger_1.safeLog)(`📋 Returning ${jobs.length} monitoring jobs for user: ${authToken.substring(0, 8)}...${emailInfo}`);
        }
        else {
            // No auth token provided - return empty list for security
            jobs = [];
            (0, logger_1.safeLog)('⚠️ No auth token provided for /api/monitoring/jobs - returning empty list');
        }
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
            // Intentionally exclude intervalId, currentValues, userId, and userEmail for security
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
        const authToken = req.query.authToken || req.headers['x-auth-token'];
        const job = monitoringService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        // Check if the job belongs to the requesting user
        if (authToken) {
            const tokenData = authTokens.get(authToken);
            const userEmail = tokenData && tokenData.email;
            // Check if job belongs to user (by auth token or email)
            const jobBelongsToUser = job.userId === authToken ||
                (userEmail && job.userEmail === userEmail);
            if (!jobBelongsToUser) {
                return res.status(403).json({ success: false, error: 'Access denied: Job belongs to another user' });
            }
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
        const authToken = req.query.authToken || req.headers['x-auth-token'];
        const job = monitoringService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        // Check if the job belongs to the requesting user
        if (authToken) {
            const tokenData = authTokens.get(authToken);
            const userEmail = tokenData && tokenData.email;
            // Check if job belongs to user (by auth token or email)
            const jobBelongsToUser = job.userId === authToken ||
                (userEmail && job.userEmail === userEmail);
            if (!jobBelongsToUser) {
                return res.status(403).json({ success: false, error: 'Access denied: Job belongs to another user' });
            }
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
        const authToken = req.query.authToken || req.headers['x-auth-token'];
        // Check if job exists and belongs to user before stopping
        const job = monitoringService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        // Check if the job belongs to the requesting user
        if (authToken) {
            const tokenData = authTokens.get(authToken);
            const userEmail = tokenData && tokenData.email;
            // Check if job belongs to user (by auth token or email)
            const jobBelongsToUser = job.userId === authToken ||
                (userEmail && job.userEmail === userEmail);
            if (!jobBelongsToUser) {
                return res.status(403).json({ success: false, error: 'Access denied: Job belongs to another user' });
            }
        }
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
        const authToken = req.query.authToken || req.headers['x-auth-token'];
        if (!authToken) {
            return res.status(400).json({ success: false, error: 'Auth token required to stop user jobs' });
        }
        // Get user email for persistent job identification
        const tokenData = authTokens.get(authToken);
        const userEmail = tokenData && tokenData.email;
        // Get user's jobs (both current session and previous sessions) and stop them individually
        const userJobs = monitoringService.getActiveJobsForCurrentUser(authToken, userEmail);
        let stoppedCount = 0;
        for (const job of userJobs) {
            try {
                await monitoringService.stopMonitoring(job.id);
                stoppedCount++;
            }
            catch (error) {
                (0, logger_1.safeError)(`Error stopping job ${job.id}:`, error);
            }
        }
        const emailInfo = userEmail ? ` (${userEmail.substring(0, 5)}***)` : '';
        res.json({
            success: true,
            message: `All user monitoring jobs stopped`,
            stoppedCount: stoppedCount,
            totalUserJobs: userJobs.length,
            userInfo: `${authToken.substring(0, 8)}...${emailInfo}`
        });
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
// Test Teams connection endpoint
app.post('/api/teams/test-connection', async (req, res) => {
    try {
        const { webhookUrl } = req.body;
        if (!webhookUrl) {
            return res.status(400).json({ success: false, error: 'Webhook URL required' });
        }
        const result = await TeamsService_1.TeamsService.testConnection(webhookUrl);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.safeError)('Teams test connection error:', error);
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
// Environment check endpoint for debugging
app.get('/api/env-check', (req, res) => {
    const envStatus = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
        timestamp: new Date().toISOString(),
        isProduction: process.env.NODE_ENV === 'production'
    };
    res.json(envStatus);
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
    app.listen(PORT, async () => {
        (0, logger_1.safeLog)(`🚀 Sheets Connector Backend Server running on port ${PORT}`);
        (0, logger_1.safeLog)(`📊 API Base URL: http://localhost:${PORT}/api`);
        (0, logger_1.safeLog)(`🔍 Health Check: http://localhost:${PORT}/health`);
        (0, logger_1.safeLog)(`🔧 Environment: ${process.env.NODE_ENV}`);
        (0, logger_1.safeLog)(`📂 Working directory: ${process.cwd()}`);
        // Load persisted monitoring jobs after server starts
        await loadPersistedJobs();
        // Clean up any duplicate jobs after loading
        cleanupDuplicateJobs();
        // Set up periodic job persistence saving
        setInterval(() => {
            saveJobsToPersistence();
        }, 10 * 60 * 1000); // Save every 10 minutes
    });
}
else {
    (0, logger_1.safeLog)(`⏭️ Skipping server start due to SKIP_SERVER_START flag`);
    (0, logger_1.safeLog)(`📦 Backend app exported for integration`);
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
        const fileId = crypto_1.default.randomBytes(16).toString("hex");
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
        fs_1.default.createReadStream(filePath)
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
// Email capture endpoint - Simple workaround for immediate Gmail address capture
app.get('/api/auth/capture-email', async (req, res) => {
    try {
        const authToken = req.headers.authorization?.replace('Bearer ', '') || req.query.authToken;
        if (!authToken || !authTokens.has(authToken)) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated. Please provide valid authToken.'
            });
        }
        // Check if user has the necessary OAuth permissions
        const credentials = googleSheetsService.getCredentials();
        if (!credentials || !credentials.access_token) {
            return res.status(401).json({
                success: false,
                error: 'No valid Google credentials. Please re-authenticate.'
            });
        }
        // Get user profile using Google OAuth2 API directly
        const { google } = require('googleapis');
        const oauth2 = google.oauth2({ version: 'v2', auth: googleSheetsService.getAuth() });
        const response = await oauth2.userinfo.get();
        const userEmail = response.data.email;
        const userName = response.data.name;
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'Unable to retrieve email. Please ensure you granted email permissions during login.'
            });
        }
        // Update the auth token entry with email
        const tokenData = authTokens.get(authToken);
        if (tokenData) {
            tokenData.email = userEmail;
            authTokens.set(authToken, tokenData);
            (0, logger_1.safeLog)(`📧 Email captured for token ${authToken.substring(0, 8)}...: ${userEmail.substring(0, 5)}***`);
        }
        res.json({
            success: true,
            email: userEmail,
            name: userName,
            message: 'Gmail address captured successfully! It will now appear in admin exports.'
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Email capture error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture email'
        });
    }
});
// Environment debug endpoint for Railway deployment
app.get('/api/debug/env', (req, res) => {
    const envInfo = {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        autoApproveUsers: process.env.AUTO_APPROVE_USERS,
        currentUrl: `${req.protocol}://${req.get('host')}`,
        headers: {
            host: req.get('host'),
            origin: req.get('origin'),
            referer: req.get('referer')
        }
    };
    (0, logger_1.safeLog)('🔍 Environment debug requested:', envInfo);
    res.json(envInfo);
});
// Authentication status endpoint
app.get('/api/debug/auth', (req, res) => {
    const authToken = req.query.authToken;
    const debugInfo = {
        authTokenProvided: !!authToken,
        authTokenLength: authToken ? authToken.length : 0,
        authTokenPreview: authToken ? authToken.substring(0, 8) + '...' : null,
        totalStoredTokens: authTokens.size,
        tokenExists: authToken ? authTokens.has(authToken) : false,
        tokenData: null
    };
    if (authToken && authTokens.has(authToken)) {
        const tokenData = authTokens.get(authToken);
        debugInfo.tokenData = {
            authenticated: tokenData?.authenticated,
            hasGoogleCredentials: !!(tokenData?.googleCredentials),
            hasEmail: !!(tokenData?.email),
            email: tokenData?.email ? tokenData.email.substring(0, 5) + '***' : null,
            timestamp: tokenData?.timestamp,
            age: tokenData ? Math.round((Date.now() - tokenData.timestamp) / 1000 / 60) + ' minutes' : null
        };
    }
    res.json(debugInfo);
});
// Manual monitoring check endpoint for debugging
app.post('/api/monitoring/check', async (req, res) => {
    try {
        const authToken = req.query.authToken || req.body.authToken;
        if (!authToken) {
            return res.status(401).json({
                success: false,
                error: 'Auth token required for monitoring check'
            });
        }
        const activeJobs = monitoringService.getActiveJobs();
        const userJobs = monitoringService.getActiveJobsForCurrentUser(authToken);
        (0, logger_1.safeLog)(`🧪 Manual monitoring check requested by ${authToken.substring(0, 8)}...`);
        (0, logger_1.safeLog)(`   Total active jobs: ${activeJobs.length}`);
        (0, logger_1.safeLog)(`   User jobs: ${userJobs.length}`);
        if (userJobs.length === 0) {
            return res.json({
                success: true,
                message: 'No active monitoring jobs found for user',
                totalJobs: activeJobs.length,
                userJobs: 0
            });
        }
        // Manually check each user job
        const results = [];
        for (const job of userJobs) {
            try {
                (0, logger_1.safeLog)(`🔍 Manually checking job ${job.id} (${job.spreadsheetName})`);
                const checkResult = await monitoringService.checkForChangesPublic(job);
                results.push({
                    jobId: job.id,
                    spreadsheet: job.spreadsheetName,
                    cellRange: job.cellRange,
                    lastChecked: job.lastChecked,
                    result: checkResult
                });
            }
            catch (error) {
                (0, logger_1.safeError)(`Error checking job ${job.id}:`, error);
                results.push({
                    jobId: job.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        res.json({
            success: true,
            message: 'Manual monitoring check completed',
            totalJobs: activeJobs.length,
            userJobs: userJobs.length,
            results
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Manual monitoring check error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Real-time monitoring status endpoint
app.get('/api/monitoring/status', (req, res) => {
    try {
        const authToken = req.query.authToken;
        if (!authToken) {
            return res.status(401).json({
                success: false,
                error: 'Auth token required'
            });
        }
        const activeJobs = monitoringService.getActiveJobs();
        const userJobs = monitoringService.getActiveJobsForCurrentUser(authToken);
        const status = {
            totalActiveJobs: activeJobs.length,
            userActiveJobs: userJobs.length,
            jobs: userJobs.map(job => ({
                id: job.id,
                spreadsheetName: job.spreadsheetName,
                cellRange: job.cellRange,
                frequencyMinutes: job.frequencyMinutes,
                isActive: job.isActive,
                hasInterval: !!job.intervalId,
                lastChecked: job.lastChecked,
                sourceType: job.sourceType,
                webhookUrl: job.webhookUrl.substring(0, 50) + '...',
                conditions: job.conditions,
                createdAt: job.createdAt
            })),
            serverTime: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
        (0, logger_1.safeLog)(`📊 Monitoring status requested by ${String(authToken).substring(0, 8)}...`);
        (0, logger_1.safeLog)(`   Active jobs: ${status.totalActiveJobs}, User jobs: ${status.userActiveJobs}`);
        res.json({
            success: true,
            status
        });
    }
    catch (error) {
        (0, logger_1.safeError)('Error getting monitoring status:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Clean up duplicate monitoring jobs
const cleanupDuplicateJobs = () => {
    try {
        const activeJobs = monitoringService.getActiveJobs();
        (0, logger_1.safeLog)(`🧹 Checking for duplicate jobs among ${activeJobs.length} active jobs...`);
        const seenJobs = new Map();
        const duplicatesToRemove = [];
        for (const job of activeJobs) {
            const key = `${job.sheetId}:${job.cellRange}:${job.webhookUrl}:${job.userEmail || job.userId}`;
            if (seenJobs.has(key)) {
                // This is a duplicate
                duplicatesToRemove.push(job.id);
                (0, logger_1.safeLog)(`🗑️ Found duplicate job: ${job.id} (${job.spreadsheetName})`);
            }
            else {
                seenJobs.set(key, job.id);
            }
        }
        // Remove duplicates
        if (duplicatesToRemove.length > 0) {
            (0, logger_1.safeLog)(`🧹 Removing ${duplicatesToRemove.length} duplicate jobs...`);
            for (const jobId of duplicatesToRemove) {
                monitoringService.stopMonitoring(jobId);
            }
            // Save the cleaned state
            saveJobsToPersistence();
            (0, logger_1.safeLog)(`✅ Cleaned up ${duplicatesToRemove.length} duplicate jobs`);
        }
        else {
            (0, logger_1.safeLog)(`✅ No duplicate jobs found`);
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Error cleaning up duplicate jobs:', error);
    }
};
// Job persistence file path - Use absolute path that works on Railway
const JOBS_PERSISTENCE_FILE = process.env.NODE_ENV === 'production'
    ? '/tmp/active-jobs.json' // Railway ephemeral storage
    : path_1.default.join(__dirname, '../data/active-jobs.json');
// Ensure data directory exists
const dataDir = path_1.default.dirname(JOBS_PERSISTENCE_FILE);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
    (0, logger_1.safeLog)(`📁 Created data directory: ${dataDir}`);
}
// Load persisted jobs on server start
const loadPersistedJobs = async () => {
    try {
        (0, logger_1.safeLog)(`📂 Checking for persisted jobs at: ${JOBS_PERSISTENCE_FILE}`);
        if (fs_1.default.existsSync(JOBS_PERSISTENCE_FILE)) {
            const data = fs_1.default.readFileSync(JOBS_PERSISTENCE_FILE, 'utf8');
            (0, logger_1.safeLog)(`📄 Raw persistence file content: ${data.substring(0, 200)}...`);
            const persistedJobs = JSON.parse(data);
            (0, logger_1.safeLog)(`📂 Loading ${persistedJobs.length} persisted monitoring jobs...`);
            for (const jobData of persistedJobs) {
                try {
                    (0, logger_1.safeLog)(`🔄 Restoring job: ${jobData.id} (${jobData.spreadsheetName})`);
                    // Restart the monitoring job
                    const result = await monitoringService.startMonitoring(jobData.id, jobData.sheetId, jobData.cellRange, jobData.frequencyMinutes, jobData.webhookUrl, jobData.userMention, jobData.conditions, jobData.fileId, jobData.userId, jobData.userEmail, jobData.userCredentials);
                    if (result.success) {
                        (0, logger_1.safeLog)(`✅ Restored monitoring job: ${jobData.id} (${jobData.spreadsheetName})`);
                    }
                    else {
                        (0, logger_1.safeError)(`❌ Failed to restore job ${jobData.id}:`, result.error);
                    }
                }
                catch (error) {
                    (0, logger_1.safeError)(`Error restoring job ${jobData.id}:`, error);
                }
            }
        }
        else {
            (0, logger_1.safeLog)(`📂 No persisted jobs file found at ${JOBS_PERSISTENCE_FILE}, starting fresh`);
        }
    }
    catch (error) {
        (0, logger_1.safeError)('Error loading persisted jobs:', error);
    }
};
// Save active jobs to persistence file
const saveJobsToPersistence = () => {
    try {
        const activeJobs = monitoringService.getActiveJobs();
        (0, logger_1.safeLog)(`💾 Saving ${activeJobs.length} active jobs to persistence...`);
        // Remove duplicates based on sheetId, cellRange, and webhookUrl
        const uniqueJobs = new Map();
        const jobsToSave = [];
        for (const job of activeJobs) {
            const key = `${job.sheetId}:${job.cellRange}:${job.webhookUrl}:${job.userEmail || job.userId}`;
            if (!uniqueJobs.has(key)) {
                uniqueJobs.set(key, true);
                jobsToSave.push({
                    id: job.id,
                    sheetId: job.sheetId,
                    cellRange: job.cellRange,
                    frequencyMinutes: job.frequencyMinutes,
                    webhookUrl: job.webhookUrl,
                    userMention: job.userMention,
                    conditions: job.conditions,
                    fileId: job.fileId,
                    userId: job.userId,
                    userEmail: job.userEmail,
                    userCredentials: job.userCredentials,
                    spreadsheetName: job.spreadsheetName,
                    sourceType: job.sourceType,
                    createdAt: job.createdAt
                });
            }
            else {
                (0, logger_1.safeLog)(`🚫 Skipping duplicate job: ${job.id} (${job.spreadsheetName})`);
            }
        }
        (0, logger_1.safeLog)(`🔄 Filtered ${activeJobs.length} jobs down to ${jobsToSave.length} unique jobs`);
        const jsonData = JSON.stringify(jobsToSave, null, 2);
        fs_1.default.writeFileSync(JOBS_PERSISTENCE_FILE, jsonData);
        (0, logger_1.safeLog)(`💾 Saved ${jobsToSave.length} unique jobs to ${JOBS_PERSISTENCE_FILE}`);
        (0, logger_1.safeLog)(`📄 Persistence data: ${jsonData.substring(0, 200)}...`);
    }
    catch (error) {
        (0, logger_1.safeError)('Error saving jobs to persistence:', error);
    }
};
// Export the app for integration with main server (must be at the end after all routes)
module.exports = app;
