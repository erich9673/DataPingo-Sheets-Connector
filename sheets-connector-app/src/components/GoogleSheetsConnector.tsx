import React, { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';

interface FileUploadConnectorProps {
  isConnected: boolean;
  currentSpreadsheet: any;
  onConnect: (spreadsheet: any) => void;
}

const FileUploadConnector: React.FC<FileUploadConnectorProps> = ({
  isConnected,
  currentSpreadsheet,
  onConnect
}) => {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const supportedFormats = [
    { ext: '.csv', name: 'CSV Files', icon: '📊' },
    { ext: '.xlsx', name: 'Excel Files', icon: '📗' },
    { ext: '.xls', name: 'Excel Legacy', icon: '📗' },
    { ext: '.ods', name: 'OpenDocument', icon: '📋' },
    { ext: '.tsv', name: 'Tab-separated', icon: '📄' }
  ];

  const handleFiles = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    // Validate file size
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isSupported = supportedFormats.some(format => 
      fileName.endsWith(format.ext)
    );
    
    if (!isSupported) {
      alert('Unsupported file format. Please upload CSV, Excel, or OpenDocument files.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(API_ENDPOINTS.uploadSpreadsheet, {
        method: 'POST',
        body: formData,
        // Add progress tracking if needed
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        onConnect({
          id: result.fileId,
          name: file.name,
          sheets: result.sheets || ['Sheet1'],
          type: 'uploaded',
          data: result.data,
          columns: result.columns,
          rows: result.rows
        });
        setUploadProgress(100);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [onConnect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  return (
    <div className="connector-card fade-in">
      <div className="connector-header">
        <h3>📄 Step 1: Upload Your Spreadsheet</h3>
        {isConnected && <span className="status-badge connected">✅ Connected</span>}
      </div>
      
      <div className="connector-content">
        {!isConnected ? (
          <div>
            <p>Upload your spreadsheet file (CSV, Excel, or OpenDocument) to start monitoring:</p>
            
            {/* File Upload Area */}
            <div 
              className={`upload-area ${dragActive ? 'drag-active' : ''} ${loading ? 'uploading' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="upload-content">
                {loading ? (
                  <div className="upload-loading">
                    <div className="spinner">🔄</div>
                    <p>Uploading and processing...</p>
                    {uploadProgress > 0 && (
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">📁</div>
                    <h4>Drop your file here or click to browse</h4>
                    <p className="upload-instructions">
                      Supports: CSV, Excel (.xlsx, .xls), OpenDocument (.ods), TSV
                    </p>
                    <p className="upload-limit">Maximum file size: 10MB</p>
                  </>
                )}
              </div>
              
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls,.ods,.tsv"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>

            {/* Supported Formats */}
            <div className="supported-formats">
              <h5>✅ Supported Formats:</h5>
              <div className="format-list">
                {supportedFormats.map((format, index) => (
                  <div key={index} className="format-item">
                    <span className="format-icon">{format.icon}</span>
                    <span className="format-name">{format.name}</span>
                    <span className="format-ext">{format.ext}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="upload-instructions-box">
              <h5>📋 How to prepare your file:</h5>
              <ol>
                <li><strong>From Google Sheets:</strong> File → Download → CSV or Excel format</li>
                <li><strong>From Excel:</strong> Save As → Choose .xlsx or .csv format</li>
                <li><strong>Ensure your data:</strong> Has headers in the first row</li>
                <li><strong>File size:</strong> Keep under 10MB for best performance</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="connected-info">
            <h4>📊 {currentSpreadsheet?.name || 'Uploaded Spreadsheet'}</h4>
            <p>✅ Successfully uploaded and processed</p>
            <p>📈 Ready for real-time monitoring</p>
            {currentSpreadsheet?.rows && (
              <p>📋 {currentSpreadsheet.rows} rows • {currentSpreadsheet.columns} columns</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadConnector;
