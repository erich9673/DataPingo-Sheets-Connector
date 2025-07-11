import React, { useState } from 'react';

interface GoogleSheetsConnectorProps {
  isConnected: boolean;
  currentSpreadsheet: any;
  onConnect: (spreadsheet: any) => void;
}

const GoogleSheetsConnector: React.FC<GoogleSheetsConnectorProps> = ({
  isConnected,
  currentSpreadsheet,
  onConnect
}) => {
  const [loading, setLoading] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<any[]>([]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Call backend to get auth URL
      const response = await fetch('http://localhost:3000/api/auth/google');
      const data = await response.json();
      
      if (data.success) {
        // Open auth URL in new window
        window.open(data.authUrl, '_blank');
        // For now, we'll simulate the connection
        // In real implementation, you'd handle the OAuth callback
        setTimeout(() => {
          onConnect({ 
            id: 'demo-sheet-id', 
            name: 'Demo Spreadsheet',
            sheets: ['Sheet1', 'Sheet2'] 
          });
          setLoading(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="connector-card">
      <div className="connector-header">
        <h3>🔗 Step 1: Connect Google Sheets</h3>
        {isConnected && <span className="status-badge connected">✅ Connected</span>}
      </div>
      
      <div className="connector-content">
        {!isConnected ? (
          <div>
            <p>Connect to your Google account to access your spreadsheets.</p>
            <button 
              className="btn-primary" 
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              {loading ? '🔄 Connecting...' : '🔗 Connect Google Sheets'}
            </button>
          </div>
        ) : (
          <div className="connected-info">
            <h4>📊 {currentSpreadsheet?.name || 'Connected Spreadsheet'}</h4>
            <p>✅ Successfully connected to Google Sheets</p>
            <button className="btn-secondary" onClick={() => handleGoogleAuth()}>
              🔄 Change Spreadsheet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleSheetsConnector;
