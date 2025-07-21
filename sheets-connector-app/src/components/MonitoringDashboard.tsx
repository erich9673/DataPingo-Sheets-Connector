import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { Analytics } from '../utils/analytics';
import { DownloadHelper } from '../utils/downloadHelper';

interface SpreadsheetConfigData {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  range: string;
  conditions: Array<{
    id: string;
    cell: string;
    operator: string;
    value: string;
    description: string;
  }>;
}

interface MonitoringDashboardProps {
  spreadsheet: any;
  webhookUrl: string;
  config: SpreadsheetConfigData;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  spreadsheet,
  webhookUrl,
  config
}) => {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [realtimeSetupLoading, setRealtimeSetupLoading] = useState(false);

  const setupRealtimeMonitoring = async () => {
    setRealtimeSetupLoading(true);
    try {
      // Determine if this is an uploaded file or Google Sheets
      const isUploadedFile = spreadsheet.type === 'uploaded';
      
      const requestBody: any = {
        cellRange: isUploadedFile ? config.range : `${config.sheetName}!${config.range}`,
        webhookUrl: webhookUrl,
        frequencyMinutes: 1, // Check every minute for now
        userMention: '@channel',
        conditions: config.conditions
      };

      if (isUploadedFile) {
        // For uploaded files, use fileId
        requestBody.fileId = spreadsheet.id;
      } else {
        // For Google Sheets, use sheetId
        requestBody.sheetId = spreadsheet.id;
      }

      // Start monitoring with the user's configuration
      const response = await fetch(API_ENDPOINTS.monitoringStart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        setRealtimeEnabled(true);
        const sourceType = isUploadedFile ? 'uploaded file' : 'Google Sheets';
        alert(`🚀 Real-time monitoring started for ${sourceType}! You will receive notifications when conditions are met.`);
        // Jobs will be automatically refreshed by the global component
      } else {
        alert(`❌ Failed to start monitoring: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Error starting monitoring. Please try again.');
    } finally {
      setRealtimeSetupLoading(false);
    }
  };

  const stopMonitoring = async (jobId: string) => {
    try {
      console.log('Stopping monitoring job:', jobId);
      const response = await fetch(API_ENDPOINTS.monitoringStop(jobId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Stop response status:', response.status);
      const data = await response.json();
      console.log('Stop response data:', data);
      
      if (data.success) {
        alert('✅ Monitoring stopped');
        // Jobs will be automatically refreshed by the global component
      } else {
        alert(`❌ Failed to stop monitoring: ${data.error}`);
      }
    } catch (error) {
      console.error('Stop monitoring error:', error);
      alert(`❌ Error stopping monitoring: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  // Add export functionality
  const exportJobData = async (jobId: string, format: 'csv' | 'json' = 'json') => {
    try {
      const response = await fetch(API_ENDPOINTS.monitoringJobs);
      if (!response.ok) throw new Error('Failed to fetch monitoring data');
      
      const allJobs = await response.json();
      const jobData = allJobs.find((job: any) => job.id === jobId);
      
      if (!jobData) throw new Error('Job not found');
      
      const filename = DownloadHelper.generateTimestampedFilename(
        `monitoring_job_${jobId}`, 
        format
      );
      
      if (format === 'csv') {
        const csvData = [{
          jobId: jobData.id,
          spreadsheet: jobData.spreadsheetName || 'Unknown',
          sheet: jobData.sheetName || 'Unknown',
          range: jobData.range || 'Unknown',
          status: jobData.status || 'Unknown',
          lastCheck: jobData.lastCheck || 'Never',
          conditions: JSON.stringify(jobData.conditions || [])
        }];
        DownloadHelper.downloadCsv(csvData, filename, `Job ${jobId}`);
      } else {
        DownloadHelper.downloadMonitoringReport(jobData, filename, format);
      }
      
      Analytics.trackFeatureUsage('monitoring_dashboard', 'export_job_data');
    } catch (error) {
      console.error('Export failed:', error);
      Analytics.trackError(`Job export failed: ${error}`, 'monitoring_dashboard');
    }
  };

  const exportConfiguration = () => {
    const configData = {
      spreadsheet: {
        id: spreadsheet.id,
        name: spreadsheet.name || 'Unknown',
        type: spreadsheet.type || 'unknown'
      },
      config: config,
      webhookUrl: webhookUrl,
      exportedAt: new Date().toISOString()
    };
    
    const filename = DownloadHelper.generateTimestampedFilename('monitoring_config', 'json');
    DownloadHelper.downloadConfig(configData, filename, 'monitoring_configuration');
    Analytics.trackFeatureUsage('monitoring_dashboard', 'export_configuration');
  };

  return (
    <div className="connector-card fade-in">
      <div className="connector-header">
        <h3>⚡ Step 3: Setup Monitoring</h3>
        <span className="status-badge connected">🚀 Ready</span>
      </div>
      
      <div className="connector-content">
        <div className="monitoring-setup">
          <h4>📊 Monitor: {spreadsheet.name}</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Connect Google Sheets to Slack for real-time notifications
          </p>
          
          {/* Real-time Monitoring Section */}
          <div className="test-result success" style={{ marginBottom: '2rem' }}>
            <h5>🚀 Real-time Monitoring</h5>
            <p>Enable instant notifications when your Google Sheet changes!</p>
            
            {!realtimeEnabled ? (
              <button
                onClick={setupRealtimeMonitoring}
                disabled={realtimeSetupLoading}
                className="btn-primary btn-large"
              >
                {realtimeSetupLoading ? '⏳ Setting up...' : '🚀 Start Real-Time Monitoring'}
              </button>
            ) : (
              <div className="connected-info">
                ✅ Real-time monitoring is active! Changes detected automatically.
              </div>
            )}
          </div>

          {/* Export Section */}
          <div className="export-section">
            <h5>📥 Export Data</h5>
            <p>Download monitoring data or configuration for backup or sharing.</p>
            
            <button
              onClick={() => exportJobData(spreadsheet.id, 'json')}
              className="btn-secondary"
            >
              📊 Export Job Data (JSON)
            </button>
            <button
              onClick={() => exportJobData(spreadsheet.id, 'csv')}
              className="btn-secondary"
              style={{ marginLeft: '1rem' }}
            >
              📊 Export Job Data (CSV)
            </button>
            <button
              onClick={exportConfiguration}
              className="btn-secondary"
              style={{ marginLeft: '1rem' }}
            >
              📂 Export Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
