const { ipcRenderer } = require('electron');

let currentSheetId = '';
let currentCellRange = '';
let isAuthenticated = false;

// DOM elements
const googleAuthBtn = document.getElementById('google-auth');
const authStatus = document.getElementById('auth-status');
const authCodeSection = document.getElementById('auth-code-section');
const authCodeInput = document.getElementById('auth-code');
const submitAuthCodeBtn = document.getElementById('submit-auth-code');
const sheetIdInput = document.getElementById('sheet-id');
const loadSheetBtn = document.getElementById('load-sheet');
const sheetStatus = document.getElementById('sheet-status');
const cellRangeInput = document.getElementById('cell-range');
const addCellsBtn = document.getElementById('add-cells');
const trackingStatus = document.getElementById('tracking-status');
const slackWebhookInput = document.getElementById('slack-webhook');
const testSlackBtn = document.getElementById('test-slack');
const slackStatus = document.getElementById('slack-status');
const frequencyInput = document.getElementById('frequency');
const startMonitoringBtn = document.getElementById('start-monitoring');
const stopMonitoringBtn = document.getElementById('stop-monitoring');
const monitoringStatus = document.getElementById('monitoring-status');

// Google Authentication
googleAuthBtn.addEventListener('click', async () => {
    try {
        const result = await ipcRenderer.invoke('google-authenticate');
        if (result.authUrl) {
            require('electron').shell.openExternal(result.authUrl);
            authStatus.innerHTML = '<div class="status info">Please sign in through the browser and copy the authorization code.</div>';
            authCodeSection.style.display = 'block';
        }
    } catch (error) {
        authStatus.innerHTML = `<div class="status error">Error: ${error.message}</div>`;
    }
});

submitAuthCodeBtn.addEventListener('click', async () => {
    const code = authCodeInput.value.trim();
    if (!code) return;

    try {
        const result = await ipcRenderer.invoke('google-set-auth-code', code);
        if (result.success) {
            isAuthenticated = true;
            authStatus.innerHTML = '<div class="status success">✅ Successfully authenticated with Google!</div>';
            authCodeSection.style.display = 'none';
        } else {
            authStatus.innerHTML = `<div class="status error">Error: ${result.error}</div>`;
        }
    } catch (error) {
        authStatus.innerHTML = `<div class="status error">Error: ${error.message}</div>`;
    }
});

// Sheet Loading
loadSheetBtn.addEventListener('click', async () => {
    const sheetId = sheetIdInput.value.trim();
    if (!sheetId) return;

    try {
        const sheets = await ipcRenderer.invoke('google-get-spreadsheet-info', sheetId);
        if (sheets) {
            currentSheetId = sheetId;
            sheetStatus.innerHTML = `<div class="status success">✅ Sheet loaded successfully! Found ${sheets.length} tabs.</div>`;
        }
    } catch (error) {
        sheetStatus.innerHTML = `<div class="status error">❌ Error loading sheet: ${error.message}</div>`;
    }
});

// Cell Tracking
addCellsBtn.addEventListener('click', async () => {
    const cellRange = cellRangeInput.value.trim();
    if (!cellRange || !currentSheetId) return;

    try {
        const values = await ipcRenderer.invoke('google-get-cell-values', currentSheetId, cellRange);
        currentCellRange = cellRange;
        trackingStatus.innerHTML = `<div class="status success">✅ Now tracking ${cellRange} in sheet ${currentSheetId}</div>`;
    } catch (error) {
        trackingStatus.innerHTML = `<div class="status error">❌ Error: ${error.message}</div>`;
    }
});

// Slack Testing
testSlackBtn.addEventListener('click', async () => {
    const webhookUrl = slackWebhookInput.value.trim();
    if (!webhookUrl) return;

    try {
        const result = await ipcRenderer.invoke('slack-test-connection', webhookUrl);
        if (result.success) {
            slackStatus.innerHTML = '<div class="status success">✅ Slack connection successful! Check your Slack channel.</div>';
        } else {
            slackStatus.innerHTML = `<div class="status error">❌ Slack test failed: ${result.error}</div>`;
        }
    } catch (error) {
        slackStatus.innerHTML = `<div class="status error">❌ Error: ${error.message}</div>`;
    }
});

// Monitoring
startMonitoringBtn.addEventListener('click', async () => {
    const frequency = parseInt(frequencyInput.value) || 1;
    const webhookUrl = slackWebhookInput.value.trim();
    
    if (!currentSheetId || !currentCellRange) {
        monitoringStatus.innerHTML = '<div class="status error">Please select a sheet and cell range first.</div>';
        return;
    }

    try {
        const result = await ipcRenderer.invoke('start-monitoring', currentSheetId, currentCellRange, frequency, webhookUrl);
        if (result.success) {
            monitoringStatus.innerHTML = `<div class="status success">🚀 Monitoring started! Checking every ${frequency} minute(s).</div>`;
        } else {
            monitoringStatus.innerHTML = `<div class="status error">❌ Error: ${result.error}</div>`;
        }
    } catch (error) {
        monitoringStatus.innerHTML = `<div class="status error">❌ Error: ${error.message}</div>`;
    }
});

stopMonitoringBtn.addEventListener('click', async () => {
    try {
        const result = await ipcRenderer.invoke('stop-monitoring');
        if (result.success) {
            monitoringStatus.innerHTML = '<div class="status info">⏸️ Monitoring stopped.</div>';
        }
    } catch (error) {
        monitoringStatus.innerHTML = `<div class="status error">❌ Error: ${error.message}</div>`;
    }
});