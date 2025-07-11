# 🔄 Sheets Connector Backend - Always On Monitoring

This is the backend service version of your Sheets Connector that provides **always-on monitoring** without needing to keep an Electron app open.

## ✅ **Key Benefits**

- **Always Running**: Works 24/7 even when your computer is off
- **Cloud Ready**: Deploy to any cloud provider (Heroku, Railway, AWS, etc.)
- **Multi-User**: Teams can share monitoring jobs
- **Web Interface**: Manage from any browser
- **API-First**: Easy to integrate with other tools

## 🚀 **Quick Start**

### 1. **Setup Environment**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Google OAuth credentials
# Get these from your existing oauth-credentials.json file
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Build and Run**
```bash
# Build TypeScript
npm run build

# Start the server
npm start
```

### 4. **Access Web Interface**
Open your browser to: `http://localhost:3000`

## 📋 **Setup Steps**

### 1. **Google OAuth Setup**
- Copy your `client_id` and `client_secret` from your existing `oauth-credentials.json`
- Add them to your `.env` file:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 2. **Authentication**
- Go to `http://localhost:3000`
- Click "Authenticate with Google"
- Follow the OAuth flow
- Paste the authorization code back into the web interface

### 3. **Setup Monitoring**
- Enter your Google Sheet ID
- Specify the cell range to monitor
- Add your Slack webhook URL
- Choose mention preferences (@channel, @here, or custom)
- Set monitoring frequency
- Click "Start Always-On Monitoring"

## 🔧 **API Endpoints**

### Authentication
- `POST /api/auth/google` - Start OAuth flow
- `POST /api/auth/google/callback` - Complete OAuth with code
- `GET /api/auth/status` - Check authentication status

### Sheets
- `GET /api/sheets/spreadsheets` - List user's spreadsheets
- `GET /api/sheets/:id/info` - Get spreadsheet info
- `GET /api/sheets/:id/values?range=A1:C10` - Get cell values

### Slack
- `POST /api/slack/test` - Test Slack webhook connection

### Monitoring
- `POST /api/monitoring/start` - Start a monitoring job
- `POST /api/monitoring/stop/:jobId` - Stop a monitoring job
- `GET /api/monitoring/jobs` - List all active jobs
- `GET /api/monitoring/jobs/:jobId` - Get specific job details

## 📊 **Monitoring Job Structure**

```javascript
{
  "sheetId": "your_sheet_id",
  "cellRange": "A1:C10",
  "frequencyMinutes": 1,
  "webhookUrl": "https://hooks.slack.com/services/...",
  "userMention": "@channel",
  "conditions": [] // Optional: Advanced conditions
}
```

## 🌐 **Deployment Options**

### **Option 1: Heroku (Easiest)**
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set GOOGLE_CLIENT_ID=your_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_client_secret

# Deploy
git push heroku main
```

### **Option 2: Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **Option 3: Docker**
```bash
# Build image
docker build -t sheets-connector .

# Run container
docker run -p 3000:3000 \
  -e GOOGLE_CLIENT_ID=your_client_id \
  -e GOOGLE_CLIENT_SECRET=your_client_secret \
  sheets-connector
```

## 🔧 **Development**

### **Scripts**
```bash
npm run build     # Build TypeScript
npm run dev       # Run with nodemon for development
npm start         # Start production server
npm run clean     # Clean build files
npm run rebuild   # Clean and build
```

### **File Structure**
```
src/
├── server.ts              # Main Express server
├── services/
│   ├── GoogleSheetsService.ts
│   ├── SlackService.ts
│   └── MonitoringService.ts
└── utils/
    └── logger.ts          # Safe logging utility
public/
└── index.html            # Web interface
```

## 🔒 **Security**

- **Environment Variables**: Never commit credentials
- **HTTPS**: Use HTTPS in production
- **Rate Limiting**: Consider adding rate limiting
- **Authentication**: Add user authentication for multi-user setups

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Google credentials not found"**
   - Make sure your `.env` file has the correct values
   - Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

2. **"Authentication failed"**
   - Ensure your Google OAuth credentials are valid
   - Check that the redirect URI is set correctly

3. **"Slack webhook failed"**
   - Verify your webhook URL format
   - Test the webhook URL directly

### **Logs**
The server logs all activities. Check the console output for detailed error messages.

## 📈 **What's Different from Electron App**

| Feature | Electron App | Backend Service |
|---------|-------------|-----------------|
| **Always On** | ❌ Must keep app open | ✅ Runs 24/7 |
| **Cloud Ready** | ❌ Local only | ✅ Deploy anywhere |
| **Multi-User** | ❌ Single user | ✅ Multiple users |
| **Resource Usage** | 🔶 Heavy (full browser) | ✅ Lightweight |
| **Remote Access** | ❌ Local only | ✅ Access from anywhere |
| **Scalability** | ❌ Limited | ✅ Highly scalable |

## 🎯 **Next Steps**

1. **Test locally** with your existing Google Sheet
2. **Deploy to cloud** for always-on monitoring
3. **Set up multiple monitoring jobs** for different sheets
4. **Add team members** by sharing the web interface URL
5. **Monitor and scale** as needed

Your monitoring will now run continuously without needing to keep any desktop app open! 🚀
