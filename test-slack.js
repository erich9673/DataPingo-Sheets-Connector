// Simple test script to send a Slack notification
const fetch = require('node-fetch');

const SLACK_WEBHOOK_URL = process.argv[2];

if (!SLACK_WEBHOOK_URL) {
    console.log('Usage: node test-slack.js <slack-webhook-url>');
    process.exit(1);
}

const testSlackNotification = async () => {
    const message = {
        text: "🧪 Test notification from Sheets Connector",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*📊 Test Notification*\n\nThis is a test to verify Slack notifications are working correctly."
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: "*Sheet:*\nTest Sheet"
                    },
                    {
                        type: "mrkdwn",
                        text: "*Cell:*\nA1"
                    },
                    {
                        type: "mrkdwn",
                        text: "*Change:*\n`old value` → `new value`"
                    },
                    {
                        type: "mrkdwn",
                        text: "*Time:*\n" + new Date().toLocaleString()
                    }
                ]
            }
        ]
    };

    try {
        console.log('🚀 Sending test Slack notification...');
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (response.ok) {
            console.log('✅ Slack notification sent successfully!');
            console.log('📱 Check your Slack channel for the test message.');
        } else {
            console.log('❌ Failed to send Slack notification');
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('❌ Error sending Slack notification:', error);
    }
};

testSlackNotification();
