// Download Helper Utility with GA4 Tracking
// Handles file downloads and automatically tracks them with Google Analytics

import { Analytics } from './analytics';

export class DownloadHelper {
    
    /**
     * Download a CSV file with analytics tracking
     */
    static downloadCsv(data: any[], filename: string, sheetName?: string) {
        try {
            // Convert data to CSV
            const csvContent = this.arrayToCsv(data);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Create download
            this.triggerDownload(blob, filename);
            
            // Track the download
            Analytics.trackCsvExport(sheetName || filename, data.length);
            Analytics.trackDownload(filename, 'csv', 'data_export');
            
            console.log('✅ CSV download completed:', filename);
        } catch (error) {
            console.error('❌ CSV download failed:', error);
            Analytics.trackError(`CSV download failed: ${error}`, 'download_helper');
        }
    }
    
    /**
     * Download JSON configuration/backup files
     */
    static downloadConfig(config: object, filename: string, configType: string = 'backup') {
        try {
            const jsonContent = JSON.stringify(config, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            
            this.triggerDownload(blob, filename);
            
            // Track the download
            Analytics.trackConfigExport(configType, blob.size);
            Analytics.trackDownload(filename, 'json', 'configuration');
            
            console.log('✅ Config download completed:', filename);
        } catch (error) {
            console.error('❌ Config download failed:', error);
            Analytics.trackError(`Config download failed: ${error}`, 'download_helper');
        }
    }
    
    /**
     * Download text files (logs, reports, etc.)
     */
    static downloadText(content: string, filename: string, fileType: string = 'txt') {
        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
            
            this.triggerDownload(blob, filename);
            
            // Track the download
            Analytics.trackDownload(filename, fileType, 'text_export');
            
            console.log('✅ Text download completed:', filename);
        } catch (error) {
            console.error('❌ Text download failed:', error);
            Analytics.trackError(`Text download failed: ${error}`, 'download_helper');
        }
    }
    
    /**
     * Download monitoring reports
     */
    static downloadMonitoringReport(reportData: any, filename: string, format: string = 'json') {
        try {
            let blob: Blob;
            let content: string;
            
            if (format === 'csv' && Array.isArray(reportData)) {
                content = this.arrayToCsv(reportData);
                blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            } else {
                content = JSON.stringify(reportData, null, 2);
                blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
            }
            
            this.triggerDownload(blob, filename);
            
            // Track the report generation and download
            const dataPoints = Array.isArray(reportData) ? reportData.length : Object.keys(reportData).length;
            Analytics.trackReportGeneration('monitoring_report', dataPoints, format);
            Analytics.trackDownload(filename, format, 'report_export');
            
            console.log('✅ Monitoring report download completed:', filename);
        } catch (error) {
            console.error('❌ Monitoring report download failed:', error);
            Analytics.trackError(`Report download failed: ${error}`, 'download_helper');
        }
    }
    
    /**
     * Download template files
     */
    static downloadTemplate(templateData: any, filename: string, templateType: string) {
        try {
            let blob: Blob;
            
            if (typeof templateData === 'string') {
                blob = new Blob([templateData], { type: 'text/plain;charset=utf-8;' });
            } else {
                const content = JSON.stringify(templateData, null, 2);
                blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
            }
            
            this.triggerDownload(blob, filename);
            
            // Track template download
            Analytics.trackTemplateDownload(filename, templateType);
            Analytics.trackDownload(filename, templateType, 'template');
            
            console.log('✅ Template download completed:', filename);
        } catch (error) {
            console.error('❌ Template download failed:', error);
            Analytics.trackError(`Template download failed: ${error}`, 'download_helper');
        }
    }
    
    /**
     * Track external file downloads (when user clicks external links)
     */
    static trackExternalDownload(url: string, filename: string, fileType: string) {
        Analytics.trackDownload(filename, fileType, 'external_link');
        console.log('🔗 External download tracked:', filename);
    }
    
    /**
     * Core method to trigger browser download
     */
    private static triggerDownload(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    }
    
    /**
     * Convert array of objects to CSV string
     */
    private static arrayToCsv(data: any[]): string {
        if (!data || data.length === 0) return '';
        
        // Get headers from first object
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
    
    /**
     * Generate timestamped filename
     */
    static generateTimestampedFilename(baseName: string, extension: string): string {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `${baseName}_${timestamp}.${extension}`;
    }
    
    /**
     * Track bulk data export operations
     */
    static trackBulkExport(operation: string, recordCount: number, format: string, success: boolean) {
        Analytics.trackBulkOperation(`export_${operation}`, recordCount, success);
        if (success) {
            Analytics.trackDownload(`bulk_${operation}.${format}`, format, 'bulk_export');
        }
    }
}
