#!/bin/bash

echo "🚀 DataPingo Sheets Connector - Production Deployment"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo "📦 Building frontend for production..."
cd sheets-connector-app
npm install
npm run build
cd ..

echo "📦 Building backend for production..."
cd sheets-connector-backend
npm install
npm run build
cd ..

echo "🔧 Production build complete!"
echo ""
echo "Next steps:"
echo "1. Deploy backend to Railway: https://railway.app"
echo "2. Deploy frontend to Vercel: https://vercel.com"
echo "3. Update OAuth redirect URIs in Google Cloud Console"
echo "4. Test production deployment"
echo "5. Submit to Slack App Directory"
echo ""
echo "Production URLs:"
echo "- Frontend: https://datapingo-sheets-connector.vercel.app"
echo "- Backend: https://datapingo-backend.railway.app"
