/**
 * Updated Memory Client Adapter - Uses proper MCP client connections
 * 
 * This replaces the broken globalThis implementation with correct MCP protocol calls
 */

import { MCPClientManager } from './mcp-client-manager.js';
import type {
  MemoryMCPClient,
  MemoryEntity,
  MemoryObservation,
  MemoryNode,
  MemoryRelation,
  MemoryObservationDeletion,
  MemoryGraph
} from '@/types/shared-types.js';

export class MemoryClientAdapterV2 implements MemoryMCPClient {
  private manager: MCPClientManager;
  private connected: boolean = false;
  
  constructor(manager: MCPClientManager) {
    this.manager = manager;
  }
  
  /**
   * Ensure we're connected before making calls
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected || !this.manager.isConnected('memory')) {
      await this.manager.connectToMemoryMCP();
      this.connected = true;
    }
  }
  
  async createEntities(entities: MemoryEntity[]): Promise<void> {
    console.log(`[MemoryClientAdapterV2] Creating ${entities.length} entities`);
    await this.ensureConnected();
    
    try {
      // Use the proper MCP protocol through the manager
      await this.manager.callTool('memory', 'create_entities', { entities });
      console.log(`[MemoryClientAdapterV2] Successfully created ${entities.length} entities`);
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to create entities:', error);
      throw error;
    }
  }
  
  async addObservations(observations: MemoryObservation[]): Promise<void> {
    console.log(`[MemoryClientAdapterV2] Adding observations to ${observations.length} entities`);
    await this.ensureConnected();
    
    try {
      await this.manager.callTool('memory', 'add_observations', { observations });
      console.log(`[MemoryClientAdapterV2] Successfully added observations`);
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to add observations:', error);
      throw error;
    }
  }
  
  async searchNodes(query: string): Promise<MemoryNode[]> {
    console.log(`[MemoryClientAdapterV2] Searching nodes with query: "${query}"`);
    await this.ensureConnected();
    
    try {
      const result = await this.manager.callTool('memory', 'search_nodes', { query });
      const nodes = result.nodes || [];
      console.log(`[MemoryClientAdapterV2] Found ${nodes.length} nodes`);
      return nodes;
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to search nodes:', error);
      throw error;
    }
  }
  
  async openNodes(names: string[]): Promise<MemoryNode[]> {
    console.log(`[MemoryClientAdapterV2] Opening ${names.length} nodes`);
    await this.ensureConnected();
    
    try {
      const result = await this.manager.callTool('memory', 'open_nodes', { names });
      return result.nodes || [];
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to open nodes:', error);
      throw error;
    }
  }
  
  async createRelations(relations: MemoryRelation[]): Promise<void> {
    console.log(`[MemoryClientAdapterV2] Creating ${relations.length} relations`);
    await this.ensureConnected();
    
    try {
      await this.manager.callTool('memory', 'create_relations', { relations });
      console.log(`[MemoryClientAdapterV2] Successfully created relations`);
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to create relations:', error);
      throw error;
    }
  }
  
  async deleteEntities(entityNames: string[]): Promise<void> {
    console.log(`[MemoryClientAdapterV2] Deleting ${entityNames.length} entities`);
    await this.ensureConnected();
    
    try {
      await this.manager.callTool('memory', 'delete_entities', { entityNames });
      console.log(`[MemoryClientAdapterV2] Successfully deleted entities`);
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to delete entities:', error);
      throw error;
    }
  }
  
  async deleteObservations(deletions: MemoryObservationDeletion[]): Promise<void> {
    console.log(`[MemoryClientAdapterV2] Deleting observations from ${deletions.length} entities`);
    await this.ensureConnected();
    
    try {
      await this.manager.callTool('memory', 'delete_observations', { deletions });
      console.log(`[MemoryClientAdapterV2] Successfully deleted observations`);
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to delete observations:', error);
      throw error;
    }
  }
  
  async deleteRelations(relations: MemoryRelation[]): Promise<void> {
    console.log(`[MemoryClientAdapterV2] Deleting ${relations.length} relations`);
    await this.ensureConnected();
    
    try {
      await this.manager.callTool('memory', 'delete_relations', { relations });
      console.log(`[MemoryClientAdapterV2] Successfully deleted relations`);
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to delete relations:', error);
      throw error;
    }
  }
  
  async readGraph(): Promise<MemoryGraph> {
    console.log('[MemoryClientAdapterV2] Reading complete Memory MCP graph');
    await this.ensureConnected();
    
    try {
      const graph = await this.manager.callTool('memory', 'read_graph', {});
      console.log(`[MemoryClientAdapterV2] Successfully read graph: ${graph.entities?.length || 0} entities, ${graph.relations?.length || 0} relations`);
      return graph;
    } catch (error) {
      console.error('[MemoryClientAdapterV2] Failed to read graph:', error);
      throw error;
    }
  }
}

// Example of how to update the MCPClientFactory to use this new adapter:
/*
// In mcp-client-factory.ts:

async createMemoryClient(): Promise<MemoryMCPClient> {
  if (this.clients.has('memory')) {
    return this.clients.get('memory');
  }

  // Create the manager with proper configuration
  const manager = new MCPClientManager({
    memory: {
      command: process.env.MEMORY_MCP_COMMAND || 'node',
      args: [process.env.MEMORY_MCP_PATH || '../memory-mcp/dist/index.js'],
      transport: 'stdio',
      env: {
        // Any environment variables the Memory MCP needs
      }
    }
  });

  // Create the adapter using the manager
  const client = new MemoryClientAdapterV2(manager);
  await this.initializeClient('memory', client);
  return client;
}
*/
