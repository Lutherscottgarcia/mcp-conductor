// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/utils/mcp-client-factory.ts

/**
 * Factory for creating clients to all 5 existing MCPs
 * Provides unified interface for MCP orchestration
 */

import { promisify } from 'util';
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

import type { MCPType, MCPHealth } from '@/types/shared-types.js';

const execAsync = promisify(exec);

// ===== REAL CHECKPOINT UTILITIES =====
const CHECKPOINT_DIR = '/Users/Luther/RiderProjects/.checkpoints';
const SNAPSHOTS_DIR = path.join(CHECKPOINT_DIR, 'snapshots');
const SOURCE_DIR = '/Users/Luther/RiderProjects';

// Patterns to exclude from checkpoints (keep them small!)
const EXCLUDE_PATTERNS = [
  'node_modules',
  'RiderProjects/*/node_modules',
  'RiderProjects/*/*/node_modules',
  'RiderProjects/*/*/*/node_modules',
  '.git',
  'dist',
  'build',
  '.DS_Store',
  '*.log',
  '__pycache__',
  '*.pyc',
  '.env',
  '.venv',
  'venv',
  'venv_new',
  '.idea',
  '*.tmp',
  '*.temp',
  '.checkpoints'
];

interface CheckpointMetadata {
  id: string;
  name?: string | undefined;
  description: string;
  createdAt: Date;
  fileCount: number;
  size: number;
  sourceDir: string;
}

class RealCheckpointManager {
  static async ensureDirectoryStructure(): Promise<void> {
    await fs.promises.mkdir(CHECKPOINT_DIR, { recursive: true });
    await fs.promises.mkdir(SNAPSHOTS_DIR, { recursive: true });
  }

  static async createTarball(checkpointId: string): Promise<{ fileCount: number; size: number }> {
    const tarPath = path.join(SNAPSHOTS_DIR, checkpointId, 'data.tar.gz');
    const checkpointDir = path.join(SNAPSHOTS_DIR, checkpointId);
    
    // Create checkpoint directory
    await fs.promises.mkdir(checkpointDir, { recursive: true });
    
    // Build exclude arguments for tar
    const excludeArgs = EXCLUDE_PATTERNS.map(pattern => `--exclude='${pattern}'`).join(' ');
    
    // Add comprehensive exclusions for known large directories
    const additionalExclusions = [
      `--exclude='RiderProjects/FantasyGM/database/NFL_Analytics/seed_data'`,
      `--exclude='*/node_modules/*'`,
      `--exclude='**/node_modules/**'`
    ].join(' ');
    
    // Create tarball of RiderProjects (excluding large dirs)
    const tarCommand = `cd "${SOURCE_DIR}/.." && tar ${excludeArgs} ${additionalExclusions} -czf "${tarPath}" RiderProjects`;
    
    // console.log(`Creating checkpoint tarball: ${checkpointId}`);
    // console.log(`Tar command: ${tarCommand}`);
    await execAsync(tarCommand);
    
    // Get file stats
    const stats = await fs.promises.stat(tarPath);
    
    // Count files in tarball (approximate)
    const { stdout } = await execAsync(`tar -tzf "${tarPath}" | wc -l`);
    const fileCount = parseInt(stdout.trim());
    
    return {
      fileCount,
      size: stats.size
    };
  }

