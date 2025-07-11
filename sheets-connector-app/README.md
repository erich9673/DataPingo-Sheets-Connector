# PingFrame Sheets Connector

A real-time Google Sheets monitoring application that sends notifications to Slack when cell values change.

## 🚀 Features

- **Real-time monitoring**: Check Google Sheets every 10 seconds to 60 minutes
- **Slack notifications**: Instant notifications when cell values change
- **Easy setup**: Simple OAuth authentication flow
- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Secure**: OAuth 2.0 authentication with Google Sheets API

## 🏗️ Architecture

- **Frontend**: HTML/JavaScript (Electron Renderer Process)
- **Backend**: TypeScript/Node.js (Electron Main Process)
- **APIs**: Google Sheets API v4, Slack Webhooks
- **Authentication**: OAuth 2.0 with Google

## 📋 Prerequisites

- Node.js 16+ and npm
- Google Cloud Console account
- Slack workspace with admin permissions

## ⚙️ Setup Instructions

### 1. Clone and Install

```bash
git clone [your-repo-url]
cd sheets-connector-app
npm install
```

### 2. Google Sheets API Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Enable Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop application"
   - Download the JSON file
5. **Save credentials**:
   - Rename the downloaded file to `oauth-credentials.json`
   - Place it in the project root directory

### 3. Slack Webhook Setup

1. **Go to [Slack API](https://api.slack.com/apps)**
2. **Create new app** → "From scratch"
3. **Choose your workspace**
4. **Enable Incoming Webhooks**:
   - Go to "Incoming Webhooks"
   - Toggle "Activate Incoming Webhooks" to ON
5. **Add webhook to workspace**:
   - Click "Add New Webhook to Workspace"
   - Choose the channel for notifications
   - Click "Allow"
6. **Copy the webhook URL** (you'll enter this in the app)

### 4. Environment Setup (Optional)

```bash
cp .env.example .env
# Edit .env with your credentials (optional - can also use UI)
```

### 5. Build and Run

```bash
npm run build
npm start
```

## 🖥️ Usage

### Step 1: Authentication
1. Click "Connect to Google Sheets"
2. Sign in to your Google account in the browser
3. Grant permissions for Google Sheets access
4. Copy the authorization code and paste it in the app

### Step 2: Configure Monitoring
1. Enter your Google Sheet ID (from the URL)
2. Click "Load Sheet" to verify access
3. Enter the cell range to monitor (e.g., `A1:C10`)
4. Select "Slack" and enter your webhook URL
5. Set monitoring frequency (0.17 = 10 seconds, 1 = 1 minute)

### Step 3: Start Monitoring
1. Click "🚀 Start Tracking"
2. The app will now monitor your sheet and send Slack notifications when cells change
3. Keep the app running for continuous monitoring

## 📁 Project Structure

```
sheets-connector-app/
├── src/
│   ├── main.ts                     # Electron main process
│   ├── renderer/
│   │   └── index.html             # User interface
│   └── services/
│       ├── GoogleSheetsService.ts  # Google Sheets API integration
│       ├── SlackService.ts         # Slack webhook notifications
│       └── MonitoringService.ts    # Polling and change detection
├── dist/                          # Compiled TypeScript output
├── oauth-credentials.json         # Google OAuth credentials (not in repo)
├── .env                          # Environment variables (not in repo)
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

## 🔧 Development

### Available Scripts

```bash
# Build TypeScript
npm run build

# Start the application
npm start

# Development mode (with auto-reload)
npm run dev

# Clean build directory
npm run clean
```

## Project Structure

```
sheets-connector-app
├── src
│   ├── main.ts                  # Entry point of the application
│   ├── renderer
│   │   ├── index.html           # HTML structure for the user interface
│   │   ├── index.ts             # Renderer process logic
│   │   ├── styles
│   │   │   └── main.css         # Styles for the user interface
│   │   └── components
│   │       ├── SheetSelector.ts  # Component for selecting Google Sheets
│   │       ├── CellTracker.ts    # Component for tracking specific cells
│   │       └── NotificationSettings.ts # Component for notification settings
│   ├── services
│   │   ├── GoogleSheetsService.ts # Service for Google Sheets API interactions
│   │   ├── SlackService.ts        # Service for sending notifications to Slack
│   │   ├── TeamsService.ts        # Service for sending notifications to Teams
│   │   └── NotificationService.ts  # Service for managing notifications
│   ├── models
│   │   ├── Sheet.ts               # Model representing a Google Sheet
│   │   ├── Cell.ts                # Model representing a specific cell
│   │   └── Notification.ts         # Model representing a notification
│   └── utils
│       ├── config.ts              # Configuration settings
│       └── logger.ts              # Utility functions for logging
├── package.json                   # npm configuration file
├── tsconfig.json                  # TypeScript configuration file
├── electron-builder.json          # Electron build configuration
└── README.md                      # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd sheets-connector-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your Google Sheets API credentials in `src/utils/config.ts`.

## Usage

1. Run the application:
   ```
   npm start
   ```

2. Use the user interface to select the Google Sheets you want to track and specify the cells of interest.

3. Configure your notification preferences to receive updates in Slack or Microsoft Teams.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.