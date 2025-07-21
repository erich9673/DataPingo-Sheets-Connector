// Example integration of download tracking in React components
// Add these methods to your existing components to enable download tracking

import { Analytics } from '../utils/analytics';
import { DownloadHelper } from '../utils/downloadHelper';
import { API_ENDPOINTS } from '../config/api';

// 1. Add to MonitoringDashboard.tsx - Export monitoring reports
export const exportMonitoringReport = async (jobId: string, format: 'csv' | 'json' = 'json') => {
  try {
    // Use existing monitoring jobs endpoint to get report data
    const response = await fetch(API_ENDPOINTS.monitoringJobs);
    if (!response.ok) throw new Error('Failed to fetch monitoring data');
    
    const allJobs = await response.json();
    const jobData = allJobs.find((job: any) => job.id === jobId);
    
    if (!jobData) throw new Error('Job not found');
    
    const filename = DownloadHelper.generateTimestampedFilename(
      `monitoring_report_${jobId}`, 
      format
    );
    
    if (format === 'csv') {
      // Convert job data to CSV format
      const csvData = [{
        jobId: jobData.id,
        spreadsheet: jobData.spreadsheetName,
        sheet: jobData.sheetName,
        range: jobData.range,
        status: jobData.status,
        lastCheck: jobData.lastCheck,
        conditions: JSON.stringify(jobData.conditions)
      }];
      DownloadHelper.downloadCsv(csvData, filename, `Job ${jobId}`);
    } else {
      DownloadHelper.downloadMonitoringReport(jobData, filename, format);
    }
    
    // Track feature usage
    Analytics.trackFeatureUsage('monitoring_dashboard', 'export_report');
  } catch (error) {
    console.error('Export failed:', error);
    Analytics.trackError(`Report export failed: ${error}`, 'monitoring_dashboard');
  }
};

// 2. Add to GoogleSheetsConnector.tsx - Export spreadsheet data
export const exportSpreadsheetData = async (spreadsheetId: string, sheetName: string, range: string = 'A1:Z1000', format: 'csv' | 'json' = 'csv') => {
  try {
    const response = await fetch(API_ENDPOINTS.cellValues(spreadsheetId, `${sheetName}!${range}`));
    if (!response.ok) throw new Error('Failed to fetch spreadsheet data');
    
    const data = await response.json();
    const filename = DownloadHelper.generateTimestampedFilename(
      `${sheetName}_export`, 
      format
    );
    
    if (format === 'csv') {
      // Convert Google Sheets values to CSV format
      const csvData = data.values ? data.values.map((row: any[], index: number) => {
        const rowData: any = {};
        row.forEach((cell, cellIndex) => {
          rowData[`Column_${String.fromCharCode(65 + cellIndex)}`] = cell;
        });
        return rowData;
      }) : [];
      DownloadHelper.downloadCsv(csvData, filename, sheetName);
    } else {
      DownloadHelper.downloadConfig(data, filename, 'spreadsheet_data');
    }
    
    // Track the export
    Analytics.trackFeatureUsage('google_sheets', 'export_data');
  } catch (error) {
    console.error('Export failed:', error);
    Analytics.trackError(`Spreadsheet export failed: ${error}`, 'google_sheets_connector');
  }
};

// For uploaded files
export const exportUploadedFileData = async (fileId: string, range: string = 'A1:Z1000', format: 'csv' | 'json' = 'csv') => {
  try {
    const response = await fetch(API_ENDPOINTS.getFileValues(fileId, range));
    if (!response.ok) throw new Error('Failed to fetch file data');
    
    const data = await response.json();
    const filename = DownloadHelper.generateTimestampedFilename(
      `file_${fileId}_export`, 
      format
    );
    
    if (format === 'csv') {
      DownloadHelper.downloadCsv(data.values || [], filename, `File ${fileId}`);
    } else {
      DownloadHelper.downloadConfig(data, filename, 'file_data');
    }
    
    // Track the export
    Analytics.trackFeatureUsage('file_upload', 'export_data');
  } catch (error) {
    console.error('Export failed:', error);
    Analytics.trackError(`File export failed: ${error}`, 'file_upload_connector');
  }
};

