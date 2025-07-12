import React, { useState, useEffect } from 'react';

interface Sheet {
  properties: {
    title: string;
    sheetId: number;
  };
}

interface Spreadsheet {
  id: string;
  name: string;
  sheets: Sheet[];
  webViewLink: string;
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

export const SpreadsheetConfig: React.FC<SpreadsheetConfigProps> = ({
  isConfigured,
  spreadsheets,
  onConfigure
}) => {
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [range, setRange] = useState<string>('A1:Z100');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [newCondition, setNewCondition] = useState({
    cell: '',
    operator: '>',
    value: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<Sheet[]>([]);

  // Debug: Log spreadsheets data
  React.useEffect(() => {
    console.log('SpreadsheetConfig received spreadsheets:', spreadsheets);
    console.log('Spreadsheets count:', spreadsheets?.length || 0);
  }, [spreadsheets]);

  // Get sheets for selected spreadsheet
  useEffect(() => {
    if (selectedSpreadsheet) {
      const spreadsheet = spreadsheets.find(s => s.id === selectedSpreadsheet);
      if (spreadsheet && spreadsheet.sheets) {
        setAvailableSheets(spreadsheet.sheets);
        if (spreadsheet.sheets.length > 0) {
          setSelectedSheet(spreadsheet.sheets[0].properties.title);
        }
      } else {
        // Fetch sheet info from API
        fetchSheetInfo(selectedSpreadsheet);
      }
    }
  }, [selectedSpreadsheet, spreadsheets]);

  const fetchSheetInfo = async (spreadsheetId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/sheets/${spreadsheetId}/info`);
      const data = await response.json();
      
      if (data.success && data.sheets) {
        setAvailableSheets(data.sheets);
        if (data.sheets.length > 0) {
          setSelectedSheet(data.sheets[0].properties.title);
        }
      }
    } catch (error) {
      console.error('Error fetching sheet info:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    if (newCondition.cell && newCondition.value) {
      const cellRef = newCondition.cell.toUpperCase();
      
      // Validate cell or range format
      if (!isValidCellOrRange(cellRef)) {
        alert('Invalid cell or range format. Examples: A1, A1:A10, B:B, 1:1');
        return;
      }
      
      // Check if range operator is used with appropriate cell reference
      const isRange = cellRef.includes(':');
      const isRangeOp = isRangeOperator(newCondition.operator);
      
      if (isRangeOp && !isRange) {
        alert('Range operators require a cell range (e.g., A1:A10). For single cells, use regular operators.');
        return;
      }
      
      const condition: Condition = {
        id: Date.now().toString(),
        cell: cellRef,
        operator: newCondition.operator,
        value: newCondition.value,
        description: newCondition.description || `${selectedSheet}!${cellRef} ${getOperatorDisplayName(newCondition.operator)} ${newCondition.value}`
      };
      setConditions([...conditions, condition]);
      setNewCondition({ cell: '', operator: '>', value: '', description: '' });
    }
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const handleConfigure = () => {
    if (selectedSpreadsheet && selectedSheet) {
      const spreadsheet = spreadsheets.find(s => s.id === selectedSpreadsheet);
      onConfigure({
        spreadsheetId: selectedSpreadsheet,
        spreadsheetName: spreadsheet?.name || 'Unknown',
        sheetName: selectedSheet,
        range,
        conditions
      });
    }
  };

  const operatorOptions = [
    { value: '>', label: 'Greater than (>)' },
    { value: '<', label: 'Less than (<)' },
    { value: '>=', label: 'Greater than or equal (>=)' },
    { value: '<=', label: 'Less than or equal (<=)' },
    { value: '=', label: 'Equal to (=)' },
    { value: '!=', label: 'Not equal to (!=)' },
    { value: 'contains', label: 'Contains text' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'changed', label: 'Value changed' },
    { value: 'any_in_range>', label: 'Any cell in range >' },
    { value: 'any_in_range<', label: 'Any cell in range <' },
    { value: 'any_in_range>=', label: 'Any cell in range >=' },
    { value: 'any_in_range<=', label: 'Any cell in range <=' },
    { value: 'any_in_range=', label: 'Any cell in range =' },
    { value: 'all_in_range>', label: 'All cells in range >' },
    { value: 'all_in_range<', label: 'All cells in range <' },
    { value: 'sum_range>', label: 'Sum of range >' },
    { value: 'sum_range<', label: 'Sum of range <' },
    { value: 'avg_range>', label: 'Average of range >' },
    { value: 'avg_range<', label: 'Average of range <' },
    { value: 'count_range>', label: 'Count of non-empty cells >' },
    { value: 'range_changed', label: 'Any cell in range changed' }
  ];

  // Helper function to validate cell or range format
  const isValidCellOrRange = (cellRef: string) => {
    // Single cell pattern: A1, B2, etc.
    const singleCellPattern = /^[A-Z]+[0-9]+$/;
    // Range pattern: A1:A10, B2:C5, etc.
    const rangePattern = /^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/;
    // Column range: A:A, B:C, etc.
    const columnRangePattern = /^[A-Z]+:[A-Z]+$/;
    // Row range: 1:1, 5:10, etc.
    const rowRangePattern = /^[0-9]+:[0-9]+$/;
    
    return singleCellPattern.test(cellRef) || 
           rangePattern.test(cellRef) || 
           columnRangePattern.test(cellRef) || 
           rowRangePattern.test(cellRef);
  };

  // Helper function to determine if operator is range-specific
  const isRangeOperator = (operator: string) => {
    return operator.includes('_range') || operator.includes('any_in_range') || operator.includes('all_in_range');
  };

  // Helper function to get operator display name
  const getOperatorDisplayName = (operator: string) => {
    const option = operatorOptions.find(op => op.value === operator);
    return option ? option.label : operator;
  };

  return (
    <div className="connector-card fade-in">
      <div className="connector-header">
        <h3>⚙️ Step 2: Configure Monitoring</h3>
        {isConfigured && <span className="status-badge connected">✅ Configured</span>}
      </div>
      
      <div className="connector-content">
        {!isConfigured ? (
          <div>
            <p>Select which spreadsheet and conditions to monitor for real-time notifications</p>
            
            {/* Spreadsheet Selection */}
            <div className="config-section">
              <label htmlFor="spreadsheet-select">📊 Select Spreadsheet:</label>
              {!spreadsheets || spreadsheets.length === 0 ? (
                <div className="loading-spinner">
                  No spreadsheets available. Please check your Google Sheets connection.
                  <br />
                  <small>Debug: Received {spreadsheets?.length || 0} spreadsheets</small>
                </div>
              ) : (
                <select
                  id="spreadsheet-select"
                  value={selectedSpreadsheet}
                  onChange={(e) => setSelectedSpreadsheet(e.target.value)}
                  className="config-select"
                >
                  <option value="">Choose a spreadsheet...</option>
                  {spreadsheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Sheet Selection */}
            {selectedSpreadsheet && (
              <div className="config-section">
                <label htmlFor="sheet-select">📋 Select Sheet:</label>
                {loading ? (
                  <div className="loading-spinner">Loading sheets...</div>
                ) : (
                  <select
                    id="sheet-select"
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="config-select"
                  >
                    <option value="">Choose a sheet...</option>
                    {availableSheets.map((sheet) => (
                      <option key={sheet.properties.sheetId} value={sheet.properties.title}>
                        {sheet.properties.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Range Selection */}
            {selectedSheet && (
              <div className="config-section">
                <label htmlFor="range-input">📍 Monitoring Range:</label>
                <input
                  id="range-input"
                  type="text"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder="e.g., A1:Z100, F8:F8, A:A"
                  className="config-input"
                />
                <small className="config-hint">
                  Specify the range to monitor (e.g., F8:F8 for single cell, A1:Z100 for range)
                </small>
              </div>
            )}

            {/* Conditions */}
            <div className="config-section">
              <label>🎯 Notification Conditions:</label>
              
              {/* Existing Conditions */}
              {conditions.length > 0 && (
                <div className="conditions-list">
                  {conditions.map((condition) => (
                    <div key={condition.id} className="condition-item">
                      <div className="condition-content">
                        <div className="condition-header">
                          <span className="sheet-name">📋 {selectedSheet}</span>
                          <span className="condition-range">📍 {condition.cell}</span>
                        </div>
                        <div className="condition-details">
                          <span className="condition-operator">{getOperatorDisplayName(condition.operator)}</span>
                          <span className="condition-value">{condition.value}</span>
                        </div>
                        {condition.description && condition.description !== `${selectedSheet}!${condition.cell} ${getOperatorDisplayName(condition.operator)} ${condition.value}` && (
                          <div className="condition-description-display">
                            💬 {condition.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="remove-condition-btn"
                        title="Remove condition"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Condition */}
              <div className="add-condition">
                <div className="condition-inputs">
                  <input
                    type="text"
                    value={newCondition.cell}
                    onChange={(e) => setNewCondition({...newCondition, cell: e.target.value})}
                    placeholder="Cell/Range (e.g., F8, A1:A10, B:B)"
                    className="condition-input"
                  />
                  <select
                    value={newCondition.operator}
                    onChange={(e) => setNewCondition({...newCondition, operator: e.target.value})}
                    className="condition-select"
                  >
                    {operatorOptions.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newCondition.value}
                    onChange={(e) => setNewCondition({...newCondition, value: e.target.value})}
                    placeholder="Value (e.g., 500)"
                    className="condition-input"
                  />
                </div>
                <input
                  type="text"
                  value={newCondition.description}
                  onChange={(e) => setNewCondition({...newCondition, description: e.target.value})}
                  placeholder="Description (optional)"
                  className="condition-description"
                />
                <button onClick={addCondition} className="add-condition-btn">
                  ➕ Add Condition
                </button>
              </div>

              <div className="condition-examples">
                <small>
                  <strong>Single Cell Examples:</strong><br/>
                  • F8 &gt; 500 (notify when F8 exceeds 500)<br/>
                  • A1 = "Complete" (notify when A1 equals "Complete")<br/>
                  • B2 changed (notify when B2 value changes)<br/><br/>
                  
                  <strong>Range Examples:</strong><br/>
                  • A1:A10 any_in_range&gt; 200 (notify if any cell in A1:A10 exceeds 200)<br/>
                  • B1:C5 all_in_range&gt; 0 (notify if all cells in B1:C5 are positive)<br/>
                  • D:D sum_range&gt; 1000 (notify if sum of column D exceeds 1000)<br/>
                  • E1:E20 avg_range&gt; 50 (notify if average of E1:E20 exceeds 50)<br/>
                  • F1:F100 range_changed (notify if any cell in F1:F100 changes)
                </small>
              </div>
            </div>

            <button
              onClick={handleConfigure}
              disabled={!selectedSpreadsheet || !selectedSheet || loading}
              className="connect-btn primary-action-btn"
            >
              {loading ? '⏳ Setting up...' : '⚙️ Configure Monitoring'}
            </button>
          </div>
        ) : (
          <div className="connected-state">
            <p>✅ Monitoring configured successfully!</p>
            <div className="config-summary">
              <p><strong>Spreadsheet:</strong> {spreadsheets.find(s => s.id === selectedSpreadsheet)?.name}</p>
              <p><strong>Sheet:</strong> {selectedSheet}</p>
              <p><strong>Range:</strong> {range}</p>
              {conditions.length > 0 && (
                <div>
                  <p><strong>Monitoring Conditions:</strong></p>
                  <ul className="config-summary-conditions">
                    {conditions.map((condition) => (
                      <li key={condition.id} className="summary-condition-item">
                        <span className="summary-sheet">📋 {selectedSheet}</span>
                        <span className="summary-condition">
                          {condition.cell} {getOperatorDisplayName(condition.operator)} {condition.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
