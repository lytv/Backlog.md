#!/usr/bin/env node

// Test script to verify bash execution logic
const fetch = require('node-fetch');

async function testBashExecution() {
    const baseUrl = 'http://localhost:6420';
    
    console.log('🧪 Testing bash execution logic...');
    
    // Test 1: Simple command
    console.log('\n1. Testing simple command (ls)...');
    try {
        const response = await fetch(`${baseUrl}/api/bash/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'ls -la' })
        });
        const result = await response.json();
        console.log('✅ Simple command result:', result.success ? 'SUCCESS' : 'FAILED');
        if (!result.success) console.log('Error:', result.error);
    } catch (error) {
        console.log('❌ Simple command failed:', error.message);
    }
    
    // Test 2: Echo command (should work without shell)
    console.log('\n2. Testing echo command...');
    try {
        const response = await fetch(`${baseUrl}/api/bash/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'echo "Hello World"' })
        });
        const result = await response.json();
        console.log('✅ Echo command result:', result.success ? 'SUCCESS' : 'FAILED');
        console.log('Output:', result.output?.trim());
    } catch (error) {
        console.log('❌ Echo command failed:', error.message);
    }
    
    // Test 3: CCRM command (the problematic one)
    console.log('\n3. Testing ccrm command (should use safe script)...');
    try {
        const response = await fetch(`${baseUrl}/api/bash/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'ccrm' })
        });
        const result = await response.json();
        console.log('✅ CCRM command result:', result.success ? 'SUCCESS' : 'FAILED');
        if (!result.success) console.log('Error:', result.error);
        console.log('Execution time:', result.executionTime, 'ms');
    } catch (error) {
        console.log('❌ CCRM command failed:', error.message);
    }
    
    // Test 4: Duplicate command prevention
    console.log('\n4. Testing duplicate command prevention...');
    try {
        // Start first command (long running)
        const promise1 = fetch(`${baseUrl}/api/bash/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'sleep 5' })
        });
        
        // Wait a bit then try same command
        setTimeout(async () => {
            try {
                const response2 = await fetch(`${baseUrl}/api/bash/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: 'sleep 5' })
                });
                const result2 = await response2.json();
                console.log('✅ Duplicate prevention result:', result2.success ? 'UNEXPECTED SUCCESS' : 'CORRECTLY BLOCKED');
                console.log('Message:', result2.error);
            } catch (error) {
                console.log('❌ Duplicate test failed:', error.message);
            }
        }, 1000);
        
        const result1 = await promise1;
        const data1 = await result1.json();
        console.log('✅ First sleep command result:', data1.success ? 'SUCCESS' : 'FAILED');
        
    } catch (error) {
        console.log('❌ Duplicate test failed:', error.message);
    }
}

// Check if server is running first
async function checkServer() {
    try {
        const response = await fetch('http://localhost:6420/api/version');
        if (response.ok) {
            console.log('✅ Server is running, starting tests...');
            await testBashExecution();
        } else {
            console.log('❌ Server responded but with error status');
        }
    } catch (error) {
        console.log('❌ Server is not running. Please start it first with: bun run browser');
        console.log('Error:', error.message);
    }
}

checkServer();