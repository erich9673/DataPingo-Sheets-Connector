export declare const API_BASE_URL: string;
export declare const IS_PRODUCTION: boolean;
export declare const API_ENDPOINTS: {
    health: string;
    authUrl: string;
    authCallback: string;
    authStatus: string;
    spreadsheets: string;
    spreadsheetInfo: (id: string) => string;
    cellValues: (id: string, range: string) => string;
    slackTest: string;
    uploadSpreadsheet: string;
    getFileData: (fileId: string) => string;
    getFileValues: (fileId: string, range: string) => string;
    monitoringStart: string;
    monitoringJobs: string;
    monitoringStop: (jobId: string) => string;
    monitoringStopAll: string;
};
