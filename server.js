// Ultra-simple Railway test
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Railway deployment working!',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID
    }
  });
});

app.get('/', (req, res) => {
  res.send('DataPingo Sheets Connector - Railway Test Server is Running!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Google Client ID set: ${!!process.env.GOOGLE_CLIENT_ID}`);
});

module.exports = app;
console.log('🚀 Starting DataPingo Sheets Connector...');
console.log('📍 Working directory:', process.cwd());
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🌐 Port:', process.env.PORT);

// Load the actual backend
try {
  console.log('� Loading backend from: ./sheets-connector-backend/dist/server.js');
  require('./sheets-connector-backend/dist/server.js');
} catch (error) {
  console.error('❌ Failed to load backend:', error);
  process.exit(1);
}
