#!/bin/bash

# PingFrame Sheets Connector Setup Script
# Run this script to set up the development environment

echo "🚀 Setting up PingFrame Sheets Connector..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if oauth-credentials.json exists
if [ ! -f "oauth-credentials.json" ]; then
    echo "⚠️  oauth-credentials.json not found"
    echo "📋 Please follow these steps:"
    echo "   1. Go to https://console.cloud.google.com/"
    echo "   2. Create/select a project"
    echo "   3. Enable Google Sheets API"
    echo "   4. Create OAuth 2.0 credentials (Desktop application)"
    echo "   5. Download and save as 'oauth-credentials.json' in this directory"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. You can edit it with your credentials (optional)"
fi

# Build the application
echo "🔨 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your oauth-credentials.json file (if not done already)"
echo "2. Run 'npm start' to launch the application"
echo "3. Follow the in-app setup to connect to Google Sheets and Slack"
echo ""
echo "For help, see README.md or contact the development team"
