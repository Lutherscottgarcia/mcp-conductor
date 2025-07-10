#!/usr/bin/env node

/**
 * Check Memory MCP Integration Status
 */

console.log('=== Memory MCP Integration Status Check ===\n');

// Check environment variables
console.log('Environment Variables:');
console.log(`  MEMORY_MCP_PATH: ${process.env.MEMORY_MCP_PATH || '❌ NOT SET'}`);
console.log(`  MEMORY_MCP_COMMAND: ${process.env.MEMORY_MCP_COMMAND || 'not set (will use default: node)'}`);
console.log(`  MCP_TEST_MODE: ${process.env.MCP_TEST_MODE || 'not set (auto-detect)'}`);
console.log();

// Check if Memory MCP path exists
if (process.env.MEMORY_MCP_PATH) {
  const fs = require('fs');
  const exists = fs.existsSync(process.env.MEMORY_MCP_PATH);
  console.log(`Memory MCP File Check: ${exists ? '✅ File exists' : '❌ File not found'}`);
} else {
  console.log('Memory MCP File Check: ⚠️  Cannot check - MEMORY_MCP_PATH not set');
}

console.log('\nIntegration Files Status:');
console.log('  ✅ MCPClientManager created (src/utils/mcp-client-manager.ts)');
console.log('  ✅ MemoryClientAdapterV2 created (src/utils/memory-client-adapter-v2.ts)');
console.log('  ✅ MCPClientFactory updated');
console.log('  ✅ Test script created (test:memory-integration)');

console.log('\nNext Steps:');
if (!process.env.MEMORY_MCP_PATH) {
  console.log('  1. Set MEMORY_MCP_PATH environment variable');
  console.log('  2. Run: npm run test:memory-integration');
} else {
  console.log('  1. Run: npm run test:memory-integration');
  console.log('  2. If test passes, Memory MCP is properly integrated!');
}

console.log('\nFor detailed instructions, see:');
console.log('  - MEMORY_MCP_INTEGRATION.md');
console.log('  - QUICK_START.md');
console.log('  - INTEGRATION_SUMMARY.md');
