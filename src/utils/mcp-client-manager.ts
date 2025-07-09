/**
 * MCP Client Manager - Proper client-server connection management
 * 
 * This module implements the correct pattern for connecting to external MCP servers
 * using the MCP SDK's client capabilities, replacing the broken globalThis approach.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import type { MCPType } from '@/types/shared-types.js';

// Configuration interface for MCP connections
export interface MCPConnectionConfig {
  command: string;      // e.g., "node"
  args: string[];       // e.g., ["path/to/memory-mcp/index.js"]
  transport: 'stdio' | 'http' | 'websocket';
  env?: Record<string, string>;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

// Complete configuration for all MCPs
export interface MCPConnectionsConfig {
  memory?: MCPConnectionConfig;
  filesystem?: MCPConnectionConfig;
  git?: MCPConnectionConfig;
  databasePlatform?: MCPConnectionConfig;
  databaseAnalytics?: MCPConnectionConfig;
}

// Connection state tracking
interface ConnectionState {
  client: Client;
  transport: StdioClientTransport;
  connected: boolean;
  lastError?: Error;
  reconnectAttempts: number;
}

export class MCPClientManager {
  private connections: Map<MCPType, ConnectionState> = new Map();
  private configs: MCPConnectionsConfig;
  
  constructor(configs: MCPConnectionsConfig) {
    this.configs = configs;
  }
  
  /**
   * Connect to Memory MCP server using proper stdio transport
   */
  async connectToMemoryMCP(): Promise<Client> {
    const config = this.configs.memory;
    if (!config) {
      throw new Error('Memory MCP configuration not provided');
    }
    
    // Check if already connected
    const existing = this.connections.get('memory');
    if (existing?.connected) {
      console.log('[MCPClientManager] Reusing existing Memory MCP connection');
      return existing.client;
    }
    
    console.log('[MCPClientManager] Establishing connection to Memory MCP...');
    
    try {
      // Create stdio transport with proper process spawning
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...process.env,
          ...config.env
        }
      });
      
      // Create client with proper capabilities
      const client = new Client({
        name: 'conversation-continuity-client',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        }
      });
      
      // Connect the client to the transport
      await client.connect(transport);
      
      // Verify connection by listing available tools
      const toolsResponse = await client.listTools();
      console.log(`[MCPClientManager] Memory MCP connected successfully. Available tools: ${toolsResponse.tools.map(t => t.name).join(', ')}`);
      
      // Store connection state
      this.connections.set('memory', {
        client,
        transport,
        connected: true,
        reconnectAttempts: 0
      });
      
      return client;
    } catch (error) {
      console.error('[MCPClientManager] Failed to connect to Memory MCP:', error);
      
      // Store failed state
      this.connections.set('memory', {
        client: null as any,
        transport: null as any,
        connected: false,
        lastError: error as Error,
        reconnectAttempts: (existing?.reconnectAttempts || 0) + 1
      });
      
      throw error;
    }
  }
  
  /**
   * Call a tool on a connected MCP server
   */
  async callTool(mcpType: MCPType, toolName: string, args: any): Promise<any> {
    const connection = this.connections.get(mcpType);
    if (!connection?.connected) {
      throw new Error(`Not connected to ${mcpType} MCP`);
    }
    
    try {
      // Use the MCP protocol to call the tool
      const response = await connection.client.callTool({
        name: toolName,
        arguments: args
      });
      
      // The response content is what we return
      return response.content;
    } catch (error) {
      console.error(`[MCPClientManager] Error calling ${toolName} on ${mcpType}:`, error);
      throw error;
    }
  }
  
  /**
   * Gracefully disconnect from an MCP server
   */
  async disconnect(mcpType: MCPType): Promise<void> {
    const connection = this.connections.get(mcpType);
    if (!connection?.connected) {
      return;
    }
    
    try {
      await connection.client.close();
      connection.connected = false;
      console.log(`[MCPClientManager] Disconnected from ${mcpType} MCP`);
    } catch (error) {
      console.error(`[MCPClientManager] Error disconnecting from ${mcpType}:`, error);
    }
  }
  
  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(
      mcpType => this.disconnect(mcpType)
    );
    await Promise.allSettled(disconnectPromises);
  }
  
  /**
   * Check if connected to a specific MCP
   */
  isConnected(mcpType: MCPType): boolean {
    return this.connections.get(mcpType)?.connected || false;
  }
  
  /**
   * Get connection status for all MCPs
   */
  getConnectionStatus(): Record<MCPType, boolean> {
    const status: Partial<Record<MCPType, boolean>> = {};
    const mcpTypes: MCPType[] = ['memory', 'claudepoint', 'filesystem', 'git', 'database-platform', 'database-analytics'];
    
    for (const mcpType of mcpTypes) {
      status[mcpType] = this.isConnected(mcpType);
    }
    
    return status as Record<MCPType, boolean>;
  }
  
  /**
   * Attempt to reconnect to a failed MCP
   */
  async reconnect(mcpType: MCPType): Promise<Client> {
    const connection = this.connections.get(mcpType);
    const config = this.configs[mcpType as keyof MCPConnectionsConfig];
    
    if (!config) {
      throw new Error(`No configuration for ${mcpType} MCP`);
    }
    
    // Apply retry policy
    const retryPolicy = config.retryPolicy || { maxAttempts: 3, backoffMs: 1000 };
    const attempts = connection?.reconnectAttempts || 0;
    
    if (attempts >= retryPolicy.maxAttempts) {
      throw new Error(`Max reconnection attempts (${retryPolicy.maxAttempts}) reached for ${mcpType} MCP`);
    }
    
    // Wait with exponential backoff
    const waitTime = retryPolicy.backoffMs * Math.pow(2, attempts);
    console.log(`[MCPClientManager] Waiting ${waitTime}ms before reconnecting to ${mcpType}...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Attempt reconnection based on MCP type
    switch (mcpType) {
      case 'memory':
        return this.connectToMemoryMCP();
      // Add other MCP types as we implement them
      default:
        throw new Error(`Reconnection not implemented for ${mcpType} MCP`);
    }
  }
}

// Example usage patterns for the roadmap documentation:
/*
// Initialize the manager with configuration
const mcpManager = new MCPClientManager({
  memory: {
    command: 'node',
    args: ['../memory-mcp/dist/index.js'],
    transport: 'stdio',
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 1000
    }
  }
});

// Connect to Memory MCP
const memoryClient = await mcpManager.connectToMemoryMCP();

// Call a tool using proper MCP protocol
const graph = await mcpManager.callTool('memory', 'read_graph', {});

// Check connection status
const isConnected = mcpManager.isConnected('memory');

// Graceful shutdown
await mcpManager.disconnectAll();
*/
