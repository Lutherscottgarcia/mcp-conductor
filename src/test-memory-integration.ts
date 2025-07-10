#!/usr/bin/env node

/**
 * Test script to verify Memory MCP integration
 * Run with: npm run test:memory-integration
 */

import { MCPClientFactory } from './utils/mcp-client-factory.js';
import type { MCPClientConfig } from './types/orchestration-types.js';

async function testMemoryIntegration() {
  console.log('=== Testing Memory MCP Integration ===\n');
  
  // Create factory with Memory MCP configuration
  const configs: MCPClientConfig[] = [
    {
      type: 'memory',
      name: 'Memory MCP',
      version: '1.0.0'
    }
  ];
  
  const factory = new MCPClientFactory(configs);
  
  try {
    console.log('1. Creating Memory MCP client...');
    const memoryClient = await factory.createMemoryClient();
    console.log('✅ Memory client created successfully\n');
    
    console.log('2. Reading current graph state...');
    const graph = await memoryClient.readGraph();
    console.log(`✅ Graph read successfully: ${graph.entities?.length || 0} entities, ${graph.relations?.length || 0} relations\n`);
    
    console.log('3. Creating test entities...');
    await memoryClient.createEntities([
      {
        name: 'TestEntity1',
        entityType: 'test_type',
        observations: ['This is a test entity created via proper MCP integration']
      },
      {
        name: 'TestEntity2', 
        entityType: 'test_type',
        observations: ['Another test entity to verify the connection works']
      }
    ]);
    console.log('✅ Test entities created\n');
    
    console.log('4. Searching for created entities...');
    const searchResults = await memoryClient.searchNodes('TestEntity');
    console.log(`✅ Found ${searchResults.length} entities matching search\n`);
    
    console.log('5. Creating relation between entities...');
    await memoryClient.createRelations([
      {
        from: 'TestEntity1',
        to: 'TestEntity2',
        relationType: 'connected_to'
      }
    ]);
    console.log('✅ Relation created\n');
    
    console.log('6. Reading final graph state...');
    const finalGraph = await memoryClient.readGraph();
    console.log(`✅ Final graph: ${finalGraph.entities?.length || 0} entities, ${finalGraph.relations?.length || 0} relations\n`);
    
    console.log('7. Cleaning up test entities...');
    await memoryClient.deleteEntities(['TestEntity1', 'TestEntity2']);
    console.log('✅ Test entities cleaned up\n');
    
    console.log('=== Memory MCP Integration Test PASSED ===');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Memory MCP Integration Test FAILED:');
    console.error(error);
    
    console.log('\n=== Troubleshooting ===');
    console.log('1. Ensure Memory MCP server is running');
    console.log('2. Check environment variables:');
    console.log(`   - MEMORY_MCP_COMMAND: ${process.env.MEMORY_MCP_COMMAND || 'not set (using default: node)'}`);
    console.log(`   - MEMORY_MCP_PATH: ${process.env.MEMORY_MCP_PATH || 'not set (using default path)'}`);
    console.log('3. Verify Memory MCP is accessible at the configured path');
    
    process.exit(1);
  }
}

// Run the test
testMemoryIntegration().catch(console.error);
