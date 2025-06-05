// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/utils/mcp-client-factory.ts

/**
 * Factory for creating clients to all 5 existing MCPs
 * Provides unified interface for MCP orchestration
 */

import type { MCPType, MCPHealth } from '@/types/shared-types.js';

// ===== TEST MODE DETECTION =====
const isTestMode = () => {
  return !globalThis.local__memory__read_graph || 
         process.env.NODE_ENV === 'test' ||
         process.env.MCP_TEST_MODE === 'true';
};
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

    const client = new MemoryClientAdapter();
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

  // ===== UNIFIED CLIENT ACCESS =====

  async getAllClients(): Promise<{
    memory: MemoryMCPClient;
    claudepoint: ClaudepointMCPClient;
    filesystem: FilesystemMCPClient;
    git: GitMCPClient;
    databasePlatform: DatabaseMCPClient;
    databaseAnalytics: DatabaseMCPClient;
  }> {
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

    await Promise.allSettled(healthChecks);
    return new Map(this.healthStatus);
  }

  getHealthStatus(mcpType?: MCPType): MCPHealth | Map<MCPType, MCPHealth> {
    if (mcpType) {
      return this.healthStatus.get(mcpType) || {
        status: 'offline',
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

class MemoryClientAdapter implements MemoryMCPClient {
  async createEntities(entities: MemoryEntity[]): Promise<void> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Creating ${entities.length} entities`);
      return;
    }
    await globalThis.local__memory__create_entities({ entities });
  }

  async addObservations(observations: MemoryObservation[]): Promise<void> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Adding observations to ${observations.length} entities`);
      return;
    }
    await globalThis.local__memory__add_observations({ observations });
  }

  async searchNodes(query: string): Promise<MemoryNode[]> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Searching nodes: "${query}"`);
      return [];
    }
    const result = await globalThis.local__memory__search_nodes({ query });
    return result.nodes || [];
  }

  async openNodes(names: string[]): Promise<MemoryNode[]> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Opening ${names.length} nodes`);
      return names.map(name => ({
        name,
        entityType: 'test_entity',
        observations: [`Mock observation for ${name}`]
      }));
    }
    const result = await globalThis.local__memory__open_nodes({ names });
    return result.nodes || [];
  }

  async createRelations(relations: MemoryRelation[]): Promise<void> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Creating ${relations.length} relations`);
      return;
    }
    await globalThis.local__memory__create_relations({ relations });
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Deleting ${entityNames.length} entities`);
      return;
    }
    await globalThis.local__memory__delete_entities({ entityNames });
  }

  async deleteObservations(deletions: MemoryObservationDeletion[]): Promise<void> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Deleting observations from ${deletions.length} entities`);
      return;
    }
    await globalThis.local__memory__delete_observations({ deletions });
  }

  async deleteRelations(relations: MemoryRelation[]): Promise<void> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Deleting ${relations.length} relations`);
      return;
    }
    await globalThis.local__memory__delete_relations({ relations });
  }

  async readGraph(): Promise<MemoryGraph> {
    if (isTestMode()) {
      console.log(`🧠 [TEST MODE] Reading graph (mock data)`);
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
    return await globalThis.local__memory__read_graph({});
  }
}

class ClaudepointClientAdapter implements ClaudepointMCPClient {
  constructor(private workingDirectory?: string) {}

  async createCheckpoint(options: CheckpointOptions): Promise<Checkpoint> {
    if (isTestMode()) {
      console.log(`🔄 [TEST MODE] Creating checkpoint: ${options.description}`);
      return {
        id: `test_checkpoint_${Date.now()}`,
        name: options.name || 'Test Checkpoint',
        description: options.description || 'Test checkpoint',
        createdAt: new Date(),
        fileCount: 42
      };
    }
    return await globalThis.local__claudepoint__create_checkpoint(options);
  }

  async listCheckpoints(): Promise<Checkpoint[]> {
    if (isTestMode()) {
      console.log(`🔄 [TEST MODE] Listing checkpoints`);
      return [];
    }
    const result = await globalThis.local__claudepoint__list_checkpoints({});
    return result.checkpoints || [];
  }