// 3. Add configuration backup/restore functionality
export const exportConfiguration = (config: any) => {
  const filename = DownloadHelper.generateTimestampedFilename('datapingo_config', 'json');
  DownloadHelper.downloadConfig(config, filename, 'full_backup');
  Analytics.trackFeatureUsage('configuration', 'backup_export');
};

// 4. Add template download functionality
export const downloadTemplate = (templateType: string) => {
  const templates = {
    'monitoring_conditions': {
      name: 'monitoring_conditions_template.json',
      data: {
        conditions: [
          {
            id: "example_1",
            cell: "B2",
            operator: "greater_than",
            value: "100",
            description: "Alert when sales exceed 100"
          }
        ]
      }
    },
    'slack_webhook': {
      name: 'slack_webhook_setup.txt',
      data: `# Slack Webhook Setup Instructions
1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Go to Incoming Webhooks
4. Add New Webhook to Workspace
5. Copy the webhook URL
6. Paste it in DataPingo Sheets Connector`
    }
  };
  
  const template = templates[templateType as keyof typeof templates];
  if (template) {
    if (typeof template.data === 'string') {
      DownloadHelper.downloadText(template.data, template.name, 'template');
    } else {
      DownloadHelper.downloadTemplate(template.data, template.name, templateType);
    }
    Analytics.trackFeatureUsage('templates', 'download');
  }
};

// 5. Add monitoring logs export
export const exportMonitoringLogs = async (jobId: string, days: number = 7) => {
  try {
    // Use existing monitoring jobs endpoint to get log data
    const response = await fetch(API_ENDPOINTS.monitoringJobs);
    if (!response.ok) throw new Error('Failed to fetch logs');
    
    const allJobs = await response.json();
    const jobData = allJobs.find((job: any) => job.id === jobId);
    
    if (!jobData) throw new Error('Job not found');
    
    // Create a log report from available job data
    const logReport = {
      jobId: jobData.id,
      generatedAt: new Date().toISOString(),
      daysPeriod: days,
      jobInfo: jobData,
      // Include any log-like data available
      history: jobData.history || [],
      alerts: jobData.alerts || [],
      status: jobData.status,
      lastCheck: jobData.lastCheck
    };
    
    const filename = DownloadHelper.generateTimestampedFilename(
      `monitoring_logs_${jobId}`, 
      'json'
    );
    
    DownloadHelper.downloadConfig(logReport, filename, 'monitoring_logs');
    Analytics.trackFeatureUsage('monitoring', 'export_logs');
  } catch (error) {
    console.error('Log export failed:', error);
    Analytics.trackError(`Log export failed: ${error}`, 'monitoring_logs');
  }
};

// 6. Track external documentation downloads
export const trackDocumentationDownload = (docType: string, url: string) => {
  const filename = url.split('/').pop() || 'document';
  const fileType = filename.split('.').pop() || 'pdf';
  
  DownloadHelper.trackExternalDownload(url, filename, fileType);
  Analytics.trackFeatureUsage('documentation', 'download');
  
  // Open the external link
  window.open(url, '_blank');
};

// 7. Add bulk data operations tracking
export const performBulkOperation = async (operation: string, data: any[]) => {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Perform your bulk operation here
    // const result = await someBulkOperation(data);
    
    success = true;
    const duration = Date.now() - startTime;
    
    // Track the operation
    Analytics.trackBulkOperation(operation, data.length, success);
    Analytics.trackFeatureUsage('bulk_operations', operation);
    
    console.log(`✅ Bulk ${operation} completed: ${data.length} records in ${duration}ms`);
  } catch (error) {
    console.error(`❌ Bulk ${operation} failed:`, error);
    Analytics.trackBulkOperation(operation, data.length, false);
    Analytics.trackError(`Bulk ${operation} failed: ${error}`, 'bulk_operations');
  }
};
