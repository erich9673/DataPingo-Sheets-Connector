// DataPingo Sheets Connector - Railway Deployment Debug Version
console.log('🚂 Starting DataPingo Sheets Connector on Railway...');
console.log('📍 Working directory:', process.cwd());
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('📂 Directory contents:', require('fs').readdirSync(process.cwd()));

// Railway-specific port validation
const PORT = process.env.PORT || 3000;
console.log(`🚂 Railway Port: ${PORT}`);

const express = require('express');
const app = express();

// Simple test endpoint to verify server.js is running
app.get('/test-server-js', (req, res) => {
  res.json({ 
    message: 'server.js is running on Railway!', 
    timestamp: new Date().toISOString(),
    port: PORT,
    pwd: process.cwd(),
    files: require('fs').readdirSync(process.cwd())
  });
});

// Basic health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Serve a simple homepage
app.get('/', (req, res) => {
  res.send(`
    <h1>DataPingo Sheets Connector - Railway Deployment Test</h1>
    <p>Server is running on port ${PORT}</p>
    <p>Current time: ${new Date().toISOString()}</p>
    <p><a href="/test-server-js">Test endpoint</a></p>
    <p><a href="/health">Health check</a></p>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log('🚀 DataPingo Sheets Connector running on Railway!');
  console.log('🌐 Port:', PORT);
  console.log('✅ Simplified server is active!');
});

console.log('✅ Server.js loaded successfully!');
