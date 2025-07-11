import React, { useState, useEffect } from 'react';

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

interface MonitoringDashboardProps {
  spreadsheet: any;
  webhookUrl: string;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  spreadsheet,
  webhookUrl
}) => {
  const [cellRange, setCellRange] = useState('A1:B10');
  const [frequency, setFrequency] = useState(2);
  const [userMention, setUserMention] = useState('@channel');
  const [activeJobs, setActiveJobs] = useState<MonitoringJob[]>([]);
  const [loading, setLoading] = useState(false);

  // Load active jobs on component mount
  useEffect(() => {
    loadActiveJobs();
  }, []);

  const loadActiveJobs = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/debug/monitoring-jobs');
      const data = await response.json();
      
      if (data.success) {
        setActiveJobs(data.activeJobs || []);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const startMonitoring = async () => {
    if (!cellRange || frequency < 2) {
      alert('Please fill in all fields correctly');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/monitoring/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: spreadsheet.id,
          cellRange,
          webhookUrl,
          frequencyMinutes: frequency,
          userMention,
          conditions: []
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Monitoring started successfully!');
        loadActiveJobs(); // Reload the jobs list
      } else {
        alert(`❌ Failed to start monitoring: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Error starting monitoring. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stopMonitoring = async (jobId: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/monitoring/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Monitoring stopped');
        loadActiveJobs();
      } else {
        alert(`❌ Failed to stop monitoring: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Error stopping monitoring');
    }
  };

  return (
    <div className="connector-card">
      <div className="connector-header">
        <h3>⚡ Step 3: Set Up Monitoring</h3>
      </div>
      
      <div className="connector-content">
        <div className="monitoring-setup">
          <h4>📊 Monitor: {spreadsheet.name}</h4>
          
          <div className="form-group">
            <label htmlFor="cell-range">Cell Range to Monitor:</label>
            <input
              id="cell-range"
              type="text"
              value={cellRange}
              onChange={(e) => setCellRange(e.target.value)}
              placeholder="e.g., A1:B10"
              className="input-field"
            />
            <small>Examples: A1, A1:B10, Sheet1!A1:C5</small>
          </div>

          <div className="form-group">
            <label htmlFor="frequency">Check Every (minutes):</label>
            <input
              id="frequency"
              type="number"
              min="2"
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value))}
              className="input-field"
            />
            <small>Minimum: 2 minutes (network-safe)</small>
          </div>

          <div className="form-group">
            <label htmlFor="mention">Slack Mention:</label>
            <select
              id="mention"
              value={userMention}
              onChange={(e) => setUserMention(e.target.value)}
              className="input-field"
            >
              <option value="@channel">@channel (everyone)</option>
              <option value="@here">@here (active users)</option>
              <option value="">No mention</option>
            </select>
          </div>

          <button 
            className="btn-primary btn-large" 
            onClick={startMonitoring}
            disabled={loading}
          >
            {loading ? '🔄 Starting...' : '🚀 Start Monitoring'}
          </button>
        </div>

        {/* Active Monitoring Jobs */}
        <div className="active-jobs">
          <h4>📋 Active Monitoring Jobs ({activeJobs.length})</h4>
          {activeJobs.length === 0 ? (
            <p className="no-jobs">No active monitoring jobs. Start one above! 🚀</p>
          ) : (
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
          )}
          
          <button 
            className="btn-secondary"
            onClick={loadActiveJobs}
          >
            🔄 Refresh Jobs
          </button>
        </div>

        <div className="success-message">
          <h4>🎉 You're All Set!</h4>
          <p>Your monitoring is now active. You can close this page and the backend will continue monitoring your Google Sheet for changes and send notifications to Slack.</p>
          <p><strong>📱 What happens next:</strong></p>
          <ul>
            <li>✅ Backend monitors your sheet every {frequency} minute(s)</li>
            <li>✅ Sends Slack notifications when values change</li>
            <li>✅ Includes direct links to your Google Sheet</li>
            <li>✅ No need to keep this page open!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
