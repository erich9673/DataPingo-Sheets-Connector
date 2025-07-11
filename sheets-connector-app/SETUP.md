# Technical Setup Guide

## For Software Engineers

This guide provides detailed technical information for setting up and deploying the PingFrame Sheets Connector.

## Quick Start

```bash
# 1. Run the automated setup
./setup.sh

# 2. Add your Google OAuth credentials
# (Download from Google Cloud Console as oauth-credentials.json)

# 3. Start the application
npm start
```

## Manual Setup

If you prefer manual setup or the automated script fails:

### 1. Prerequisites Check

```bash
# Check Node.js version (16+ required)
node --version

# Check npm version
npm --version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your preferred editor
nano .env  # or vim, code, etc.
```

### 4. Google Cloud Setup

#### Enable APIs:
```bash
# Using gcloud CLI (optional)
gcloud services enable sheets.googleapis.com
```

#### Manual Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google Sheets API
4. Create OAuth 2.0 Desktop credentials
5. Download as `oauth-credentials.json`

### 5. Build and Test

```bash
# Clean build
npm run clean
npm run build

# Test run
npm start
```

## Development Workflow

### File Structure
```
src/
├── main.ts                    # Electron main process
├── renderer/                  # Frontend UI
│   └── index.html
└── services/                  # Business logic
    ├── GoogleSheetsService.ts # Google API integration
    ├── SlackService.ts        # Slack webhooks
    └── MonitoringService.ts   # Polling logic
```

### Build Process
1. TypeScript compilation (`tsc`)
2. Copy HTML/CSS assets to `dist/`
3. Package with Electron

### Development Scripts
```bash
npm run dev          # Development mode
npm run build        # Production build
npm run clean        # Clean dist directory
npm run rebuild      # Clean + build
npm run package      # Create distributable package
```

## Architecture Deep Dive

### Process Architecture
- **Main Process**: Node.js/TypeScript, handles system APIs
- **Renderer Process**: HTML/JS, handles UI and user interactions
- **IPC Communication**: Secure message passing between processes

### Key Services

#### GoogleSheetsService
```typescript
class GoogleSheetsService {
  authenticate()           // OAuth flow
  setAuthCode(code)       // Complete OAuth
  getSpreadsheetInfo(id)  // Fetch sheet metadata
  getCellValues(id, range) // Get cell data
}
```

#### SlackService
```typescript
class SlackService {
  constructor(webhookUrl)
  sendNotification(...)   // Send to Slack
  testConnection()        // Verify webhook
}
```

#### MonitoringService
```typescript
class MonitoringService {
  startMonitoring(sheet, range, frequency)
  checkForChanges()       // Compare values
  stopMonitoring()        // Clean up timers
}
```

### Security Model
- OAuth 2.0 with Google (no permanent tokens stored)
- Webhook URLs validated before use
- No sensitive data in source code
- Local credential storage only

## Deployment Options

### Option 1: Development Deployment
```bash
# Direct execution for testing
npm start
```

### Option 2: Packaged Application
```bash
# Install electron-builder
npm install electron-builder --save-dev

# Create distributables
npm run package

# Output in dist/ directory:
# - .dmg (macOS)
# - .exe (Windows)  
# - .AppImage (Linux)
```

### Option 3: Cloud Services (Future)
For always-on monitoring, consider:
- AWS Lambda + EventBridge
- Google Cloud Functions + Cloud Scheduler
- Azure Functions + Timer Triggers

## Configuration Management

### Environment Variables
```bash
NODE_ENV=development              # Enable debug features
GOOGLE_OAUTH_CLIENT_ID=...       # From Google Cloud Console
GOOGLE_OAUTH_CLIENT_SECRET=...   # From Google Cloud Console
DEFAULT_CHECK_FREQUENCY_MINUTES=1
SLACK_WEBHOOK_URL=...            # Optional default
```

### OAuth Credentials Format
```json
{
  "installed": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  }
}
```

## Testing

### Manual Testing Checklist
- [ ] Google authentication flow
- [ ] Sheet loading and parsing
- [ ] Cell value monitoring
- [ ] Slack notification delivery
- [ ] Error handling and recovery

### Automated Testing (Future Enhancement)
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Monitoring and Debugging

### Console Logging
The application logs key events:
- Authentication attempts
- API calls and responses
- Monitoring cycles
- Error conditions

### Debug Mode
Set `NODE_ENV=development` to enable:
- Electron DevTools
- Verbose logging
- Hot reload (future enhancement)

### Performance Monitoring
- Google API quota usage
- Memory consumption
- Monitoring intervals

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   npm run clean
   rm -rf node_modules
   npm install
   npm run build
   ```

2. **OAuth Issues**
   ```bash
   # Verify credentials file
   cat oauth-credentials.json | jq .
   
   # Check API enablement
   gcloud services list --enabled | grep sheets
   ```

3. **Permission Errors**
   ```bash
   # Fix file permissions
   chmod +x setup.sh
   chmod 644 oauth-credentials.json
   ```

### Debug Commands
```bash
# Check application logs
tail -f ~/.config/sheets-connector-app/logs/main.log

# Monitor network requests
NODE_ENV=development npm start

# Validate configuration
node -e "console.log(require('./oauth-credentials.json'))"
```

## Performance Optimization

### API Rate Limiting
- Google Sheets API: 300 requests/minute/user
- Slack Webhooks: No strict limits, but use reasonable intervals

### Memory Management
- Clear previous cell values periodically
- Limit monitoring range size
- Handle large spreadsheets efficiently

### Network Optimization
- Cache spreadsheet metadata
- Batch multiple range requests
- Implement exponential backoff

## Security Best Practices

### Development
- Never commit credentials to version control
- Use environment variables for sensitive data
- Validate all user inputs
- Sanitize webhook URLs

### Deployment
- Use HTTPS for all external communications
- Implement proper error handling
- Log security events
- Regular dependency updates

## Contributing Guidelines

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- JSDoc comments for public APIs

### Git Workflow
```bash
# Feature development
git checkout -b feature/your-feature
git commit -m "feat: add new feature"
git push origin feature/your-feature

# Create pull request for review
```

### Testing Requirements
- Unit tests for services
- Integration tests for IPC
- Manual testing checklist
- Performance benchmarks

## Support and Maintenance

### Regular Maintenance
- Update dependencies monthly
- Monitor Google API changes
- Review security advisories
- Test on all supported platforms

### Support Channels
- GitHub Issues for bugs
- Internal documentation for setup
- Team chat for quick questions
- Code reviews for changes

---

**For additional technical questions, contact the development team.**
