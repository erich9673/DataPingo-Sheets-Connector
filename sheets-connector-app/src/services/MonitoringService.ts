import { GoogleSheetsService } from './GoogleSheetsService';
import { SlackService } from './SlackService';
import { safeLog, safeError } from '../utils/logger';

// Define condition types for monitoring
interface MonitoringCondition {
    type: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains' | 'changed';
    value?: string | number;
    threshold?: number;
    enabled: boolean;
}

export class MonitoringService {
    private googleSheetsService: GoogleSheetsService;
    private slackService: SlackService | null = null;
    private previousValues: Map<string, any> = new Map();
    private intervalId: NodeJS.Timeout | null = null;
    private spreadsheetNames: Map<string, string> = new Map(); // Store spreadsheet names
    private conditions: MonitoringCondition[] = []; // Store monitoring conditions
    private userMention: string = ''; // Store user mention preference

    constructor(googleSheetsService: GoogleSheetsService) {
        this.googleSheetsService = googleSheetsService;
    }

    setSlackService(slackService: SlackService) {
        this.slackService = slackService;
    }

    setConditions(conditions: MonitoringCondition[]) {
        this.conditions = conditions;
    }

    setUserMention(mention: string) {
        this.userMention = mention;
    }

    // Check if a value change should trigger a notification based on conditions
    private shouldNotify(oldValue: any, newValue: any): boolean {
        // If no conditions are set, notify on any change (default behavior)
        if (!this.conditions || this.conditions.length === 0) {
            return oldValue !== newValue;
        }

        // Check each condition
        for (const condition of this.conditions) {
            if (!condition.enabled) continue;

            switch (condition.type) {
                case 'changed':
                    if (oldValue !== newValue) return true;
                    break;
                    
                case 'greater_than':
                    if (condition.threshold !== undefined) {
                        const numValue = parseFloat(String(newValue));
                        if (!isNaN(numValue) && numValue > condition.threshold) return true;
                    }
                    break;
                    
                case 'less_than':
                    if (condition.threshold !== undefined) {
                        const numValue = parseFloat(String(newValue));
                        if (!isNaN(numValue) && numValue < condition.threshold) return true;
                    }
                    break;
                    
                case 'equals':
                    if (String(newValue) === String(condition.value)) return true;
                    break;
                    
                case 'not_equals':
                    if (String(newValue) !== String(condition.value)) return true;
                    break;
                    
                case 'contains':
                    if (condition.value && String(newValue).includes(String(condition.value))) return true;
                    break;
            }
        }

        return false;
    }

    async startMonitoring(sheetId: string, cellRange: string, frequencyMinutes: number) {
        try {
            safeLog(`Starting monitoring for sheet ${sheetId}, range ${cellRange}, frequency ${frequencyMinutes} minutes`);
            
            // Get spreadsheet info including name
            const spreadsheetInfo = await this.googleSheetsService.getSpreadsheetInfo(sheetId);
            if (spreadsheetInfo.success && spreadsheetInfo.name) {
                this.spreadsheetNames.set(sheetId, spreadsheetInfo.name);
            }
            
            // Get initial values
            const initialValues = await this.googleSheetsService.getCellValues(sheetId, cellRange);
            const key = `${sheetId}:${cellRange}`;
            this.previousValues.set(key, initialValues);
            
            // Convert to milliseconds - support faster checking (minimum 10 seconds)
            const intervalMs = Math.max(frequencyMinutes * 60 * 1000, 10000); // Minimum 10 seconds
            
            // Set up interval monitoring
            this.intervalId = setInterval(async () => {
                await this.checkForChanges(sheetId, cellRange);
            }, intervalMs);
            
            return { success: true };
        } catch (error) {
            safeError('Error starting monitoring:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async checkForChanges(sheetId: string, cellRange: string) {
        try {
            safeLog('Checking for changes in sheet:', sheetId);
            
            const currentValues = await this.googleSheetsService.getCellValues(sheetId, cellRange);
            const key = `${sheetId}:${cellRange}`;
            const previousValues = this.previousValues.get(key);
            
            if (previousValues && this.hasValuesChanged(previousValues, currentValues)) {
                safeLog('Changes detected!');
                
                // Get spreadsheet name
                const spreadsheetName = this.spreadsheetNames.get(sheetId) || 'Unknown Spreadsheet';
                
                // Find the specific cells that changed
                const changes = this.findChangedCells(previousValues, currentValues);
                
                // Send notification for each change if Slack is configured
                if (this.slackService) {
                    for (const change of changes) {
                        // Check if notification should be sent based on conditions
                        if (this.shouldNotify(change.oldValue, change.newValue)) {
                            // Use retry logic for better reliability
                            const result = await this.slackService.sendNotificationWithRetry(
                                'Google Sheets change detected',
                                sheetId,
                                change.cellRange,
                                change.oldValue,
                                change.newValue,
                                spreadsheetName,
                                this.userMention || '@channel' // Use stored mention or default to @channel
                            );
                            
                            if (!result.success) {
                                safeError(`Failed to send notification for ${change.cellRange}: ${result.error}`);
                            }
                        } else {
                            safeLog(`Change in ${change.cellRange} did not meet notification conditions`);
                        }
                    }
                }
                
                // Update stored values
                this.previousValues.set(key, currentValues);
                
                return { success: true, changesDetected: true };
            } else {
                safeLog('No changes detected');
                return { success: true, changesDetected: false };
            }
        } catch (error) {
            safeError('Error checking for changes:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check if values have changed between previous and current
     */
    private hasValuesChanged(previousValues: any[][], currentValues: any[][]): boolean {
        if (!previousValues || !currentValues) {
            return true;
        }
        
        if (previousValues.length !== currentValues.length) {
            return true;
        }
        
        for (let i = 0; i < previousValues.length; i++) {
            const prevRow = previousValues[i] || [];
            const currRow = currentValues[i] || [];
            
            if (prevRow.length !== currRow.length) {
                return true;
            }
            
            for (let j = 0; j < Math.max(prevRow.length, currRow.length); j++) {
                if ((prevRow[j] || '') !== (currRow[j] || '')) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Find specific cells that have changed
     */
    private findChangedCells(previousValues: any[][], currentValues: any[][]): Array<{
        cellRange: string;
        oldValue: any;
        newValue: any;
    }> {
        const changes: Array<{
            cellRange: string;
            oldValue: any;
            newValue: any;
        }> = [];
        
        const maxRows = Math.max(previousValues?.length || 0, currentValues?.length || 0);
        
        for (let i = 0; i < maxRows; i++) {
            const prevRow = previousValues?.[i] || [];
            const currRow = currentValues?.[i] || [];
            const maxCols = Math.max(prevRow.length, currRow.length);
            
            for (let j = 0; j < maxCols; j++) {
                const oldValue = prevRow[j] || '';
                const newValue = currRow[j] || '';
                
                if (oldValue !== newValue) {
                    // Convert to A1 notation (approximate)
                    const cellRange = this.indexToCellRange(i, j);
                    changes.push({
                        cellRange,
                        oldValue,
                        newValue
                    });
                }
            }
        }
        
        return changes;
    }

    /**
     * Convert row/column indices to A1 notation
     */
    private indexToCellRange(row: number, col: number): string {
        let columnName = '';
        let colIndex = col;
        
        while (colIndex >= 0) {
            columnName = String.fromCharCode(65 + (colIndex % 26)) + columnName;
            colIndex = Math.floor(colIndex / 26) - 1;
        }
        
        return `${columnName}${row + 1}`;
    }

    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            safeLog('Monitoring stopped');
        }
    }
}