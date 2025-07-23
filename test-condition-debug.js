#!/usr/bin/env node

/**
 * Test script to trigger a condition check with detailed logging
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function testConditionCheck() {
    try {
        console.log('🧪 Starting condition check test...');
        
        // First check current job status
        const statusResponse = await fetch('https://sheets-connector-for-slack-production.up.railway.app/api/monitoring/status');
        const status = await statusResponse.json();
        console.log('📊 Current monitoring status:', JSON.stringify(status, null, 2));
        
        if (!status.jobs || status.jobs.length === 0) {
            console.log('❌ No active monitoring jobs found');
            return;
        }
        
        const job = status.jobs[0];
        console.log('🎯 Testing with job:', job.id);
        console.log('📋 Job conditions:', JSON.stringify(job.conditions, null, 2));
        
        // Load credentials
        const credentialsPath = path.join(__dirname, 'sheets-connector-backend', 'src', 'config', 'credentials.json');
        if (!fs.existsSync(credentialsPath)) {
            console.log('❌ Credentials file not found');
            return;
        }
        
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        const sheets = google.sheets({ version: 'v4', auth });
        
        // Get current value
        console.log(`📊 Getting current value from ${job.sheetId}:${job.cellRange}...`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: job.sheetId,
            range: job.cellRange
        });
        
        const currentValues = response.data.values || [];
        console.log('📊 Current values:', JSON.stringify(currentValues));
        
        // Make a test change - find E10 (4th column, 9th row in 0-based)
        const testValue = Math.floor(Math.random() * 90000) + 10000; // Random value between 10000-99999
        console.log(`🔄 Updating E10 to: ${testValue}`);
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: job.sheetId,
            range: 'E10',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[testValue]]
            }
        });
        
        console.log('✅ Value updated successfully');
        console.log('⏳ Waiting 10 seconds for monitoring to detect change...');
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Trigger manual check
        console.log('🔍 Triggering manual monitoring check...');
        const checkResponse = await fetch('https://sheets-connector-for-slack-production.up.railway.app/api/monitoring/check', {
            method: 'POST'
        });
        const checkResult = await checkResponse.json();
        console.log('📊 Manual check result:', JSON.stringify(checkResult, null, 2));
        
        console.log('🏁 Test completed. Check Railway logs for detailed condition checking.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testConditionCheck().catch(console.error);
