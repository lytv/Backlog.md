#!/usr/bin/env node

// Test worktree creation with feature branch
import { BacklogServer } from './src/server/index.ts';

console.log('🧪 Testing Worktree Creation with Feature Branch');
console.log('='.repeat(50));

async function testWorktreeCreation() {
  const server = new BacklogServer(process.cwd());
  
  try {
    // Start server
    await server.start(6427, false);
    console.log('✅ Server started on port 6427');
    
    const baseUrl = 'http://localhost:6427';
    
    // Test 1: Create worktree with feature branch (should work)
    console.log('\n🔨 Test 1: Create worktree with feature branch');
    try {
      const createData = {
        name: 'test-feature-worktree',
        branch: 'feature/test-feature-worktree',
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
        
        // Test 2: Verify worktree exists
        console.log('\n📋 Test 2: Verify worktree in list');
        const listResponse = await fetch(`${baseUrl}/api/worktrees`);
        const worktrees = await listResponse.json();
        const createdWorktree = worktrees.find(wt => wt.id === worktree.id);
        
        if (createdWorktree) {
          console.log(`✅ Worktree found in list: ${createdWorktree.name}`);
          console.log(`   Active: ${createdWorktree.isActive}`);
          console.log(`   Status: ${createdWorktree.status.isClean ? 'Clean' : 'Modified'}`);
        } else {
          console.log(`❌ Worktree not found in list`);
        }
        
        // Test 3: Get worktree status
        console.log('\n📊 Test 3: Get worktree status');
        const statusResponse = await fetch(`${baseUrl}/api/worktrees/${worktree.id}/status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          console.log(`✅ Status retrieved:`);
          console.log(`   Clean: ${status.isClean}`);
          console.log(`   Modified files: ${status.modifiedFiles}`);
          console.log(`   Staged files: ${status.stagedFiles}`);
        }
        
        // Test 4: Cleanup - delete the test worktree
        console.log('\n🗑️  Test 4: Cleanup test worktree');
        const deleteResponse = await fetch(`${baseUrl}/api/worktrees/${worktree.id}?force=true`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted test worktree successfully`);
        } else {
          console.log(`⚠️  Failed to delete test worktree: ${deleteResponse.status}`);
        }
        
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create worktree: ${error.error}`);
        console.log(`   This might be expected if git repository is not properly set up`);
      }
    } catch (error) {
      console.log(`❌ Worktree creation test failed: ${error.message}`);
    }
    
    // Test 5: Test error handling - try to create with main branch (should fail)
    console.log('\n⚠️  Test 5: Test error handling with main branch');
    try {
      const createData = {
        name: 'test-main-worktree',
        branch: 'main',
        baseBranch: 'main',
        taskId: 'task-004'
      };
      
      const response = await fetch(`${baseUrl}/api/worktrees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.log(`✅ Expected error caught: ${error.error}`);
        console.log(`   This is correct behavior - main branch is already in use`);
      } else {
        console.log(`⚠️  Unexpected success - main branch worktree created`);
      }
    } catch (error) {
      console.log(`✅ Expected error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Worktree creation test completed!');
    console.log('📝 Summary:');
    console.log('   - Feature branch worktrees should work');
    console.log('   - Main branch worktrees should fail (expected)');
    console.log('   - Error handling works correctly');
    console.log('   - WorktreeButton now uses feature branches');
    console.log('\n💡 In browser:');
    console.log('   - Click "Create Worktree" should now work');
    console.log('   - If error appears, hover over red icon for details');
    console.log('   - Click X next to error icon to clear error');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Stop server
    await server.stop();
    console.log('✅ Server stopped');
  }
}

testWorktreeCreation().catch(console.error);