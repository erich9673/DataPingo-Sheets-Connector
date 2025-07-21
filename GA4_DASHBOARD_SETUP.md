# GA4 Dashboard Setup Guide - DataPingo Sheets Connector

**GA4 Property ID**: G-W5VY62S4LR  
**Date**: July 21, 2025

## 🚀 Quick Setup Steps

### 1. Access Your GA4 Property
1. Go to [Google Analytics 4](https://analytics.google.com/)
2. Select property with ID: `G-W5VY62S4LR`
3. If you don't see it, make sure you're logged into the correct Google account

### 2. Real-Time Reports Setup

#### Navigate to Real-Time:
```
GA4 Dashboard → Reports → Realtime
```

#### What You'll See:
- **Active Users**: Current users on your site
- **Event Count by Event Name**: Live events firing
- **User Activity**: Real-time user actions

#### Key Events to Monitor:
- `file_download` - Admin exports happening now
- `google_oauth` - Users connecting Google accounts
- `slack_connection` - Slack integrations
- `user_signup` - New registrations
- `page_view` - Site traffic

---

## 📊 Custom Dashboard Creation

### Dashboard 1: Install & Conversion Tracking

#### Step-by-Step:
1. **Go to**: Reports → Library → Create Report → Dashboard
2. **Name**: "DataPingo Install Tracking"
3. **Add Charts**:

**Chart 1: Daily Installs**
```
Chart Type: Time Series
Metric: Events (filter: event_name = "slack_app_install_click")
Dimension: Date
Time Range: Last 30 days
```

**Chart 2: Download Counts**
```
Chart Type: Scorecard
Metric: Events (filter: event_name = "file_download")
Secondary Metric: Unique Users
Time Range: Last 7 days
```

**Chart 3: User Journey Funnel**
```
Chart Type: Funnel
Steps:
1. Page View (website)
2. slack_app_install_click
3. user_signup
4. google_oauth
```

### Dashboard 2: Feature Usage Analytics

**Chart 1: Feature Adoption**
```
Chart Type: Bar Chart
Metric: Events
Dimension: Event Name
Filters: 
- monitoring_job_created
- slack_connection
- google_oauth
```

**Chart 2: User Engagement**
```
Chart Type: Line Chart
Metric: Average Engagement Time
Dimension: Date
Time Range: Last 14 days
```

---

## 🎯 Key Metrics to Track

### Conversion Funnel Metrics:
1. **Website Visits** → `page_view` on datapingo.com
2. **Try Now Clicks** → `slack_app_install_click`
3. **App Installs** → `slack_app_metrics` (install)
4. **User Signups** → `user_signup`
5. **Google Connect** → `google_oauth`
6. **First Monitoring Job** → `monitoring_job_created`

### Daily KPIs:
- **New Installs**: Count of `slack_app_install_click`
- **Active Users**: Daily active users
- **Feature Usage**: `monitoring_job_created` events
- **Downloads**: `file_download` events
- **Conversion Rate**: Signups / Install clicks

---

## 🔧 Custom Report Setup Instructions

### Create "DataPingo KPI Dashboard":

1. **Navigate**: Reports → Library → Create Report → Dashboard
2. **Name**: "DataPingo Daily KPIs"

### Add These Charts:

#### Chart 1: Install Funnel (Last 30 Days)
```
Chart Type: Funnel exploration
Steps:
1. Event: page_view (website visits)
2. Event: slack_app_install_click (try now clicks)
3. Event: user_signup (actual signups)
4. Event: google_oauth (connected Google)

Dimensions: Date
```

#### Chart 2: Daily Downloads
```
Chart Type: Time series
Metric: Events
Filter: event_name exactly matches "file_download"
Dimension: Date
Breakdown: event_label (csv, json)
```

#### Chart 3: Feature Usage Heatmap
```
Chart Type: Table
Rows: Event name
Columns: Date
Values: Event count
Filters: Include events starting with "monitoring_" or "slack_" or "google_"
```

#### Chart 4: Real-Time Activity (Scorecard)
```
Chart Type: Scorecard
Metric: Active users (1 day)
Secondary Metric: Events (1 day)
Time Range: Today
```

---

## 📱 Mobile App for Real-Time Monitoring

### Download GA4 Mobile App:
- iOS: [Google Analytics App](https://apps.apple.com/app/google-analytics/id881599038)
- Android: [Google Analytics App](https://play.google.com/store/apps/details?id=com.google.android.apps.giant)

### Setup Mobile Notifications:
1. Open GA4 mobile app
2. Go to Intelligence → Insights
3. Create Custom Alerts:
   - "New Install Alert": When `slack_app_install_click` > 5 per hour
   - "Download Spike": When `file_download` > 10 per day
   - "Signup Alert": When `user_signup` > 3 per hour

---

## 🎨 Visualization Tips

### Best Chart Types for Each Metric:

**Installs Over Time**: Line Chart or Time Series
**Download Counts**: Scorecards or Bar Charts  
**User Journey**: Funnel Charts
**Feature Usage**: Heat Maps or Stacked Bar Charts
**Real-Time Activity**: Scorecards with auto-refresh

### Color Coding:
- 🟢 Green: Successful events (installs, signups)
- 🔵 Blue: User actions (clicks, views)
- 🟡 Yellow: Feature usage (monitoring, exports)
- 🔴 Red: Errors or failed attempts

---

## 🚨 Important Custom Events to Monitor

Based on your analytics.ts setup, watch for these specific events:

```typescript
// Key events already implemented:
- file_download (admin exports)
- google_oauth (auth success/failure)
- slack_connection (webhook setup)
- monitoring_job_created (feature usage)
- user_signup (new registrations)
- feature_usage (general interactions)
```

---

## 🔍 Debugging Your Setup

### Test Your Events:
1. **Open your app**: https://web-production-aafd.up.railway.app
2. **Open GA4 Real-Time**: Reports → Realtime
3. **Perform actions**: Login, export data, connect Slack
4. **Verify events appear** in real-time view (may take 1-2 minutes)

### Common Issues:
- **Events not showing**: Check browser console for analytics errors
- **Wrong data**: Verify measurement ID is `G-W5VY62S4LR`
- **Delayed data**: GA4 has 1-4 hour delay for detailed reports

---

**Next Step**: Would you like me to help you implement the website tracking for the "Try Now for Free" button on datapingo.com?
