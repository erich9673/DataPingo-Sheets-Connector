# 🚂 RAILWAY DEPLOYMENT GUIDE - Slack-only Version with Security

## Overview
This deployment includes admin file protection while maintaining your Slack-only functionality (no Teams/Discord features).

## 🔒 Security Features Implemented

### Protected Files
These files now require admin authentication:
- `admin.html` - Main admin dashboard
- `oauth-debug.html` - OAuth debugging interface  
- `frontend-debug.html` - Frontend debugging tools
- `manual-entry.html` - Manual data entry interface
- `test-auth.html` - Authentication testing page
- `beta.html` - Beta features page

### Security Headers
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-XSS-Protection**: Enabled with blocking mode
- **Content-Security-Policy**: Restrictive policy for admin pages
- **Referrer-Policy**: strict-origin-when-cross-origin

## 🚀 Railway Deployment Steps

### 1. Prepare for Deployment
```bash
# Build the application
npm run build

# Test locally (optional)
PORT=3000 node railway-server.js
```

### 2. Set Railway Environment Variables
In your Railway dashboard, add these environment variables:

**Required Security Variables:**
```bash
ADMIN_PASSWORD=YourSecurePassword123!
SESSION_SECRET=YourUltraSecureSessionSecret456!
```

**Required Google OAuth Variables:**
```bash
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
GOOGLE_REDIRECT_URI=https://your-railway-app.railway.app/api/auth/google/callback
```

**Application Variables:**
```bash
NODE_ENV=production
DATABASE_PATH=./data/monitoring.db
JWT_SECRET=your_jwt_secret_here
```

### 3. Deploy to Railway
```bash
# Commit your changes
git add .
git commit -m "Add security protection for admin files - Slack-only version"

# Push to Railway (if connected to Git)
git push origin main
```

Or use Railway CLI:
```bash
railway up
```

### 4. Update Google OAuth Redirect URI
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Update your OAuth 2.0 redirect URI to:
   ```
   https://your-railway-app.railway.app/api/auth/google/callback
   ```

## 🔐 Admin Access After Deployment

### Accessing Protected Files
1. Navigate to: `https://your-railway-app.railway.app/admin.html`
2. When prompted for credentials:
   - **Username**: `admin`
   - **Password**: `[your ADMIN_PASSWORD]`

### Testing Security
```bash
# Test without credentials (should get 401)
curl -i https://your-railway-app.railway.app/admin.html

# Test with credentials (should get admin page)
curl -u admin:YourPassword https://your-railway-app.railway.app/admin.html
```

## 📊 Monitoring & Health Checks

### Available Endpoints
- `https://your-app.railway.app/` - Main Slack connector interface
- `https://your-app.railway.app/health` - Health check
- `https://your-app.railway.app/test-railway` - Railway deployment test
- `https://your-app.railway.app/admin.html` - Protected admin dashboard

### Health Check Response
```json
{
  "status": "healthy",
  "service": "DataPingo Sheets Connector for Slack",
  "timestamp": "2024-07-26T06:19:30.123Z",
  "port": 3000,
  "environment": "production"
}
```

## 🛠️ Features Included

### ✅ Slack Integration
- Full Slack webhook support
- Google Sheets monitoring
- Real-time notifications
- User authentication with Google OAuth

### ✅ Security Features
- Admin file protection with HTTP Basic Auth
- Security headers for all responses
- Protected debug interfaces
- Graceful error handling

### ❌ Removed Features (as requested)
- Microsoft Teams integration (removed)
- Discord integration (removed)
- Multi-platform webhook detection (removed)

## 🔧 Troubleshooting

### Admin Access Issues
1. **401 Unauthorized**: Check your `ADMIN_PASSWORD` environment variable
2. **File Not Found**: Verify admin files exist in backend/public directory
3. **Security Headers**: Check browser developer tools for CSP violations

### Backend Integration Issues
1. Check Railway logs for backend startup errors
2. Verify all environment variables are set
3. Test health endpoint: `/health`

### Google OAuth Issues
1. Verify `GOOGLE_REDIRECT_URI` matches Railway URL exactly
2. Check Google Cloud Console credentials
3. Test OAuth flow: `/api/auth/google`

## 📝 Security Best Practices

### Immediate Actions
1. **Change Default Password**: Set a strong `ADMIN_PASSWORD`
2. **Secure Session Secret**: Set a random `SESSION_SECRET` (32+ characters)
3. **Monitor Access**: Check Railway logs for authentication attempts

### Ongoing Security
1. **Regular Password Updates**: Change admin password monthly
2. **Access Monitoring**: Review admin access logs
3. **Dependency Updates**: Keep npm packages updated

## 🎯 Post-Deployment Checklist

- [ ] Railway app is accessible at main URL
- [ ] Health check endpoint returns "healthy"
- [ ] Admin pages require authentication
- [ ] Google OAuth flow works correctly
- [ ] Slack webhook notifications work
- [ ] All environment variables are set
- [ ] SSL/HTTPS is working
- [ ] Security headers are present

## 📞 Support

### If Issues Occur
1. Check Railway application logs
2. Verify environment variables in Railway dashboard
3. Test health endpoints
4. Review Google Cloud Console OAuth settings

### Emergency Access
If admin credentials are lost:
1. Update `ADMIN_PASSWORD` in Railway environment variables
2. Restart the Railway application
3. Use new credentials to access admin panel

---

**Note**: This deployment maintains your Slack-only functionality while adding essential security protection for admin interfaces. Teams and Discord features have been removed as requested.
