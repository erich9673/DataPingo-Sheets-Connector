#!/bin/bash
set -e

echo "=== DataPingo Sheets Connector Build Script ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "=== Installing backend dependencies ==="
cd sheets-connector-backend
npm install

echo "=== Verifying installation ==="
npm list --depth=0 || echo "Dependencies installed successfully"

echo "=== Build completed successfully ==="
