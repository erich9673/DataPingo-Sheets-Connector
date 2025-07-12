// Minimal test server to isolate the issue
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting minimal test server...');

// Basic middleware
app.use(express.json());

// Simple test endpoints
app.get('/ping', (req, res) => {
    console.log('📍 Ping endpoint hit');
    res.send('pong');
});

app.get('/health', (req, res) => {
    console.log('🩺 Health endpoint hit');
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: PORT 
    });
});

app.get('/', (req, res) => {
    console.log('🏠 Root endpoint hit');
    res.send('<h1>DataPingo Sheets Connector - Minimal Test</h1><p>Server is running!</p>');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Minimal server running on port ${PORT}`);
    console.log(`🔗 Test URL: http://localhost:${PORT}`);
});

module.exports = app;
