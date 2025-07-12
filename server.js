// Debug environment variables first
console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET ✅' : 'NOT SET ❌');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET ✅' : 'NOT SET ❌');
console.log('All env vars:', Object.keys(process.env).filter(key => key.startsWith('GOOGLE')));

// Simple Railway test server ONLY - no backend loading
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
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      googleClientIdLength: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 0,
      googleEnvVars: Object.keys(process.env).filter(key => key.startsWith('GOOGLE'))
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
  console.log(`Google Client ID length: ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 0}`);
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
