// Get your auth token and check monitoring jobs
// Run this in your browser console on the Sheets Connector app page

console.log('🔍 GETTING AUTH TOKEN AND CHECKING MONITORING...');

// Get the auth token from localStorage
const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
console.log('Auth Token:', authToken ? authToken.substring(0, 20) + '...' : 'NOT FOUND');

if (authToken) {
    // Check monitoring jobs with auth token
    fetch(`/api/monitoring/jobs?authToken=${authToken}`)
        .then(r => r.json())
        .then(data => {
            console.log('📊 Monitoring Jobs:', data);
            
            if (data.jobs && data.jobs.length > 0) {
                console.log('✅ Found', data.jobs.length, 'monitoring jobs');
                data.jobs.forEach((job, i) => {
                    console.log(`Job ${i + 1}:`, {
                        id: job.id,
                        spreadsheet: job.spreadsheetName,
                        cellRange: job.cellRange,
                        frequency: job.frequencyMinutes,
                        isActive: job.isActive,
                        lastChecked: job.lastChecked,
                        webhook: job.webhookUrl?.substring(0, 50) + '...'
                    });
                });
                
                // Now manually trigger a check
                console.log('🔄 Triggering manual check...');
                fetch('/api/monitoring/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authToken })
                })
                .then(r => r.json())
                .then(result => {
                    console.log('🧪 Manual check result:', result);
                    console.log('📋 Now check Railway logs for detailed monitoring output');
                    console.log('🔗 Railway logs: https://railway.app → Your project → Logs');
                })
                .catch(e => console.error('❌ Manual check failed:', e));
                
            } else {
                console.log('❌ No monitoring jobs found');
            }
        })
        .catch(e => console.error('❌ Error fetching jobs:', e));
} else {
    console.log('❌ No auth token found. Please log in again.');
}

console.log('📝 INSTRUCTIONS:');
console.log('1. Copy this entire script');
console.log('2. Go to your Sheets Connector app in the browser');
console.log('3. Open Developer Tools (F12)');
console.log('4. Go to Console tab');
console.log('5. Paste and run this script');
console.log('6. Check the output and Railway logs');
