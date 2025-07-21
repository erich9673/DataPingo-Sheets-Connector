import React from 'react';
interface FileUploadConnectorProps {
    isConnected: boolean;
    currentSpreadsheet: any;
    onConnect: (spreadsheet: any) => void;
}
declare const FileUploadConnector: React.FC<FileUploadConnectorProps>;
export default FileUploadConnector;
