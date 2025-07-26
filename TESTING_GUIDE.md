# 🧪 MANUAL TESTING GUIDE

## Local Testing (Before Railway)

### 1. Start Local Server
```bash
cd "/Users/erichuang/Desktop/Sheets Connector for Slack"
PORT=3001 node railway-server.js
```

### 2. Test Main Interface
- Open: http://localhost:3001
- Should show: DataPingo Sheets Connector interface
- Should work: Google OAuth login

### 3. Test Admin Protection
**Without credentials:**
- Open: http://localhost:3001/admin.html
- Should show: HTTP Basic Auth prompt
- Should happen: 401 Unauthorized if you cancel

**With wrong credentials:**
- Username: admin
- Password: wrongpassword
- Should happen: Access denied message

**With correct credentials:**
- Username: admin
- Password: datapingo-admin-2024-secure
- Should show: Admin dashboard

### 4. Test Protected Files
Try accessing these without auth (should all require login):
- http://localhost:3001/oauth-debug.html
- http://localhost:3001/frontend-debug.html
- http://localhost:3001/manual-entry.html
- http://localhost:3001/beta.html

### 5. Test API Endpoints
- Health: http://localhost:3001/health
- API Health: http://localhost:3001/api/health
- Railway Test: http://localhost:3001/test-railway

## Railway Testing (After Deployment)

### 1. Update URLs
Replace `localhost:3001` with your Railway URL:
`https://your-app-name.railway.app`

### 2. Environment Variables Check
In Railway dashboard, verify these are set:
- ✅ ADMIN_PASSWORD
- ✅ SESSION_SECRET
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GOOGLE_REDIRECT_URI
- ✅ NODE_ENV=production

### 3. Test Production Security
```bash
# Test from command line
RAILWAY_URL="https://your-app.railway.app"

# Health check
curl "$RAILWAY_URL/health"

# Admin protection (should get 401)
curl -I "$RAILWAY_URL/admin.html"

# Admin access (use your password)
curl -u admin:YourPassword "$RAILWAY_URL/admin.html"
```

### 4. Browser Testing
1. **Main app**: Visit your Railway URL
2. **Admin login**: Visit /admin.html, enter credentials
3. **Security headers**: Check in browser dev tools
4. **OAuth flow**: Test Google login integration

## Browser Dev Tools Testing

### 1. Security Headers Check
1. Open your app in browser
2. Press F12 → Network tab
3. Refresh page
4. Click on main document request
5. Check Response Headers:
   - ✅ X-Frame-Options: DENY
   - ✅ X-Content-Type-Options: nosniff
   - ✅ X-XSS-Protection: 1; mode=block
   - ✅ Referrer-Policy: strict-origin-when-cross-origin

### 2. Admin Protection Test
1. Try to access `/admin.html` in incognito window
2. Should see HTTP Basic Auth popup
3. Cancel → should see "Authentication required" page
4. Enter wrong credentials → should see "Invalid credentials"
5. Enter correct credentials → should see admin dashboard

### 3. Console Error Check
1. Open Console tab in dev tools
2. Should see no security-related errors
3. Look for any CSP violations

## Load Testing (Optional)

### Basic Load Test
```bash
# Install Apache Bench (if not installed)
# macOS: brew install httpd

# Test main page
ab -n 100 -c 10 http://localhost:3001/

# Test health endpoint
ab -n 100 -c 10 http://localhost:3001/health
```

## Slack Integration Testing

### 1. Google OAuth Flow
1. Visit your app
2. Click "Connect to Google Sheets"
3. Complete OAuth flow
4. Should return to app successfully

### 2. Slack Webhook Test
1. Access admin panel (with credentials)
2. Set up a test monitoring job
3. Use a test Slack webhook URL
4. Verify notifications work

### 3. Sheet Monitoring Test
1. Connect a test Google Sheet
2. Set up monitoring for a cell
3. Change the cell value
4. Check Slack for notification

## Security Audit Checklist

### ✅ Authentication
- [ ] Admin files require HTTP Basic Auth
- [ ] Wrong passwords are rejected
- [ ] Correct passwords grant access
- [ ] Session secrets are secure

### ✅ Authorization
- [ ] Protected files are inaccessible without auth
- [ ] Public files remain accessible
- [ ] API endpoints work correctly

### ✅ Security Headers
- [ ] X-Frame-Options prevents clickjacking
- [ ] X-Content-Type-Options prevents MIME sniffing
- [ ] XSS Protection is enabled
- [ ] CSP is configured for admin pages

### ✅ Environment Security
- [ ] Sensitive data in environment variables
- [ ] No hardcoded credentials in code
- [ ] Production environment properly configured

### ✅ Error Handling
- [ ] Graceful error messages
- [ ] No sensitive data in error responses
- [ ] Proper HTTP status codes

## Troubleshooting

### Common Issues
1. **401 on admin pages**: Check ADMIN_PASSWORD env var
2. **Backend integration errors**: Check logs for missing modules
3. **OAuth failures**: Verify Google redirect URI
4. **Missing security headers**: Check middleware setup

### Debug Commands
```bash
# Check environment variables
echo $ADMIN_PASSWORD
echo $SESSION_SECRET

# Check server logs
tail -f railway.log

# Test specific endpoints
curl -v http://localhost:3001/health
curl -v -u admin:password http://localhost:3001/admin.html
```

---

**🎯 Goal**: All tests should pass before Railway deployment!
**🔒 Security**: Admin access should always require authentication
**⚡ Performance**: Main app should load quickly and work smoothly
