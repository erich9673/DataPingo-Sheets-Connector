# Troubleshooting Slack Notifications

## Common Issues and Solutions

### 1. **EIO Error (Fixed)**
- **Issue**: `Error: write EIO` when the app tries to log to console
- **Solution**: ✅ **FIXED** - All console.log statements now use safe logging that won't crash the app

### 2. **Not Getting Pinged in Slack**
Here are the most common reasons and solutions:

#### A. **Webhook URL Issues**
- **Check**: Make sure your webhook URL is correct
- **Format**: Should look like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`
- **Test**: Use the "Test Connection" button in the app to verify

#### B. **User Mention Configuration**
- **@channel**: Will ping everyone in the channel (use with caution!)
- **@here**: Will ping only active members
- **Custom mention**: Use `@username` for specific users or `<@U123456789>` for user IDs
- **No mention**: Won't ping anyone, just sends a regular message

#### C. **Slack Channel Settings**
- **Check**: Make sure the webhook is configured for the correct channel
- **Check**: Verify you're monitoring the channel where the webhook posts
- **Check**: Ensure notification settings in Slack allow pings from webhooks

#### D. **Monitoring Not Detecting Changes**
- **Check**: Verify the sheet ID is correct
- **Check**: Ensure the cell range is valid (e.g., A1:B5)
- **Check**: Make sure there are actual changes in the monitored cells
- **Check**: Check the monitoring frequency (minimum 10 seconds)

### 3. **How to Debug**

#### A. **Test the Webhook Connection**
1. Open the app
2. Configure notifications → Enable Slack
3. Enter your webhook URL
4. Use the test connection feature

#### B. **Check the Browser Console**
1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for any error messages
4. Check if monitoring is starting successfully

#### C. **Verify Sheet Access**
1. Make sure you're authenticated with Google Sheets
2. Verify the sheet ID is correct
3. Test loading the sheet information first

#### D. **Check Monitoring Status**
The app will show:
- "🟢 Tracking Active" when monitoring is running
- Error messages if something goes wrong
- Notification success/failure in the console

### 4. **Best Practices**

#### A. **Webhook URL Security**
- Keep your webhook URL secret
- Don't share it publicly
- Consider regenerating it if compromised

#### B. **Mention Usage**
- Use `@channel` sparingly (it pings everyone)
- Use `@here` for active members only
- Use specific user mentions for targeted notifications

#### C. **Monitoring Frequency**
- Don't set too frequent checks (minimum 10 seconds)
- Recommended: 1-5 minutes for most use cases
- Higher frequency = more API calls

### 5. **Common Slack Webhook Errors**

| Error | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | Invalid webhook URL | Check and update webhook URL |
| 400 Bad Request | Invalid message format | Contact support (this shouldn't happen) |
| 403 Forbidden | Webhook disabled/deleted | Recreate webhook in Slack |
| 500 Server Error | Slack service issue | Wait and try again |

### 6. **Getting Help**
If you're still having issues:
1. Check the console for error messages
2. Try the test connection feature
3. Verify your webhook URL format
4. Test with a simple cell change first
5. Check Slack notification settings

### 7. **Validation Features Added**
- ✅ Safe logging (prevents EIO crashes)
- ✅ Webhook URL validation
- ✅ Retry logic for failed notifications
- ✅ User mention options (@channel, @here, custom)
- ✅ Better error handling and reporting
