// Google Analytics 4 Tracking Utility for DataPingo Sheets Connector
// Using GA4 measurement ID: G-W5VY62S4LR

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
        dataLayer: any[];
    }
}

export class Analytics {
    private static isInitialized = false;
    
    // Initialize GA4 with your measurement ID
    static init(measurementId: string) {
        if (typeof window === 'undefined' || this.isInitialized) return;
        
        // Load gtag script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(script);
        
        // Initialize dataLayer
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() {
            window.dataLayer.push(arguments);
        };
        
        window.gtag('js', new Date());
        window.gtag('config', measurementId, {
            // Enhanced ecommerce and user engagement
            send_page_view: true,
            allow_google_signals: true,
            allow_ad_personalization_signals: false
        });
        
        this.isInitialized = true;
        console.log('📊 Google Analytics 4 initialized');
    }
    
    // Track page views
    static trackPageView(pagePath: string, pageTitle: string) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('config', 'G-W5VY62S4LR', {
            page_path: pagePath,
            page_title: pageTitle
        });
        
        console.log('📊 Page view tracked:', pagePath);
    }
    
    // Track app "downloads" / installations from Slack
    static trackInstallation(source: string = 'slack_marketplace') {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'app_install', {
            event_category: 'acquisition',
            event_label: source,
            value: 1,
            custom_parameters: {
                source: source,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('📥 App installation tracked from:', source);
    }
    
    // Track user signups
    static trackSignup(email: string, method: string = 'email') {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'sign_up', {
            event_category: 'engagement',
            method: method,
            event_label: 'user_registration',
            custom_parameters: {
                user_email: email,
                signup_method: method
            }
        });
        
        console.log('✅ User signup tracked:', email);
    }
    
    // Track Google OAuth connections
    static trackGoogleConnect(success: boolean, email?: string) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'google_oauth', {
            event_category: 'integration',
            event_label: success ? 'success' : 'failure',
            value: success ? 1 : 0,
            custom_parameters: {
                oauth_success: success,
                user_email: email || 'unknown',
                integration_type: 'google_sheets'
            }
        });
        
        console.log('🔗 Google OAuth tracked:', success ? 'success' : 'failure');
    }
    
    // Track Slack connections
    static trackSlackConnect(success: boolean, testResult?: boolean) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'slack_connection', {
            event_category: 'integration',
            event_label: success ? 'success' : 'failure',
            value: success ? 1 : 0,
            custom_parameters: {
                slack_success: success,
                test_successful: testResult,
                integration_type: 'slack_webhook'
            }
        });
        
        console.log('💬 Slack connection tracked:', success ? 'success' : 'failure');
    }
    
    // Track monitoring job creation
    static trackMonitoringJobCreated(sheetName: string, frequency: number, conditionsCount: number) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'monitoring_job_created', {
            event_category: 'feature_usage',
            event_label: 'job_creation',
            value: 1,
            custom_parameters: {
                sheet_name: sheetName,
                check_frequency_minutes: frequency,
                conditions_count: conditionsCount,
                feature_type: 'monitoring'
            }
        });
        
        console.log('📊 Monitoring job creation tracked:', sheetName);
    }
    
    // Track feature usage
    static trackFeatureUsage(feature: string, action: string, value?: number) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'feature_usage', {
            event_category: 'engagement',
            event_label: `${feature}_${action}`,
            value: value || 1,
            custom_parameters: {
                feature_name: feature,
                action_type: action
            }
        });
        
        console.log('🎯 Feature usage tracked:', feature, action);
    }
    
    // Track user engagement time
    static trackEngagementTime(timeSpent: number, page: string) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'user_engagement', {
            event_category: 'engagement',
            event_label: page,
            value: Math.round(timeSpent),
            custom_parameters: {
                engagement_time_msec: timeSpent,
                page_name: page
            }
        });
        
        console.log('⏱️ Engagement time tracked:', timeSpent, 'ms on', page);
    }
    
    // Track errors
    static trackError(error: string, context: string) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'exception', {
            description: error,
            fatal: false,
            custom_parameters: {
                error_context: context,
                error_message: error
            }
        });
        
        console.log('❌ Error tracked:', error, 'in', context);
    }
    
    // Track conversions (premium upgrades, etc.)
    static trackConversion(conversionType: string, value?: number) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'conversion', {
            event_category: 'conversion',
            event_label: conversionType,
            value: value || 1,
            custom_parameters: {
                conversion_type: conversionType,
                conversion_value: value
            }
        });
        
        console.log('🎯 Conversion tracked:', conversionType, value);
    }
    
    // Track user properties
    static setUserProperties(userId: string, properties: Record<string, any>) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('config', 'G-W5VY62S4LR', {
            user_id: userId,
            custom_map: properties
        });
        
        console.log('👤 User properties set:', properties);
    }
    
    // Track Slack App Store metrics
    static trackSlackMetrics(action: string, data?: Record<string, any>) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'slack_app_metrics', {
            event_category: 'slack_marketplace',
            event_label: action,
            custom_parameters: {
                slack_action: action,
                ...data
            }
        });
        
        console.log('📱 Slack metrics tracked:', action, data);
    }

    // Track file downloads and exports
    static trackDownload(fileName: string, fileType: string, source: string = 'export') {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'file_download', {
            event_category: 'downloads',
            event_label: fileType,
            value: 1,
            custom_parameters: {
                file_name: fileName,
                file_type: fileType,
                download_source: source,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('📥 Download tracked:', fileName, fileType);
    }

    // Track CSV exports from spreadsheet data
    static trackCsvExport(sheetName: string, rowCount: number) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'csv_export', {
            event_category: 'data_export',
            event_label: 'csv_download',
            value: rowCount,
            custom_parameters: {
                sheet_name: sheetName,
                rows_exported: rowCount,
                export_type: 'csv',
                export_timestamp: new Date().toISOString()
            }
        });
        
        console.log('📊 CSV export tracked:', sheetName, rowCount, 'rows');
    }

    // Track configuration exports/backups
    static trackConfigExport(configType: string, size?: number) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'config_export', {
            event_category: 'configuration',
            event_label: 'backup_download',
            value: 1,
            custom_parameters: {
                config_type: configType,
                file_size_bytes: size,
                export_timestamp: new Date().toISOString()
            }
        });
        
        console.log('⚙️ Config export tracked:', configType);
    }

    // Track template downloads
    static trackTemplateDownload(templateName: string, templateType: string) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'template_download', {
            event_category: 'resources',
            event_label: templateType,
            value: 1,
            custom_parameters: {
                template_name: templateName,
                template_type: templateType,
                download_timestamp: new Date().toISOString()
            }
        });
        
        console.log('📋 Template download tracked:', templateName);
    }

    // Track report generations and downloads
    static trackReportGeneration(reportType: string, dataPoints: number, format: string = 'pdf') {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'report_generated', {
            event_category: 'reporting',
            event_label: reportType,
            value: dataPoints,
            custom_parameters: {
                report_type: reportType,
                data_points: dataPoints,
                output_format: format,
                generation_timestamp: new Date().toISOString()
            }
        });
        
        console.log('📈 Report generation tracked:', reportType, format);
    }

    // Track bulk data operations
    static trackBulkOperation(operation: string, recordCount: number, success: boolean) {
        if (typeof window === 'undefined' || !window.gtag) return;
        
        window.gtag('event', 'bulk_operation', {
            event_category: 'data_processing',
            event_label: operation,
            value: recordCount,
            custom_parameters: {
                operation_type: operation,
                records_processed: recordCount,
                operation_success: success,
                processing_timestamp: new Date().toISOString()
            }
        });
        
        console.log('🔄 Bulk operation tracked:', operation, recordCount, 'records');
    }
}
