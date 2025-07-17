// API Configuration
const isRailwayProduction = typeof window !== 'undefined' && 
  (window.location.hostname.includes('railway.app') || 
   window.location.hostname.includes('up.railway.app'));

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// EMERGENCY FIX: Force Railway production mode
const forceRailwayMode = typeof window !== 'undefined' && 
  window.location.hostname.includes('web-production-aafd.up.railway.app');

export const API_BASE_URL = (isRailwayProduction || forceRailwayMode)
  ? ''  // Railway production - same domain, proxied through /api
  : 'http://localhost:3001';  // Local development - backend on port 3001  

export const IS_PRODUCTION = isRailwayProduction || forceRailwayMode;

// Debug logging for Railway
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration Debug:', {
    hostname: window.location.hostname,
    fullURL: window.location.href,
    isRailwayProduction,
    forceRailwayMode,
    isLocalhost,
    API_BASE_URL,
    IS_PRODUCTION
  });
}

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