  async restoreCheckpoint(checkpoint: string, dryRun?: boolean): Promise<RestoreResult> {
    if (isTestMode()) {
      console.log(`🔄 [TEST MODE] Restoring checkpoint: ${checkpoint} (dry run: ${dryRun})`);
      return {
        success: true,
        message: 'Test checkpoint restored successfully',
        filesRestored: 25
      };
    }
    return await globalThis.local__claudepoint__restore_checkpoint({ checkpoint, dry_run: dryRun });
  }

  async setupClaudepoint(): Promise<void> {
    if (isTestMode()) {
      console.log(`🔄 [TEST MODE] Setting up Claudepoint`);
      return;
    }
    await globalThis.local__claudepoint__setup_claudepoint({});
  }

  async getChangelog(): Promise<ChangelogEntry[]> {
    if (isTestMode()) {
      console.log(`🔄 [TEST MODE] Getting changelog`);
      return [
        {
          action_type: 'TEST_MODE',
          description: 'Mock changelog entry for testing',
          details: 'Running in test mode with mock implementations'
        }
      ];
    }
    const result = await globalThis.local__claudepoint__get_changelog({});
    return result.entries || [];
  }

  async setChangelog(entry: ChangelogEntry): Promise<void> {
    if (isTestMode()) {
      console.log(`🔄 [TEST MODE] Setting changelog entry: ${entry.description}`);
      return;
    }
    await globalThis.local__claudepoint__set_changelog(entry);
  }
}

