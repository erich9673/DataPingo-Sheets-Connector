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

// Start the working test server directly
console.log('🚂 Starting reliable test server on Railway...');
console.log('🔄 Loading test-server.js...');

try {
  require('./test-server.js');
  console.log('✅ Test server module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load test server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}
