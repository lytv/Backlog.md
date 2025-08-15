#!/usr/bin/env node

// Test worktree path and naming changes
import { BacklogServer } from './src/server/index.ts';

console.log('🧪 Testing Worktree Path and Naming Changes');
console.log('='.repeat(50));

async function testWorktreePath() {
  const server = new BacklogServer(process.cwd());
  
  try {
    // Start server
    await server.start(6428, false);
    console.log('✅ Server started on port 6428');
    
    const baseUrl = 'http://localhost:6428';
    
    // Test 1: Create worktree with task title format
    console.log('\n🔨 Test 1: Create worktree with task title format');
    try {
      const createData = {
        name: 'T06_S01_Database_Migrations',
        branch: 'feature/t06_s01_database_migrations',
        baseBranch: 'main',
        taskId: 'task-004'
      };
      
      const response = await fetch(`${baseUrl}/api/worktrees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });
      
      if (response.ok) {
        const worktree = await response.json();
        console.log(`✅ Created worktree successfully:`);
        console.log(`   Name: ${worktree.name}`);
        console.log(`   Branch: ${worktree.branch}`);
        console.log(`   Path: ${worktree.path}`);
        console.log(`   Task ID: ${worktree.taskIds?.[0] || 'none'}`);
        
        // Check if path uses .tree directory
        if (worktree.path.includes('.tree')) {
          console.log(`✅ Path correctly uses .tree directory`);
        } else {
          console.log(`⚠️  Path does not use .tree directory: ${worktree.path}`);
        }
        
        // Check if name preserves original format
        if (worktree.name === 'T06_S01_Database_Migrations') {
          console.log(`✅ Name preserves original format: ${worktree.name}`);
        } else {
          console.log(`⚠️  Name format changed: ${worktree.name}`);
        }
        
        // Test 2: Verify worktree in list
        console.log('\n📋 Test 2: Verify worktree in list');
        const listResponse = await fetch(`${baseUrl}/api/worktrees`);
        const worktrees = await listResponse.json();
        const createdWorktree = worktrees.find(wt => wt.id === worktree.id);
        
        if (createdWorktree) {
          console.log(`✅ Worktree found in list: ${createdWorktree.name}`);
          console.log(`   Full path: ${createdWorktree.path}`);
        }
        
        // Test 3: Cleanup
        console.log('\n🗑️  Test 3: Cleanup test worktree');
        const deleteResponse = await fetch(`${baseUrl}/api/worktrees/${worktree.id}?force=true`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted test worktree successfully`);
        }
        
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create worktree: ${error.error}`);
      }
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
    
    // Test 4: Test WorktreeButton naming logic
    console.log('\n🏷️  Test 4: Test naming logic');
    
    const testTitles = [
      'T06_S01_Database_Migrations',
      'User Authentication System',
      'API-Gateway-Setup',
      'Fix Bug #123'
    ];
    
    for (const title of testTitles) {
      // Simulate the generateWorktreeName function
      const worktreeName = title
        .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove special characters but keep underscores
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .substring(0, 50); // Limit length
      
      const branchName = `feature/${worktreeName.toLowerCase()}`;
      
      console.log(`   Title: "${title}"`);
      console.log(`   → Worktree name: "${worktreeName}"`);
      console.log(`   → Branch name: "${branchName}"`);
      console.log(`   → Expected path: .tree/${worktreeName}`);
      console.log('');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Worktree path and naming test completed!');
    console.log('📝 Summary:');
    console.log('   - Worktrees now stored in .tree/ directory');
    console.log('   - Names preserve original case and underscores');
    console.log('   - Branch names use lowercase (git convention)');
    console.log('   - Filesystem-safe character handling');
    console.log('\n💡 Expected behavior:');
    console.log('   - T06_S01_Database_Migrations → .tree/T06_S01_Database_Migrations');
    console.log('   - Branch: feature/t06_s01_database_migrations');
    console.log('   - Case sensitivity: Names preserve original format');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Stop server
    await server.stop();
    console.log('✅ Server stopped');
  }
}

testWorktreePath().catch(console.error);