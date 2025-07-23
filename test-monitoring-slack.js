// Simple test to send Slack notification
const SlackService = require('./sheets-connector-backend/dist/services/SlackService').SlackService;

const webhookUrl = "https://hooks.slack.com/services/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";

async function testSlackNotification() {
    console.log('🧪 Testing Slack notification...');
    
    const slackService = new SlackService(webhookUrl);
    
    try {
        const result = await slackService.sendNotification(
            'Test message',
            'test-sheet-id',
            'A1',
            'old value',
            'new value',
            'Test Spreadsheet',
            '@channel'
        );
        
        console.log('📤 Slack notification result:', result);
        
        if (result.success) {
            console.log('✅ Slack notification sent successfully!');
        } else {
            console.log('❌ Slack notification failed:', result.error);
        }
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

testSlackNotification();
