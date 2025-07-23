// Test script to simulate user authentication and job creation
const API_BASE_URL = 'http://localhost:3001';

// Simulate getting an auth token (you'd normally get this from OAuth)
const testAuthToken = 'test-token-' + Date.now();
const testUserEmail = 'test@example.com';

console.log('🧪 Testing logout/login flow...');
console.log(`📧 Test user: ${testUserEmail}`);
console.log(`🎫 Test token: ${testAuthToken}`);

async function testFlow() {
  try {
    // Step 1: Create a monitoring job
    console.log('\n📝 Step 1: Creating a test monitoring job...');
    const createJobResponse = await fetch(`${API_BASE_URL}/api/monitoring/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authToken: testAuthToken,
        userEmail: testUserEmail,
        spreadsheetId: 'test-spreadsheet-id',
        sheetName: 'Sheet1',
        cellRange: 'A1:B10',
        frequency: 60000,
        slackWebhook: 'https://hooks.slack.com/test'
      })
    });
    
    const createResult = await createJobResponse.json();
    console.log('✅ Job creation result:', createResult);
    
    if (!createResult.success) {
      console.error('❌ Failed to create job:', createResult.error);
      return;
    }
    
    const jobId = createResult.jobId;
    
    // Step 2: Check jobs for this user
    console.log('\n📋 Step 2: Checking jobs for authenticated user...');
    const jobsResponse = await fetch(`${API_BASE_URL}/api/monitoring/jobs?authToken=${encodeURIComponent(testAuthToken)}`);
    const jobsResult = await jobsResponse.json();
    console.log('📊 Jobs for user:', jobsResult);
    
    // Step 3: Simulate logout
    console.log('\n🔓 Step 3: Simulating logout...');
    const logoutResponse = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken: testAuthToken })
    });
    const logoutResult = await logoutResponse.json();
    console.log('🔓 Logout result:', logoutResult);
    
    // Step 4: Check jobs without auth token (should be empty)
    console.log('\n📋 Step 4: Checking jobs without auth token (should be empty)...');
    const noAuthJobsResponse = await fetch(`${API_BASE_URL}/api/monitoring/jobs`);
    const noAuthJobsResult = await noAuthJobsResponse.json();
    console.log('📊 Jobs without auth:', noAuthJobsResult);
    
    // Step 5: Simulate login again with same token
    console.log('\n🔑 Step 5: Simulating login again...');
    const loginAgainJobsResponse = await fetch(`${API_BASE_URL}/api/monitoring/jobs?authToken=${encodeURIComponent(testAuthToken)}`);
    const loginAgainJobsResult = await loginAgainJobsResponse.json();
    console.log('📊 Jobs after login again:', loginAgainJobsResult);
    
    // Cleanup: Stop the test job
    console.log('\n🧹 Cleanup: Stopping test job...');
    const stopResponse = await fetch(`${API_BASE_URL}/api/monitoring/jobs/${jobId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken: testAuthToken })
    });
    const stopResult = await stopResponse.json();
    console.log('🛑 Stop result:', stopResult);
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFlow();
