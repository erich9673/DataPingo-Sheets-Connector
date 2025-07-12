import React, { useState, useEffect } from 'react';
import GoogleSheetsConnector from './components/GoogleSheetsConnector';
import { SpreadsheetConfig } from './components/SpreadsheetConfig';
import SlackConnector from './components/SlackConnector';
import MonitoringDashboard from './components/MonitoringDashboard';
import './styles/App.css';

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

interface AppState {
  isGoogleConnected: boolean;
  isConfigured: boolean;
  isSlackConnected: boolean;
  currentSpreadsheet: any;
  availableSpreadsheets: any[];
  spreadsheetConfig: SpreadsheetConfigData | null;
  webhookUrl: string;
}

interface MonitoringJob {
  id: string;
  sheetId: string;
  cellRange: string;
  frequencyMinutes: number;
  isActive: boolean;
  createdAt: string;
  lastChecked?: string;
  spreadsheetName: string;
}

// Global Active Jobs Component
const GlobalActiveJobs: React.FC = () => {
  const [activeJobs, setActiveJobs] = useState<MonitoringJob[]>([]);

  const loadActiveJobs = async () => {
    try {
      console.log('🔄 Loading active jobs from:', 'http://localhost:3001/api/monitoring/jobs');
      const response = await fetch('http://localhost:3001/api/monitoring/jobs', {
        method: 'GET',
        headers: { 
          'Accept': 'application/json' 
        },
        mode: 'cors'
      });
      
      console.log('📡 Load jobs response status:', response.status);
      console.log('📡 Load jobs response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to load jobs:', errorText);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Active jobs loaded:', data);
      
      if (data.success) {
        setActiveJobs(data.jobs || []);
      } else {
        console.error('❌ API returned error:', data.error);
      }
    } catch (error) {
      console.error('🚨 Error loading jobs:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Network error: Cannot connect to backend server at http://localhost:3001');
      }
    }
  };

  const stopMonitoring = async (jobId: string) => {
    try {
      console.log('🛑 Stopping monitoring job:', jobId);
      console.log('🌐 Making request to:', `http://localhost:3001/api/monitoring/stop/${jobId}`);
      
      const response = await fetch(`http://localhost:3001/api/monitoring/stop/${jobId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      console.log('📡 Stop response status:', response.status);
      console.log('📡 Stop response ok:', response.ok);
      console.log('📡 Stop response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Stop response data:', data);
      
      if (data.success) {
        alert('✅ Monitoring stopped successfully!');
        await loadActiveJobs(); // Refresh the jobs list
      } else {
        alert(`❌ Failed to stop monitoring: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🚨 Stop monitoring error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert(`❌ Network error: Cannot connect to backend server. Is http://localhost:3001 running?`);
      } else {
        alert(`❌ Error stopping monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  useEffect(() => {
    loadActiveJobs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActiveJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  if (activeJobs.length === 0) {
    return (
      <div className="connector-card fade-in" style={{ marginBottom: '2rem' }}>
        <div className="connector-header">
          <h3>📋 Active Monitoring Jobs (0)</h3>
          <span className="status-badge">⚪ None</span>
        </div>
        
        <div className="connector-content">
          <p className="no-jobs">No active monitoring jobs. Set up monitoring below to see jobs here! 🚀</p>
          
          <button 
            className="btn-secondary"
            onClick={loadActiveJobs}
          >
            🔄 Refresh Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="connector-card fade-in" style={{ marginBottom: '2rem' }}>
      <div className="connector-header">
        <h3>📋 Active Monitoring Jobs ({activeJobs.length})</h3>
        <span className="status-badge connected">🟢 Live</span>
      </div>
      
      <div className="connector-content">
        <div className="jobs-list">
          {activeJobs.map((job) => (
            <div key={job.id} className="job-item">
              <div className="job-info">
                <h5>{job.spreadsheetName}</h5>
                <p>📍 Range: {job.cellRange}</p>
                <p>⏰ Every {job.frequencyMinutes} minute(s)</p>
                <p>🕒 Last checked: {job.lastChecked ? new Date(job.lastChecked).toLocaleString() : 'Never'}</p>
              </div>
              <div className="job-actions">
                <span className={`status ${job.isActive ? 'active' : 'inactive'}`}>
                  {job.isActive ? '🟢 Active' : '🔴 Inactive'}
                </span>
                <button 
                  className="btn-danger btn-small"
                  onClick={() => stopMonitoring(job.id)}
                >
                  🛑 Stop
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button 
          className="btn-secondary"
          onClick={loadActiveJobs}
        >
          🔄 Refresh Jobs
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isGoogleConnected: false,
    isConfigured: false,
    isSlackConnected: false,
    currentSpreadsheet: null,
    availableSpreadsheets: [],
    spreadsheetConfig: null,
    webhookUrl: ''
  });

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 DataPingo Sheets Connector</h1>
        <div className="tagline">🚀 Set it once, forget it forever!</div>
        <p>Connect Google Sheets to Slack for real-time notifications</p>
      </header>

      <main className="app-main">
        {/* Global Active Monitoring Jobs - Always visible at top */}
        <GlobalActiveJobs />
        
        <div className="setup-flow">
          {/* Step 1: Google Sheets Connection */}
          <GoogleSheetsConnector 
            isConnected={state.isGoogleConnected}
            currentSpreadsheet={state.currentSpreadsheet}
            onConnect={(spreadsheet, allSpreadsheets = []) => updateState({ 
              isGoogleConnected: true, 
              currentSpreadsheet: spreadsheet,
              availableSpreadsheets: allSpreadsheets
            })}
          />

          {/* Step 2: Configure Monitoring */}
          {state.isGoogleConnected && (
            <SpreadsheetConfig
              isConfigured={state.isConfigured}
              spreadsheets={state.availableSpreadsheets}
              onConfigure={(config) => updateState({
                isConfigured: true,
                spreadsheetConfig: config,
                currentSpreadsheet: {
                  id: config.spreadsheetId,
                  name: config.spreadsheetName,
                  sheets: [config.sheetName],
                  range: config.range,
                  conditions: config.conditions
                }
              })}
            />
          )}

          {/* Step 3: Slack Connection */}
          {state.isGoogleConnected && state.isConfigured && (
            <SlackConnector 
              isConnected={state.isSlackConnected}
              webhookUrl={state.webhookUrl}
              onConnect={(webhook) => updateState({ 
                isSlackConnected: true, 
                webhookUrl: webhook 
              })}
            />
          )}

          {/* Step 4: Monitoring Setup */}
          {state.isGoogleConnected && state.isConfigured && state.isSlackConnected && state.spreadsheetConfig && (
            <MonitoringDashboard 
              spreadsheet={state.currentSpreadsheet}
              webhookUrl={state.webhookUrl}
              config={state.spreadsheetConfig}
            />
          )}

          {/* Success Message */}
          {state.isGoogleConnected && state.isConfigured && state.isSlackConnected && (
            <div className="success-message fade-in">
              <h4>🎉 Setup Complete!</h4>
              <p>Your DataPingo Sheets Connector is now active and monitoring your spreadsheet for changes.</p>
              <ul>
                <li>✅ Google Sheets connected and authorized</li>
                <li>✅ Monitoring configured ({state.spreadsheetConfig?.conditions.length || 0} conditions)</li>
                <li>✅ Slack notifications configured</li>
                <li>✅ Real-time monitoring active</li>
                <li>✅ All changes will be instantly reported to your Slack channel</li>
              </ul>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>🚀 Set it once, forget it forever! | DataPingo Sheets Connector</p>
      </footer>
    </div>
  );
};

export default App;
