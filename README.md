# 🚀 DataPingo Sheets Connector

**Real-time Google Sheets to Slack monitoring with instant notifications (0-5 second latency)**

*Set it once, forget it forever!* ⚡

## ✨ Features

- **🔥 Real-time Monitoring**: 0-5 second latency with Google Drive Push Notifications
- **📊 Google Sheets Integration**: Monitor any cell range in your spreadsheets
- **💬 Slack Notifications**: Instant alerts when data changes
- **🎯 Smart Conditions**: Monitor for specific changes, thresholds, or any update
- **🌐 Production Ready**: Deployed on Railway with automatic scaling
- **🔒 Secure OAuth**: Google OAuth 2.0 authentication

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### 1. Deploy Backend
1. Click "Deploy on Railway" above
2. Connect your GitHub repository
3. Set environment variables:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NODE_ENV=production
   PRODUCTION_REDIRECT_URI=https://your-app.railway.app/auth/callback
   ```

### 2. Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://your-app.railway.app/auth/callback`
5. Add authorized JavaScript origins: `https://your-app.railway.app`

### 3. Test Real-time Monitoring
1. Open your deployed app: `https://your-app.railway.app`
2. Authenticate with Google
3. Select a Google Sheet
4. Enable "Real-time Monitoring" (0-5 second latency)
5. Set up Slack webhook
6. Make changes to your Google Sheet and watch instant notifications! ⚡

## 🛠 Local Development

### Prerequisites
- Node.js 16+
- Google Cloud Project with Sheets API enabled
- Slack webhook URL

### Setup
```bash
# Clone repository
git clone https://github.com/erichuang2003/DataPingo-Sheets-Connector.git
cd DataPingo-Sheets-Connector

# Install dependencies
npm run install-all

# Setup environment variables
cp .env.production.example sheets-connector-backend/.env
# Edit .env with your credentials

# Start backend
cd sheets-connector-backend && npm run dev

# Start frontend (new terminal)
cd sheets-connector-app && npm start
```

## 📚 API Endpoints

### Authentication
- `GET /api/auth/google/url` - Get Google OAuth URL
- `POST /api/auth/google/callback` - Handle OAuth callback

### Monitoring
- `POST /api/monitoring/start` - Start monitoring a sheet
- `POST /api/monitoring/stop` - Stop monitoring
- `POST /api/monitoring/setup-push` - Enable real-time notifications
- `POST /api/webhook/google-drive` - Google Drive webhook endpoint

### Sheets
- `GET /api/sheets/list` - List user's spreadsheets
- `GET /api/sheets/:id/tabs` - Get sheet tabs
- `GET /api/sheets/:id/data` - Get sheet data

## 🔧 Configuration

### Environment Variables
```env
# Required
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Production
NODE_ENV=production
PORT=3000
PRODUCTION_REDIRECT_URI=https://your-app.railway.app/auth/callback
```

### Google Cloud Setup
1. Enable Google Sheets API and Google Drive API
2. Create OAuth 2.0 credentials
3. Add authorized domains and redirect URIs
4. Download credentials (not needed for production)

## 🎯 Real-time vs Polling

| Feature | Real-time (Push) | Polling |
|---------|------------------|---------|
| **Latency** | 0-5 seconds ⚡ | 2+ minutes |
| **Network Usage** | Minimal | Higher |
| **Reliability** | Very High | High |
| **Setup** | One-click | Automatic |

## 🏗 Architecture

```
Google Sheets → Google Drive API → Webhook → Backend → Slack
                     ↓                        ↓
              Real-time Push             Instant Alert
              (0-5 seconds)              (Sub-second)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🚀 Ready for Slack App Store

This app is prepared for Slack App Store submission with:
- Real-time monitoring competitive advantage
- Production-ready deployment
- Comprehensive error handling
- Security best practices

---

**Built with ❤️ by DataPingo**

*Transform your Google Sheets into real-time Slack dashboards!*
