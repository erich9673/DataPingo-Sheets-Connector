# DataPingo Sheets Connector - Railway Deployment

## 🚂 Quick Railway Deployment

### Prerequisites
- Railway account ([railway.app](https://railway.app))
- Git repository connected
- Environment variables configured

### One-Click Deploy
```bash
./railway-deploy.sh
```

### Manual Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Deploy
railway up
```

## 🔧 Environment Variables

Set these in your Railway dashboard:

```env
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://datapingo-sheets-connector.up.railway.app/auth/callback
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_SIGNING_SECRET=your_slack_signing_secret
```

## 📊 Monitoring

- **Health Check**: `/health`
- **Logs**: `railway logs`
- **Variables**: `railway variables`

## 🔗 URLs

- **Production**: https://datapingo-sheets-connector.up.railway.app
- **Health Check**: https://datapingo-sheets-connector.up.railway.app/health
- **OAuth Callback**: https://datapingo-sheets-connector.up.railway.app/auth/callback

## 🚀 Features Supported

- ✅ Background tasks (Google Sheets monitoring)
- ✅ Persistent connections
- ✅ Automatic restarts
- ✅ Health monitoring
- ✅ Environment variables
- ✅ Custom domains
- ✅ SSL certificates

Perfect for Slack App Store submission!
