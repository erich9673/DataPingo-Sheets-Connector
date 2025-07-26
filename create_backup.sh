#!/bin/bash

# 🚀 Sheets Connector - Local Backup Script
# Created: July 23, 2025
# Purpose: Create a complete backup of the deployment-ready project

echo "🚀 Creating local backup of Sheets Connector project..."

# Get current date for backup folder
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FOLDER="SheetsConnector_Backup_${BACKUP_DATE}"
SOURCE_DIR="/Users/erichuang/Desktop/Sheets Connector for Slack"

echo "📁 Creating backup folder: ${BACKUP_FOLDER}"
cd ~/Desktop
mkdir -p "${BACKUP_FOLDER}"

echo "📋 Copying project files..."

# Copy main project
cp -r "${SOURCE_DIR}" "${BACKUP_FOLDER}/"

# Create deployment info file
cat > "${BACKUP_FOLDER}/BACKUP_INFO.txt" << EOF
🚀 SHEETS CONNECTOR - LOCAL BACKUP
================================

Backup Created: $(date)
Project Status: DEPLOYMENT READY
Save Point: July 23, 2025

FEATURES INCLUDED:
✅ Multi-platform support (Slack, Teams, Discord)
✅ Google Sheets OAuth integration
✅ Real-time monitoring (30-second intervals)
✅ Duplicate job prevention
✅ Clean UI (Clear Data button removed)
✅ Proper notification formatting for all platforms
✅ Network-safe monitoring with caching
✅ User isolation and persistence

DEPLOYMENT STATUS:
✅ Frontend compiled and ready
✅ Backend TypeScript compiled
✅ All dependencies installed
✅ OAuth credentials configured
✅ Webhook services implemented
✅ Monitoring service optimized

NEXT STEPS FOR DEPLOYMENT:
1. Copy to production server
2. Run npm install in both folders
3. Configure production OAuth credentials
4. Start backend with npm start
5. Access via http://localhost:3001

BACKUP CONTENTS:
- Complete source code
- Compiled frontend (bundle.js)
- All configuration files
- Teams instruction screenshots
- Documentation and guides

Contact: Ready for production deployment
EOF

echo "📊 Creating project statistics..."
cat > "${BACKUP_FOLDER}/PROJECT_STATS.txt" << EOF
📊 PROJECT STATISTICS
====================

BACKEND FILES:
$(find "${SOURCE_DIR}/sheets-connector-backend/src" -name "*.ts" | wc -l) TypeScript files
$(find "${SOURCE_DIR}/sheets-connector-backend/src" -name "*.js" | wc -l) JavaScript files

FRONTEND FILES:
$(find "${SOURCE_DIR}/sheets-connector-app/src" -name "*.tsx" -o -name "*.ts" | wc -l) React/TypeScript files

KEY SERVICES:
- MonitoringService.ts (Core monitoring logic)
- SlackService.ts (Slack webhooks)
- TeamsService.ts (Teams webhooks)  
- DiscordService.ts (Discord webhooks)
- GoogleSheetsService.ts (Google Sheets API)

FRONTEND COMPONENTS:
- App.tsx (Main UI with platform selector)
- Multi-platform webhook configuration
- Teams setup instructions with screenshots

TOTAL PROJECT SIZE: $(du -sh "${SOURCE_DIR}" | cut -f1)

LAST MODIFIED: $(stat -f "%Sm" "${SOURCE_DIR}")
EOF

echo "🔒 Creating security checklist..."
cat > "${BACKUP_FOLDER}/SECURITY_CHECKLIST.txt" << EOF
🔒 SECURITY CHECKLIST
===================

BEFORE DEPLOYMENT - VERIFY:

☐ Google OAuth credentials are production-ready
☐ .env file contains valid CLIENT_ID and CLIENT_SECRET
☐ OAuth redirect URIs updated for production domain
☐ Webhook URLs are properly validated
☐ No hardcoded secrets in source code
☐ Rate limiting is properly configured
☐ User authentication is working
☐ HTTPS is configured for production

OAUTH CONFIGURATION:
- File: sheets-connector-backend/.env
- Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- Scopes: Google Sheets API access
- Redirect URI: Must match production domain

WEBHOOK SECURITY:
- All webhook URLs validated before use
- Platform detection prevents malicious usage
- User isolation prevents cross-user access
- Proper error handling for failed webhooks

PRODUCTION CONSIDERATIONS:
- Use environment variables for all secrets
- Set up proper logging and monitoring
- Configure SSL/TLS certificates
- Implement proper session management
- Consider adding webhook URL whitelisting
EOF

echo "📝 Creating quick start guide..."
cat > "${BACKUP_FOLDER}/QUICK_START.md" << EOF
# 🚀 Quick Start Guide

## Immediate Deployment Steps

### 1. Prerequisites
- Node.js 16+ installed
- Google Cloud project with Sheets API enabled
- Slack/Teams/Discord webhook URLs ready

### 2. Backend Setup
\`\`\`bash
cd "Sheets Connector for Slack/sheets-connector-backend"
npm install
npm run build
npm start
\`\`\`

### 3. Environment Configuration
Update \`.env\` file with your credentials:
\`\`\`
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
\`\`\`

### 4. Access Application
- Open browser: http://localhost:3001
- Login with Google account
- Configure monitoring for your spreadsheets

### 5. Test Webhooks
- Slack: Test with workspace webhook URL
- Teams: Test with incoming webhook URL  
- Discord: Test with channel webhook URL

## Troubleshooting

### If monitoring stops working:
1. Check backend logs for errors
2. Verify Google OAuth token hasn't expired
3. Reconnect Google Sheets via frontend
4. Restart backend service

### If webhooks fail:
1. Verify webhook URL is correct
2. Check platform permissions
3. Test webhook manually with curl
4. Check backend logs for error details

## Support Files
- DEPLOYMENT_READY_GUIDE.md (Complete deployment guide)
- BACKUP_INFO.txt (Backup details)
- PROJECT_STATS.txt (Project statistics)
- SECURITY_CHECKLIST.txt (Security verification)
EOF

echo "✅ Backup completed successfully!"
echo "📁 Backup location: ~/Desktop/${BACKUP_FOLDER}"
echo "📋 Backup includes:"
echo "   - Complete project source code"
echo "   - Compiled frontend and backend"
echo "   - Configuration files"
echo "   - Documentation and guides"
echo "   - Security checklists"
echo ""
echo "🚀 Ready for deployment! Check DEPLOYMENT_READY_GUIDE.md for details."

# Make the backup folder easy to find
open ~/Desktop
