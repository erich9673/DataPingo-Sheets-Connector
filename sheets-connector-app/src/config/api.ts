// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const IS_PRODUCTION = process.env.REACT_APP_ENVIRONMENT === 'production';

// API Endpoints
export const API_ENDPOINTS = {
  // Health
  health: `${API_BASE_URL}/health`,
  
  // Auth
  authUrl: `${API_BASE_URL}/api/auth/google/url`,
  authCallback: `${API_BASE_URL}/api/auth/google/callback`,
  authStatus: `${API_BASE_URL}/api/auth/status`,
  
  // Sheets
  spreadsheets: `${API_BASE_URL}/api/sheets/spreadsheets`,
  spreadsheetInfo: (id: string) => `${API_BASE_URL}/api/sheets/${id}/info`,
  cellValues: (id: string, range: string) => `${API_BASE_URL}/api/sheets/${id}/values/${range}`,
  
  // Slack
  slackTest: `${API_BASE_URL}/api/slack/test`,
  
  // File Upload
  uploadSpreadsheet: `${API_BASE_URL}/api/upload/spreadsheet`,
  getFileData: (fileId: string) => `${API_BASE_URL}/api/upload/file/${fileId}`,
  getFileValues: (fileId: string, range: string) => `${API_BASE_URL}/api/upload/file/${fileId}/values/${range}`,
  
  // Monitoring
  monitoringStart: `${API_BASE_URL}/api/monitoring/start`,
  monitoringJobs: `${API_BASE_URL}/api/monitoring/jobs`,
  monitoringStop: (jobId: string) => `${API_BASE_URL}/api/monitoring/stop/${jobId}`,
  monitoringStopAll: `${API_BASE_URL}/api/monitoring/stop-all`,
};

console.log('🔧 API Configuration:', {
  baseUrl: API_BASE_URL,
  environment: IS_PRODUCTION ? 'production' : 'development'
});
