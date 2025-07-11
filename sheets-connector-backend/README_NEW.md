# 📄 Sheets Connector for Slack

A powerful web application that monitors Google Sheets for changes and sends real-time notifications to Slack channels.

![Sheets Connector](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)

## ✨ Features

### 🔐 **Seamless Authentication**
- One-click Google OAuth integration
- Automatic Google Drive API access
- Secure token management

### 📊 **Smart Spreadsheet Integration**
- Auto-discovery of your Google Sheets via Drive API
- Interactive spreadsheet selection dropdown
- Real-time cell range validation

### 🎯 **Advanced Monitoring Conditions**
- Multiple condition types: `>`, `<`, `=`, `≠`, `contains`, `changed`
- Visual feedback for condition setup (green borders when complete)
- Support for complex monitoring scenarios

### 💬 **Rich Slack Notifications**
- Beautifully formatted messages with change indicators (📈📉)
- Flexible mention options: `@channel`, `@here`, custom users
- Direct "View Sheet" links in notifications

### ⚡ **Real-time Job Management**
- Live monitoring with configurable intervals
- Active job dashboard with current values
- Individual job controls (stop, refresh, status)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Cloud Project with Sheets & Drive APIs enabled
- Slack workspace with webhook access

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd sheets-connector-backend
npm install
```

### 2. Environment Setup
Create `.env` file:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PORT=3000
```

### 3. Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Sheets API**
3. Enable **Google Drive API**
4. Create OAuth 2.0 credentials
5. Add your client ID/secret to `.env`

### 4. Run the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to start monitoring! 🎉

## 📋 How It Works

### Step-by-Step Workflow:

1. **🔐 Authenticate** - One-click Google OAuth
2. **📊 Select Sheet** - Choose from your Drive spreadsheets  
3. **🎯 Configure Tracking** - Set cell ranges and conditions
4. **💬 Setup Slack** - Add webhook URL and mentions
5. **⏱️ Set Frequency** - Choose monitoring interval
6. **🚀 Start Monitoring** - Watch for real-time changes!

### Example Monitoring Scenarios:
- **Sales Dashboard**: Alert when revenue > $10,000
- **Inventory Tracking**: Notify when stock < 50 items
- **Project Status**: Alert on any status changes
- **KPI Monitoring**: Track metric changes in real-time

## 🏗️ Architecture

### Backend Stack:
- **Express.js** - RESTful API server
- **TypeScript** - Type-safe development
- **Google APIs** - Sheets & Drive integration
- **Node.js Timers** - Scheduled monitoring

### Frontend:
- **Vanilla JavaScript** - Lightweight & fast
- **Modern CSS** - Responsive design
- **Real-time UI** - Dynamic condition feedback

### Key Services:
- `GoogleSheetsService` - Handles authentication & data fetching
- `SlackService` - Manages webhook notifications  
- `MonitoringService` - Coordinates change detection & jobs

## 📡 API Endpoints

### Authentication
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/google/url` - Get OAuth URL
- `POST /api/auth/google/callback` - Handle OAuth callback

### Sheets Integration  
- `GET /api/sheets/spreadsheets` - List user spreadsheets
- `GET /api/sheets/:id/values/:range` - Validate cell ranges

### Monitoring
- `POST /api/monitoring/start` - Start monitoring job
- `GET /api/monitoring/jobs` - List active jobs
- `POST /api/monitoring/stop/:id` - Stop specific job

### Slack
- `POST /api/slack/test` - Test webhook integration

## 🔧 Configuration Options

### Monitoring Conditions:
```javascript
{
  type: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains' | 'changed',
  value: string | number,
  enabled: boolean
}
```

### Notification Format:
- 📈 Increasing values (with delta)
- 📉 Decreasing values (with delta)  
- 🔄 Text changes
- ⏰ Timestamp and cell location
- 🔗 Direct sheet links

## 🛠️ Development

### Project Structure:
```
src/
├── server.ts              # Main Express server
├── services/
│   ├── GoogleSheetsService.ts  # Google API integration
│   ├── SlackService.ts         # Slack webhooks  
│   └── MonitoringService.ts    # Job management
├── utils/
│   └── logger.ts          # Safe logging utilities
public/
└── index.html             # Frontend application
```

### Available Scripts:
```bash
npm run dev        # Start development server
npm run build      # Build TypeScript
npm start          # Start production server
npm run lint       # Run linting
```

## 🚨 Troubleshooting

### Common Issues:

**Drive API Error**: 
- Ensure Google Drive API is enabled in Cloud Console
- Wait a few minutes for API propagation
- Re-authenticate if needed

**Slack Notifications Not Working**:
- Verify webhook URL format
- Check Slack app permissions
- Test with the built-in test button

**Authentication Issues**:
- Confirm OAuth credentials are correct
- Check redirect URIs in Google Cloud Console
- Clear browser cache if needed

## 🔐 Security Notes

- OAuth tokens are stored in memory only
- No persistent user data storage
- Webhook URLs are not logged
- All API calls use HTTPS

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues, questions, or feature requests, please open a GitHub issue.

---

**Built with ❤️ for seamless Google Sheets + Slack integration**