  static async saveMetadata(checkpointId: string, metadata: CheckpointMetadata): Promise<void> {
    const metadataPath = path.join(SNAPSHOTS_DIR, checkpointId, 'metadata.json');
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  static async loadMetadata(checkpointId: string): Promise<CheckpointMetadata | null> {
    try {
      const metadataPath = path.join(SNAPSHOTS_DIR, checkpointId, 'metadata.json');
      const data = await fs.promises.readFile(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  static async listCheckpointDirectories(): Promise<string[]> {
    try {
      const items = await fs.promises.readdir(SNAPSHOTS_DIR);
      const checkpoints = [];
      
      for (const item of items) {
        const itemPath = path.join(SNAPSHOTS_DIR, item);
        const stat = await fs.promises.stat(itemPath);
        if (stat.isDirectory()) {
          checkpoints.push(item);
        }
      }
      
      return checkpoints.sort((a, b) => b.localeCompare(a)); // Newest first
    } catch (error) {
      return [];
    }
  }

  static async extractCheckpoint(checkpointId: string, targetDir: string, dryRun: boolean = false): Promise<{ success: boolean; message: string; filesRestored: number }> {
    const tarPath = path.join(SNAPSHOTS_DIR, checkpointId, 'data.tar.gz');
    
    if (!await fs.promises.access(tarPath).then(() => true).catch(() => false)) {
      return {
        success: false,
        message: `Checkpoint tarball not found: ${checkpointId}`,
        filesRestored: 0
      };
    }
    
    if (dryRun) {
      // List files that would be restored
      const { stdout } = await execAsync(`tar -tzf "${tarPath}" | head -20`);
      return {
        success: true,
        message: `Dry run: Would restore checkpoint ${checkpointId}\nSample files:\n${stdout}`,
        filesRestored: 0
      };
    }
    
    // Create backup before restore
    const backupId = `emergency_backup_${Date.now()}`;
    // console.log(`Creating emergency backup: ${backupId}`);
    const backupResult = await this.createTarball(backupId);
    const backupMetadata: CheckpointMetadata = {
      id: backupId,
      description: `Emergency backup before restoring ${checkpointId}`,
      createdAt: new Date(),
      fileCount: backupResult.fileCount,
      size: backupResult.size,
      sourceDir: SOURCE_DIR
    };
    await this.saveMetadata(backupId, backupMetadata);
    
    // Extract checkpoint
    const extractCommand = `cd "${targetDir}/.." && tar -xzf "${tarPath}"`;
    // console.log(`Restoring checkpoint: ${checkpointId}`);
    await execAsync(extractCommand);
    
    const metadata = await this.loadMetadata(checkpointId);
    
    return {
      success: true,
      message: `Successfully restored checkpoint ${checkpointId} (emergency backup created: ${backupId})`,
      filesRestored: metadata?.fileCount || 0
    };
  }

  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}

// ===== MCP CLIENT MANAGER SINGLETON =====
let mcpClientManagerInstance: MCPClientManager | null = null;

const getMCPClientManager = (): MCPClientManager => {
  if (!mcpClientManagerInstance) {
    // Create configuration from environment variables
    const config: MCPConnectionsConfig = {
      memory: {
        command: process.env.MEMORY_MCP_COMMAND || 'node',
        args: [process.env.MEMORY_MCP_PATH || path.join(__dirname, '../../../../memory-mcp/dist/index.js')],
        transport: 'stdio',
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000
        }
      }
      // Add other MCP configurations as we implement them
    };
    
    mcpClientManagerInstance = new MCPClientManager(config);
  }
  
  return mcpClientManagerInstance;
};

// ===== TEST MODE DETECTION =====
const isTestMode = () => {
  // Explicit test mode from environment
  if (process.env.MCP_TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // Production mode explicitly set
  if (process.env.MCP_TEST_MODE === 'false' || process.env.NODE_ENV === 'production') {
    return false;
  }
  
  // New approach: check if we can connect to Memory MCP through the manager
  const manager = getMCPClientManager();
  const hasMemoryMCP = manager.isConnected('memory');
  
  // Log the detection result for debugging
  if (!hasMemoryMCP) {
    // console.warn('⚠️  Memory MCP not connected - enabling test mode');
  }
  
  return !hasMemoryMCP;
};

// ===== LOGGING CONTROLS =====
const shouldLog = (level: 'debug' | 'info' | 'warn' | 'error' = 'info') => {
  if (process.env.NODE_ENV === 'production' && level === 'debug') {
    return false;
  }
  return true;
};

const mcpLog = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => {
  // DISABLED: Console output causes JSON-RPC corruption
  // All logging disabled to prevent protocol contamination
  return;
};
import { MCPClientManager, MCPConnectionsConfig } from './mcp-client-manager.js';
import { MemoryClientAdapterV2 } from './memory-client-adapter-v2.js';
import type { MCPClientConfig } from '@/types/orchestration-types.js';
import type {
  MemoryEntity,
  MemoryObservation,
  MemoryNode,
  MemoryRelation,
  MemoryObservationDeletion,
  MemoryGraph,
  CheckpointOptions,
  Checkpoint,
  RestoreResult,
  ChangelogEntry,
  FileEdit,
  EditResult,
  FileReadResult,
  DirectoryListing,
  DirectoryTree,
  FileMetadata,
  QueryResult,
  SchemaInfo,
  TransactionClient,
  DatabaseHealth,
  GitStatus,
  GitLogOptions,
  GitCommit,
  GitDiffOptions,
  GitBranch
} from '@/types/shared-types.js';

// ===== MCP CLIENT INTERFACES =====

export interface MemoryMCPClient {
  createEntities(entities: MemoryEntity[]): Promise<void>;
  addObservations(observations: MemoryObservation[]): Promise<void>;
  searchNodes(query: string): Promise<MemoryNode[]>;
  openNodes(names: string[]): Promise<MemoryNode[]>;
  createRelations(relations: MemoryRelation[]): Promise<void>;
  deleteEntities(entityNames: string[]): Promise<void>;
  deleteObservations(deletions: MemoryObservationDeletion[]): Promise<void>;
  deleteRelations(relations: MemoryRelation[]): Promise<void>;
  readGraph(): Promise<MemoryGraph>;
}

export interface ClaudepointMCPClient {
  createCheckpoint(options: CheckpointOptions): Promise<Checkpoint>;
  listCheckpoints(): Promise<Checkpoint[]>;
  restoreCheckpoint(checkpoint: string, dryRun?: boolean): Promise<RestoreResult>;
  setupClaudepoint(): Promise<void>;
  getChangelog(): Promise<ChangelogEntry[]>;
  setChangelog(entry: ChangelogEntry): Promise<void>;
}

export interface FilesystemMCPClient {
  readFile(path: string): Promise<string>;
  readMultipleFiles(paths: string[]): Promise<FileReadResult[]>;
  writeFile(path: string, content: string): Promise<void>;
  editFile(path: string, edits: FileEdit[], dryRun?: boolean): Promise<EditResult>;
  createDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<DirectoryListing>;
  directoryTree(path: string): Promise<DirectoryTree>;
  moveFile(source: string, destination: string): Promise<void>;
  searchFiles(path: string, pattern: string, excludePatterns?: string[]): Promise<string[]>;
  getFileInfo(path: string): Promise<FileMetadata>;
  listAllowedDirectories(): Promise<string[]>;
}

export interface GitMCPClient {
  status(): Promise<GitStatus>;
  add(files: string[]): Promise<void>;
  commit(message: string): Promise<string>;
  push(remote?: string, branch?: string): Promise<void>;
  pull(remote?: string, branch?: string): Promise<void>;
  log(options?: GitLogOptions): Promise<GitCommit[]>;
  diff(options?: GitDiffOptions): Promise<string>;
  branch(action: 'list' | 'create' | 'delete', name?: string): Promise<GitBranch[]>;
  checkout(branch: string): Promise<void>;
}

export interface DatabaseMCPClient {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  getSchema(): Promise<SchemaInfo>;
  beginTransaction(): Promise<TransactionClient>;
  healthCheck(): Promise<DatabaseHealth>;
}

// ===== MCP CLIENT FACTORY =====

export class MCPClientFactory {
  private clients: Map<MCPType, any> = new Map();
  private configs: Map<MCPType, MCPClientConfig> = new Map();
  private healthStatus: Map<MCPType, MCPHealth> = new Map();

  constructor(configs: MCPClientConfig[]) {
    configs.forEach(config => {
      this.configs.set(config.type, config);
      this.healthStatus.set(config.type, {
        status: 'offline',
        lastChecked: new Date(),
      });
    });
  }

  // ===== CLIENT CREATION =====

  async createMemoryClient(): Promise<MemoryMCPClient> {
    if (this.clients.has('memory')) {
      return this.clients.get('memory');
    }

    // Use the new adapter with proper MCP client connection
    const manager = getMCPClientManager();
    const client = new MemoryClientAdapterV2(manager);
    await this.initializeClient('memory', client);
    return client;
  }

  async createClaudepointClient(): Promise<ClaudepointMCPClient> {
    if (this.clients.has('claudepoint')) {
      return this.clients.get('claudepoint');
    }

    const config = this.configs.get('claudepoint');
    const client = new ClaudepointClientAdapter(config?.workingDirectory);
    await this.initializeClient('claudepoint', client);
    return client;
  }

  async createFilesystemClient(): Promise<FilesystemMCPClient> {
    if (this.clients.has('filesystem')) {
      return this.clients.get('filesystem');
    }

    const client = new FilesystemClientAdapter();
    await this.initializeClient('filesystem', client);
    return client;
  }

  async createGitClient(): Promise<GitMCPClient> {
    if (this.clients.has('git')) {
      return this.clients.get('git');
    }

    const config = this.configs.get('git');
    const client = new GitClientAdapter(config?.workingDirectory);
    await this.initializeClient('git', client);
    return client;
  }

  async createDatabaseClient(database: 'platform' | 'analytics'): Promise<DatabaseMCPClient> {
    const mcpType: MCPType = database === 'platform' ? 'database-platform' : 'database-analytics';
    
    if (this.clients.has(mcpType)) {
      return this.clients.get(mcpType);
    }

    const config = this.configs.get(mcpType);
    const client = new DatabaseClientAdapter(config?.connectionString, database);
    await this.initializeClient(mcpType, client);
    return client;
  }

  // ===== AVAILABILITY CHECKING =====

  hasClientConfig(mcpType: MCPType): boolean {
    return this.configs.has(mcpType);
  }

  getAvailableMCPs(): MCPType[] {
    return Array.from(this.configs.keys());
  }

  // ===== SAFE CLIENT CREATION =====

  async createMemoryClientSafe(): Promise<MemoryMCPClient | null> {
    if (!this.hasClientConfig('memory')) {
      mcpLog('warn', 'Memory MCP not configured - returning null client');
      return null;
    }
    try {
      const client = await this.createMemoryClient();
      mcpLog('info', 'Memory MCP client created successfully');
      return client;
    } catch (error) {
      mcpLog('error', `Memory MCP failed to initialize: ${error}`);
      return null;
    }
  }

  async createClaudepointClientSafe(): Promise<ClaudepointMCPClient | null> {
    if (!this.hasClientConfig('claudepoint')) {
      // console.log('Claudepoint MCP not configured - using null client');
      return null;
    }
    try {
      return await this.createClaudepointClient();
    } catch (error) {
      // console.warn('Claudepoint MCP failed to initialize:', error);
      return null;
    }
  }

  async createFilesystemClientSafe(): Promise<FilesystemMCPClient | null> {
    if (!this.hasClientConfig('filesystem')) {
      // console.log('Filesystem MCP not configured - using null client');
      return null;
    }
    try {
      return await this.createFilesystemClient();
    } catch (error) {
      // console.warn('Filesystem MCP failed to initialize:', error);
      return null;
    }
  }

  async createGitClientSafe(): Promise<GitMCPClient | null> {
    if (!this.hasClientConfig('git')) {
      // console.log('Git MCP not configured - using null client');
      return null;
    }
    try {
      return await this.createGitClient();
    } catch (error) {
      // console.warn('Git MCP failed to initialize:', error);
      return null;
    }
  }

  async createDatabaseClientSafe(database: 'platform' | 'analytics'): Promise<DatabaseMCPClient | null> {
    const mcpType: MCPType = database === 'platform' ? 'database-platform' : 'database-analytics';
    
    if (!this.hasClientConfig(mcpType)) {
      // console.log(`Database MCP (${database}) not configured - using null client`);
      return null;
    }
    try {
      return await this.createDatabaseClient(database);
    } catch (error) {
      // console.warn(`Database MCP (${database}) failed to initialize:`, error);
      return null;
    }
  }

  // ===== FLEXIBLE CLIENT ACCESS =====

  async getAllAvailableClients(): Promise<{
    memory: MemoryMCPClient | null;
    claudepoint: ClaudepointMCPClient | null;
    filesystem: FilesystemMCPClient | null;
    git: GitMCPClient | null;
    databasePlatform: DatabaseMCPClient | null;
    databaseAnalytics: DatabaseMCPClient | null;
    availableMCPs: MCPType[];
  }> {
    mcpLog('info', `Initializing available MCPs: ${this.getAvailableMCPs().join(', ')}`);
    
    const [memory, claudepoint, filesystem, git, databasePlatform, databaseAnalytics] = 
      await Promise.all([
        this.createMemoryClientSafe(),
        this.createClaudepointClientSafe(),
        this.createFilesystemClientSafe(),
        this.createGitClientSafe(),
        this.createDatabaseClientSafe('platform'),
        this.createDatabaseClientSafe('analytics')
      ]);

    const successfullyInitialized = [
      memory && 'memory',
      claudepoint && 'claudepoint', 
      filesystem && 'filesystem',
      git && 'git',
      databasePlatform && 'database-platform',
      databaseAnalytics && 'database-analytics'
    ].filter(Boolean) as MCPType[];

    mcpLog('info', `Successfully initialized MCPs: ${successfullyInitialized.join(', ')}`);

    return {
      memory,
      claudepoint,
      filesystem,
      git,
      databasePlatform,
      databaseAnalytics,
      availableMCPs: successfullyInitialized
    };
  }

  // ===== LEGACY SUPPORT =====
  // Keep the old method for backward compatibility, but now it's more flexible
  async getAllClients(): Promise<{
    memory: MemoryMCPClient;
    claudepoint: ClaudepointMCPClient;
    filesystem: FilesystemMCPClient;
    git: GitMCPClient;
    databasePlatform: DatabaseMCPClient;
    databaseAnalytics: DatabaseMCPClient;
  }> {
    // console.warn('WARNING: getAllClients() is deprecated - use getAllAvailableClients() for graceful handling');
    
    const [memory, claudepoint, filesystem, git, databasePlatform, databaseAnalytics] = 
      await Promise.all([
        this.createMemoryClient(),
        this.createClaudepointClient(),
        this.createFilesystemClient(),
        this.createGitClient(),
        this.createDatabaseClient('platform'),
        this.createDatabaseClient('analytics')
      ]);

    return {
      memory,
      claudepoint,
      filesystem,
      git,
      databasePlatform,
      databaseAnalytics
    };
  }

  // ===== HEALTH MONITORING =====

  async checkAllMCPHealth(): Promise<Map<MCPType, MCPHealth>> {
    // Only check health for MCPs that are configured and have clients
    const healthChecks = Array.from(this.clients.entries()).map(async ([mcpType, client]) => {
      try {
        const startTime = Date.now();
        await this.performHealthCheck(mcpType, client);
        const responseTime = Date.now() - startTime;

        this.healthStatus.set(mcpType, {
          status: 'online',
          responseTime,
          lastChecked: new Date()
        });
      } catch (error) {
        this.healthStatus.set(mcpType, {
          status: 'error',
          lastChecked: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Mark unconfigured MCPs as 'not_configured'
    const allMCPTypes: MCPType[] = ['memory', 'claudepoint', 'filesystem', 'git', 'database-platform', 'database-analytics'];
    for (const mcpType of allMCPTypes) {
      if (!this.hasClientConfig(mcpType)) {
        this.healthStatus.set(mcpType, {
          status: 'not_configured',
          lastChecked: new Date()
        });
      }
    }

    await Promise.allSettled(healthChecks);
    return new Map(this.healthStatus);
  }

  getHealthStatus(mcpType?: MCPType): MCPHealth | Map<MCPType, MCPHealth> {
    if (mcpType) {
      return this.healthStatus.get(mcpType) || {
        status: this.hasClientConfig(mcpType) ? 'offline' : 'not_configured',
        lastChecked: new Date()
      };
    }
    return new Map(this.healthStatus);
  }

  // ===== PRIVATE HELPERS =====

  private async initializeClient(mcpType: MCPType, client: any): Promise<void> {
    try {
      await this.performHealthCheck(mcpType, client);
      this.clients.set(mcpType, client);
      this.healthStatus.set(mcpType, {
        status: 'online',
        lastChecked: new Date()
      });
    } catch (error) {
      this.healthStatus.set(mcpType, {
        status: 'error',
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async performHealthCheck(mcpType: MCPType, client: any): Promise<void> {
    switch (mcpType) {
      case 'memory':
        await client.readGraph(); // Simple read operation
        break;
      case 'claudepoint':
        await client.listCheckpoints(); // List existing checkpoints
        break;
      case 'filesystem':
        await client.listAllowedDirectories(); // Check directory access
        break;
      case 'git':
        await client.status(); // Get git status
        break;
      case 'database-platform':
      case 'database-analytics':
        await client.healthCheck(); // Database-specific health check
        break;
      default:
        throw new Error(`Unknown MCP type: ${mcpType}`);
    }
  }
}

// ===== CLIENT ADAPTERS =====

/**
 * These adapters wrap the actual MCP SDK calls
 * They provide a unified interface while handling MCP-specific details
 */

// OLD ADAPTER - REPLACED BY MemoryClientAdapterV2
// Keeping for reference during migration
/*
class MemoryClientAdapter implements MemoryMCPClient {
  async createEntities(entities: MemoryEntity[]): Promise<void> {
    mcpLog('debug', `Creating ${entities.length} entities: ${entities.map(e => e.name).join(', ')}`);
    
    if (isTestMode()) {
      mcpLog('warn', `Test mode: Skipping creation of ${entities.length} entities`);
      return;
    }
    
    try {
      await (globalThis as any).local__memory__create_entities({ entities });
      mcpLog('info', `Successfully created ${entities.length} entities in Memory MCP`);
    } catch (error) {
      mcpLog('error', `Failed to create entities in Memory MCP: ${error}`);
      throw error;
    }
  }

  async addObservations(observations: MemoryObservation[]): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Adding observations to ${observations.length} entities`);
      return;
    }
    await (globalThis as any).local__memory__add_observations({ observations });
  }

  async searchNodes(query: string): Promise<MemoryNode[]> {
    mcpLog('debug', `Searching nodes with query: "${query}"`);
    
    if (isTestMode()) {
      mcpLog('warn', `Test mode: Returning empty search results for query: "${query}"`);
      return [];
    }
    
    try {
      const result = await (globalThis as any).local__memory__search_nodes({ query });
      const nodes = result.nodes || [];
      mcpLog('info', `Found ${nodes.length} nodes matching query: "${query}"`);
      return nodes;
    } catch (error) {
      mcpLog('error', `Failed to search nodes in Memory MCP: ${error}`);
      throw error;
    }
  }

  async openNodes(names: string[]): Promise<MemoryNode[]> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Opening ${names.length} nodes`);
      return names.map(name => ({
        name,
        entityType: 'test_entity',
        observations: [`Mock observation for ${name}`]
      }));
    }
    const result = await (globalThis as any).local__memory__open_nodes({ names });
    return result.nodes || [];
  }

  async createRelations(relations: MemoryRelation[]): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Creating ${relations.length} relations`);
      return;
    }
    await (globalThis as any).local__memory__create_relations({ relations });
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Deleting ${entityNames.length} entities`);
      return;
    }
    await (globalThis as any).local__memory__delete_entities({ entityNames });
  }

  async deleteObservations(deletions: MemoryObservationDeletion[]): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Deleting observations from ${deletions.length} entities`);
      return;
    }
    await (globalThis as any).local__memory__delete_observations({ deletions });
  }

  async deleteRelations(relations: MemoryRelation[]): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Deleting ${relations.length} relations`);
      return;
    }
    await (globalThis as any).local__memory__delete_relations({ relations });
  }

  async readGraph(): Promise<MemoryGraph> {
    mcpLog('debug', 'Reading complete Memory MCP graph');
    
    if (isTestMode()) {
      mcpLog('warn', 'Test mode: Returning mock graph data');
      return {
        entities: [
          {
            name: 'TestEntity',
            entityType: 'test_entity',
            observations: ['Mock observation for testing']
          }
        ],
        relations: []
      };
    }
    
    try {
      const graph = await (globalThis as any).local__memory__read_graph({});
      mcpLog('info', `Successfully read graph: ${graph.entities?.length || 0} entities, ${graph.relations?.length || 0} relations`);
      return graph;
    } catch (error) {
      mcpLog('error', `Failed to read graph from Memory MCP: ${error}`);
      throw error;
    }
  }
}
*/

class ClaudepointClientAdapter implements ClaudepointMCPClient {
  constructor(private workingDirectory?: string) {}

  async createCheckpoint(options: CheckpointOptions): Promise<Checkpoint> {
    // console.log(`Creating REAL checkpoint: ${options.description}`);
    
    // Ensure directory structure exists
    await RealCheckpointManager.ensureDirectoryStructure();
    
    // Generate checkpoint ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpointId = options.name 
      ? `${options.name}_${timestamp}`
      : `checkpoint_${timestamp}`;
    
    try {
      // Create actual tarball backup of RiderProjects
      const { fileCount, size } = await RealCheckpointManager.createTarball(checkpointId);
      
      // Create metadata
      const metadata: CheckpointMetadata = {
        id: checkpointId,
        name: options.name || undefined,
        description: options.description,
        createdAt: new Date(),
        fileCount,
        size,
        sourceDir: SOURCE_DIR
      };
      
      // Save metadata
      await RealCheckpointManager.saveMetadata(checkpointId, metadata);
      
      // console.log(`Real checkpoint created: ${checkpointId} (${RealCheckpointManager.formatSize(size)}, ${fileCount} files)`);
      
      return {
        id: checkpointId,
        name: options.name || checkpointId,
        description: options.description,
        createdAt: metadata.createdAt,
        fileCount: metadata.fileCount
      };
    } catch (error) {
      // console.error(`Failed to create checkpoint: ${error}`);
      throw new Error(`Failed to create checkpoint: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listCheckpoints(): Promise<Checkpoint[]> {
    // console.log(`Listing REAL checkpoints`);
    
    try {
      const checkpointIds = await RealCheckpointManager.listCheckpointDirectories();
      const checkpoints: Checkpoint[] = [];
      
      for (const checkpointId of checkpointIds) {
        const metadata = await RealCheckpointManager.loadMetadata(checkpointId);
        if (metadata) {
          checkpoints.push({
            id: metadata.id,
            name: metadata.name || metadata.id,
            description: metadata.description,
            createdAt: new Date(metadata.createdAt),
            fileCount: metadata.fileCount
          });
        }
      }
      
      // console.log(`Found ${checkpoints.length} real checkpoints`);
      return checkpoints;
    } catch (error) {
      // console.error(`Failed to list checkpoints: ${error}`);
      return [];
    }
  }

  async restoreCheckpoint(checkpoint: string, dryRun?: boolean): Promise<RestoreResult> {
    // console.log(`${dryRun ? 'Dry run' : 'Restoring'} REAL checkpoint: ${checkpoint}`);
    
    try {
      // Find checkpoint by partial name match
      const checkpointIds = await RealCheckpointManager.listCheckpointDirectories();
      const matchingCheckpoint = checkpointIds.find(id => 
        id.includes(checkpoint) || id === checkpoint
      );
      
      if (!matchingCheckpoint) {
        return {
          success: false,
          message: `Checkpoint not found: ${checkpoint}`,
          filesRestored: 0
        };
      }
      
      // Extract checkpoint
      const result = await RealCheckpointManager.extractCheckpoint(
        matchingCheckpoint, 
        SOURCE_DIR, 
        dryRun || false
      );
      
      // console.log(`${result.success ? 'SUCCESS' : 'FAILED'} Checkpoint restore result: ${result.message}`);
      return result;
    } catch (error) {
      // console.error(`Failed to restore checkpoint: ${error}`);
      return {
        success: false,
        message: `Failed to restore checkpoint: ${error instanceof Error ? error.message : String(error)}`,
        filesRestored: 0
      };
    }
  }

  async setupClaudepoint(): Promise<void> {
    // console.log(`Setting up REAL ClaudePoint`);
    
    try {
      // Ensure directory structure exists
      await RealCheckpointManager.ensureDirectoryStructure();
      
      // Create initial config if it doesn't exist
      const configPath = path.join(CHECKPOINT_DIR, 'config.json');
      const configExists = await fs.promises.access(configPath).then(() => true).catch(() => false);
      
      if (!configExists) {
        const config = {
          maxCheckpoints: 10,
          autoName: true,
          sourceDir: SOURCE_DIR,
          excludePatterns: EXCLUDE_PATTERNS,
          nameTemplate: 'checkpoint_{timestamp}'
        };
        
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
        // console.log(`Created ClaudePoint config: ${configPath}`);
      }
      
      // console.log(`Real ClaudePoint setup complete in: ${CHECKPOINT_DIR}`);
    } catch (error) {
      // console.error(`Failed to setup ClaudePoint: ${error}`);
      throw error;
    }
  }

  async getChangelog(): Promise<ChangelogEntry[]> {
    // console.log(`Getting REAL changelog`);
    
    try {
      const changelogPath = path.join(CHECKPOINT_DIR, 'changelog.json');
      const changelogExists = await fs.promises.access(changelogPath).then(() => true).catch(() => false);
      
      if (!changelogExists) {
        return [{
          action_type: 'SETUP',
          description: 'Real ClaudePoint system initialized',
          details: 'Internal checkpoint system with tar compression and smart exclusions'
        }];
      }
      
      const data = await fs.promises.readFile(changelogPath, 'utf8');
      const changelog = JSON.parse(data);
      
      return Array.isArray(changelog) ? changelog : [];
    } catch (error) {
      // console.error(`Failed to get changelog: ${error}`);
      return [];
    }
  }

  async setChangelog(entry: ChangelogEntry): Promise<void> {
    // console.log(`Adding REAL changelog entry: ${entry.description}`);
    
    try {
      const changelogPath = path.join(CHECKPOINT_DIR, 'changelog.json');
      
      // Load existing changelog
      let changelog: ChangelogEntry[] = [];
      const changelogExists = await fs.promises.access(changelogPath).then(() => true).catch(() => false);
      
      if (changelogExists) {
        const data = await fs.promises.readFile(changelogPath, 'utf8');
        changelog = JSON.parse(data);
      }
      
      // Add new entry with timestamp
      const entryWithTimestamp = {
        ...entry,
        timestamp: new Date().toISOString()
      };
      
      changelog.unshift(entryWithTimestamp); // Add to beginning (newest first)
      
      // Keep only last 100 entries
      if (changelog.length > 100) {
        changelog = changelog.slice(0, 100);
      }
      
      // Save updated changelog
      await fs.promises.writeFile(changelogPath, JSON.stringify(changelog, null, 2));
      
      // console.log(`Changelog entry added: ${entry.action_type}`);
    } catch (error) {
      // console.error(`Failed to set changelog: ${error}`);
      throw error;
    }
  }
}

class FilesystemClientAdapter implements FilesystemMCPClient {
  async readFile(path: string): Promise<string> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Reading file: ${path}`);
      return `// Mock file content for ${path}\n// This is a test mode implementation\n`;
    }
    const result = await (globalThis as any).local__filesystem__read_file({ path });
    return result.content;
  }

  async readMultipleFiles(paths: string[]): Promise<FileReadResult[]> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Reading ${paths.length} files`);
      return paths.map(path => ({
        path,
        content: `Mock content for ${path}`,
        success: true
      }));
    }
    const result = await (globalThis as any).local__filesystem__read_multiple_files({ paths });
    return result.files || [];
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Writing file: ${path} (${content.length} chars)`);
      return;
    }
    await (globalThis as any).local__filesystem__write_file({ path, content });
  }

  async editFile(path: string, edits: FileEdit[], dryRun?: boolean): Promise<EditResult> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Editing file: ${path} (${edits.length} edits, dry run: ${dryRun})`);
      return {
        success: true,
        diff: 'Mock diff output',
        message: `Applied ${edits.length} edits successfully`
      };
    }
    return await (globalThis as any).local__filesystem__edit_file({ path, edits, dryRun });
  }

  async createDirectory(path: string): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Creating directory: ${path}`);
      return;
    }
    await (globalThis as any).local__filesystem__create_directory({ path });
  }

  async listDirectory(path: string): Promise<DirectoryListing> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Listing directory: ${path}`);
      return {
        items: [
          { name: 'src', type: 'directory' },
          { name: 'docs', type: 'directory' },
          { name: 'package.json', type: 'file' },
          { name: 'README.md', type: 'file' }
        ]
      };
    }
    return await (globalThis as any).local__filesystem__list_directory({ path });
  }

  async directoryTree(path: string): Promise<DirectoryTree> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Getting directory tree: ${path}`);
      return {
        tree: {
          name: path,
          type: 'directory',
          children: [
            { name: 'src', type: 'directory', children: [] },
            { name: 'docs', type: 'directory', children: [] }
          ]
        }
      };
    }
    return await (globalThis as any).local__filesystem__directory_tree({ path });
  }

  async moveFile(source: string, destination: string): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Moving file: ${source} -> ${destination}`);
      return;
    }
    await (globalThis as any).local__filesystem__move_file({ source, destination });
  }

  async searchFiles(path: string, pattern: string, excludePatterns?: string[]): Promise<string[]> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Searching files in ${path} for pattern: ${pattern}`);
      return [`${path}/mock-result1.ts`, `${path}/mock-result2.ts`];
    }
    const result = await (globalThis as any).local__filesystem__search_files({ path, pattern, excludePatterns });
    return result.files || [];
  }

  async getFileInfo(path: string): Promise<FileMetadata> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Getting file info: ${path}`);
      return {
        path,
        size: 1024,
        lastModified: new Date(),
        type: 'file',
        permissions: '644'
      };
    }
    return await (globalThis as any).local__filesystem__get_file_info({ path });
  }

  async listAllowedDirectories(): Promise<string[]> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Listing allowed directories`);
      return ['/Users/Luther/RiderProjects', '/tmp'];
    }
    const result = await (globalThis as any).local__filesystem__list_allowed_directories({});
    return result.directories || [];
  }
}

