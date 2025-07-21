import React from 'react';
interface Sheet {
    properties: {
        title: string;
        sheetId: number;
    };
}
interface Spreadsheet {
    id: string;
    name: string;
    sheets: Sheet[] | string[];
    webViewLink?: string;
    type?: string;
    data?: any[];
    columns?: string[];
    rows?: number;
}
interface Condition {
    id: string;
    cell: string;
    operator: string;
    value: string;
    description: string;
}
interface SpreadsheetConfigProps {
    isConfigured: boolean;
    spreadsheets: Spreadsheet[];
    onConfigure: (config: {
        spreadsheetId: string;
        spreadsheetName: string;
        sheetName: string;
        range: string;
        conditions: Condition[];
    }) => void;
}
export declare const SpreadsheetConfig: React.FC<SpreadsheetConfigProps>;
export {};
