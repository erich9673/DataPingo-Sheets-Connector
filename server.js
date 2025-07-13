// DataPingo Sheets Connector - Production Railway Deployment
console.log('🚂 Starting DataPingo Sheets Connector on Railway...');
console.log('📍 Working directory:', process.cwd());
console.log('🔧 Environment:', process.env.NODE_ENV);

// Railway-specific port validation
const PORT = process.env.PORT || 3000;
console.log('🚂 Railway Port: ${PORT}');

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

// Load the main DataPingo Sheets Connector backend
console.log('🚀 Loading DataPingo Sheets Connector...');

try {
  const path = require('path');
  const fs = require('fs');
  const backendPath = path.join(__dirname, 'sheets-connector-backend', 'dist', 'server.js');
  
  if (fs.existsSync(backendPath)) {
    console.log('✅ Main DataPingo backend found, loading...');
    require(backendPath);
  } else {
    console.error('❌ Main backend not found at:', backendPath);
    console.log('📋 Available files:', fs.readdirSync(__dirname));
    throw new Error('DataPingo backend not found');
  }
} catch (error) {
  console.error('💥 Failed to load DataPingo backend:', error);
  process.exit(1);
}
