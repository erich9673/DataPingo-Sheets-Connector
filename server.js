// Simple Railway entry point
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
