#!/usr/bin/env node

// Use built-in fetch (Node.js 18+)

async function testCCRM() {
    const baseUrl = 'http://localhost:6421'; // Using port 6421 as shown in logs
    
    console.log('🧪 Testing CCRM command via API...');
    
    try {
        console.log('📤 Sending CCRM command...');
        const response = await fetch(`${baseUrl}/api/bash/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'ccrm' })
        });
        
        const result = await response.json();
        
        console.log('\n📊 Result:');
        console.log('Success:', result.success);
        console.log('Exit Code:', result.exitCode);
        console.log('Execution Time:', result.executionTime, 'ms');
        
        if (result.output) {
            console.log('\n📝 Output:');
            console.log(result.output);
        }
        
        if (result.error) {
            console.log('\n❌ Error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCCRM();