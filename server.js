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
    
    // Serve frontend static files
    app.use(express.static(frontendPath));
    console.log('� Static files served from:', frontendPath);
    
    // Load backend server logic but mount it on /api
    console.log('�🚀 Loading DataPingo backend API...');
    const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');
    
    if (fs.existsSync(backendPath)) {
      console.log('✅ Backend found, integrating API routes...');
      console.log('📁 Backend dist contents:', fs.readdirSync(path.dirname(backendPath)));
      
      // Since the backend server.ts creates its own app, we need to proxy the API calls
      // Start backend on a different port and proxy to it
      const { spawn } = require('child_process');
      
      // Start backend server on port 3001 (internal)
      const backendProcess = spawn('node', [backendPath], {
        env: { ...process.env, PORT: '3001' },
        stdio: 'inherit'
      });
      
      // Proxy API calls to backend
      const { createProxyMiddleware } = require('http-proxy-middleware');
      
      // Proxy /api routes
      app.use('/api', createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        logLevel: 'debug'
      }));
      
      // Proxy health endpoint directly
      app.use('/health', createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        logLevel: 'debug'
      }));
      
      console.log('🔗 API routes (/api/*) and health endpoint proxied to backend on port 3001');
    }
    
    // Catch-all handler: serve React app for client-side routing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
      }
    });
    
    // Start the combined server
    app.listen(PORT, () => {
      console.log('🚀 DataPingo Sheets Connector running on Railway!');
      console.log('🌐 Port:', PORT);
      console.log('🎨 Frontend: served from dist folder');
      console.log('⚡ Backend API: proxied to port 3001');
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
