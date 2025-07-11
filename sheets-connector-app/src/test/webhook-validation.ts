import { SlackService } from '../services/SlackService';

// Test webhook validation
console.log('Testing webhook validation...');

// Valid Slack webhook
const validWebhook = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
console.log('Valid webhook test:', SlackService.isValidSlackWebhook(validWebhook)); // Should be true

// Invalid webhook URLs
const invalidWebhook1 = 'https://example.com/webhook';
const invalidWebhook2 = 'not-a-url';
const invalidWebhook3 = 'https://hooks.slack.com/invalid/path';

console.log('Invalid webhook test 1:', SlackService.isValidSlackWebhook(invalidWebhook1)); // Should be false
console.log('Invalid webhook test 2:', SlackService.isValidSlackWebhook(invalidWebhook2)); // Should be false
console.log('Invalid webhook test 3:', SlackService.isValidSlackWebhook(invalidWebhook3)); // Should be false

console.log('Webhook validation tests completed!');
