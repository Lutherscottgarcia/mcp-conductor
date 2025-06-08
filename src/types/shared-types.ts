// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/types/shared-types.ts

/**
 * Shared type definitions used across multiple modules
 * Prevents circular dependencies and type duplication
 */

// ===== MEMORY MCP TYPES =====

export interface MemoryEntity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface MemoryObservation {
  entityName: string;
  contents: string[];
}

export interface MemoryNode {
  name: string;
  entityType: string;
  observations: string[];
}

export interface MemoryRelation {
  from: string;
  to: string;
  relationType: string;
}

export interface MemoryObservationDeletion {
  entityName: string;
  observations: string[];
}

export interface MemoryGraph {
  entities: MemoryNode[];
  relations: MemoryRelation[];
}

export interface MemoryRelationship {
  from: string;
  to: string;
  relationType: string;
  strength?: number;
  metadata?: Record<string, any>;
}

// ===== CLAUDEPOINT MCP TYPES =====

export interface CheckpointOptions {
  name?: string;
  description: string;
}

export interface Checkpoint {
  id: string;
  name?: string;
  description: string;
  createdAt: Date;
  fileCount?: number;
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  filesRestored?: number;
}

export interface ChangelogEntry {
  action_type?: string;
  description: string;
  details?: string;
}

// ===== FILESYSTEM MCP TYPES =====

export interface FileEdit {
  oldText: string;
  newText: string;
}

export interface EditResult {
  success: boolean;
  diff?: string;
  message?: string;
}

export interface FileReadResult {
  path: string;
  content: string;
  error?: string;
}

export interface DirectoryListing {
  items: DirectoryItem[];
}

export interface DirectoryItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
}

export interface DirectoryTree {
  tree: any; // Structure depends on filesystem MCP implementation
}

export interface FileMetadata {
  path: string;
  size: number;
  type: 'file' | 'directory';
  lastModified: Date;
  permissions?: string;
}

export interface FileActivity {
  path: string;
  action: 'created' | 'modified' | 'deleted' | 'moved';
  timestamp: Date;
  size?: number;
}

export interface FileChange {
  path: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  timestamp: Date;
  oldPath?: string; // for renames
  linesAdded?: number;
  linesRemoved?: number;
}

export interface FileSnapshot {
  path: string;
  content: string;
  lastModified: Date;
  size: number;
}

export interface ProjectSnapshot {
  rootPath: string;
  fileCount: number;
  directoryCount: number;
  totalSize: number;
  lastModified: Date;
  fileTree: FileTreeNode[];
}

export interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified?: Date;
  children?: FileTreeNode[];
}

// ===== DATABASE MCP TYPES =====

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields?: any[];
}

export interface SchemaInfo {
  tables: TableInfo[];
  views?: ViewInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ViewInfo {
  name: string;
  definition: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
}

export interface TransactionClient {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  lastChecked: Date;
  errorMessage?: string;
}

export interface DatabaseSessionInfo {
  database: 'platform' | 'analytics';
  activeQueries: number;
  lastActivity: Date;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

// ===== GIT MCP TYPES =====

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  conflicted: string[];
}

export interface GitStatusSummary {
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
  conflicted: number;
}

export interface GitLogOptions {
  maxCount?: number;
  since?: Date;
  author?: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface GitDiffOptions {
  staged?: boolean;
  file?: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
}

// ===== SHARED ENUMS AND CONSTANTS =====

export type MCPType = 'memory' | 'claudepoint' | 'filesystem' | 'git' | 'database-platform' | 'database-analytics';

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export type OrchestrationEventType = 
  | 'file_changed'
  | 'git_commit'
  | 'memory_entity_created'
  | 'checkpoint_created'
  | 'rule_violated'
  | 'context_threshold_reached'
  | 'decision_made'
  | 'database_query_executed';

// ===== ANALYTICS AND SESSION TYPES =====

export interface SessionAnalytics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  tokenCount: number;
  decisionsCount: number;
  filesModified: number;
  rulesEnforced: number;
  mcpOperations: Record<MCPType, number>;
}

export interface LearningPattern {
  patternId: string;
  patternType: 'workflow' | 'context_usage' | 'rule_violation' | 'mcp_coordination';
  description: string;
  frequency: number;
  effectiveness: number;
  mcpsInvolved: MCPType[];
  suggestedOptimization?: string;
}

export interface EffectivenessMetrics {
  contextReconstructionAccuracy: number;
  handoffSuccessRate: number;
  ruleComplianceRate: number;
  mcpCoordinationLatency: number;
  userSatisfactionScore?: number;
}

// ===== HEALTH AND MONITORING TYPES =====

export interface MCPHealth {
  status: 'online' | 'offline' | 'error' | 'not_configured';
  responseTime?: number;
  lastChecked: Date;
  errorMessage?: string;
}

export interface CoordinationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  mcpStatuses: Record<MCPType, MCPHealth>;
  lastFullSync: Date;
  averageResponseTime: number;
  errorCount: number;
}
