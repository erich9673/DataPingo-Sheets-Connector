import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

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
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