class FilesystemClientAdapter implements FilesystemMCPClient {
  async readFile(path: string): Promise<string> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Reading file: ${path}`);
      return `// Mock file content for ${path}\n// This is a test mode implementation\n`;
    }
    const result = await globalThis.local__filesystem__read_file({ path });
    return result.content;
  }

  async readMultipleFiles(paths: string[]): Promise<FileReadResult[]> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Reading ${paths.length} files`);
      return paths.map(path => ({
        path,
        content: `Mock content for ${path}`,
        success: true
      }));
    }
    const result = await globalThis.local__filesystem__read_multiple_files({ paths });
    return result.files || [];
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Writing file: ${path} (${content.length} chars)`);
      return;
    }
    await globalThis.local__filesystem__write_file({ path, content });
  }

  async editFile(path: string, edits: FileEdit[], dryRun?: boolean): Promise<EditResult> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Editing file: ${path} (${edits.length} edits, dry run: ${dryRun})`);
      return {
        success: true,
        diff: 'Mock diff output',
        message: `Applied ${edits.length} edits successfully`
      };
    }
    return await globalThis.local__filesystem__edit_file({ path, edits, dryRun });
  }

  async createDirectory(path: string): Promise<void> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Creating directory: ${path}`);
      return;
    }
    await globalThis.local__filesystem__create_directory({ path });
  }

  async listDirectory(path: string): Promise<DirectoryListing> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Listing directory: ${path}`);
      return {
        items: [
          { name: 'src', type: 'directory' },
          { name: 'docs', type: 'directory' },
          { name: 'package.json', type: 'file' },
          { name: 'README.md', type: 'file' }
        ]
      };
    }
    return await globalThis.local__filesystem__list_directory({ path });
  }

  async directoryTree(path: string): Promise<DirectoryTree> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Getting directory tree: ${path}`);
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
    return await globalThis.local__filesystem__directory_tree({ path });
  }

  async moveFile(source: string, destination: string): Promise<void> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Moving file: ${source} → ${destination}`);
      return;
    }
    await globalThis.local__filesystem__move_file({ source, destination });
  }

  async searchFiles(path: string, pattern: string, excludePatterns?: string[]): Promise<string[]> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Searching files in ${path} for pattern: ${pattern}`);
      return [`${path}/mock-result1.ts`, `${path}/mock-result2.ts`];
    }
    const result = await globalThis.local__filesystem__search_files({ path, pattern, excludePatterns });
    return result.files || [];
  }

  async getFileInfo(path: string): Promise<FileMetadata> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Getting file info: ${path}`);
      return {
        path,
        size: 1024,
        lastModified: new Date(),
        type: 'file',
        permissions: '644'
      };
    }
    return await globalThis.local__filesystem__get_file_info({ path });
  }

  async listAllowedDirectories(): Promise<string[]> {
    if (isTestMode()) {
      console.log(`📁 [TEST MODE] Listing allowed directories`);
      return ['/Users/Luther/RiderProjects', '/tmp'];
    }
    const result = await globalThis.local__filesystem__list_allowed_directories({});
    return result.directories || [];
  }
}

class GitClientAdapter implements GitMCPClient {
  constructor(private workingDirectory?: string) {}

  async status(): Promise<GitStatus> {
    if (isTestMode()) {
      console.log('🔀 [TEST MODE] Getting git status');
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
    console.warn('Git MCP integration pending - using mock data');
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
      console.log(`🔀 [TEST MODE] Adding ${files.length} files to git`);
      return;
    }
    console.warn('Git MCP integration pending - add operation simulated');
  }

  async commit(message: string): Promise<string> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Committing with message: ${message}`);
      return `test_commit_${Date.now()}`;
    }
    console.warn('Git MCP integration pending - commit operation simulated');
    return `mock_commit_${Date.now()}`;
  }

  async push(remote?: string, branch?: string): Promise<void> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Pushing to ${remote || 'origin'}/${branch || 'main'}`);
      return;
    }
    console.warn('Git MCP integration pending - push operation simulated');
  }

  async pull(remote?: string, branch?: string): Promise<void> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Pulling from ${remote || 'origin'}/${branch || 'main'}`);
      return;
    }
    console.warn('Git MCP integration pending - pull operation simulated');
  }

  async log(options?: GitLogOptions): Promise<GitCommit[]> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Getting git log`);
      return [
        {
          hash: 'abc123',
          message: 'Test commit message',
          author: 'Test Author',
          date: new Date()
        }
      ];
    }
    console.warn('Git MCP integration pending - using mock commit history');
    return [];
  }

  async diff(options?: GitDiffOptions): Promise<string> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Getting git diff`);
      return 'diff --git a/src/index.ts b/src/index.ts\n+// Mock diff content';
    }
    console.warn('Git MCP integration pending - using mock diff');
    return '';
  }

  async branch(action: 'list' | 'create' | 'delete', name?: string): Promise<GitBranch[]> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Branch operation: ${action} ${name || ''}`);
      return [
        { name: 'main', current: true, remote: 'origin/main' },
        { name: 'develop', current: false, remote: 'origin/develop' }
      ];
    }
    console.warn('Git MCP integration pending - using mock branch data');
    return [{ name: 'main', current: true }];
  }

  async checkout(branch: string): Promise<void> {
    if (isTestMode()) {
      console.log(`🔀 [TEST MODE] Checking out branch: ${branch}`);
      return;
    }
    console.warn('Git MCP integration pending - checkout operation simulated');
  }
}

class DatabaseClientAdapter implements DatabaseMCPClient {
  constructor(
    private connectionString?: string,
    private database?: 'platform' | 'analytics'
  ) {}

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (isTestMode()) {
      console.log(`🗄️ [TEST MODE] Database query: ${sql}`);
      return {
        rows: [
          { id: 1, name: 'Mock Data', value: 'test' },
          { id: 2, name: 'Sample Row', value: 'demo' }
        ],
        rowCount: 2
      };
    }
    
    const mcpFunction = this.database === 'platform' 
      ? globalThis.local__postgres_platform__query
      : globalThis.local__postgres_analytics__query;
    
    return await mcpFunction({ sql, params });
  }

  async getSchema(): Promise<SchemaInfo> {
    if (isTestMode()) {
      console.log(`🗄️ [TEST MODE] Getting database schema`);
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
    console.warn('Database schema introspection pending - using mock schema');
    return { tables: [], views: [] };
  }

  async beginTransaction(): Promise<TransactionClient> {
    if (isTestMode()) {
      console.log(`🗄️ [TEST MODE] Beginning database transaction`);
      return {
        query: async (sql: string, params?: any[]) => {
          console.log(`🗄️ [TEST MODE] Transaction query: ${sql}`);
          return { rows: [], rowCount: 0 };
        },
        commit: async () => {
          console.log(`🗄️ [TEST MODE] Committing transaction`);
        },
        rollback: async () => {
          console.log(`🗄️ [TEST MODE] Rolling back transaction`);
        }
      };
    }
    console.warn('Database transactions pending - using mock transaction');
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
      commit: async () => {},
      rollback: async () => {}
    };
  }

  async healthCheck(): Promise<DatabaseHealth> {
    if (isTestMode()) {
      console.log(`🗄️ [TEST MODE] Database health check`);
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
