# GA4 Dashboard Creation - Detailed Step-by-Step Guide

**Property ID**: G-W5VY62S4LR  
**Time Required**: 15-20 minutes  
**Difficulty**: Beginner-friendly

## 🚀 Before You Start

1. **Open Google Analytics**: https://analytics.google.com/
2. **Verify Access**: Make sure you can see property `G-W5VY62S4LR`
3. **Have This Guide Open**: Keep these instructions visible while working

---

## 📊 Step 1: Navigate to Dashboard Creation

### 1.1 Go to Reports Library
```
Click: Reports (left sidebar)
Click: Library (at the bottom of Reports section)
```
**What you'll see**: A page titled "Reports Library" with existing reports and templates

### 1.2 Create New Dashboard
```
Click: "Create Report" (blue button, top right)
Select: "Dashboard" from dropdown menu
```
**What you'll see**: A dialog asking "Create a new dashboard or duplicate an existing one?"

### 1.3 Choose Creation Method
```
Select: "Create a new dashboard"
Click: "Create" (blue button)
```
**What you'll see**: Dashboard editor opens with "Untitled Dashboard"

---

## 🎯 Step 2: Name Your Dashboard

### 2.1 Set Dashboard Name
```
Click: "Untitled Dashboard" (top left)
Type: "DataPingo KPIs"
Press: Enter to save
```
**Result**: Dashboard is now named "DataPingo KPIs"

---

## 📈 Step 3: Add Chart 1 - Daily Installs (Time Series)

### 3.1 Add First Chart
```
Click: "Add chart" (large + button in center)
```
**What you'll see**: Chart editor panel opens on the right

### 3.2 Configure Chart Type
```
Chart Type: Select "Time series" (line chart icon)
Chart Title: Type "Daily Installs"
```

### 3.3 Set Dimensions
```
Dimensions:
- Click: "Add dimension"
- Select: "Date"
```

### 3.4 Set Metrics
```
Metrics:
- Click: "Add metric"
- Select: "Events"
```

### 3.5 Add Event Filter
```
Filters:
- Click: "Add filter"
- Select: "Event name"
- Condition: "exactly matches"
- Value: "slack_app_install_click"
```

### 3.6 Save Chart
```
Click: "Save" (blue button, top right of chart panel)
```
**Result**: Time series chart appears showing install clicks over time

---

## 🎯 Step 4: Add Chart 2 - Download Counts (Scorecard)

### 4.1 Add Second Chart
```
Click: "Add chart" (+ button, now in toolbar)
```

### 4.2 Configure Scorecard
```
Chart Type: Select "Scorecard" (number icon)
Chart Title: Type "Download Counts"
```

### 4.3 Set Primary Metric
```
Metrics:
- Click: "Add metric"
- Select: "Events"
```

### 4.4 Add Download Filter
```
Filters:
- Click: "Add filter"
- Select: "Event name"
- Condition: "exactly matches"
- Value: "file_download"
```

### 4.5 Set Time Range
```
Date Range:
- Select: "Last 7 days"
```

### 4.6 Save Chart
```
Click: "Save"
```
**Result**: Scorecard showing total downloads in last 7 days

---

## 🛤️ Step 5: Add Chart 3 - User Journey Funnel

### 5.1 Add Funnel Chart
```
Click: "Add chart"
Chart Type: Select "Funnel exploration"
Chart Title: Type "User Journey Funnel"
```

### 5.2 Define Funnel Steps
```
Step 1:
- Event: "page_view"
- Name: "Website Visits"

Step 2:
- Event: "slack_app_install_click"  
- Name: "Try Now Clicks"

Step 3:
- Event: "user_signup"
- Name: "App Signups"

Step 4:
- Event: "google_oauth"
- Name: "Google Connected"
```

### 5.3 Configure Funnel Settings
```
Time Range: "Last 30 days"
Breakdown: None (leave empty for now)
```

