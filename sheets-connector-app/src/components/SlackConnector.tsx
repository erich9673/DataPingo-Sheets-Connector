import React, { useState } from 'react';

interface SlackConnectorProps {
  isConnected: boolean;
  webhookUrl: string;
  onConnect: (webhookUrl: string) => void;
}

const SlackConnector: React.FC<SlackConnectorProps> = ({
  isConnected,
  webhookUrl,
  onConnect
}) => {
  const [inputUrl, setInputUrl] = useState(webhookUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const handleSlackTest = async () => {
    if (!inputUrl) {
      setTestResult('❌ Please enter a webhook URL');
      return;
    }

    setTesting(true);
    setTestResult('');

    try {
      const response = await fetch('http://localhost:3001/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: inputUrl })
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult('✅ Connection successful! Check your Slack channel.');
        onConnect(inputUrl);
      } else {
        setTestResult(`❌ Connection failed: ${data.error}`);
      }
    } catch (error) {
      setTestResult('❌ Connection failed. Please check your webhook URL.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="connector-card slide-in">
      <div className="connector-header">
        <h3>💬 Step 3: Connect Slack</h3>
        {isConnected && <span className="status-badge connected">✅ Connected</span>}
      </div>
      
      <div className="connector-content">
        {!isConnected ? (
          <div>
            <p>Set up Slack notifications to receive instant alerts when your spreadsheet changes.</p>
            
            <div className="form-group">
              <label htmlFor="webhook-url">Slack Webhook URL</label>
              <input
                id="webhook-url"
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="input-field"
              />
              <small>
                Get your webhook URL from your Slack app settings. 
                <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">
                  Learn how to create one →
                </a>
              </small>
            </div>
            
            <div className="button-group">
              <button 
                className="btn-primary" 
                onClick={handleSlackTest}
                disabled={testing || !inputUrl}
              >
                {testing ? '🔄 Testing...' : '🧪 Test Connection'}
              </button>
            </div>

            {testResult && (
              <div className={`test-result ${testResult.includes('✅') ? 'success' : 'error'}`}>
                {testResult}
              </div>
            )}

            <div className="help-text">
              <details>
                <summary>🤔 How to get a Slack Webhook URL?</summary>
                <ol>
                  <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a></li>
                  <li>Create a new app or select an existing one</li>
                  <li>Go to "Incoming Webhooks" and activate them</li>
                  <li>Click "Add New Webhook to Workspace"</li>
                  <li>Choose your channel and copy the webhook URL</li>
                </ol>
              </details>
            </div>
          </div>
        ) : (
          <div className="connected-info">
            <h4>💬 Slack Connected</h4>
            <p>✅ Notifications are active and ready</p>
            <button className="btn-secondary" onClick={() => onConnect('')}>
              🔄 Change Webhook URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlackConnector;
