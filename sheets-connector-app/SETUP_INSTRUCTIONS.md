# Setup Instructions for Sheets Connector

## Current Status
The app is now **fully functional** with the following improvements:

✅ **Fixed UI Issues**: 
- Removed duplicate event handlers that were causing conflicts
- Spreadsheet selection now works properly
- Conditions UI is enabled after adding cells to track

✅ **Enhanced UX**:
- Better error handling and user feedback
- Automatic fallback to manual Sheet ID when needed
- Clear step-by-step flow

## Two Options for Spreadsheet Selection

### Option 1: Enable Google Drive API (Recommended)
To use the **automatic spreadsheet dropdown**, you need to enable the Google Drive API:

1. Go to [Google Cloud Console](https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=60189191818)
2. Click "Enable API" 
3. Wait a few minutes for the API to activate
4. Restart the app and authenticate again

### Option 2: Use Manual Sheet ID (Works Now)
If you prefer to use the manual Sheet ID option:

1. Authenticate with Google Sheets
2. When you see "Could not load spreadsheets automatically", ignore this message
3. Use the "Enter Sheet ID manually" section instead
4. Copy the Sheet ID from your Google Sheets URL
5. Enter the cell range (e.g., `F8`)
6. Configure conditions if needed
7. Set up Slack webhook and start tracking

## How to Use the App

### Step 1: Authentication
1. Click "Connect to Google Sheets"
2. Sign in to Google in the browser
3. Copy the authorization code and paste it in the app

### Step 2: Select Spreadsheet
- **If Drive API is enabled**: Select from the dropdown
- **If Drive API is not enabled**: Enter the Sheet ID manually

### Step 3: Configure Tracking
1. Enter cell or cell range (e.g., `F8`, `A1`, `A1:B10`)
2. Click "Add Cells to Track"
3. **Configure conditions** (optional):
   - Greater than: `> 10000`
   - Less than: `< 5000`
   - Equals: `= "Done"`
   - Contains: `contains "urgent"`
   - Any change: Default option

### Step 4: Configure Notifications
1. **Check the boxes** for your preferred notification methods:
   - ☑️ Slack (enter webhook URL)
   - ☑️ MS Teams (enter webhook URL)
   - You can enable both if desired!

### Step 5: Set Latency Configuration
1. Set check frequency (minimum: 30 seconds, recommended: 1-5 minutes)

### Step 6: Start Monitoring
1. Click "Start Tracking"
2. Monitor the status display for real-time updates
3. The app will show tracking status and monitoring details

## Key Features Now Working

1. **Spreadsheet Dropdown**: Auto-loads your spreadsheets (requires Drive API)
2. **Manual Sheet ID**: Always works as backup
3. **Conditions Configuration**: Set notification rules after adding cells
4. **Real-time Monitoring**: Track changes with custom conditions
5. **Rich Slack Notifications**: Show delta values and direct links

## Troubleshooting

**Issue**: "Could not load spreadsheets automatically"
**Solution**: Enable Google Drive API or use manual Sheet ID

**Issue**: "Configure conditions" button disabled
**Solution**: First add cells to track, then the conditions UI will be enabled

**Issue**: App shows old interface
**Solution**: The app now auto-copies HTML files during build. Run `npm run build` to update.

## Technical Notes

The app now:
- Automatically copies HTML files during build
- Handles Drive API errors gracefully
- Shows appropriate fallback options
- Provides clear user feedback at each step
- Has comprehensive error handling and logging
