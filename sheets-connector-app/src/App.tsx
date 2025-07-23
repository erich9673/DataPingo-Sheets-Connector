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
  
  // Slack configuration
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackConnected, setSlackConnected] = useState(false);
  
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
  const [frequencyMinutes, setFrequencyMinutes] = useState(0.5);
  const [conditions, setConditions] = useState<any[]>([]);
  const [userMention, setUserMention] = useState('');
  
  // Condition validation state
  const [conditionsValidationStatus, setConditionsValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  // Simple auth check
  useEffect(() => {
    // Initialize Google Analytics
    Analytics.init('G-W5VY62S4LR'); // DataPingo GA4 measurement ID
    Analytics.trackPageView(window.location.pathname, document.title);
    
    console.log('🚀 App initialization - checking for auth token...');
    
    // Check for installation source (from Slack marketplace)
    const urlParams = new URLSearchParams(window.location.search);
    const installSource = urlParams.get('source') || urlParams.get('utm_source');
    if (installSource) {
      Analytics.trackInstallation(installSource);
    }
    
    // Check for auth token in URL (from OAuth redirect)
    const authToken = urlParams.get('authToken') || urlParams.get('token'); // Support both parameter names
    
    console.log('🔗 URL parameters check:', {
      hasAuthTokenParam: !!authToken,
      authTokenLength: authToken ? authToken.length : 0,
      authTokenPreview: authToken ? `${authToken.substring(0, 8)}...` : 'null',
      fullURL: window.location.href,
      searchParams: window.location.search,
      parameterUsed: urlParams.get('authToken') ? 'authToken' : urlParams.get('token') ? 'token' : 'none'
    });
    
    if (authToken) {
      // Store auth token and clean URL
      console.log('💾 Storing auth token from URL and cleaning URL...');
      localStorage.setItem('datapingo_auth_token', authToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('✅ Auth token received and stored from OAuth redirect');
    } else {
      console.log('ℹ️ No auth token in URL parameters');
    }
    
    const savedEmail = localStorage.getItem('datapingo_user_email');
    const storedAuthToken = localStorage.getItem('datapingo_auth_token');
    
    console.log('🚀 App initialization:', {
      hasSavedEmail: !!savedEmail,
      hasAuthToken: !!storedAuthToken,
      savedEmail: savedEmail || 'none'
    });
    
    if (savedEmail) {
      setUserEmail(savedEmail);
      setAuthStatus('approved'); // Assume approved for testing
      checkGoogleAuthStatus(); // Check Google auth when user is approved
      loadMonitoringJobs(); // Load existing monitoring jobs
    } else if (storedAuthToken) {
      // If we have an auth token but no saved email, check auth status to potentially get the email
      console.log('📧 No saved email but auth token exists, checking auth status...');
      checkGoogleAuthStatus();
    }
  }, []);

  const checkGoogleAuthStatus = async () => {
    try {
      console.log('🔍 Checking Google auth status...');
      
      // First, try token-based authentication if we have a token
      const authToken = localStorage.getItem('datapingo_auth_token');
      console.log('🎫 Auth token check:', {
        hasToken: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        tokenPreview: authToken ? `${authToken.substring(0, 8)}...` : 'null'
      });
      
      if (authToken) {
        console.log('🔐 Found auth token, verifying with backend...');
        const tokenResponse = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authToken })
        });
        
        console.log('📡 Token verification response status:', tokenResponse.status);
        const tokenData = await tokenResponse.json();
        console.log('📄 Token verification data:', tokenData);
        
        if (tokenData.success && tokenData.authenticated) {
          console.log('✅ Token verified successfully, setting user status and loading sheets...');
          
          // Set user email and auth status if we got email from token verification
          if (tokenData.email) {
            console.log('📧 Setting user email from token verification:', tokenData.email);
            setUserEmail(tokenData.email);
            localStorage.setItem('datapingo_user_email', tokenData.email);
            setAuthStatus('approved');
          }
          
          setGoogleAuthStatus('connected');
          await loadGoogleSheets();
          return;
        } else {
          console.log('❌ Token invalid, removing from localStorage...', tokenData);
          localStorage.removeItem('datapingo_auth_token');
        }
      } else {
        console.log('ℹ️ No auth token found in localStorage');
      }
      
      // Fallback to session-based authentication
      const response = await fetch(`${API_BASE_URL}/api/auth/google-status`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log('Google auth status response:', data);
      
      if (data.success && data.authenticated) {
        console.log('Google authenticated, setting status and loading sheets...');
        setGoogleAuthStatus('connected');
        await loadGoogleSheets();
      } else {
        console.log('Google not authenticated');
        setGoogleAuthStatus('idle');
      }
    } catch (error) {
      console.error('Error checking Google auth status:', error);
      setGoogleAuthStatus('error');
    }
  };

  const loadGoogleSheets = async () => {
    try {
      console.log('Loading Google Sheets...');
      
      // Get auth token from localStorage
      const authToken = localStorage.getItem('datapingo_auth_token');
      const url = authToken 
        ? `${API_BASE_URL}/api/sheets/spreadsheets?authToken=${authToken}`
        : `${API_BASE_URL}/api/sheets/spreadsheets`;
      
      // Try the spreadsheets endpoint first
      const response = await fetch(url, {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log('Google Sheets API response:', data);
      
      if (data.success) {
        const sheets = data.spreadsheets || data.sheets || [];
        console.log('Found sheets:', sheets);
        setGoogleSheets(sheets);
      } else {
        console.error('API error:', data.error);
        setError('Failed to load Google Sheets: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading Google Sheets:', error);
      setError('Network error loading Google Sheets');
    }
  };

  const loadSheetTabs = async (spreadsheetId: string) => {
    try {
      console.log('Loading sheet tabs for:', spreadsheetId);
      
      const authToken = localStorage.getItem('datapingo_auth_token');
      const url = authToken 
        ? `${API_BASE_URL}/api/sheets/${spreadsheetId}/info?authToken=${authToken}`
        : `${API_BASE_URL}/api/sheets/${spreadsheetId}/info`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log('Sheet tabs response:', data);
      
      if (data.success && data.sheets) {
        setAvailableSheetTabs(data.sheets);
        console.log('Found sheet tabs:', data.sheets.map((s: any) => s.properties.title));
      } else {
        console.error('Failed to load sheet tabs:', data.error);
        setAvailableSheetTabs([]);
      }
    } catch (error) {
      console.error('Error loading sheet tabs:', error);
      setAvailableSheetTabs([]);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setGoogleAuthStatus('connecting');
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/google/url`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // Redirect to Google OAuth in the same window
        console.log('🔗 Redirecting to Google OAuth:', data.url);
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to get Google auth URL');
        setGoogleAuthStatus('error');
      }
    } catch (error) {
      console.error('Google connect error:', error);
      setError('Failed to connect to Google Sheets');
      setGoogleAuthStatus('error');
    }
  };

  const handleSlackTest = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/slack/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ webhookUrl: slackWebhook })
      });
      
      const data = await response.json();
      if (data.success) {
        setSlackConnected(true);
        alert('✅ Slack connection successful! Check your Slack channel for the test message.');
      } else {
        alert('❌ Slack connection failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Slack test error:', error);
      alert('❌ Network error testing Slack connection');
    }
  };

  // Validate alert conditions
  const handleValidateConditions = async () => {
    setConditionsValidationStatus('validating');
    setValidationMessage('');
    
    try {
      // Basic validation checks
      const validationErrors = [];
      
      if (conditions.length === 0) {
        setConditionsValidationStatus('valid');
        setValidationMessage('✅ No specific conditions - will alert on any change');
        return;
      }
      
      // Check each condition
      for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        
        // Check if cell reference is valid (single cell or range)
        if (!condition.cellRef || !/^[A-Z]+\d+(:[A-Z]+\d+)?$/.test(condition.cellRef.trim())) {
          validationErrors.push(`Condition ${i + 1}: Invalid cell reference (e.g., A1, B5, C10, or F11:F20)`);
        }
        
        // Check if value is required for non-"changed" operators
        if (condition.operator !== 'changed' && (!condition.value || condition.value.trim() === '')) {
          validationErrors.push(`Condition ${i + 1}: Value is required for "${condition.operator}" operator`);
        }
        
        // Check if numeric value is valid for comparison operators
        if (['>', '<', '=', '!='].includes(condition.operator)) {
          const numValue = parseFloat(condition.value);
          if (isNaN(numValue)) {
            validationErrors.push(`Condition ${i + 1}: Numeric value required for "${condition.operator}" operator`);
          }
        }
      }
      
      if (validationErrors.length > 0) {
        setConditionsValidationStatus('invalid');
        setValidationMessage('❌ ' + validationErrors.join('; '));
      } else {
        // Test conditions against current cell values if possible
        if (selectedSheetForMonitoring && selectedSheetTab && conditions.length > 0) {
          try {
            const authToken = localStorage.getItem('datapingo_auth_token');
            
            // Test each condition's range
            let totalDataFound = 0;
            
            for (const condition of conditions) {
              if (condition.cellRef) {
                const fullRange = selectedSheetTab ? `${selectedSheetTab}!${condition.cellRef}` : condition.cellRef;
                const url = authToken 
                  ? `${API_BASE_URL}/api/sheets/${selectedSheetForMonitoring.id}/values/${encodeURIComponent(fullRange)}?authToken=${authToken}`
                  : `${API_BASE_URL}/api/sheets/${selectedSheetForMonitoring.id}/values/${encodeURIComponent(fullRange)}`;
                  
                const response = await fetch(url, { credentials: 'include' });
                const data = await response.json();
                
                if (data.success && data.values) {
                  totalDataFound += data.values.length;
                }
              }
            }
            
            if (totalDataFound > 0) {
              setConditionsValidationStatus('valid');
              setValidationMessage(`✅ All conditions valid! Found ${totalDataFound} row(s) of data across all monitoring rules`);
            } else {
              setConditionsValidationStatus('valid');
              setValidationMessage('✅ Conditions syntax valid, but no data found in specified ranges');
            }
          } catch (testError) {
            setConditionsValidationStatus('valid');
            setValidationMessage('✅ Conditions syntax valid, but unable to test against current data');
          }
        } else {
          setConditionsValidationStatus('valid');
          setValidationMessage('✅ All conditions are properly configured');
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      setConditionsValidationStatus('invalid');
      setValidationMessage('❌ Error validating conditions');
    }
  };

  // Monitoring functions
  const loadMonitoringJobs = async () => {
    try {
      // Get auth token for user isolation
      const authToken = localStorage.getItem('datapingo_auth_token');
      
      // Build URL with auth token if available
      const url = authToken 
        ? `${API_BASE_URL}/api/monitoring/jobs?authToken=${encodeURIComponent(authToken)}`
        : `${API_BASE_URL}/api/monitoring/jobs`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setMonitoringJobs(data.jobs || []);
        console.log(`📋 Loaded ${data.jobs?.length || 0} monitoring jobs for current user`);
      } else {
        console.error('Failed to load monitoring jobs:', data.error);
      }
    } catch (error) {
      console.error('Error loading monitoring jobs:', error);
    }
  };

  const createMonitoringJob = async () => {
    if (!selectedSheetForMonitoring || !cellRange.trim()) {
      alert('Please select a spreadsheet and specify a cell range to monitor.');
      return;
    }

    try {
      // Get and validate auth token
      const authToken = localStorage.getItem('datapingo_auth_token');
      console.log('🔑 Auth token status for monitoring:', {
        hasToken: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        tokenPreview: authToken ? `${authToken.substring(0, 8)}...` : 'null'
      });

      if (!authToken) {
        alert('❌ Authentication required. Please reconnect to Google Sheets first.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/monitoring/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          sheetId: selectedSheetForMonitoring.id,
          cellRange: cellRange.trim(),
          webhookUrl: slackWebhook,
          frequencyMinutes: frequencyMinutes,
          userMention: userMention.trim(),
          conditions: conditions,
          authToken: authToken // Include auth token for authentication
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Monitoring job created successfully!\n\nJob ID: ${data.jobId}\nMonitoring: ${selectedSheetForMonitoring.name}\nCell range: ${cellRange}\nFrequency: Every ${frequencyMinutes} minute(s)`);
        
        // Reset form
        setSelectedSheetForMonitoring(null);
        setCellRange('A1');
        setFrequencyMinutes(5);
        setConditions([]);
        setUserMention('');
        
        // Reload jobs list
        await loadMonitoringJobs();
        
        // Go back to main setup view
        setShowMonitoringConfig(false);
      } else {
        alert('❌ Failed to create monitoring job: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating monitoring job:', error);
      alert('❌ Network error creating monitoring job');
    }
  };

  const addCondition = () => {
    setConditions([...conditions, {
      id: Date.now(),
      cellRef: '',
      operator: 'changed',
      value: '',
      description: ''
    }]);
  };

  const updateCondition = (id: number, field: string, value: string) => {
    setConditions(conditions.map(condition => 
      condition.id === id ? { ...condition, [field]: value } : condition
    ));
  };

  const removeCondition = (id: number) => {
    setConditions(conditions.filter(condition => condition.id !== id));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!userEmail || !userEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setAuthStatus('requesting');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('datapingo_user_email', userEmail);
        if (data.status === 'approved') {
          setAuthStatus('approved');
        } else {
          setAuthStatus('pending');
        }
      } else {
        setError(data.error || 'Failed to request access');
        setAuthStatus('idle');
      }
    } catch (error) {
      console.error('Request access error:', error);
      setError('Network error. Please try again.');
      setAuthStatus('idle');
    }
  };

  const renderAuthForm = () => (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo-section">
          <div className="brand-header">
            <div className="unified-brand">
              <img src="/Sheets Connector for Slack Logo.png" alt="Sheets Connector for Slack" className="unified-logo" />
              <h1 className="login-title">Sheets Connector for Slack</h1>
            </div>
          </div>
          <p>Real-time Google Sheets monitoring with intelligent Slack notifications</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={authStatus === 'requesting'}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={authStatus === 'requesting'}
          >
            {authStatus === 'requesting' ? 'Getting Started...' : 'Get Started'}
          </button>
        </form>

        <div className="info-section">
          <h3>Features</h3>
          <ul>
            <li><img src="/chart.jpg" alt="Monitor" className="feature-icon" />Monitor Google Sheets in real-time</li>
            <li><img src="/lightning.jpg" alt="Notifications" className="feature-icon" />Get Slack notifications on changes</li>
            <li><img src="/tools.jpg" alt="Conditions" className="feature-icon" />Set custom alert conditions</li>
            <li><img src="/chart.jpg" alt="Track" className="feature-icon" />Track multiple spreadsheets</li>
          </ul>
        </div>

        <div className="footer-links">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span className="separator">•</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <span className="separator">•</span>
          <a href="/support" target="_blank" rel="noopener noreferrer">Support</a>
        </div>
      </div>
    </div>
  );

  const renderPendingApproval = () => (
    <div className="auth-container">
      <div className="auth-card">
        <div className="pending-section">
          <div className="pending-icon">
            <img src="/tools.jpg" alt="Processing" className="status-icon" />
          </div>
          <h2>Approval Pending</h2>
          <p>Your access request has been submitted for <strong>{userEmail}</strong></p>
          <p>Please wait for an administrator to approve your request.</p>
          
          <div className="admin-info">
            <p><strong>For Admins:</strong></p>
            <p>Review and approve requests in the admin panel</p>
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem('datapingo_user_email');
              setUserEmail('');
              setAuthStatus('idle');
            }}
            className="secondary-button"
          >
            Use Different Email
          </button>
        </div>
      </div>
    </div>
  );

  const renderApprovedUser = () => (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-content">
          <div className="header-brand">
            <img src="/Sheets Connector for Slack Logo.png" alt="Sheets Connector for Slack" className="header-unified-logo" />
            <h1 className="header-title">Spreadsheet Monitoring</h1>
          </div>
          <div className="user-info">
            <span>👤 {userEmail}</span>
            <button 
              onClick={async () => {
                // Get auth token before clearing it
                const authToken = localStorage.getItem('datapingo_auth_token');
                
                // Call backend logout to clear server-side credentials
                try {
                  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authToken })
                  });
                  const result = await response.json();
                  console.log('🔓 Backend logout result:', result);
                } catch (error) {
                  console.log('⚠️ Backend logout failed (continuing with frontend logout):', error);
                }
                
                // Clear frontend state
                localStorage.removeItem('datapingo_user_email');
                localStorage.removeItem('datapingo_auth_token');
                setUserEmail('');
                setAuthStatus('idle');
                setGoogleAuthStatus('idle');
                setMonitoringJobs([]); // Clear monitoring jobs from UI
                console.log('🔄 Frontend logout complete');
              }}
              className="datapingo-button secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Main Monitoring Setup Card */}
        <div className="step-card" style={{ marginBottom: '1.5rem' }}>
          <h3>🚀 Set Up New Monitor</h3>

          {/* Google Authentication Status - Moved to Top */}
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>🔗 Google Sheets Connection</span>
              {googleAuthStatus === 'connected' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success-color)', fontSize: '0.9rem', fontWeight: '500' }}>✅ Connected</span>
                  <button 
                    className="secondary-button" 
                    onClick={loadGoogleSheets}
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              ) : (
                <button 
                  className="primary-button" 
                  onClick={handleGoogleConnect}
                  disabled={googleAuthStatus === 'connecting'}
                  style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}
                >
                  {googleAuthStatus === 'connecting' ? 'Connecting...' : 'Connect Google'}
                </button>
              )}
            </div>
            {googleAuthStatus === 'connected' && (
              <div style={{ fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Found {googleSheets.length} spreadsheet(s)</span>
                {googleSheets.length >= 100 && (
                  <span style={{ 
                    color: 'var(--warning-color)', 
                    background: '#fef3c7', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    (showing first 100)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Spreadsheet Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1rem' }}>
              📋 Select Spreadsheet
            </label>
            
            {/* Elegant Toggle Switch */}
            <div style={{ 
              marginBottom: '1rem',
              background: '#f8fafc',
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={() => setUseManualUrl(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: !useManualUrl ? '#667eea' : 'transparent',
                  color: !useManualUrl ? 'white' : '#64748b',
                  boxShadow: !useManualUrl ? '0 2px 4px rgba(102, 126, 234, 0.3)' : 'none'
                }}
              >
                📊 My Spreadsheets
              </button>
              <button
                type="button"
                onClick={() => setUseManualUrl(true)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: useManualUrl ? '#667eea' : 'transparent',
                  color: useManualUrl ? 'white' : '#64748b',
                  boxShadow: useManualUrl ? '0 2px 4px rgba(102, 126, 234, 0.3)' : 'none'
                }}
              >
                🔗 Enter URL
              </button>
            </div>

            {!useManualUrl ? (
              // Dropdown selection with enhanced styling
              <div>
                <select
                  value={selectedSheetForMonitoring?.id || ''}
                  onChange={async (e) => {
                    const sheet = googleSheets.find(s => s.id === e.target.value);
                    setSelectedSheetForMonitoring(sheet || null);
                    if (sheet) {
                      await loadSheetTabs(sheet.id);
                    } else {
                      setAvailableSheetTabs([]);
                    }
                  }}
                  disabled={googleAuthStatus !== 'connected'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    background: googleAuthStatus !== 'connected' ? '#f8fafc' : 'white',
                    cursor: googleAuthStatus !== 'connected' ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="">
                    {googleAuthStatus !== 'connected' ? '🔒 Connect to Google first...' : '🔍 Choose a spreadsheet...'}
                  </option>
                  {googleSheets.map(sheet => (
                    <option key={sheet.id} value={sheet.id}>
                      📊 {sheet.name}
                    </option>
                  ))}
                </select>
                {googleAuthStatus === 'connected' && googleSheets.length === 0 && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem', 
                    background: '#fef3c7', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#92400e'
                  }}>
                    ⚠️ No spreadsheets found. Try refreshing or check your Google Drive permissions.
                  </div>
                )}
              </div>
            ) : (
              // Manual URL input with enhanced styling
              <div>
                <input
                  type="url"
                  value={manualSpreadsheetUrl}
                  onChange={(e) => setManualSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'white',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <div style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.75rem', 
                  background: '#f0f9ff', 
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#0369a1'
                }}>
                  💡 <strong>Tip:</strong> Copy the URL from your browser when viewing the Google Sheet. 
                  Make sure the sheet is publicly accessible or you have appropriate permissions.
                </div>
              </div>
            )}
            
            {/* Enhanced Selection Confirmation */}
            {(selectedSheetForMonitoring || (manualSpreadsheetUrl && extractSheetIdFromUrl(manualSpreadsheetUrl))) && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                borderRadius: '10px',
                border: '1px solid #b7dfbb',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#155724' }}>
                    Spreadsheet Selected
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#155724', opacity: 0.8 }}>
                    {useManualUrl ? 
                      `Manual URL (ID: ${extractSheetIdFromUrl(manualSpreadsheetUrl)?.substring(0, 12)}...)` : 
                      selectedSheetForMonitoring?.name
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sheet Tab Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1rem' }}>
              📑 Sheet Tab
            </label>
            <select
              value={selectedSheetTab}
              onChange={(e) => setSelectedSheetTab(e.target.value)}
              disabled={!selectedSheetForMonitoring || availableSheetTabs.length === 0}
              style={{
                width: '100%',
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '1rem',
                background: (!selectedSheetForMonitoring || availableSheetTabs.length === 0) ? '#f8fafc' : 'white',
                cursor: (!selectedSheetForMonitoring || availableSheetTabs.length === 0) ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            >
              <option value="">
                {!selectedSheetForMonitoring ? 'Select spreadsheet first...' : 
                 availableSheetTabs.length === 0 ? 'Loading sheet tabs...' : 
                 'Choose a sheet tab...'}
              </option>
              {availableSheetTabs.map(sheet => (
                <option key={sheet.properties.sheetId} value={sheet.properties.title}>
                  📄 {sheet.properties.title}
                </option>
              ))}
            </select>
            <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>
              {availableSheetTabs.length > 0 ? 
                `Found ${availableSheetTabs.length} sheet(s)` : 
                'Select a spreadsheet to see available sheets'}
            </small>
          </div>

          {/* Unified: What to Monitor */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1rem' }}>
              🎯 What to Monitor
            </label>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {conditions.map((condition, index) => (
                  <div key={index} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.5fr 1fr 1fr auto',
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        📍 Cell/Range to Watch
                      </label>
                      <input
                        type="text"
                        value={condition.cellRef || ''}
                        onChange={(e) => {
                          const newConditions = [...conditions];
                          newConditions[index].cellRef = e.target.value;
                          setConditions(newConditions);
                        }}
                        placeholder="B1:B20 or A1"
                        style={{ 
                          width: '100%',
                          padding: '0.75rem', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        🔍 When
                      </label>
                      <select
                        value={condition.operator}
                        onChange={(e) => {
                          const newConditions = [...conditions];
                          newConditions[index].operator = e.target.value;
                          setConditions(newConditions);
                        }}
                        style={{ 
                          width: '100%',
                          padding: '0.75rem', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="changed">changes</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value="=">=</option>
                        <option value="!=">≠</option>
                        <option value="contains">contains</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        🎯 Value
                      </label>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => {
                          const newConditions = [...conditions];
                          newConditions[index].value = e.target.value;
                          setConditions(newConditions);
                        }}
                        placeholder={condition.operator === 'changed' ? 'N/A' : '500'}
                        disabled={condition.operator === 'changed'}
                        style={{ 
                          width: '100%',
                          padding: '0.75rem', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          background: condition.operator === 'changed' ? '#f1f5f9' : 'white'
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newConditions = conditions.filter((_, i) => i !== index);
                        setConditions(newConditions);
                      }}
                      style={{ 
                        background: '#fee2e2', 
                        color: '#991b1b', 
                        border: 'none', 
                        borderRadius: '6px',
                        padding: '0.75rem',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        minWidth: '36px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              }
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setConditions([...conditions, { id: Date.now(), cellRef: '', operator: 'changed', value: '' }]);
                  }}
                  style={{ 
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'translateY(0)'}
                >
                  ➕ Add Monitoring Rule
                </button>
              </div>
              
              {/* Condition Validation Button */}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={handleValidateConditions}
                  disabled={conditionsValidationStatus === 'validating'}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: conditionsValidationStatus === 'valid' ? '#10b981' : 
                               conditionsValidationStatus === 'invalid' ? '#ef4444' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: conditionsValidationStatus === 'validating' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {conditionsValidationStatus === 'validating' ? (
                    <>🔄 Validating...</>
                  ) : conditionsValidationStatus === 'valid' ? (
                    <>✅ Conditions Valid</>
                  ) : conditionsValidationStatus === 'invalid' ? (
                    <>❌ Fix Issues</>
                  ) : (
                    <>⚙️ Test Conditions</>
                  )}
                </button>
                
                {validationMessage && (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    background: conditionsValidationStatus === 'valid' ? '#ecfdf5' : 
                               conditionsValidationStatus === 'invalid' ? '#fef2f2' : '#f1f5f9',
                    color: conditionsValidationStatus === 'valid' ? '#059669' : 
                           conditionsValidationStatus === 'invalid' ? '#dc2626' : '#475569',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    flex: 1,
                    border: `1px solid ${conditionsValidationStatus === 'valid' ? '#d1fae5' : 
                                        conditionsValidationStatus === 'invalid' ? '#fee2e2' : '#e2e8f0'}`
                  }}>
                    {validationMessage}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slack Configuration */}
          {/* Slack Integration */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1rem' }}>
              💬 Slack Integration
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem',
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: 'white',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                onClick={handleSlackTest}
                className="datapingo-button accent"
                style={{ 
                  padding: '1rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}
              >
                🧪 Test
              </button>
            </div>
            {slackConnected ? (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                borderRadius: '8px',
                border: '1px solid #b7dfbb',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.1rem' }}>✅</span>
                <span style={{ color: '#155724', fontWeight: '500' }}>Slack connection verified!</span>
              </div>
            ) : (
              <div className="help-text" style={{ marginTop: '0.75rem' }}>
                <details>
                  <summary>🤔 How to get a Slack Webhook URL?</summary>
                  <div className="help-content">
                    <h4>📋 Step-by-Step Guide:</h4>
                    <ol>
                      <li>
                        <strong>Go to Slack Apps:</strong>
                        <br />Visit <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a> and sign in to your Slack workspace
                      </li>
                      <li>
                        <strong>Create or Select App:</strong>
                        <br />Click "Create New App" → "From scratch" → Name it "DataPingo Sheets Connector"
                      </li>
                      <li>
                        <strong>Enable Incoming Webhooks:</strong>
                        <br />In your app settings, go to "Incoming Webhooks" and toggle "Activate Incoming Webhooks" to ON
                      </li>
                      <li>
                        <strong>Add Webhook to Workspace:</strong>
                        <br />Click "Add New Webhook to Workspace" and choose the channel where you want notifications
                      </li>
                      <li>
                        <strong>Copy Webhook URL:</strong>
                        <br />Copy the webhook URL that starts with <code>https://hooks.slack.com/services/...</code>
                      </li>
                    </ol>
                    
                    <div className="help-note">
                      <strong>� Pro Tip:</strong> Create a dedicated channel like <code>#sheets-alerts</code> for your notifications to keep them organized!
                    </div>
                    
                    <div className="help-links">
                      <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="help-link">
                        📖 Official Slack Documentation
                      </a>
                      <a href="https://slack.com/help/articles/115005265063-Incoming-webhooks-for-Slack" target="_blank" rel="noopener noreferrer" className="help-link">
                        🎥 Slack Help Guide
                      </a>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Monitoring Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.95rem' }}>
                ⏱️ Check Frequency
              </label>
              <select
                value={frequencyMinutes}
                onChange={(e) => setFrequencyMinutes(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              >
                <option value={0.5}>Every 30 seconds</option>
                <option value={1}>Every 1 minute</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.95rem' }}>
                👥 Slack Mention (optional)
              </label>
              <input
                type="text"
                value={userMention}
                onChange={(e) => setUserMention(e.target.value)}
                placeholder="@channel or @username"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>
                e.g., @channel, @here, @username
              </small>
            </div>
          </div>

          {/* Start Monitoring Button */}
          <button
            onClick={handleStartMonitoring}
            disabled={!canStartMonitoring()}
            className="primary-button"
            style={{ 
              width: '100%', 
              padding: '1.25rem',
              fontSize: '1.2rem',
              fontWeight: '700',
              borderRadius: '12px',
              background: canStartMonitoring() ? 
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                '#e2e8f0',
              border: 'none',
              color: canStartMonitoring() ? 'white' : '#94a3b8',
              cursor: canStartMonitoring() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              boxShadow: canStartMonitoring() ? 
                '0 4px 15px rgba(102, 126, 234, 0.4)' : 
                'none',
              transform: 'translateY(0px)'
            }}
            onMouseEnter={(e) => {
              if (canStartMonitoring()) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (canStartMonitoring()) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(0px)';
                target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }
            }}
          >
            🚀 Start Monitoring
          </button>
        </div>

        {/* Current Monitoring Jobs */}
        <div className="step-card">
          <h3>📋 Current Monitoring Jobs</h3>
          {monitoringJobs.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
              No monitoring jobs active. Create your first monitor above! 👆
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {monitoringJobs.map(job => (
                <div key={job.id} style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '0.75rem', 
                  background: job.isActive ? '#f8f9fa' : '#fff5f5',
                  overflow: 'hidden'
                }}>
                  {/* Main Job Header */}
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <strong style={{ color: '#333', fontSize: '1.1rem' }}>
                        📊 {job.spreadsheetName || job.sheetId}
                      </strong>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          background: job.isActive ? '#d4edda' : '#f8d7da',
                          color: job.isActive ? '#155724' : '#721c24',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '1rem',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}>
                          {job.isActive ? '🟢 Active' : '🔴 Inactive'}
                        </span>
                        <button
                          onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {expandedJobId === job.id ? '▼ Hide Details' : '▶ Show Details'}
                        </button>
                        <button
                          onClick={() => stopMonitoringJob(job.id)}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            borderRadius: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          🛑 Stop
                        </button>
                      </div>
                    </div>
                    
                    {/* Quick Summary */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '0.75rem', 
                      fontSize: '0.9rem',
                      color: '#64748b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>📍</span>
                        <span><strong>Range:</strong> {job.cellRange}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>⏱️</span>
                        <span><strong>Frequency:</strong> {job.frequencyMinutes}min</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>⚙️</span>
                        <span><strong>Conditions:</strong> {job.conditions?.length || 0} rules</span>
                      </div>
                    </div>
                    
                    {job.lastChecked && (
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#94a3b8', 
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.9rem' }}>🕒</span>
                        <span>Last checked: {new Date(job.lastChecked).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Details */}
                  {expandedJobId === job.id && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      padding: '1.5rem',
                      borderTop: '1px solid #e2e8f0'
                    }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1rem' }}>📋 Job Details</h4>
                      
                      {/* Job Configuration */}
                      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                          gap: '1rem'
                        }}>
                          <div style={{ 
                            background: 'white', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Job ID</div>
                            <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#374151' }}>{job.id}</div>
                          </div>
                          
                          <div style={{ 
                            background: 'white', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Sheet ID</div>
                            <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#374151' }}>{job.sheetId}</div>
                          </div>
                          
                          <div style={{ 
                            background: 'white', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Created</div>
                            <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                              {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monitoring Conditions */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', color: '#374151', fontSize: '0.95rem' }}>🎯 Alert Conditions</h5>
                        {job.conditions && job.conditions.length > 0 ? (
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {job.conditions.map((condition: any, index: number) => (
                              <div key={index} style={{
                                background: 'white',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.9rem'
                              }}>
                                <span style={{ 
                                  background: '#dbeafe', 
                                  color: '#1e40af', 
                                  padding: '0.25rem 0.5rem', 
                                  borderRadius: '0.25rem',
                                  fontSize: '0.8rem',
                                  fontWeight: '500'
                                }}>
                                  Rule {index + 1}
                                </span>
                                <span>
                                  {condition.cellRef ? `If cell ${condition.cellRef} ` : 'If value '}
                                  <strong>{condition.operator}</strong>
                                  {condition.value && condition.operator !== 'changed' ? ` ${condition.value}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            background: 'white',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb',
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                          }}>
                            No specific conditions - alerts on any change
                          </div>
                        )}
                      </div>

                      {/* Slack Configuration */}
                      <div>
                        <h5 style={{ margin: '0 0 0.75rem 0', color: '#374151', fontSize: '0.95rem' }}>💬 Slack Configuration</h5>
                        <div style={{ 
                          background: 'white', 
                          padding: '1rem', 
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Webhook URL</div>
                          <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#374151', marginBottom: '0.75rem' }}>
                            {job.webhookUrl ? `${job.webhookUrl.substring(0, 50)}...` : 'Not configured'}
                          </div>
                          {job.userMention && (
                            <>
                              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>User Mention</div>
                              <div style={{ fontSize: '0.9rem', color: '#374151' }}>{job.userMention}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMonitoringConfig = () => (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-content">
          <h1>⚙️ Configure Monitoring</h1>
          <div className="user-info">
            <button 
              onClick={() => setShowMonitoringConfig(false)}
              className="secondary-button"
            >
              ← Back to Setup
            </button>
            <span>👤 {userEmail}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="step-card">
          <h3>📊 New Monitoring Job</h3>
          <p style={{ marginBottom: '1.5rem', opacity: '0.8' }}>
            Configure monitoring for a specific Google Sheet. You can monitor cell changes and set up custom alert conditions.
          </p>

          {/* Spreadsheet Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              📋 Select Spreadsheet
            </label>
            <select
              value={selectedSheetForMonitoring?.id || ''}
              onChange={(e) => {
                const sheet = googleSheets.find(s => s.id === e.target.value);
                setSelectedSheetForMonitoring(sheet || null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem'
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

          {/* Cell Range */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              📍 Cell Range to Monitor
            </label>
            <input
              type="text"
              value={cellRange}
              onChange={(e) => setCellRange(e.target.value)}
              placeholder="e.g., A1, B2:D5, A:A"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
            />
            <div style={{ fontSize: '0.8rem', opacity: '0.7', marginTop: '0.25rem' }}>
              Examples: A1 (single cell), A1:C3 (range), A:A (entire column), 1:1 (entire row)
            </div>
          </div>

          {/* Frequency */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ⏱️ Check Frequency (minutes)
            </label>
            <select
              value={frequencyMinutes}
              onChange={(e) => setFrequencyMinutes(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
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
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              👤 Slack User Mention (optional)
            </label>
            <input
              type="text"
              value={userMention}
              onChange={(e) => setUserMention(e.target.value)}
              placeholder="@username or @channel"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
            />
            <div style={{ fontSize: '0.8rem', opacity: '0.7', marginTop: '0.25rem' }}>
              Optional: Mention a specific user or channel in Slack notifications
            </div>
          </div>

          {/* Alert Conditions */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontWeight: 'bold' }}>
                🚨 Alert Conditions
              </label>
              <button
                onClick={addCondition}
                className="secondary-button"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
              >
                + Add Condition
              </button>
            </div>
            
            {conditions.length === 0 ? (
              <div style={{ 
                padding: '1rem', 
                background: '#f8fafc', 
                borderRadius: '0.5rem', 
                border: '1px solid #e2e8f0',
                fontSize: '0.9rem',
                opacity: '0.7',
                textAlign: 'center'
              }}>
                No conditions set - will alert on any value change
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {conditions.map(condition => (
                  <div key={condition.id} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 2fr auto',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
                    >
                      <option value="changed">Any Change</option>
                      <option value=">">Greater Than</option>
                      <option value="<">Less Than</option>
                      <option value="=">Equals</option>
                      <option value="!=">Not Equals</option>
                      <option value="contains">Contains</option>
                    </select>
                    
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                      placeholder={condition.operator === 'changed' ? 'N/A' : 'Value...'}
                      disabled={condition.operator === 'changed'}
                      style={{ 
                        padding: '0.5rem', 
                        borderRadius: '0.25rem', 
                        border: '1px solid #cbd5e1',
                        background: condition.operator === 'changed' ? '#f1f5f9' : 'white'
                      }}
                    />
                    
                    <input
                      type="text"
                      value={condition.description}
                      onChange={(e) => updateCondition(condition.id, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
                    />
                    
                    <button
                      onClick={() => removeCondition(condition.id)}
                      style={{ 
                        padding: '0.5rem', 
                        background: '#fee2e2', 
                        color: '#991b1b', 
                        border: 'none', 
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowMonitoringConfig(false)}
              className="secondary-button"
            >
              Cancel
            </button>
            <button
              onClick={createMonitoringJob}
              className="primary-button"
              disabled={!selectedSheetForMonitoring || !cellRange.trim()}
            >
              Create Monitoring Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const canStartMonitoring = () => {
    const hasSpreadsheet = useManualUrl ? 
      manualSpreadsheetUrl.trim().length > 0 : 
      selectedSheetForMonitoring !== null;
    
    const hasValidConditions = conditions.length > 0 && 
      conditions.every(c => c.cellRef && c.cellRef.trim().length > 0);
    
    return hasSpreadsheet && 
           hasValidConditions && 
           slackWebhook.trim().length > 0;
  };

  const extractSheetIdFromUrl = (url: string): string | null => {
    try {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const handleStartMonitoring = async () => {
    try {
      // New validation for condition-based monitoring
      if (!selectedSheetForMonitoring && !useManualUrl) {
        alert('Please select a spreadsheet');
        return;
      }
      
      if (conditions.length === 0) {
        alert('Please add at least one monitoring rule');
        return;
      }
      
      if (!slackWebhook.trim()) {
        alert('Please provide a Slack webhook URL');
        return;
      }

      const sheetId = useManualUrl ? 
        extractSheetIdFromUrl(manualSpreadsheetUrl) : 
        selectedSheetForMonitoring.id;

      if (!sheetId) {
        alert('Invalid spreadsheet URL. Please check the format.');
        return;
      }

      // Create a monitoring range that encompasses all condition ranges
      const allCellRefs = conditions.map(c => c.cellRef).filter(ref => ref && ref.trim());
      if (allCellRefs.length === 0) {
        alert('Please specify cell references in your monitoring rules');
        return;
      }
      
      // For now, use a broad range that covers most common use cases
      // TODO: Calculate the actual bounding box of all condition ranges
      const primaryRange = "A1:Z1000"; // Broad range to ensure we capture all condition data
      const fullRange = selectedSheetTab ? `${selectedSheetTab}!${primaryRange}` : primaryRange;

      // Get and validate auth token
      const authToken = localStorage.getItem('datapingo_auth_token');
      
      // Enhanced debugging for auth token
      console.log('🔑 Detailed Auth Token Analysis:', {
        hasToken: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        tokenPreview: authToken ? `${authToken.substring(0, 12)}...${authToken.substring(authToken.length - 4)}` : 'null',
        tokenType: typeof authToken,
        localStorageKeys: Object.keys(localStorage),
        localStorageSize: Object.keys(localStorage).length,
        googleAuthStatus: googleAuthStatus,
        isConnected: googleAuthStatus === 'connected'
      });
      
      // Also check if we have other auth-related items in localStorage
      const userEmail = localStorage.getItem('datapingo_user_email');
      const allStorageItems: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          allStorageItems[key] = value ? value.substring(0, 20) + '...' : 'null';
        }
      }
      console.log('💾 All localStorage items:', allStorageItems);

      if (!authToken) {
        alert('❌ Authentication required. Please reconnect to Google Sheets first.');
        return;
      }

      // Create the monitoring job
      const response = await fetch(`${API_BASE_URL}/api/monitoring/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          sheetId: sheetId,
          cellRange: fullRange,
          webhookUrl: slackWebhook,
          frequencyMinutes: frequencyMinutes,
          userMention: userMention,
          conditions: conditions,
          authToken: authToken // Include auth token for authentication
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Monitoring started successfully!\n\nJob ID: ${data.jobId}\nMonitoring: ${useManualUrl ? 'Manual URL' : selectedSheetForMonitoring.name}\nRules: ${conditions.length} monitoring rule(s)\nFrequency: Every ${frequencyMinutes} minute(s)`);
        
        // Reset form
        setSelectedSheetForMonitoring(null);
        setManualSpreadsheetUrl('');
        setSelectedSheetTab('');
        setConditions([]);
        setUserMention('');
        
        // Reload monitoring jobs
        loadMonitoringJobs();
      } else {
        alert('❌ Failed to start monitoring: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Start monitoring error:', error);
      alert('❌ Network error starting monitoring');
    }
  };

  const stopMonitoringJob = async (jobId: string) => {
    try {
      // Get auth token for user authorization
      const authToken = localStorage.getItem('datapingo_auth_token');
      
      // Build URL with auth token if available
      const url = authToken 
        ? `${API_BASE_URL}/api/monitoring/stop/${jobId}?authToken=${encodeURIComponent(authToken)}`
        : `${API_BASE_URL}/api/monitoring/stop/${jobId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Monitoring job stopped successfully');
        loadMonitoringJobs(); // Reload the jobs list
      } else {
        alert('❌ Failed to stop monitoring: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Stop monitoring error:', error);
      alert('❌ Network error stopping monitoring');
    }
  };

  // New Google-first login screen
  const renderGoogleLoginScreen = () => (
    <div className="auth-container">
      <div className="auth-card">
        <div className="logo-section">
          <div className="brand-header">
            <div className="unified-brand">
              <img src="/Sheets Connector for Slack Logo.png" alt="Sheets Connector for Slack" className="unified-logo" />
              <h1 className="login-title">Sheets Connector for Slack</h1>
            </div>
          </div>
          <p>Real-time Google Sheets monitoring with intelligent Slack notifications</p>
        </div>

        <div className="google-login-section">
          <div className="login-prompt">
            <h3>🚀 Get Started in Seconds</h3>
            <p>Connect your Google account to start monitoring your spreadsheets</p>
          </div>

          <button 
            className="google-signin-button" 
            onClick={handleGoogleConnect}
            disabled={googleAuthStatus === 'connecting'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="google-icon">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleAuthStatus === 'connecting' ? 'Connecting to Google...' : 'Sign in with Google'}
          </button>

          <div className="security-note">
            <p>🔒 We only access your spreadsheet data - no personal information</p>
          </div>
        </div>

        <div className="info-section">
          <h3>Why Choose DataPingo?</h3>
          <ul>
            <li><img src="/chart.jpg" alt="Monitor" className="feature-icon" />Monitor Google Sheets in real-time</li>
            <li><img src="/lightning.jpg" alt="Notifications" className="feature-icon" />Get Slack notifications on changes</li>
            <li><img src="/tools.jpg" alt="Conditions" className="feature-icon" />Set custom alert conditions</li>
            <li><img src="/chart.jpg" alt="Track" className="feature-icon" />Track multiple spreadsheets</li>
          </ul>
        </div>

        <div className="footer-links">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span className="separator">•</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <span className="separator">•</span>
          <a href="/support" target="_blank" rel="noopener noreferrer">Support</a>
        </div>
      </div>
    </div>
  );

  const renderConnectingToGoogle = () => (
    <div className="auth-container">
      <div className="auth-card">
        <div className="connecting-section">
          <div className="connecting-icon">
            <div className="spinner"></div>
          </div>
          <h2>Connecting to Google...</h2>
          <p>Please complete the authentication in the popup window</p>
          <p className="connecting-details">This may take a few moments</p>
          
          <button 
            onClick={() => setGoogleAuthStatus('idle')}
            className="secondary-button"
            style={{ marginTop: '1rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderGoogleAuthError = () => (
    <div className="auth-container">
      <div className="auth-card">
        <div className="error-section">
          <div className="error-icon">❌</div>
          <h2>Connection Failed</h2>
          <p>We couldn't connect to your Google account</p>
          {error && (
            <div className="error-details">
              <p><strong>Error:</strong> {error}</p>
            </div>
          )}
          
          <div className="error-actions">
            <button 
              onClick={() => {
                setError('');
                setGoogleAuthStatus('idle');
              }}
              className="primary-button"
            >
              Try Again
            </button>
            
            <button 
              onClick={() => {
                setError('');
                setGoogleAuthStatus('idle');
              }}
              className="secondary-button"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render logic
  const renderContent = () => {
    if (showMonitoringConfig) {
      return renderMonitoringConfig();
    }
    
    // Skip manual approval - go straight to Google login
    switch (googleAuthStatus) {
      case 'connected':
        return renderApprovedUser();
      case 'connecting':
        return renderConnectingToGoogle();
      case 'error':
        return renderGoogleAuthError();
      case 'idle':
      default:
        return renderGoogleLoginScreen();
    }
  };

  return (
    <div className="app">
      {renderContent()}
    </div>
  );
};

export default App;
