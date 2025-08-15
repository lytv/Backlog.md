#!/usr/bin/env node

// Start server for manual testing
import { BacklogServer } from './src/server/index.ts';

console.log('Starting test server...');

try {
  const server = new BacklogServer(process.cwd());
  
  // Start server and open browser
  await server.start(6424, true);
  
  console.log('✅ Server started successfully!');
  console.log('🌐 Open http://localhost:6424 in your browser');
  console.log('⏹️  Press Ctrl+C to stop');
  
  // Keep server running
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping server...');
    await server.stop();
    console.log('✅ Server stopped');
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}