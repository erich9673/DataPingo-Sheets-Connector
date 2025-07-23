#!/usr/bin/env node

/**
 * Test not_equals condition logic
 */

function testNotEqualsCondition() {
    console.log('🧪 Testing not_equals condition...\n');
    
    const condition = {
        type: 'not_equals',
        value: 'test',
        enabled: true
    };
    
    // Test cases
    const testCases = [
        { oldValue: '', newValue: 'hello', expected: true, description: 'Empty to "hello" (not equal to "test")' },
        { oldValue: 'hello', newValue: 'test', expected: false, description: '"hello" to "test" (equals "test")' },
        { oldValue: 'test', newValue: 'different', expected: true, description: '"test" to "different" (not equal to "test")' },
        { oldValue: 'test', newValue: 'test', expected: false, description: '"test" to "test" (equals "test")' },
        { oldValue: '123', newValue: '456', expected: true, description: '"123" to "456" (not equal to "test")' },
        { oldValue: '', newValue: '', expected: true, description: 'Empty to empty (not equal to "test")' }
    ];
    
    console.log(`Condition: not_equals "${condition.value}"\n`);
    
    testCases.forEach((testCase, index) => {
        const result = checkNotEqualsCondition(condition, testCase.oldValue, testCase.newValue);
        const passed = result === testCase.expected;
        
        console.log(`Test ${index + 1}: ${testCase.description}`);
        console.log(`  Old: "${testCase.oldValue}" → New: "${testCase.newValue}"`);
        console.log(`  Expected: ${testCase.expected}, Got: ${result} ${passed ? '✅' : '❌'}`);
        console.log('');
    });
}

function checkNotEqualsCondition(condition, oldValue, newValue) {
    const notEqualsResult = String(newValue) !== String(condition.value);
    console.log(`    📊 Not equals check: "${String(newValue)}" !== "${String(condition.value)}" = ${notEqualsResult}`);
    return notEqualsResult;
}

testNotEqualsCondition();
