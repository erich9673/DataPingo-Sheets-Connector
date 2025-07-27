// DataPingo Sheets Connector - Production Railway Deployment
console.log('🚂 Starting DataPingo Sheets Connector on Railway...');
console.log('📍 Working directory:', process.cwd());
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('📂 Directory contents:', require('fs').readdirSync(process.cwd()));

// Railway-specific port validation
const PORT = process.env.PORT || 3000;
console.log(`🚂 Railway Port: ${PORT}`);

// Add process error handlers for production stability
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Load the main DataPingo Sheets Connector
console.log('🚀 Loading DataPingo Sheets Connector...');

try {
  const path = require('path');
  const fs = require('fs');
  const express = require('express');
  
  // Check for frontend dist folder
  const frontendPath = path.join(__dirname, 'sheets-connector-app', 'dist');
  console.log('🎨 Looking for frontend at:', frontendPath);
  
  if (fs.existsSync(frontendPath)) {
    console.log('✅ Frontend dist found, setting up combined server...');
    console.log('📁 Frontend dist contents:', fs.readdirSync(frontendPath));
    
    // Create Express app to serve both frontend and backend
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
    
    // Simple test endpoint to verify server.js is running
    app.get('/test-server-js', (req, res) => {
      res.json({ 
        message: 'server.js is running on Railway!', 
        timestamp: new Date().toISOString(),
        port: PORT 
      });
    });
    
    // Basic health endpoint (as fallback if backend proxy doesn't work)
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy-frontend', 
        timestamp: new Date().toISOString(),
        port: PORT,
        source: 'frontend-server'
      });
    });
    
    // Debug endpoint accessible from the browser
    app.get('/debug', (req, res) => {
      const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');
      res.json({
        status: 'Frontend server running',
        port: PORT,
        timestamp: new Date().toISOString(),
        frontendPath: frontendPath,
        frontendExists: fs.existsSync(frontendPath),
        backendPath: backendPath,
        backendExists: fs.existsSync(backendPath),
        backendDir: fs.existsSync(path.dirname(backendPath)) ? fs.readdirSync(path.dirname(backendPath)) : 'Backend dir not found',
        environment: process.env.NODE_ENV,
        workingDir: process.cwd()
      });
    });
    
    // ⚠️ SECURITY: Protect sensitive admin files with authentication
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'datapingo-admin-2024';
    const PROTECTED_FILES = [
        'admin.html',
        'oauth-debug.html', 
        'oauth-debug-simple.html',
        'frontend-debug.html',
        'manual-entry.html',
        'test-auth.html'
    ];
    
    // Admin authentication middleware
    function requireAdminAuth(req, res, next) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
            return res.status(401).send('Authentication required');
        }
        
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        
        if (username === 'admin' && password === ADMIN_PASSWORD) {
            next();
        } else {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
            return res.status(401).send('Invalid credentials');
        }
    }
    
    // Protect admin files with authentication
    PROTECTED_FILES.forEach(filename => {
        app.get(`/${filename}`, requireAdminAuth, (req, res) => {
            res.sendFile(path.join(frontendPath, filename));
        });
    });
    
    // Custom static file serving that excludes protected files
    app.use(express.static(frontendPath, {
        index: ['index.html'],
        setHeaders: (res, path) => {
            // Block direct access to protected files through static serving
            const filename = require('path').basename(path);
            if (PROTECTED_FILES.includes(filename)) {
                res.status(403);
                throw new Error('Access denied');
            }
        }
    }));
    console.log('� Static files served from:', frontendPath);
    console.log('🔒 Protected admin files:', PROTECTED_FILES.join(', '));
    
    // Load backend server logic but mount it on /api
    console.log('�🚀 Loading DataPingo backend API...');
    const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');
    
    if (fs.existsSync(backendPath)) {
      console.log('✅ Backend found, integrating directly...');
      console.log('📁 Backend dist contents:', fs.readdirSync(path.dirname(backendPath)));
      
      // Instead of spawning a separate process, let's run the backend logic directly
      // First, set up the required middleware for the backend
      console.log('� Setting up backend middleware...');
      
      const cors = require('cors');
      const session = require('express-session');
      const bodyParser = require('body-parser');
      
      // Add middleware that the backend needs
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));
      
      // CORS for API routes
      app.use('/api', cors({
        origin: [
          'http://localhost:3002',  // Local development
          'http://127.0.0.1:3002',  // Local development
          'https://web-production-aafd.up.railway.app',  // Old Railway URL
          'https://datapingo-sheets-connector-production.up.railway.app',  // Current Railway URL
          /\.railway\.app$/  // Any Railway domain
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
          secure: false,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: 'lax'
        }
      }));
      
      // Load the full backend with all API routes
      try {
        console.log('📦 Loading full backend module...');
        
        // Set environment to prevent the backend from starting its own server
        process.env.SKIP_SERVER_START = 'true';
        
        // Load the backend module and get the Express app
        const backendApp = require(backendPath);
        
        if (backendApp && typeof backendApp.use === 'function') {
          // Mount the backend app at root since routes already have /api prefix
          app.use('/', backendApp);
          console.log('✅ Backend app mounted successfully');
          
          // Test if a specific route exists
          setTimeout(() => {
            console.log('🧪 Testing backend route registration...');
            const routeStack = app._router?.stack || [];
            const routeCount = routeStack.length;
            console.log(`📊 Total routes registered: ${routeCount}`);
          }, 100);
          
        } else {
          console.log('⚠️ Backend did not export an Express app, loading manually...');
          
          // Fallback: require the backend without expecting an export
          require(backendPath);
          console.log('✅ Backend loaded directly');
        }
        
        console.log('✅ Full backend integrated with all API routes');
        
      } catch (error) {
        console.log('⚠️ Backend loading error:', error.message);
        console.log('Stack:', error.stack);
        
        // Fallback: Basic health endpoint
        app.get('/api/health', (req, res) => {
          res.json({ 
            status: 'healthy-fallback', 
            timestamp: new Date().toISOString(),
            source: 'fallback-backend',
            error: error.message
          });
        });
      }
      
      console.log('✅ Backend middleware configured, API routes available');
      
    } else {
      console.log('❌ Backend not found at:', backendPath);
    }
    
    // Catch-all handler: serve React app for client-side routing (but exclude API routes and our endpoints)
    app.get('*', (req, res) => {
      // Only serve the React app for routes that aren't API endpoints or our custom endpoints
      if (!req.path.startsWith('/api/') && !req.path.startsWith('/test-') && req.path !== '/health') {
        res.sendFile(path.join(frontendPath, 'index.html'));
      } else {
        res.status(404).json({ error: 'Endpoint not found', path: req.path });
      }
    });
    
    // Start the combined server
    app.listen(PORT, () => {
      console.log('🚀 DataPingo Sheets Connector running on Railway!');
      console.log('🌐 Port:', PORT);
      console.log('🎨 Frontend: served from dist folder');
      console.log('⚡ Backend API: integrated directly');
    });
    
  } else {
    console.log('❌ Frontend dist not found, loading backend only...');
    const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');
    
    if (fs.existsSync(backendPath)) {
      console.log('✅ Main DataPingo backend found, loading...');
      require(backendPath);
    } else {
      console.error('❌ Main backend not found at:', backendPath);
      console.log('📋 Available files:', fs.readdirSync(__dirname));
      throw new Error('DataPingo backend not found');
    }
  }
} catch (error) {
  console.error('💥 Failed to load DataPingo backend:', error);
  process.exit(1);
}
