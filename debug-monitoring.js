// Debug script to manually trigger monitoring checks and trace the issue
const https = require('https');

// Configuration - update these with your actual values
const RAILWAY_URL = 'https://web-production-aafd.up.railway.app'; // Update with your Railway URL
const AUTH_TOKEN = 'your_auth_token_here'; // Update with your actual auth token

function makeRequest(path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(RAILWAY_URL + path);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: data ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            data = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve(jsonData);
                } catch (error) {
                    resolve({ statusCode: res.statusCode, body: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function debugMonitoring() {
    console.log('🔍 Debugging Monitoring System...');
    console.log('🌐 Railway URL:', RAILWAY_URL);
    console.log('🔑 Auth Token:', AUTH_TOKEN.substring(0, 10) + '...');
    
    try {
        // 1. Check active jobs
        console.log('\n📋 1. Checking active monitoring jobs...');
        const jobs = await makeRequest(`/api/monitoring/jobs?authToken=${AUTH_TOKEN}`);
        console.log('Active jobs:', JSON.stringify(jobs, null, 2));
        
        if (!jobs.jobs || jobs.jobs.length === 0) {
            console.log('❌ No active monitoring jobs found. Please create a monitoring job first.');
            return;
        }
        
        // 2. Manual check trigger
        console.log('\n🔄 2. Triggering manual monitoring check...');
        const checkResult = await makeRequest('/api/monitoring/check', { authToken: AUTH_TOKEN });
        console.log('Check result:', JSON.stringify(checkResult, null, 2));
        
        // 3. Show Railway logs hint
        console.log('\n📊 3. Check Railway logs for detailed debug output:');
        console.log('   Go to Railway dashboard → Your project → Logs');
        console.log('   Look for logs with [INTERVAL], [CHECK], [NOTIFICATION], [SLACK] prefixes');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Instructions
console.log('🔧 DEBUG MONITORING SCRIPT');
console.log('==========================');
console.log('');
console.log('📝 Before running, update these values in the script:');
console.log('   1. RAILWAY_URL - Your Railway deployment URL');
console.log('   2. AUTH_TOKEN - Your auth token from the app');
console.log('');
console.log('🚀 To run: node debug-monitoring.js');
console.log('');

if (AUTH_TOKEN === 'your_auth_token_here') {
    console.log('⚠️  Please update the AUTH_TOKEN in this script first!');
} else {
    debugMonitoring();
}
