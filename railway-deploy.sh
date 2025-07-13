#!/bin/bash
# Railway deployment script for DataPingo Sheets Connector

echo "🚂 DataPingo Sheets Connector - Railway Deployment"
echo "================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "� Linking to Railway project..."
railway link

echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌍 Your app should be available at: https://datapingo-sheets-connector.up.railway.app"
echo "📊 Monitor logs with: railway logs"
echo "⚙️  Manage environment variables with: railway variables"