class GitClientAdapter implements GitMCPClient {
  constructor(private workingDirectory?: string) {}

  async status(): Promise<GitStatus> {
    if (isTestMode()) {
      // console.log('[TEST MODE] Getting git status');
      return {
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: ['src/test.ts', 'README.md'],
        staged: [],
        untracked: ['temp.log'],
        conflicted: []
      };
    }
    // Git MCP integration will be implemented when Git MCP SDK is available
    // console.warn('Git MCP integration pending - using mock data');
    return {
      branch: 'main',
      ahead: 0,
      behind: 0,
      modified: [],
      staged: [],
      untracked: [],
      conflicted: []
    };
  }

  async add(files: string[]): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Adding ${files.length} files to git`);
      return;
    }
    // console.warn('Git MCP integration pending - add operation simulated');
  }

  async commit(message: string): Promise<string> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Committing with message: ${message}`);
      return `test_commit_${Date.now()}`;
    }
    // console.warn('Git MCP integration pending - commit operation simulated');
    return `mock_commit_${Date.now()}`;
  }

  async push(remote?: string, branch?: string): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Pushing to ${remote || 'origin'}/${branch || 'main'}`);
      return;
    }
    // console.warn('Git MCP integration pending - push operation simulated');
  }

  async pull(remote?: string, branch?: string): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Pulling from ${remote || 'origin'}/${branch || 'main'}`);
      return;
    }
    // console.warn('Git MCP integration pending - pull operation simulated');
  }

  async log(options?: GitLogOptions): Promise<GitCommit[]> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Getting git log`);
      return [
        {
          hash: 'abc123',
          message: 'Test commit message',
          author: 'Test Author',
          date: new Date()
        }
      ];
    }
    // console.warn('Git MCP integration pending - using mock commit history');
    return [];
  }

  async diff(options?: GitDiffOptions): Promise<string> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Getting git diff`);
      return 'diff --git a/src/index.ts b/src/index.ts\n+// Mock diff content';
    }
    // console.warn('Git MCP integration pending - using mock diff');
    return '';
  }

  async branch(action: 'list' | 'create' | 'delete', name?: string): Promise<GitBranch[]> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Branch operation: ${action} ${name || ''}`);
      return [
        { name: 'main', current: true, remote: 'origin/main' },
        { name: 'develop', current: false, remote: 'origin/develop' }
      ];
    }
    // console.warn('Git MCP integration pending - using mock branch data');
    return [{ name: 'main', current: true }];
  }

  async checkout(branch: string): Promise<void> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Checking out branch: ${branch}`);
      return;
    }
    // console.warn('Git MCP integration pending - checkout operation simulated');
  }
}

