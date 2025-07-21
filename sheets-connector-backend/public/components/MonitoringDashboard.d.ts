import React from 'react';
interface SpreadsheetConfigData {
    spreadsheetId: string;
    spreadsheetName: string;
    sheetName: string;
    range: string;
    conditions: Array<{
        id: string;
        cell: string;
        operator: string;
        value: string;
        description: string;
    }>;
}
interface MonitoringDashboardProps {
    spreadsheet: any;
    webhookUrl: string;
    config: SpreadsheetConfigData;
}
declare const MonitoringDashboard: React.FC<MonitoringDashboardProps>;
export default MonitoringDashboard;
