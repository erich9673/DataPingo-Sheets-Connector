// Enhanced test server with monitoring and resource management
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Server state tracking
let requestCount = 0;
let activeConnections = 0;
const startTime = Date.now();

console.log('🚀 Starting enhanced test server with monitoring...');

// Configure Express with better settings for Render
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

// Request timeout middleware (30 seconds max)
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.error(`⏰ Request timeout: ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Connection tracking middleware
app.use((req, res, next) => {
  activeConnections++;
  requestCount++;
  
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;
  
  res.on('finish', () => {
    activeConnections--;
  });
  
  res.on('close', () => {
    activeConnections--;
  });
  
  next();
});

// Enhanced logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const memUsage = process.memoryUsage();
    console.log(`${new Date().toISOString()} [${req.requestId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Mem: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB - Active: ${activeConnections}`);
  });
  
  next();
});

// Memory monitoring
const checkMemory = () => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  
  if (heapUsedMB > 400) { // Render Starter plan has 512MB limit
    console.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🗑️ Garbage collection triggered');
    }
  }
};

// Run memory check every 30 seconds
setInterval(checkMemory, 30000);

// Health check endpoint with enhanced metrics
app.get('/health', (req, res) => {
  console.log('🩺 Health endpoint hit');
  const usage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime),
    uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    },
    requests: {
      total: requestCount,
      active: activeConnections
    },
    nodeVersion: process.version,
    platform: process.platform,
    port: PORT
  });
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
  console.log('📍 Ping endpoint hit');
  res.status(200).json({ 
    message: 'pong', 
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Load test endpoint (for testing server limits)
app.get('/load-test', (req, res) => {
  console.log('⚡ Load test endpoint hit');
  const iterations = parseInt(req.query.iterations) || 1000;
  const startTime = Date.now();
  
  // Simulate some CPU work
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.random() * Math.sin(i);
  }
  
  const duration = Date.now() - startTime;
  
  res.json({
    message: 'Load test completed',
    iterations,
    duration: `${duration}ms`,
    result: result.toFixed(6),
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint hit');
  const uptime = process.uptime();
  const usage = process.memoryUsage();
  
  res.send(`
    <html>
      <head>
        <title>DataPingo Sheets Connector Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .status { background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .metrics { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 10px 0; }
          a { color: #0066cc; text-decoration: none; margin-right: 15px; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>DataPingo Sheets Connector - Enhanced Test Server</h1>
        
        <div class="status">
          <h2>✅ Server Status: HEALTHY</h2>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Uptime:</strong> ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s</p>
        </div>
        
        <div class="metrics">
          <h3>Server Metrics</h3>
          <p><strong>Total Requests:</strong> ${requestCount}</p>
          <p><strong>Active Connections:</strong> ${activeConnections}</p>
          <p><strong>Memory Usage:</strong> ${Math.round(usage.heapUsed / 1024 / 1024)}MB / ${Math.round(usage.heapTotal / 1024 / 1024)}MB</p>
          <p><strong>Node.js Version:</strong> ${process.version}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>
        
        <h3>Available Endpoints:</h3>
        <p>
          <a href="/health">🩺 Health Check</a>
          <a href="/ping">📍 Ping Test</a>
          <a href="/load-test">⚡ Load Test</a>
        </p>
        
        <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px;">
          <strong>Note:</strong> This is a diagnostic server for troubleshooting 502 errors on Render.
          Server automatically monitors memory usage and performance metrics.
        </div>
      </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`❌ Error in request ${req.requestId}:`, err);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Enhanced test server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Node.js version: ${process.version}`);
  console.log(`💾 Memory limit awareness: Monitoring enabled`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Server timeout configuration - REDUCED for faster responses
server.timeout = 10000; // 10 seconds (reduced from 30)
server.keepAliveTimeout = 2000; // 2 seconds (reduced from 5)
server.headersTimeout = 3000; // 3 seconds (reduced from 6)

module.exports = app;