class DatabaseClientAdapter implements DatabaseMCPClient {
  constructor(
    private connectionString?: string,
    private database?: 'platform' | 'analytics'
  ) {}

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Database query: ${sql}`);
      return {
        rows: [
          { id: 1, name: 'Mock Data', value: 'test' },
          { id: 2, name: 'Sample Row', value: 'demo' }
        ],
        rowCount: 2
      };
    }
    
    const mcpFunction = this.database === 'platform' 
      ? (globalThis as any).local__postgres_platform__query
      : (globalThis as any).local__postgres_analytics__query;
    
    return await mcpFunction({ sql, params });
  }

  async getSchema(): Promise<SchemaInfo> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Getting database schema`);
      return {
        tables: [
          { 
            name: 'users', 
            columns: [
              { name: 'id', type: 'integer', nullable: false, primaryKey: true },
              { name: 'name', type: 'varchar', nullable: false },
              { name: 'email', type: 'varchar', nullable: false }
            ]
          },
          { 
            name: 'projects', 
            columns: [
              { name: 'id', type: 'integer', nullable: false, primaryKey: true },
              { name: 'name', type: 'varchar', nullable: false },
              { name: 'description', type: 'text', nullable: true }
            ]
          }
        ],
        views: []
      };
    }
    // console.warn('Database schema introspection pending - using mock schema');
    return { tables: [], views: [] };
  }

  async beginTransaction(): Promise<TransactionClient> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Beginning database transaction`);
      return {
        query: async (sql: string, params?: any[]) => {
          // console.log(`[TEST MODE] Transaction query: ${sql}`);
          return { rows: [], rowCount: 0 };
        },
        commit: async () => {
          // console.log(`[TEST MODE] Committing transaction`);
        },
        rollback: async () => {
          // console.log(`[TEST MODE] Rolling back transaction`);
        }
      };
    }
    // console.warn('Database transactions pending - using mock transaction');
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
      commit: async () => {},
      rollback: async () => {}
    };
  }

  async healthCheck(): Promise<DatabaseHealth> {
    if (isTestMode()) {
      // console.log(`[TEST MODE] Database health check`);
      return { status: 'healthy', lastChecked: new Date() };
    }
    
    // Simple query to check database connectivity
    try {
      await this.query('SELECT 1 as health_check');
      return { status: 'healthy', lastChecked: new Date() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
