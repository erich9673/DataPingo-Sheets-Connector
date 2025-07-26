#!/bin/bash

echo "🔍 Railway Build Debug Script"
echo "=============================="

# Show environment info
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo ""

# Show file structure
echo "📂 Project structure:"
ls -la
echo ""

echo "📂 Backend directory:"
if [ -d "sheets-connector-backend" ]; then
    cd sheets-connector-backend
    echo "Contents:"
    ls -la
    echo ""
    
    echo "🔧 Installing backend dependencies..."
    npm install
    
    echo "🏗️ Compiling TypeScript..."
    npx tsc --version
    npx tsc
    
    echo "📂 Checking dist after compilation:"
    if [ -d "dist" ]; then
        echo "Dist directory exists:"
        ls -la dist/
        
        if [ -d "dist/services" ]; then
            echo "Services directory contents:"
            ls -la dist/services/
        else
            echo "❌ Services directory missing!"
        fi
    else
        echo "❌ Dist directory missing!"
    fi
    
    cd ..
else
    echo "❌ Backend directory not found!"
fi

echo ""
echo "✅ Build debug complete"
