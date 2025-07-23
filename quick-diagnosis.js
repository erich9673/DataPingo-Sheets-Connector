// Quick diagnostic script to check what's happening with your monitoring
const https = require('https');

// Update this with your Railway URL
const RAILWAY_URL = 'https://web-production-aafd.up.railway.app';

async function quickDiagnosis() {
    console.log('🔍 QUICK SLACK NOTIFICATION DIAGNOSIS');
    console.log('=====================================\n');
    
    try {
        // 1. Check if server is responding
        console.log('1. ✅ Checking if server is responding...');
        const healthCheck = await fetch(`${RAILWAY_URL}/api/health`).catch(() => null);
        if (!healthCheck) {
            console.log('❌ Server is not responding at', RAILWAY_URL);
            return;
        }
        console.log('✅ Server is responding\n');
        
        // 2. Check monitoring jobs without auth (just count)
        console.log('2. 📊 Checking monitoring system...');
        const jobs = await fetch(`${RAILWAY_URL}/api/monitoring/jobs`).then(r => r.json()).catch(() => ({}));
        console.log('Response:', JSON.stringify(jobs, null, 2));
        
        if (jobs.jobs && jobs.jobs.length > 0) {
            console.log(`✅ Found ${jobs.jobs.length} monitoring jobs`);
            jobs.jobs.forEach((job, i) => {
                console.log(`   Job ${i + 1}: ${job.spreadsheetName} (${job.cellRange})`);
                console.log(`           Webhook: ${job.webhookUrl?.substring(0, 50)}...`);
                console.log(`           Active: ${job.isActive}`);
                console.log(`           Last checked: ${job.lastChecked || 'Never'}`);
            });
        } else {
            console.log('❌ No monitoring jobs found - this might be the issue!');
        }
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error.message);
    }
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. If no jobs found: Re-create your monitoring job in the app');
    console.log('2. If jobs exist but not active: Check Railway logs for errors');
    console.log('3. If jobs are active: Try the manual test below');
    console.log('\n🧪 MANUAL TEST:');
    console.log('Go to your app → Test Connection → Should send a test ping to Slack');
}

// Use built-in fetch if available, otherwise provide instructions
if (typeof fetch === 'undefined') {
    console.log('❗ This script needs Node.js 18+ or you can run these commands manually:\n');
    console.log(`curl "${RAILWAY_URL}/api/health"`);
    console.log(`curl "${RAILWAY_URL}/api/monitoring/jobs"`);
    console.log('\nOr open these URLs in your browser:');
    console.log(`${RAILWAY_URL}/api/monitoring/jobs`);
} else {
    quickDiagnosis();
}
