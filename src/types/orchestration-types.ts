// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/types/orchestration-types.ts

/**
 * Core types for the MCP Conductor Architecture
 * Defines how our CC-MCP orchestrates all 5 existing MCPs
 */

import type { SessionRule } from './rule-types.js';
import type {
  MCPType,
  EventPriority,
  OrchestrationEventType,
  FileActivity,
  GitStatusSummary,
  DatabaseSessionInfo,
  CoordinationHealth,
  MCPHealth,
  ProjectSnapshot,
  FileChange,
  MemoryRelationship,
  SessionAnalytics,
  LearningPattern,
  EffectivenessMetrics,
  FileTreeNode
} from './shared-types.js';
import type {
  ProjectIntelligence,
  CacheCreationOptions,
  CacheValidationResult,
  CacheUpdateResult,
  ProjectChange,
  EnhancedHandoffPackage,
  IntelligenceOrchestrationEvent
} from './project-intelligence-types.js';

// ===== CORE ORCHESTRATION TYPES =====

export interface MCPOrchestrator {
  // Ecosystem monitoring
  monitorEcosystemState(): Promise<EcosystemState>;
  
  // Unified operations
  createUnifiedHandoffPackage(): Promise<UnifiedHandoffPackage>;
  reconstructUnifiedContext(handoffId: string): Promise<ReconstructedContext>;
  
  // Cross-MCP coordination
  syncStateAcrossMCPs(): Promise<SyncResult>;
  coordinateConversationCheckpoint(): Promise<CoordinatedCheckpoint>;
  
  // Real-time orchestration
  handleMCPEvent(event: MCPOrchestrationEvent): Promise<OrchestrationResponse>;
  
  // ===== PROJECT INTELLIGENCE CACHE =====
  // Eliminates session startup overhead through intelligent caching
  createProjectIntelligenceCache(projectName?: string, options?: CacheCreationOptions): Promise<ProjectIntelligence>;
  loadProjectIntelligenceCache(projectName: string): Promise<ProjectIntelligence | null>;
  validateProjectIntelligenceCache(projectName: string): Promise<CacheValidationResult>;
  refreshProjectIntelligence(projectName: string, changes?: ProjectChange[]): Promise<CacheUpdateResult>;
  invalidateProjectCache(projectName: string, reason: string): Promise<void>;
}

export interface EcosystemState {
  timestamp: Date;
  conversationTokens: number;
  memoryEntities: number;
  claudepointCheckpoints: string[];
  filesystemActivity: FileActivity[];
  gitStatus: GitStatusSummary;
  databaseSessions: DatabaseSessionInfo[];
  coordinationHealth: CoordinationHealth;
}

export interface UnifiedHandoffPackage {
  handoffId: string;
  createdAt: Date;
  
  // Cross-MCP coordination data
  memoryPackage: MemoryHandoffData;
  claudepointPackage: CheckpointHandoffData;
  filesystemPackage: FilesystemHandoffData;
  gitPackage: GitHandoffData;
  databasePackage: DatabaseHandoffData;
  
  // Orchestration metadata
  crossReferences: CrossMCPReference[];
  coordinationMap: CoordinationMapping;
  reconstructionInstructions: ReconstructionInstruction[];
}

// ===== MCP-SPECIFIC HANDOFF DATA =====

export interface MemoryHandoffData {
  compressedContextEntities: string[];
  sessionRuleEntities: string[];
  workingStateEntity: string;
  contextRelationships: MemoryRelationship[];
  semanticSummary: string;
}

export interface CheckpointHandoffData {
  checkpointId: string;
  description: string;
  workingDirectory: string;
  createdAt: Date;
  fileCount: number;
}

export interface FilesystemHandoffData {
  projectSnapshot: ProjectSnapshot;
  activeFiles: string[];
  recentChanges: FileChange[];
  projectStructureHash: string;
}

export interface GitHandoffData {
  currentBranch: string;
  commitHash: string;
  changesSummary: string;
  uncommittedChanges: number;
  branchAheadBehind: { ahead: number; behind: number };
}

export interface DatabaseHandoffData {
  sessionAnalytics: SessionAnalytics;
  learningPatterns: LearningPattern[];
  effectivenessMetrics: EffectivenessMetrics;
  queryLog: string[];
}

