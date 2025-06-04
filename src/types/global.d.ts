// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/types/global.d.ts

/**
 * Global type declarations for MCP function access
 * Resolves the globalThis typing issues in client adapters
 */

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
  QueryResult
} from './shared-types.js';

declare global {
  namespace globalThis {
    // Memory MCP functions
    const local__memory__create_entities: (params: { entities: MemoryEntity[] }) => Promise<void>;
    const local__memory__add_observations: (params: { observations: MemoryObservation[] }) => Promise<void>;
    const local__memory__search_nodes: (params: { query: string }) => Promise<{ nodes: MemoryNode[] }>;
    const local__memory__open_nodes: (params: { names: string[] }) => Promise<{ nodes: MemoryNode[] }>;
    const local__memory__create_relations: (params: { relations: MemoryRelation[] }) => Promise<void>;
    const local__memory__delete_entities: (params: { entityNames: string[] }) => Promise<void>;
    const local__memory__delete_observations: (params: { deletions: MemoryObservationDeletion[] }) => Promise<void>;
    const local__memory__delete_relations: (params: { relations: MemoryRelation[] }) => Promise<void>;
    const local__memory__read_graph: (params: {}) => Promise<MemoryGraph>;

    // Claudepoint MCP functions
    const local__claudepoint__create_checkpoint: (params: CheckpointOptions) => Promise<Checkpoint>;
    const local__claudepoint__list_checkpoints: (params: {}) => Promise<{ checkpoints: Checkpoint[] }>;
    const local__claudepoint__restore_checkpoint: (params: { checkpoint: string; dry_run?: boolean }) => Promise<RestoreResult>;
    const local__claudepoint__setup_claudepoint: (params: {}) => Promise<void>;
    const local__claudepoint__get_changelog: (params: {}) => Promise<{ entries: ChangelogEntry[] }>;
    const local__claudepoint__set_changelog: (params: ChangelogEntry) => Promise<void>;

    // Filesystem MCP functions
    const local__filesystem__read_file: (params: { path: string }) => Promise<{ content: string }>;
    const local__filesystem__read_multiple_files: (params: { paths: string[] }) => Promise<{ files: FileReadResult[] }>;
    const local__filesystem__write_file: (params: { path: string; content: string }) => Promise<void>;
    const local__filesystem__edit_file: (params: { path: string; edits: FileEdit[]; dryRun?: boolean }) => Promise<EditResult>;
    const local__filesystem__create_directory: (params: { path: string }) => Promise<void>;
    const local__filesystem__list_directory: (params: { path: string }) => Promise<DirectoryListing>;
    const local__filesystem__directory_tree: (params: { path: string }) => Promise<DirectoryTree>;
    const local__filesystem__move_file: (params: { source: string; destination: string }) => Promise<void>;
    const local__filesystem__search_files: (params: { path: string; pattern: string; excludePatterns?: string[] }) => Promise<{ files: string[] }>;
    const local__filesystem__get_file_info: (params: { path: string }) => Promise<FileMetadata>;
    const local__filesystem__list_allowed_directories: (params: {}) => Promise<{ directories: string[] }>;

    // Database MCP functions
    const local__postgres_platform__query: (params: { sql: string; params?: any[] }) => Promise<QueryResult>;
    const local__postgres_analytics__query: (params: { sql: string; params?: any[] }) => Promise<QueryResult>;
  }
}

export {};
