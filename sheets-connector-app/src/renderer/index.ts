// Basic functionality for the Google Sheets Connector

document.addEventListener('DOMContentLoaded', () => {
    const sheetSelector = document.getElementById('sheet-selector');
    const cellTracker = document.getElementById('cell-tracker');
    const notificationSettings = document.getElementById('notification-settings');
    const startButton = document.getElementById('start-tracking') as HTMLButtonElement;

    // Initialize the UI
    initializeUI();

    function initializeUI() {
        if (sheetSelector) {
            sheetSelector.innerHTML = `
                <h3>📊 Select Google Sheet</h3>
                <button id="connect-google">Connect to Google Sheets</button>
                <div id="sheets-list"></div>
            `;
        }

        if (cellTracker) {
            cellTracker.innerHTML = `
                <h3>🎯 Track Cells</h3>
                <p>Connect to Google Sheets first to select cells to track</p>
                <div id="tracked-cells"></div>
            `;
        }

        if (notificationSettings) {
            notificationSettings.innerHTML = `
                <h3>📢 Notification Settings</h3>
                <label>
                    <input type="radio" name="platform" value="slack"> 
                    Slack
                </label>
                <br>
                <label>
                    <input type="radio" name="platform" value="teams"> 
                    MS Teams
                </label>
                <br>
                <input type="number" id="frequency" placeholder="Check frequency (minutes)" min="1" max="60">
            `;
        }

        // Add event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        const connectButton = document.getElementById('connect-google');
        if (connectButton) {
            connectButton.addEventListener('click', handleGoogleConnect);
        }

        if (startButton) {
            startButton.addEventListener('click', handleStartTracking);
        }
    }

    function handleGoogleConnect() {
        const connectButton = document.getElementById('connect-google') as HTMLButtonElement;
        const sheetsList = document.getElementById('sheets-list');
        
        if (connectButton) {
            connectButton.textContent = 'Connecting...';
            connectButton.disabled = true;
        }

        // Simulate connection (we'll make this real later)
        setTimeout(() => {
            if (connectButton) {
                connectButton.textContent = 'Connected!';
                connectButton.style.backgroundColor = '#28a745';
            }
            
            if (sheetsList) {
                sheetsList.innerHTML = `
                    <select id="sheet-dropdown">
                        <option value="">Select a sheet...</option>
                        <option value="sheet1">My Budget Sheet</option>
                        <option value="sheet2">Sales Dashboard</option>
                        <option value="sheet3">Project Tracker</option>
                    </select>
                `;
            }

            updateCellTracker();
        }, 2000);
    }

    function updateCellTracker() {
        const cellTracker = document.getElementById('cell-tracker');
        if (cellTracker) {
            cellTracker.innerHTML = `
                <h3>🎯 Track Cells</h3>
                <input type="text" id="cell-range" placeholder="Enter cell range (e.g., A1:B5)">
                <button id="add-cells">Add Cells to Track</button>
                <div id="tracked-cells">
                    <p>No cells being tracked yet.</p>
                </div>
            `;

            const addCellsButton = document.getElementById('add-cells');
            if (addCellsButton) {
                addCellsButton.addEventListener('click', handleAddCells);
            }
        }
    }

    function handleAddCells() {
        const cellRangeInput = document.getElementById('cell-range') as HTMLInputElement;
        const trackedCells = document.getElementById('tracked-cells');
        
        if (cellRangeInput && trackedCells && cellRangeInput.value) {
            trackedCells.innerHTML = `
                <p>✅ Tracking cells: ${cellRangeInput.value}</p>
                <small>Last checked: Never</small>
            `;
            cellRangeInput.value = '';
        }
    }

    function handleStartTracking() {
        const platform = document.querySelector('input[name="platform"]:checked') as HTMLInputElement;
        const frequency = document.getElementById('frequency') as HTMLInputElement;
        
        if (!platform) {
            alert('Please select Slack or MS Teams');
            return;
        }

        if (!frequency.value) {
            alert('Please enter check frequency in minutes');
            return;
        }

        startButton.textContent = 'Tracking Started!';
        startButton.style.backgroundColor = '#28a745';
        startButton.disabled = true;

        alert(`Started tracking! Will check every ${frequency.value} minutes and send notifications to ${platform.value}`);
    }
});