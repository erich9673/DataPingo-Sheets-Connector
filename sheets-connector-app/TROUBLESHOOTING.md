# Troubleshooting Guide - Sheets Connector

## Issue 1: "Could not load spreadsheets automatically"

### Root Cause
The Google Drive API is not enabled in your Google Cloud project. This is a one-time setup requirement.

### Solution Options

#### Option A: Enable Google Drive API (Recommended)
1. **Go to Google Cloud Console**: 
   - Visit: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=60189191818
   - Click "Enable API"
   - Wait 2-3 minutes for activation

2. **Restart the app**:
   - Close the Sheets Connector app
   - Run `npm start` again
   - Re-authenticate with Google
   - The spreadsheet dropdown will now work automatically

#### Option B: Use Manual Sheet ID (Works Immediately)
1. **Get your Sheet ID**:
   - Open your Google Sheet in a browser
   - Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - Example: `15rEzT4rJEAIhGrXZtgiOHKcQIhDPgEKIVnrxA5nnitM`

2. **Enter in the app**:
   - Use the "Enter Sheet ID manually" section
   - Paste your Sheet ID
   - Click "Load Sheet"

## Issue 2: "Configure Conditions" Button Greyed Out

### Root Cause
The conditions UI is only enabled **after** you add cells to track.

### Solution
1. **First complete these steps**:
   - ✅ Authenticate with Google Sheets
   - ✅ Load a spreadsheet (dropdown or manual ID)
   - ✅ Enter cell range (e.g., `F8`, `A1:B5`)
   - ✅ Click "Add Cells to Track"

2. **Then the conditions UI will be enabled**:
   - The "Add Condition" button will become clickable
   - You can configure notification rules

### How to Configure Conditions
1. **Select condition type**:
   - `Any change` - Notify on any modification
   - `Greater than` - Notify when value > threshold
   - `Less than` - Notify when value < threshold  
   - `Equals` - Notify when value matches exactly
   - `Contains` - Notify when text contains substring

2. **Enter value** (if needed):
   - For `greater_than`/`less_than`: Enter number (e.g., `10000`)
   - For `equals`/`contains`: Enter text (e.g., `"Done"`)

3. **Click "Add Condition"**

## Issue 3: Notifications Not Working

### Common Causes & Solutions

#### Slack Webhook Issues
1. **Check webhook URL format**:
   - Should start with: `https://hooks.slack.com/services/...`
   - Get from: Slack Settings > Apps > Incoming Webhooks

2. **Test webhook**:
   - Use curl to test: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' YOUR_WEBHOOK_URL`

#### MS Teams Webhook Issues
1. **Check webhook URL format**:
   - Should start with: `https://outlook.office.com/webhook/...`
   - Get from: Teams Channel > Connectors > Incoming Webhook

#### Frequency Too Low
1. **Check minimum frequency**:
   - Minimum: 30 seconds (0.5 minutes)
   - Recommended: 1-5 minutes
   - Too frequent checks may hit API limits

## Technical Details

### Current App Status
- ✅ Authentication working
- ✅ Manual Sheet ID working  
- ✅ Cell tracking working
- ✅ Conditions UI fixed (no more duplicates)
- ✅ Slack notifications working
- ⚠️ Spreadsheet dropdown requires Drive API

### What's Working Without Drive API
- Manual Sheet ID entry
- Cell range tracking
- Condition configuration
- Slack/Teams notifications
- Real-time monitoring

### What Requires Drive API
- Automatic spreadsheet dropdown
- Browsing user's spreadsheets
- Spreadsheet name auto-detection

## Quick Setup Flow

### For Immediate Use (No API Setup)
1. Authenticate → Enter Sheet ID → Add cells → Configure conditions → Start tracking

### For Full Features (With API Setup)
1. Enable Drive API → Authenticate → Select from dropdown → Add cells → Configure conditions → Start tracking

## Support

If you're still having issues:
1. Check the terminal output for error messages
2. Verify your Google Sheet is accessible 
3. Test webhook URLs independently
4. Ensure cell ranges are valid (e.g., `A1`, `F8`, `A1:B5`)
5. Check internet connection and firewall settings
