// DataPingo Sheets Connector - Railway Deployment
console.log('🚂 Starting DataPingo Sheets Connector on Railway...');
console.log('📍 Working directory:', process.cwd());
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🌐 Port:', process.env.PORT);

// Railway-specific port validation
const PORT = process.env.PORT || 3000;
console.log(`🚂 Railway Port: ${PORT}`);

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Load the main DataPingo application
console.log('🚂 Starting DataPingo Sheets Connector application...');
console.log('🔄 Loading main backend from sheets-connector-backend...');

try {
  const path = require('path');
  const fs = require('fs');
  const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');
  
  console.log('📂 Backend path:', backendPath);
  
  if (fs.existsSync(backendPath)) {
    console.log('✅ Main backend found, loading...');
    require(backendPath);
    console.log('✅ DataPingo Sheets Connector loaded successfully');
  } else {
    console.log('⚠️ Main backend not found, falling back to test server');
    require('./test-server.js');
    console.log('✅ Test server fallback loaded');
  }
} catch (error) {
  console.error('❌ Failed to load main backend, falling back to test server:', error);
  console.error('Stack:', error.stack);
  try {
    require('./test-server.js');
    console.log('✅ Test server fallback loaded successfully');
  } catch (fallbackError) {
    console.error('💥 Complete failure - both main and test servers failed:', fallbackError);
    process.exit(1);
  }
}
