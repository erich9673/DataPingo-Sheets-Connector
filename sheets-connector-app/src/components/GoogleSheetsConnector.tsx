import React, { useState, useEffect } from 'react';

interface GoogleSheetsConnectorProps {
  isConnected: boolean;
  currentSpreadsheet: any;
  onConnect: (spreadsheet: any, allSpreadsheets?: any[]) => void;
}

const GoogleSheetsConnector: React.FC<GoogleSheetsConnectorProps> = ({
  isConnected,
  currentSpreadsheet,
  onConnect
}) => {
  const [loading, setLoading] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<any[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/status');
      const data = await response.json();
      
      console.log('Auth status check:', data);
      
      if (data.success && data.authenticated) {
        // Check if we have a refresh token by trying to fetch spreadsheets
        const spreadsheetsResponse = await fetch('http://localhost:3001/api/sheets/spreadsheets');
        const spreadsheetsData = await spreadsheetsResponse.json();
        
        console.log('Spreadsheets data:', spreadsheetsData);
        
        if (spreadsheetsData.success && spreadsheetsData.spreadsheets && spreadsheetsData.spreadsheets.length > 0) {
          // Use the first spreadsheet for simplicity, but pass all spreadsheets
          const firstSheet = spreadsheetsData.spreadsheets[0];
          onConnect({
            id: firstSheet.id,
            name: firstSheet.name,
            sheets: ['Sheet1'], // We'd need to fetch actual sheet names
            webViewLink: firstSheet.webViewLink
          }, spreadsheetsData.spreadsheets);
        } else if (spreadsheetsData.error && spreadsheetsData.error.includes('refresh token')) {
          // Need to re-authenticate with forced consent to get refresh token
          console.log('No refresh token found, need to re-authenticate');
          return; // Don't auto-connect, let user click the button to re-auth
        }
      }
    } catch (error) {
      console.error('Auth status check error:', error);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Call backend to get auth URL with forced consent to ensure we get refresh token
      const response = await fetch('http://localhost:3001/api/auth/google/url?force=true');
      const data = await response.json();
      
      console.log('Auth response:', data);
      
      if (data.success && data.url) {
        // Open auth URL in a new window/tab
        const authWindow = window.open(data.url, '_blank', 'width=500,height=600');
        
        // Start checking for authentication completion
        setCheckingAuth(true);
        
        // Add timeout to prevent infinite loading
        const authTimeout = setTimeout(() => {
          clearInterval(checkInterval);
          setCheckingAuth(false);
          setLoading(false);
          alert('⏰ Authentication timeout. Please try again or check if you completed the OAuth process.');
        }, 2 * 60 * 1000); // 2 minutes timeout
        
        const checkInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch('http://localhost:3001/api/auth/status');
            const statusData = await statusResponse.json();
            
            console.log('Polling auth status:', statusData);
            
            if (statusData.success && statusData.authenticated && statusData.hasRefreshToken) {
              clearInterval(checkInterval);
              clearTimeout(authTimeout);
              setCheckingAuth(false);
              setLoading(false);
              
              // Close the auth window if still open
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              
              // Fetch user's spreadsheets
              const spreadsheetsResponse = await fetch('http://localhost:3001/api/sheets/spreadsheets');
              const spreadsheetsData = await spreadsheetsResponse.json();
              
              if (spreadsheetsData.success && spreadsheetsData.spreadsheets && spreadsheetsData.spreadsheets.length > 0) {
                // Use the first spreadsheet for initial connection, but pass all spreadsheets
                const firstSheet = spreadsheetsData.spreadsheets[0];
                onConnect({
                  id: firstSheet.id,
                  name: firstSheet.name,
                  sheets: ['Sheet1'], // We'd need to fetch actual sheet names
                  webViewLink: firstSheet.webViewLink
                }, spreadsheetsData.spreadsheets);
              } else {
                alert('✅ Authentication successful, but no spreadsheets found. Please create a Google Sheet first.');
              }
            }
          } catch (error) {
            console.error('Auth status check error:', error);
          }
        }, 1000); // Check every 1 second for faster response
        
        // Stop checking after 5 minutes to prevent infinite polling
        setTimeout(() => {
          clearInterval(checkInterval);
          setCheckingAuth(false);
          setLoading(false);
        }, 5 * 60 * 1000);
        
      } else {
        console.error('No auth URL received:', data);
        alert('❌ Failed to get Google auth URL. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      alert('❌ Error connecting to Google. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="connector-card fade-in">
      <div className="connector-header">
        <h3>🔗 Step 1: Connect Google Sheets</h3>
        {isConnected && <span className="status-badge connected">✅ Connected</span>}
      </div>
      
      <div className="connector-content">
        {!isConnected ? (
          <div>
            <p>Connect Google Sheets to Slack for real-time notifications</p>
            <div className="button-group">
              <button 
                className="btn-primary btn-large" 
                onClick={handleGoogleAuth}
                disabled={loading}
              >
                {loading ? '🔄 Authenticating...' : '� Connect with Google'}
              </button>
            </div>
            <small style={{ color: 'var(--text-secondary)', marginTop: '1rem', display: 'block' }}>
              ✅ Secure OAuth authentication • ✅ Read-only access • ✅ No data stored
            </small>
          </div>
        ) : (
          <div className="connected-info">
            <h4>📊 {currentSpreadsheet?.name || 'Connected Spreadsheet'}</h4>
            <p>✅ Successfully connected to Google Sheets</p>
            <p>📈 Real-time monitoring is now active</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleSheetsConnector;
