import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { API_BASE_URL } from './config/api';
import { Analytics } from './utils/analytics';

type AuthStatus = 'idle' | 'requesting' | 'pending' | 'approved' | 'denied';

const App: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [userEmail, setUserEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Google Sheets state
  const [googleAuthStatus, setGoogleAuthStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [googleSheets, setGoogleSheets] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const [availableSheetTabs, setAvailableSheetTabs] = useState<any[]>([]);
  
  // Multi-platform notification configuration
  const [selectedPlatform, setSelectedPlatform] = useState<'slack' | 'teams' | 'discord'>('slack');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [platformConnected, setPlatformConnected] = useState(false);
  
  // Monitoring state
  const [showMonitoringConfig, setShowMonitoringConfig] = useState(false);
  const [monitoringJobs, setMonitoringJobs] = useState<any[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  
  // Monitoring config form state
  const [selectedSheetForMonitoring, setSelectedSheetForMonitoring] = useState<any>(null);
  const [manualSpreadsheetUrl, setManualSpreadsheetUrl] = useState('');
  const [useManualUrl, setUseManualUrl] = useState(false);
  const [selectedSheetTab, setSelectedSheetTab] = useState('');
  const [cellRange, setCellRange] = useState('A1');
  const [frequencyMinutes, setFrequencyMinutes] = useState(5);
  const [conditions, setConditions] = useState<any[]>([]);
  const [userMention, setUserMention] = useState('');

  // Simple auth check
  useEffect(() => {
    Analytics.init('G-W5VY62S4LR');
    Analytics.trackPageView(window.location.pathname, document.title);
    
    const token = localStorage.getItem('access_token');
    if (token) {
      setGoogleAuthStatus('connected');
      fetchGoogleSheets();
    }
  }, []);

  const handleGoogleAuth = async () => {
    setGoogleAuthStatus('connecting');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`);
      const data = await response.json();
      
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Auth error:', error);
      setGoogleAuthStatus('error');
    }
  };

  const fetchGoogleSheets = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/sheets/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sheets = await response.json();
        setGoogleSheets(sheets);
        setGoogleAuthStatus('connected');
      }
    } catch (error) {
      console.error('Error fetching sheets:', error);
    }
  };

  const handleWebhookTest = async () => {
    if (!webhookUrl) {
      alert('Please enter a webhook URL first');
      return;
    }

    try {
      const testMessage = {
        text: `✅ ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} webhook test successful!`,
        attachments: [{
          color: 'good',
          fields: [{
            title: 'Sheets Connector',
            value: `Your ${selectedPlatform} integration is working correctly!`,
            short: false
          }]
        }]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      });

      if (response.ok) {
        setPlatformConnected(true);
        alert(`${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} webhook test successful!`);
      } else {
        alert('Webhook test failed. Please check your URL.');
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      alert('Webhook test failed. Please check your URL.');
    }
  };

  const handleSheetSelection = async (sheet: any) => {
    setSelectedSheet(sheet);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/sheets/${sheet.id}/tabs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const tabs = await response.json();
        setAvailableSheetTabs(tabs);
      }
    } catch (error) {
      console.error('Error fetching sheet tabs:', error);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, {
      id: Date.now().toString(),
      type: 'contains',
      value: '',
      column: 'A'
    }]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, field: string, value: string) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const createMonitoringJob = async () => {
    if (!selectedSheet && !manualSpreadsheetUrl) {
      alert('Please select a spreadsheet');
      return;
    }
    
    if (!webhookUrl) {
      alert('Please configure your webhook URL');
      return;
    }

    const jobData = {
      spreadsheetId: useManualUrl ? null : selectedSheet?.id,
      spreadsheetUrl: useManualUrl ? manualSpreadsheetUrl : null,
      sheetTab: selectedSheetTab,
      cellRange,
      frequency: frequencyMinutes,
      conditions,
      webhookUrl,
      platform: selectedPlatform,
      userMention: userMention || null
    };

    try {
      const response = await fetch(`${API_BASE_URL}/monitoring/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        alert('Monitoring job created successfully!');
        setShowMonitoringConfig(false);
        fetchMonitoringJobs();
        
        // Reset form
        setSelectedSheetForMonitoring(null);
        setManualSpreadsheetUrl('');
        setSelectedSheetTab('');
        setCellRange('A1');
        setConditions([]);
        setUserMention('');
      } else {
        alert('Failed to create monitoring job');
      }
    } catch (error) {
      console.error('Error creating monitoring job:', error);
      alert('Failed to create monitoring job');
    }
  };

  const fetchMonitoringJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/monitoring/jobs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const jobs = await response.json();
        setMonitoringJobs(jobs);
      }
    } catch (error) {
      console.error('Error fetching monitoring jobs:', error);
    }
  };

  // Check URL parameters for auth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (token) {
      localStorage.setItem('access_token', token);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      setGoogleAuthStatus('connected');
      fetchGoogleSheets();
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (googleAuthStatus === 'connected') {
      fetchMonitoringJobs();
    }
  }, [googleAuthStatus]);

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <img 
              src="/datapingo-logo-a3.png" 
              alt="DataPingo" 
              className="logo"
              style={{ height: '40px', marginRight: '1rem' }}
            />
            <div>
              <h1>Sheets Connector</h1>
              <p>Monitor Google Sheets and send notifications to Slack, Teams, or Discord</p>
            </div>
          </div>
        </header>

        <div className="main-content">
          {/* Google Sheets Connection */}
          <div className="section">
            <h2>📊 Connect Google Sheets</h2>
            
            {googleAuthStatus === 'idle' && (
              <button 
                onClick={handleGoogleAuth}
                className="datapingo-button primary"
              >
                🔗 Connect Google Sheets
              </button>
            )}
            
            {googleAuthStatus === 'connecting' && (
              <div className="status connecting">
                <span>🔄 Connecting to Google Sheets...</span>
              </div>
            )}
            
            {googleAuthStatus === 'connected' && (
              <div className="status connected">
                <span>✅ Connected to Google Sheets</span>
                <p>Found {googleSheets.length} spreadsheets</p>
              </div>
            )}
            
            {googleAuthStatus === 'error' && (
              <div className="status error">
                <span>❌ Connection failed</span>
                <button onClick={handleGoogleAuth} className="datapingo-button primary">
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Platform Configuration */}
          {googleAuthStatus === 'connected' && (
            <div className="section">
              <h2>🔔 Notification Setup</h2>
              
              {/* Platform Selector */}
              <div className="platform-selector">
                <h3>Choose Your Platform:</h3>
                <div className="platform-buttons">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatform('slack');
                      setPlatformConnected(false);
                      setWebhookUrl('');
                    }}
                    className={`platform-button ${selectedPlatform === 'slack' ? 'active' : ''}`}
                  >
                    📱 Slack
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatform('teams');
                      setPlatformConnected(false);
                      setWebhookUrl('');
                    }}
                    className={`platform-button ${selectedPlatform === 'teams' ? 'active' : ''}`}
                  >
                    🏢 Teams
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatform('discord');
                      setPlatformConnected(false);
                      setWebhookUrl('');
                    }}
                    className={`platform-button ${selectedPlatform === 'discord' ? 'active' : ''}`}
                  >
                    🎮 Discord
                  </button>
                </div>
              </div>

              {/* Webhook Input */}
              <div className="webhook-config">
                <div className="input-group">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder={
                      selectedPlatform === 'slack' ? 'https://hooks.slack.com/services/...' :
                      selectedPlatform === 'teams' ? 'https://outlook.office.com/webhook/...' :
                      'https://discord.com/api/webhooks/...'
                    }
                    className="webhook-input"
                  />
                  <button
                    onClick={handleWebhookTest}
                    className="datapingo-button accent"
                  >
                    🧪 Test
                  </button>
                </div>
                
                {platformConnected && (
                  <div className="status connected">
                    ✅ {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} connection verified!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monitoring Configuration */}
          {googleAuthStatus === 'connected' && platformConnected && (
            <div className="section">
              <div className="section-header">
                <h2>⚡ Create Monitoring Job</h2>
                <button
                  onClick={() => setShowMonitoringConfig(!showMonitoringConfig)}
                  className="datapingo-button primary"
                >
                  {showMonitoringConfig ? 'Cancel' : '+ New Monitor'}
                </button>
              </div>

              {showMonitoringConfig && (
                <div className="monitoring-config">
                  {/* Spreadsheet Selection */}
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={useManualUrl}
                        onChange={(e) => setUseManualUrl(e.target.checked)}
                      />
                      Use manual spreadsheet URL
                    </label>
                  </div>

                  {useManualUrl ? (
                    <div className="form-group">
                      <label>Spreadsheet URL:</label>
                      <input
                        type="url"
                        value={manualSpreadsheetUrl}
                        onChange={(e) => setManualSpreadsheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Select Spreadsheet:</label>
                      <select
                        value={selectedSheetForMonitoring?.id || ''}
                        onChange={(e) => {
                          const sheet = googleSheets.find(s => s.id === e.target.value);
                          if (sheet) {
                            setSelectedSheetForMonitoring(sheet);
                            handleSheetSelection(sheet);
                          }
                        }}
                      >
                        <option value="">Choose a spreadsheet...</option>
                        {googleSheets.map(sheet => (
                          <option key={sheet.id} value={sheet.id}>
                            {sheet.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sheet Tab Selection */}
                  {availableSheetTabs.length > 0 && (
                    <div className="form-group">
                      <label>Sheet Tab:</label>
                      <select
                        value={selectedSheetTab}
                        onChange={(e) => setSelectedSheetTab(e.target.value)}
                      >
                        <option value="">Choose a sheet tab...</option>
                        {availableSheetTabs.map(tab => (
                          <option key={tab.properties.title} value={tab.properties.title}>
                            {tab.properties.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cell Range */}
                  <div className="form-group">
                    <label>Cell Range to Monitor:</label>
                    <input
                      type="text"
                      value={cellRange}
                      onChange={(e) => setCellRange(e.target.value)}
                      placeholder="A1 or A1:Z100"
                    />
                  </div>

                  {/* Frequency */}
                  <div className="form-group">
                    <label>Check Frequency:</label>
                    <select
                      value={frequencyMinutes}
                      onChange={(e) => setFrequencyMinutes(parseInt(e.target.value))}
                    >
                      <option value={1}>Every 1 minute</option>
                      <option value={5}>Every 5 minutes</option>
                      <option value={10}>Every 10 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every hour</option>
                    </select>
                  </div>

                  {/* User Mention */}
                  <div className="form-group">
                    <label>User Mention (optional):</label>
                    <input
                      type="text"
                      value={userMention}
                      onChange={(e) => setUserMention(e.target.value)}
                      placeholder={
                        selectedPlatform === 'slack' ? '@username or @channel' :
                        selectedPlatform === 'teams' ? '@username' :
                        '@username'
                      }
                    />
                  </div>

                  {/* Conditions */}
                  <div className="form-group">
                    <div className="section-header">
                      <label>Notification Conditions:</label>
                      <button
                        type="button"
                        onClick={addCondition}
                        className="datapingo-button small"
                      >
                        + Add Condition
                      </button>
                    </div>
                    
                    {conditions.map(condition => (
                      <div key={condition.id} className="condition-row">
                        <select
                          value={condition.column}
                          onChange={(e) => updateCondition(condition.id, 'column', e.target.value)}
                        >
                          <option value="A">Column A</option>
                          <option value="B">Column B</option>
                          <option value="C">Column C</option>
                          <option value="D">Column D</option>
                          <option value="E">Column E</option>
                        </select>
                        
                        <select
                          value={condition.type}
                          onChange={(e) => updateCondition(condition.id, 'type', e.target.value)}
                        >
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                          <option value="not_equals">not equals</option>
                          <option value="greater_than">greater than</option>
                          <option value="less_than">less than</option>
                        </select>
                        
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                          placeholder="Value to check"
                        />
                        
                        <button
                          type="button"
                          onClick={() => removeCondition(condition.id)}
                          className="datapingo-button danger small"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={createMonitoringJob}
                    className="datapingo-button primary"
                  >
                    Create Monitoring Job
                  </button>
                </div>
              )}

              {/* Existing Jobs */}
              {monitoringJobs.length > 0 && (
                <div className="monitoring-jobs">
                  <h3>Active Monitoring Jobs</h3>
                  {monitoringJobs.map(job => (
                    <div key={job.id} className="job-card">
                      <div className="job-header">
                        <span>{job.name || 'Monitoring Job'}</span>
                        <span className={`status ${job.status}`}>{job.status}</span>
                      </div>
                      <div className="job-details">
                        <p>Platform: {job.platform}</p>
                        <p>Frequency: Every {job.frequency} minutes</p>
                        <p>Range: {job.cellRange}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
