#!/bin/bash

# DataPingo Sheets Connector - Deployment Script
# This script builds the React app and copies it to the backend's public directory

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Build the React app
echo "📦 Building React app..."
cd sheets-connector-app
npm run build

echo "📁 Copying built files to backend public directory..."
# Copy all built files from dist/ to backend's public/
cp -r dist/* ../sheets-connector-backend/public/

# Note: We preserve admin.html and other backend-specific files
# The React app's index.html will overwrite the old static homepage

echo "🔧 Building backend..."
cd ../sheets-connector-backend
npm run build

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Commit and push changes to trigger Railway deployment"
echo "2. Railway will serve the updated React app from the public directory"
echo ""
echo "Files copied:"
ls -la public/ | grep -E "\.(html|js|css|png|jpg|svg)$" | head -10
