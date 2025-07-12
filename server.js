// Test if Railway is working
const http = require('http');
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'Railway is working!', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('DataPingo Sheets Connector - Railway Test Server Running!\nHealth: /health');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${port}`);
});

// After confirming Railway works, load the actual backend
setTimeout(() => {
  console.log('🔄 Loading actual backend...');
  require('./sheets-connector-backend/dist/server.js');
}, 2000);
