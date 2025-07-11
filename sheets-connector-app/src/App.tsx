import React, { useState, useEffect } from 'react';
import GoogleSheetsConnector from './components/GoogleSheetsConnector';
import SlackConnector from './components/SlackConnector';
import MonitoringDashboard from './components/MonitoringDashboard';
import './styles/App.css';

interface AppState {
  isGoogleConnected: boolean;
  isSlackConnected: boolean;
  currentSpreadsheet: any;
  webhookUrl: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isGoogleConnected: false,
    isSlackConnected: false,
    currentSpreadsheet: null,
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
        <div className="setup-flow">
          {/* Step 1: Google Sheets Connection */}
          <GoogleSheetsConnector 
            isConnected={state.isGoogleConnected}
            currentSpreadsheet={state.currentSpreadsheet}
            onConnect={(spreadsheet) => updateState({ 
              isGoogleConnected: true, 
              currentSpreadsheet: spreadsheet 
            })}
          />

          {/* Step 2: Slack Connection */}
          {state.isGoogleConnected && (
            <SlackConnector 
              isConnected={state.isSlackConnected}
              webhookUrl={state.webhookUrl}
              onConnect={(webhook) => updateState({ 
                isSlackConnected: true, 
                webhookUrl: webhook 
              })}
            />
          )}

          {/* Step 3: Monitoring Setup */}
          {state.isGoogleConnected && state.isSlackConnected && (
            <MonitoringDashboard 
              spreadsheet={state.currentSpreadsheet}
              webhookUrl={state.webhookUrl}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>🚀 Set it once, forget it forever!</p>
      </footer>
    </div>
  );
};

export default App;
