declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}
export declare class Analytics {
    private static isInitialized;
    static init(measurementId: string): void;
    static trackPageView(pagePath: string, pageTitle: string): void;
    static trackInstallation(source?: string): void;
    static trackSignup(email: string, method?: string): void;
    static trackGoogleConnect(success: boolean, email?: string): void;
    static trackSlackConnect(success: boolean, testResult?: boolean): void;
    static trackMonitoringJobCreated(sheetName: string, frequency: number, conditionsCount: number): void;
    static trackFeatureUsage(feature: string, action: string, value?: number): void;
    static trackEngagementTime(timeSpent: number, page: string): void;
    static trackError(error: string, context: string): void;
    static trackConversion(conversionType: string, value?: number): void;
    static setUserProperties(userId: string, properties: Record<string, any>): void;
    static trackSlackMetrics(action: string, data?: Record<string, any>): void;
    static trackDownload(fileName: string, fileType: string, source?: string): void;
    static trackCsvExport(sheetName: string, rowCount: number): void;
    static trackConfigExport(configType: string, size?: number): void;
    static trackTemplateDownload(templateName: string, templateType: string): void;
    static trackReportGeneration(reportType: string, dataPoints: number, format?: string): void;
    static trackBulkOperation(operation: string, recordCount: number, success: boolean): void;
}
