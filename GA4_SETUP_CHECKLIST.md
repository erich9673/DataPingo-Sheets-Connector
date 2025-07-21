# GA4 Setup Checklist - DataPingo

## ✅ Quick Setup Checklist

### Prerequisites:
- [ ] Access to Google Analytics account with property `G-W5VY62S4LR`
- [ ] Admin permissions on the GA4 property
- [ ] DataPingo app running at https://web-production-aafd.up.railway.app

### Real-Time Setup (5 minutes):
- [ ] 1. Go to https://analytics.google.com/
- [ ] 2. Select property `G-W5VY62S4LR`
- [ ] 3. Navigate to Reports → Realtime
- [ ] 4. Test: Visit your app and watch events appear
- [ ] 5. Verify these events show up:
  - [ ] `page_view` (when you visit the homepage)
  - [ ] `file_download` (when you export from admin)
  - [ ] `google_oauth` (when you connect Google account)

### Dashboard Creation (15 minutes):
- [ ] 1. Go to Reports → Library
- [ ] 2. Click "Create Report" → "Dashboard"
- [ ] 3. Name it "DataPingo KPIs"
- [ ] 4. Add charts for:
  - [ ] Daily installs (time series)
  - [ ] Download counts (scorecard)
  - [ ] User journey funnel
  - [ ] Feature usage (bar chart)

📋 **Detailed Instructions**: See `GA4_DASHBOARD_DETAILED_STEPS.md` for complete step-by-step guide with exact clicks and settings.

### Mobile App Setup (Optional, 5 minutes):
- [ ] 1. Download Google Analytics mobile app
- [ ] 2. Login with same Google account
- [ ] 3. Select your property
- [ ] 4. Set up custom alerts for installs/downloads

### Website Tracking Setup (Next Phase):
- [ ] Add GA4 code to datapingo.com
- [ ] Track "Try Now for Free" button clicks
- [ ] Set up complete user journey tracking

## 🎯 Key Metrics to Monitor Daily:

1. **Install Funnel**:
   - Website visits → Try Now clicks → App installs → User signups

2. **Feature Adoption**:
   - Google account connections
   - Slack webhook setups
   - First monitoring job created

3. **User Engagement**:
   - Admin dashboard usage
   - Data exports (CSV/JSON)
   - Session duration

## 📊 Expected Event Volume:

**Current Traffic** (Railway app):
- Page views: 10-50/day
- Downloads: 1-10/day  
- Signups: 1-5/day

**After Slack App Store Launch** (estimated):
- Page views: 100-500/day
- Downloads: 20-100/day
- Signups: 10-50/day

## 🚨 Alerts to Set Up:

1. **High Priority**:
   - New install spike (>10 installs/hour)
   - Error rate increase (>5 errors/hour)
   - Zero activity for 6+ hours

2. **Medium Priority**:
   - Daily download threshold (>20/day)
   - New user signups (>5/day)
   - Feature usage spikes

## 🔗 Quick Links:

- **GA4 Dashboard**: https://analytics.google.com/analytics/web/#/p{YOUR_PROPERTY_ID}/reports/dashboard
- **Real-Time View**: https://analytics.google.com/analytics/web/#/p{YOUR_PROPERTY_ID}/reports/realtime
- **Your App**: https://web-production-aafd.up.railway.app
- **Admin Dashboard**: https://web-production-aafd.up.railway.app/admin.html

---
**Time to Complete**: ~25 minutes total
**Difficulty**: Easy (just clicking through GA4 interface)
**Result**: Complete visibility into app usage and user journey! 📊
