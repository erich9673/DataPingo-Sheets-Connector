export declare const exportMonitoringReport: (jobId: string, format?: "csv" | "json") => Promise<void>;
export declare const exportSpreadsheetData: (spreadsheetId: string, sheetName: string, range?: string, format?: "csv" | "json") => Promise<void>;
export declare const exportUploadedFileData: (fileId: string, range?: string, format?: "csv" | "json") => Promise<void>;
export declare const exportConfiguration: (config: any) => void;
export declare const downloadTemplate: (templateType: string) => void;
export declare const exportMonitoringLogs: (jobId: string, days?: number) => Promise<void>;
export declare const trackDocumentationDownload: (docType: string, url: string) => void;
export declare const performBulkOperation: (operation: string, data: any[]) => Promise<void>;
