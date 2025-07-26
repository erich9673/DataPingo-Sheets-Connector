#!/bin/bash

echo "🔍 DEBUG: Railway Build Process Check"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

echo "📂 Current directory: $(pwd)"
echo "📂 Directory contents:"
ls -la

echo ""
echo "📂 Checking backend package.json:"
if [ -f "sheets-connector-backend/package.json" ]; then
    echo "✅ Backend package.json exists"
    echo "Build script: $(cat sheets-connector-backend/package.json | grep '"build"' || echo 'Not found')"
else
    echo "❌ Backend package.json not found"
fi

echo ""
echo "📂 Checking TypeScript compilation:"
if [ -d "sheets-connector-backend/dist" ]; then
    echo "✅ Dist directory exists"
    echo "Contents:"
    ls -la sheets-connector-backend/dist/
    if [ -d "sheets-connector-backend/dist/services" ]; then
        echo "Services directory contents:"
        ls -la sheets-connector-backend/dist/services/
    fi
else
    echo "❌ Dist directory not found"
fi

echo ""
echo "🔧 Environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
