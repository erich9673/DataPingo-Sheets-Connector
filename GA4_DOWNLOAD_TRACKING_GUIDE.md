# GA4 Download Tracking Implementation Guide

## Overview
Your DataPingo Sheets Connector now has comprehensive download tracking capabilities with Google Analytics 4. Here's how to implement and use them effectively.

## 1. Set Up Your GA4 Measurement ID

First, replace the placeholder with your actual GA4 measurement ID:

### In `src/index.html`:
```html
<!-- Replace GA_MEASUREMENT_ID with your actual ID -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### In `src/App.tsx`:
```typescript
// Replace 'GA_MEASUREMENT_ID' with your actual measurement ID
Analytics.init('G-XXXXXXXXXX');
```

### In `src/utils/analytics.ts`:
Replace both instances of `'GA_MEASUREMENT_ID'` with your actual measurement ID.

## 2. What Downloads Are Tracked

### Automatic Tracking:
- **App Installations**: When users install from Slack marketplace
- **Configuration Exports**: Backup files and settings
- **Monitoring Reports**: CSV and JSON exports of monitoring data
- **Template Downloads**: Setup guides and configuration templates
- **Spreadsheet Data Exports**: CSV/JSON exports of sheet data
- **External Documentation**: Links to help docs and resources

### Manual Tracking (when you add the functions):
- **Bulk Data Operations**: Large data processing tasks
- **Report Generation**: Custom reports and analytics
- **User Configuration Backups**: Personal settings exports

## 3. How to Use Download Tracking

### Basic Download Tracking:
```typescript
import { DownloadHelper } from '../utils/downloadHelper';

// For CSV data exports
DownloadHelper.downloadCsv(data, 'my-data.csv', 'Sheet1');

// For configuration backups
DownloadHelper.downloadConfig(configObject, 'backup.json', 'user_settings');

// For monitoring reports
DownloadHelper.downloadMonitoringReport(reportData, 'report.json', 'json');
```

### Track External Link Clicks:
```typescript
import { DownloadHelper } from '../utils/downloadHelper';

// When user clicks documentation links
const handleDocumentationClick = (url: string, docType: string) => {
  const filename = url.split('/').pop() || 'document';
  const fileType = filename.split('.').pop() || 'pdf';
  
  DownloadHelper.trackExternalDownload(url, filename, fileType);
  window.open(url, '_blank');
};
```

### Track Feature Usage with Downloads:
```typescript
import { Analytics } from '../utils/analytics';

// When user performs any download-related action
Analytics.trackFeatureUsage('monitoring_dashboard', 'export_data');
Analytics.trackFeatureUsage('google_sheets', 'download_template');
```

## 4. Available Download Functions

### From `downloadHelper.ts`:
- `downloadCsv(data, filename, sheetName)` - Export CSV with tracking
- `downloadConfig(config, filename, type)` - Export JSON config with tracking
- `downloadText(content, filename, type)` - Export text files with tracking
- `downloadMonitoringReport(data, filename, format)` - Export reports with tracking
- `downloadTemplate(data, filename, type)` - Export templates with tracking
- `trackExternalDownload(url, filename, type)` - Track external links

### From `analytics.ts`:
- `trackDownload(fileName, fileType, source)` - Basic download event
- `trackCsvExport(sheetName, rowCount)` - CSV-specific tracking
- `trackConfigExport(configType, size)` - Configuration export tracking
- `trackTemplateDownload(templateName, type)` - Template download tracking
- `trackReportGeneration(reportType, dataPoints, format)` - Report tracking
- `trackBulkOperation(operation, recordCount, success)` - Bulk operations

## 5. GA4 Events Created

### Event Types:
1. **`file_download`** - General file downloads
2. **`csv_export`** - CSV data exports  
3. **`config_export`** - Configuration backups
4. **`template_download`** - Template file downloads
5. **`report_generated`** - Report creation and download
6. **`bulk_operation`** - Large data operations

### Event Parameters:
- `file_name` - Name of downloaded file
- `file_type` - File extension (csv, json, pdf, etc.)
- `download_source` - Source of download (export, template, etc.)
- `sheet_name` - Name of spreadsheet/sheet
- `rows_exported` - Number of data rows
- `config_type` - Type of configuration exported
- `timestamp` - ISO timestamp of download

## 6. Add to Your Components

### In MonitoringDashboard.tsx:
```typescript
// Add export button
<button onClick={() => exportJobData(jobId, 'csv')}>
  📊 Export CSV
</button>
<button onClick={() => exportJobData(jobId, 'json')}>
  📋 Export JSON
</button>
<button onClick={exportConfiguration}>
  ⚙️ Export Config
</button>
```

### In GoogleSheetsConnector.tsx:
```typescript
// Add data export functionality
<button onClick={() => exportSpreadsheetData(spreadsheetId, sheetName, 'csv')}>
  📥 Download Data
</button>
```

### In App.tsx (for external links):
```typescript
// Track documentation clicks
<a 
  href="https://docs.datapingo.com/setup.pdf" 
  onClick={() => DownloadHelper.trackExternalDownload(
    'https://docs.datapingo.com/setup.pdf', 
    'setup.pdf', 
    'pdf'
  )}
  target="_blank"
>
  Setup Guide
</a>
```

## 7. View Analytics in GA4

### Go to Google Analytics 4:
1. **Events** → **All Events**
2. Look for events: `file_download`, `csv_export`, `config_export`, etc.
3. **Conversions** → Add download events as conversion goals
4. **Reports** → **Engagement** → **Events** for detailed analysis

### Key Metrics to Monitor:
- Download volume by file type
- Most popular exports (CSV vs JSON)
- Template download patterns
- User engagement with export features
- Conversion from page view to download

## 8. Custom Dimensions (Optional)

Add these to GA4 for better tracking:
- `user_type` (free vs premium)
- `integration_type` (google_sheets vs uploaded_file)
- `export_frequency` (daily, weekly, etc.)
- `data_size` (small, medium, large exports)

## 9. Privacy Considerations

- File names are tracked but not file contents
- Personal data in filenames is avoided (using IDs instead)
- User emails are only tracked with consent
- GDPR-compliant tracking (no personal data without consent)

## 10. Testing Your Tracking

### Local Testing:
```javascript
// In browser console
window.gtag('event', 'test_download', {
  event_category: 'downloads',
  event_label: 'test_file.csv',
  file_type: 'csv'
});
```

### Verify in GA4:
1. Go to **Configure** → **DebugView**
2. Perform downloads in your app
3. Check that events appear in real-time
4. Verify all custom parameters are captured

---

## Quick Start Checklist

- [ ] Replace `GA_MEASUREMENT_ID` with actual GA4 ID in all files
- [ ] Test download tracking in DebugView
- [ ] Add export buttons to your components
- [ ] Import and use `DownloadHelper` functions
- [ ] Set up GA4 conversion goals for key downloads
- [ ] Monitor download analytics in GA4 dashboard

Your download tracking is now ready! Users' download behavior will be automatically tracked and you can analyze engagement patterns in Google Analytics 4.
