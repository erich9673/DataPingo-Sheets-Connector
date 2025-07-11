import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { GoogleSheetsService } from './services/GoogleSheetsService';
import { SlackService } from './services/SlackService';
import { MonitoringService } from './services/MonitoringService';

let mainWindow: BrowserWindow;
let googleSheetsService: GoogleSheetsService;
let slackService: SlackService | null = null;
let monitoringService: MonitoringService;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    
    // Open developer tools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();
    
    // Initialize services
    googleSheetsService = new GoogleSheetsService();
    monitoringService = new MonitoringService(googleSheetsService);
    
    // Set up IPC handlers
    setupIpcHandlers();
});

function setupIpcHandlers() {
    // Google Sheets handlers
    ipcMain.handle('authenticate-google-sheets', async () => {
        return await googleSheetsService.authenticate();
    });

    ipcMain.handle('set-auth-code', async (event, code: string) => {
        return await googleSheetsService.setAuthCode(code);
    });

    ipcMain.handle('get-spreadsheet-info', async (event, spreadsheetId: string) => {
        return await googleSheetsService.getSpreadsheetInfo(spreadsheetId);
    });

    ipcMain.handle('get-cell-values', async (event, spreadsheetId: string, range: string) => {
        return await googleSheetsService.getCellValues(spreadsheetId, range);
    });

    ipcMain.handle('get-user-spreadsheets', async () => {
        return await googleSheetsService.getUserSpreadsheets();
    });

    // Slack handlers
    ipcMain.handle('slack-test-connection', async (event, webhookUrl: string) => {
        slackService = new SlackService(webhookUrl);
        return await slackService.testConnection();
    });

    // Monitoring handlers
    ipcMain.handle('start-monitoring', async (event, sheetId: string, cellRange: string, frequencyMinutes: number, webhookUrl: string, conditions?: any[], userMention?: string) => {
        if (webhookUrl) {
            slackService = new SlackService(webhookUrl);
            monitoringService.setSlackService(slackService);
        }
        
        // Set conditions if provided
        if (conditions && conditions.length > 0) {
            monitoringService.setConditions(conditions);
        }
        
        // Set user mention if provided
        if (userMention) {
            monitoringService.setUserMention(userMention);
        }
        
        return await monitoringService.startMonitoring(sheetId, cellRange, frequencyMinutes);
    });

    ipcMain.handle('set-monitoring-conditions', async (event, conditions: any[]) => {
        monitoringService.setConditions(conditions);
        return { success: true };
    });

    ipcMain.handle('stop-monitoring', async () => {
        monitoringService.stopMonitoring();
        return { success: true };
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});