### 5.4 Save Funnel
```
Click: "Save"
```
**Result**: Funnel chart showing conversion at each step

---

## 📊 Step 6: Add Chart 4 - Feature Usage (Bar Chart)

### 6.1 Add Bar Chart
```
Click: "Add chart"
Chart Type: Select "Bar chart"
Chart Title: Type "Feature Usage"
```

### 6.2 Set Dimensions
```
Dimensions:
- Click: "Add dimension"
- Select: "Event name"
```

### 6.3 Set Metrics
```
Metrics:
- Click: "Add metric"
- Select: "Events"
```

### 6.4 Filter for Feature Events
```
Filters:
- Click: "Add filter"
- Select: "Event name"
- Condition: "contains"
- Value: "monitoring_job_created"

Add another filter:
- Select: "Event name"
- Condition: "contains"  
- Value: "slack_connection"

Add another filter:
- Select: "Event name"
- Condition: "contains"
- Value: "google_oauth"
```

### 6.5 Sort Results
```
Sort: By "Events" (descending)
Show: Top 10 results
```

### 6.6 Save Chart
```
Click: "Save"
```
**Result**: Bar chart showing which features are used most

---

## ✅ Step 7: Arrange and Finalize Dashboard

### 7.1 Arrange Charts
```
Drag charts to arrange in this layout:
┌─────────────┬─────────────┐
│ Daily       │ Download    │
│ Installs    │ Counts      │
│ (line)      │ (scorecard) │
├─────────────┴─────────────┤
│ User Journey Funnel       │
│ (funnel chart)            │
├───────────────────────────┤
│ Feature Usage             │
│ (bar chart)               │
└───────────────────────────┘
```

### 7.2 Save Dashboard
```
Click: "Save" (top right, main dashboard save)
```

### 7.3 Set Dashboard Settings
```
Click: Settings icon (gear, top right)
Auto-refresh: Select "5 minutes"
Date range: "Last 30 days"
Click: "Apply"
```

---

## 🎉 Step 8: Test Your Dashboard

### 8.1 Verify Data Shows
- **Daily Installs**: Should show a line graph (may be empty if no installs yet)
- **Download Counts**: Should show a number (test by doing an export)
- **User Journey**: Should show funnel steps
- **Feature Usage**: Should show bars for different features

### 8.2 Test Real-Time Updates
1. Open your app: https://web-production-aafd.up.railway.app
2. Perform actions (login, export data)
3. Refresh dashboard after 2-3 minutes
4. Watch numbers update

---

## 🔧 Troubleshooting

### No Data Showing?
1. **Check Date Range**: Make sure it includes recent dates
2. **Verify Events**: Go to Reports → Realtime to see if events are firing
3. **Check Filters**: Make sure event names match exactly
4. **Wait for Data**: GA4 can take 1-4 hours for full data processing

### Charts Look Empty?
- **Daily Installs**: Normal if no website tracking yet
- **Downloads**: Do an admin export to generate data
- **User Journey**: Will populate as users complete actions
- **Feature Usage**: Login and use features to generate data

### Event Names Not Found?
Double-check these exact event names in your filters:
- `slack_app_install_click`
- `file_download`
- `user_signup`
- `google_oauth`
- `monitoring_job_created`

---

## 📱 Next Steps

1. **Share Dashboard**: 
   ```
   Click: Share (top right)
   Add: Team members' emails
   Set: Viewer permissions
   ```

2. **Create Alerts**:
   ```
   Go to: Admin → Intelligence
   Create: Custom alerts for key metrics
   ```

3. **Export Dashboard**:
   ```
   Click: Export (top right)
   Choose: PDF or PNG for reports
   ```

---

**🎯 Success Criteria**: 
- 4 charts created and showing data
- Dashboard auto-refreshes every 5 minutes  
- Charts show relevant metrics for your app
- You can see real-time data when testing

**⏱️ Total Time**: 15-20 minutes for complete setup