// ===== CROSS-MCP COORDINATION =====

export interface CrossMCPReference {
  sourceType: MCPType;
  sourceId: string;
  targetType: MCPType;
  targetId: string;
  relationshipType: 'synchronized_with' | 'linked_to' | 'derived_from' | 'triggers';
  metadata?: Record<string, any>;
}

export interface CoordinationMapping {
  primaryContext: MCPType; // Which MCP holds the primary context
  dependencies: MCPDependency[];
  syncPriority: MCPType[];
  conflictResolution: ConflictResolutionStrategy[];
}

export interface MCPDependency {
  mcp: MCPType;
  dependsOn: MCPType[];
  syncTriggers: SyncTrigger[];
  required: boolean;
}

// ===== ORCHESTRATION EVENTS =====

export interface MCPOrchestrationEvent {
  eventId: string;
  timestamp: Date;
  sourceType: MCPType;
  eventType: OrchestrationEventType;
  data: any;
  affectedMCPs: MCPType[];
  priority: EventPriority;
}

export interface OrchestrationResponse {
  actions: OrchestrationAction[];
  coordinationNeeded: boolean;
  mcpsToSync: MCPType[];
  nextCheckInterval?: number;
}

export interface OrchestrationAction {
  actionType: 'sync_state' | 'create_checkpoint' | 'update_memory' | 'enforce_rule' | 'compress_context';
  targetMCP: MCPType;
  parameters: Record<string, any>;
  executeAfter?: string[]; // Other action IDs to wait for
  timeout?: number;
}

// ===== MCP CLIENT CONFIGURATION =====

export interface MCPClientConfig {
  type: MCPType;
  connectionString?: string;
  workingDirectory?: string;
  options?: Record<string, any>;
}

// ===== RECONSTRUCTION AND SYNC =====

export interface SyncTrigger {
  eventType: OrchestrationEventType;
  conditions?: Record<string, any>;
  debounceMs?: number;
}

export interface ConflictResolutionStrategy {
  conflictType: string;
  resolution: 'prefer_memory' | 'prefer_filesystem' | 'prefer_git' | 'prefer_database' | 'manual_review';
  fallback?: 'prefer_memory' | 'prefer_filesystem' | 'prefer_git' | 'prefer_database';
}

export interface ReconstructionInstruction {
  step: number;
  description: string;
  targetMCP: MCPType;
  operation: string;
  parameters: Record<string, any>;
  dependencies?: number[]; // Other step numbers to complete first
}

export interface CoordinatedCheckpoint {
  checkpointId: string;
  coordinatedAt: Date;
  mcpCheckpoints: Record<MCPType, string>;
  crossReferences: CrossMCPReference[];
  description: string;
}

export interface SyncResult {
  success: boolean;
  mcpResults: Record<MCPType, MCPSyncResult>;
  conflicts: ConflictReport[];
  duration: number;
  nextSyncRecommended?: Date;
}

export interface MCPSyncResult {
  mcp: MCPType;
  success: boolean;
  operationsPerformed: string[];
  errorMessage?: string;
  responseTime: number;
}

export interface ConflictReport {
  conflictType: string;
  description: string;
  affectedMCPs: MCPType[];
  resolution: 'auto_resolved' | 'manual_required';
  resolutionDetails?: string;
}

export interface ReconstructedContext {
  contextId: string;
  reconstructedAt: Date;
  sourceHandoffId: string;
  
  // Reconstructed data from each MCP
  memoryContext: any;
  claudepointState: any;
  filesystemState: any;
  gitState: any;
  databaseState: any;
  
  // Reconstruction quality metrics
  completeness: number; // 0-1 scale
  accuracy: number; // 0-1 scale
  missingElements: string[];
  reconstructionTime: number;
}

// Re-export shared types for convenience
export type {
  MCPType,
  EventPriority,
  OrchestrationEventType,
  MCPHealth,
  CoordinationHealth,
  FileActivity,
  GitStatusSummary,
  DatabaseSessionInfo,
  ProjectSnapshot,
  FileTreeNode,
  FileChange,
  MemoryRelationship,
  SessionAnalytics,
  LearningPattern,
  EffectivenessMetrics
} from './shared-types.js';
