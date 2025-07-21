export declare class DownloadHelper {
    /**
     * Download a CSV file with analytics tracking
     */
    static downloadCsv(data: any[], filename: string, sheetName?: string): void;
    /**
     * Download JSON configuration/backup files
     */
    static downloadConfig(config: object, filename: string, configType?: string): void;
    /**
     * Download text files (logs, reports, etc.)
     */
    static downloadText(content: string, filename: string, fileType?: string): void;
    /**
     * Download monitoring reports
     */
    static downloadMonitoringReport(reportData: any, filename: string, format?: string): void;
    /**
     * Download template files
     */
    static downloadTemplate(templateData: any, filename: string, templateType: string): void;
    /**
     * Track external file downloads (when user clicks external links)
     */
    static trackExternalDownload(url: string, filename: string, fileType: string): void;
    /**
     * Core method to trigger browser download
     */
    private static triggerDownload;
    /**
     * Convert array of objects to CSV string
     */
    private static arrayToCsv;
    /**
     * Generate timestamped filename
     */
    static generateTimestampedFilename(baseName: string, extension: string): string;
    /**
     * Track bulk data export operations
     */
    static trackBulkExport(operation: string, recordCount: number, format: string, success: boolean): void;
}
