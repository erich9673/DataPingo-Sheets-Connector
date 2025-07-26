// Railway Secure Server - Slack-only version with admin protection
const express = require('express');
const path = require('path');
const fs = require('fs');

// Railway environment setup
const PORT = process.env.PORT || 3000;
console.log('🚂 Starting DataPingo Sheets Connector (Slack-only) on Railway...');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🚂 Railway Port:', PORT);

// Create Express app
const app = express();

// Security headers middleware
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy for admin pages
    if (req.path.includes('admin.html') || req.path.includes('debug')) {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' www.googletagmanager.com; style-src 'self' 'unsafe-inline';");
    }
    
    next();
});

// ⚠️ SECURITY: Protect sensitive admin files with authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'datapingo-admin-2024-secure';
const PROTECTED_FILES = [
    'admin.html',
    'oauth-debug.html', 
    'oauth-debug-simple.html',
    'frontend-debug.html',
    'manual-entry.html',
    'test-auth.html',
    'beta.html'
];

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="DataPingo Admin Area"');
        return res.status(401).send(`
            <html><body style="font-family: Arial; text-align: center; margin-top: 50px;">
                <h2>🔒 DataPingo Admin Access Required</h2>
                <p>This area is protected. Please contact the administrator for access.</p>
                <hr>
                <small>DataPingo Sheets Connector for Slack</small>
            </body></html>
        `);
    }
    
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    if (username === 'admin' && password === ADMIN_PASSWORD) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="DataPingo Admin Area"');
        return res.status(401).send(`
            <html><body style="font-family: Arial; text-align: center; margin-top: 50px;">
                <h2>❌ Invalid Credentials</h2>
                <p>Access denied. Please check your credentials.</p>
                <hr>
                <small>DataPingo Sheets Connector for Slack</small>
            </body></html>
        `);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'DataPingo Sheets Connector for Slack',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'production'
    });
});

// Test endpoint to verify Railway deployment
app.get('/test-railway', (req, res) => {
    res.json({ 
        message: 'DataPingo Sheets Connector for Slack is running on Railway!', 
        timestamp: new Date().toISOString(),
        port: PORT,
        adminProtected: PROTECTED_FILES.length,
        securityEnabled: true
    });
});

// Protect admin files with authentication
PROTECTED_FILES.forEach(filename => {
    app.get(`/${filename}`, requireAdminAuth, (req, res) => {
        const backendPublicPath = path.join(__dirname, 'sheets-connector-backend', 'public', filename);
        if (fs.existsSync(backendPublicPath)) {
            res.sendFile(backendPublicPath);
        } else {
            res.status(404).send(`
                <html><body style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h2>📄 File Not Found</h2>
                    <p>Admin file "${filename}" not found.</p>
                    <hr>
                    <small>DataPingo Sheets Connector for Slack</small>
                </body></html>
            `);
        }
    });
});

// Set up paths
const frontendPath = path.join(__dirname, 'sheets-connector-app', 'dist');
const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');

console.log('🎨 Looking for frontend at:', frontendPath);
console.log('⚙️ Looking for backend at:', backendPath);

// Check if frontend exists
if (fs.existsSync(frontendPath)) {
    console.log('✅ Frontend dist found');
    console.log('📁 Frontend contents:', fs.readdirSync(frontendPath));
    
    // Serve frontend static files (excluding protected files)
    app.use(express.static(frontendPath, {
        index: ['index.html'],
        setHeaders: (res, filePath) => {
            // Block direct access to protected files through static serving
            const filename = path.basename(filePath);
            if (PROTECTED_FILES.includes(filename)) {
                res.status(403);
                throw new Error('Access denied - Protected file');
            }
        }
    }));
    
    console.log('🎨 Frontend served from:', frontendPath);
    console.log('🔒 Protected admin files:', PROTECTED_FILES.join(', '));
} else {
    console.log('❌ Frontend dist not found at:', frontendPath);
    
    // Simple fallback page
    app.get('/', (req, res) => {
        res.send(`
            <html><body style="font-family: Arial; text-align: center; margin-top: 50px;">
                <h1>🚀 DataPingo Sheets Connector for Slack</h1>
                <p>Backend is running, but frontend not built yet.</p>
                <p><a href="/health">Health Check</a> | <a href="/test-railway">Railway Test</a></p>
                <hr>
                <small>Build the frontend with: npm run build</small>
            </body></html>
        `);
    });
}

// Check if backend exists and integrate it
if (fs.existsSync(backendPath)) {
    console.log('✅ Backend dist found');
    console.log('📁 Backend contents:', fs.readdirSync(path.dirname(backendPath)));
    
    try {
        // Load backend middleware
        const cors = require('cors');
        const session = require('express-session');
        
        // Backend middleware setup
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        
        // CORS for API routes
        app.use('/api', cors({
            origin: [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'https://datapingo-sheets-connector-production.up.railway.app',
                /.*\.railway\.app$/
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // Session middleware for API routes
        app.use('/api', session({
            secret: process.env.SESSION_SECRET || 'datapingo-session-secret-' + Math.random(),
            resave: false,
            saveUninitialized: false,
            cookie: { 
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));
        
        // Load and mount backend
        console.log('📦 Loading backend module...');
        
        // Set environment flag to prevent backend from starting its own server
        process.env.SKIP_SERVER_START = 'true';
        
        // Import backend
        const backendModule = require(backendPath);
        
        if (backendModule && backendModule.app) {
            // Mount backend app on /api
            app.use('/api', backendModule.app);
            console.log('✅ Backend API mounted on /api');
        } else if (typeof backendModule === 'function') {
            // If backend exports a function, call it
            const backendApp = backendModule();
            app.use('/api', backendApp);
            console.log('✅ Backend function mounted on /api');
        } else {
            console.log('⚠️ Backend module loaded but no app exported');
        }
        
        console.log('✅ Backend integration complete');
        
    } catch (error) {
        console.error('❌ Error loading backend:', error);
        
        // Fallback API endpoint
        app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'backend_error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }
} else {
    console.log('❌ Backend dist not found at:', backendPath);
    
    // Fallback API endpoints
    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'backend_missing',
            message: 'Backend not built yet',
            timestamp: new Date().toISOString()
        });
    });
}

// Catch-all route for frontend SPA
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <html><body style="font-family: Arial; text-align: center; margin-top: 50px;">
                <h2>📄 Page Not Found</h2>
                <p>The requested page could not be found.</p>
                <p><a href="/">← Back to Home</a></p>
                <hr>
                <small>DataPingo Sheets Connector for Slack</small>
            </body></html>
        `);
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 DataPingo Sheets Connector for Slack running on Railway!');
    console.log('🌐 Port:', PORT);
    console.log('🎨 Frontend: Slack-only interface');
    console.log('⚡ Backend API: /api/*');
    console.log('🔒 Security: Admin files protected');
    console.log('📊 Health Check: /health');
    
    if (process.env.NODE_ENV === 'production') {
        console.log('🔐 Security Note: Set ADMIN_PASSWORD environment variable for admin access');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully');
    process.exit(0);
});
