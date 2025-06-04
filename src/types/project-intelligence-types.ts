// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/types/project-intelligence-types.ts

/**
 * Project Intelligence Cache Types
 * Revolutionary efficiency system - eliminates session startup overhead through intelligent caching
 */

import type { MCPType } from './shared-types.js';

// ===== CORE PROJECT INTELLIGENCE =====

export interface ProjectIntelligence {
  // Core identification
  projectName: string;
  projectPath: string;
  createdAt: Date;
  lastUpdated: Date;
  cacheVersion: string;

  // Intelligence components
  structure: ProjectStructure;
  architecture: ArchitectureState;
  development: DevelopmentState;
  context: ProjectContext;

  // Cache management
  invalidationTriggers: InvalidationTrigger[];
  freshness: FreshnessAssessment;
  metadata: ProjectMetadata;
}

// ===== PROJECT STRUCTURE INTELLIGENCE =====

export interface ProjectStructure {
  summary: string;
  keyDirectories: DirectoryInfo[];
  criticalFiles: FileInfo[];
  componentMap: ComponentInfo[];
  dependencyGraph: DependencyNode[];
  totalFiles: number;
  totalSize: number;
}

export interface DirectoryInfo {
  path: string;
  purpose: string;
  importance: 'critical' | 'important' | 'supporting' | 'optional';
  fileCount: number;
  keyContents: string[];
}

export interface FileInfo {
  path: string;
  purpose: string;
  importance: 'critical' | 'important' | 'supporting' | 'optional';
  lastModified: Date;
  size: number;
  dependencies: string[];
  exports?: string[];
  fileType?: 'typescript' | 'javascript' | 'json' | 'markdown' | 'other';
}

export interface ComponentInfo {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'constant' | 'module';
  filePath: string;
  purpose: string;
  dependencies: string[];
  usedBy: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface DependencyNode {
  name: string;
  version?: string;
  type: 'runtime' | 'dev' | 'peer' | 'optional';
  purpose: string;
  critical: boolean;
}

// ===== ARCHITECTURE STATE INTELLIGENCE =====

export interface ArchitectureState {
  currentPhase: string;
  implementedComponents: ImplementedComponent[];
  pendingComponents: PendingComponent[];
  technicalStack: TechnicalStack;
  designPatterns: DesignPattern[];
  integrationPoints: IntegrationPoint[];
}

export interface ImplementedComponent {
  name: string;
  type: 'service' | 'client' | 'handler' | 'utility' | 'types' | 'config';
  status: 'complete' | 'partial' | 'refactoring';
  filePaths: string[];
  dependencies: string[];
  testCoverage?: number;
}

export interface PendingComponent {
  name: string;
  type: 'service' | 'client' | 'handler' | 'utility' | 'types' | 'config';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort: 'small' | 'medium' | 'large' | 'epic';
  blockedBy: string[];
  designNotes?: string;
}

export interface TechnicalStack {
  language: string;
  runtime: string;
  frameworks: string[];
  libraries: string[];
  tools: string[];
  protocols: string[];
}

export interface DesignPattern {
  pattern: string;
  implementation: string;
  rationale: string;
  benefits: string[];
  tradeoffs: string[];
}

export interface IntegrationPoint {
  name: string;
  type: 'mcp_client' | 'api' | 'database' | 'filesystem' | 'external_service';
  status: 'active' | 'configured' | 'planned' | 'deprecated';
  configuration: Record<string, any>;
  healthCheck?: string;
}

// ===== DEVELOPMENT STATE INTELLIGENCE =====

export interface DevelopmentState {
  recentFocus: string;
  activeWorkAreas: string[];
  nextLogicalSteps: LogicalStep[];
  blockers: Blocker[];
  decisions: Decision[];
  momentum: DevelopmentMomentum;
}

export interface LogicalStep {
  step: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'trivial' | 'small' | 'medium' | 'large' | 'epic';
  dependencies: string[];
  rationale: string;
  estimatedTime?: string;
}

export interface Blocker {
  issue: string;
  type: 'technical' | 'design' | 'dependency' | 'resource' | 'decision';
  severity: 'critical' | 'high' | 'medium' | 'low';
  blockedSince: Date;
  potentialSolutions: string[];
}

export interface Decision {
  decision: string;
  madeAt: Date;
  rationale: string;
  alternatives: string[];
  impact: 'architecture' | 'implementation' | 'performance' | 'maintenance';
  confidence: 'high' | 'medium' | 'low';
}

export interface DevelopmentMomentum {
  velocity: 'very_high' | 'high' | 'steady' | 'slow' | 'stagnant';
  focus_areas: string[];
  recent_completions: string[];
  upcoming_milestones: string[];
}

// ===== PROJECT CONTEXT INTELLIGENCE =====

export interface ProjectContext {
  purpose: string;
  goals: Goal[];
  constraints: Constraint[];
  stakeholders: string[];
  timeline: ProjectTimeline;
  success_metrics: SuccessMetric[];
}

export interface Goal {
  description: string;
  type: 'functional' | 'performance' | 'usability' | 'reliability' | 'innovation';
  priority: 'must_have' | 'should_have' | 'could_have' | 'nice_to_have';
  status: 'planning' | 'in_progress' | 'completed' | 'deferred';
  measurable: boolean;
}

export interface Constraint {
  constraint: string;
  type: 'technical' | 'business' | 'time' | 'resource' | 'regulatory';
  severity: 'hard' | 'soft' | 'preference';
  workarounds: string[];
}

export interface ProjectTimeline {
  started: Date;
  major_milestones: Milestone[];
  current_phase: string;
  estimated_completion?: Date;
}

export interface Milestone {
  name: string;
  description: string;
  targetDate: Date;
  status: 'upcoming' | 'in_progress' | 'completed' | 'delayed';
  deliverables: string[];
}

export interface SuccessMetric {
  metric: string;
  type: 'performance' | 'quality' | 'adoption' | 'efficiency' | 'innovation';
  target: string;
  measurement_method: string;
  current_value?: string;
}

// ===== CACHE MANAGEMENT TYPES =====

export interface CacheCreationOptions {
  includeFileContents?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  includeGitInfo?: boolean;
  includeDependencies?: boolean;
  compressionLevel?: 'minimal' | 'standard' | 'comprehensive';
  customAnalyzers?: string[];
}

export interface CacheValidationResult {
  valid: boolean;
  confidence: number;
  staleness_reasons: string[];
  recommended_action: 'use' | 'refresh' | 'recreate' | 'invalidate';
  partial_updates_available: string[];
}

export interface CacheUpdateResult {
  success: boolean;
  updated_sections: string[];
  invalidated_sections: string[];
  new_cache_version: string;
  update_duration: number;
  confidence_improvement: number;
}

export interface ProjectChange {
  type: 'file_added' | 'file_modified' | 'file_deleted' | 'config_changed' | 'dependency_changed';
  path: string;
  magnitude: 'minor' | 'moderate' | 'major' | 'breaking';
  description: string;
  timestamp: Date;
  affects_cache: boolean;
}

export interface InvalidationTrigger {
  trigger: string;
  type: 'file_pattern' | 'directory_pattern' | 'dependency_change' | 'config_change' | 'time_based';
  pattern: string;
  importance: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface FreshnessAssessment {
  status: 'fresh' | 'stale' | 'expired' | 'unknown';
  confidence: number;
  lastValidation: Date;
  staleness_indicators: string[];
  freshness_score: number; // 0-1 scale
}

export interface ProjectMetadata {
  contributors: string[];
  creation_date: Date;
  technologies: string[];
  complexity_score: number; // 0-1 scale
  maturity_level: 'prototype' | 'development' | 'testing' | 'production' | 'maintenance';
  documentation_coverage: number; // 0-1 scale
}

// ===== ENHANCED HANDOFF INTEGRATION =====

export interface EnhancedHandoffPackage {
  handoffId: string;
  projectIntelligence: ProjectIntelligence;
  intelligenceVersion: string;
  compressionRatio: number;
  reconstructionInstructions: IntelligenceReconstructionStep[];
}

export interface IntelligenceReconstructionStep {
  step: number;
  operation: 'load_cache' | 'validate_freshness' | 'partial_refresh' | 'apply_changes';
  parameters: Record<string, any>;
  fallback_operation?: string;
}

// ===== MCP INTEGRATION TYPES =====

export interface IntelligenceOrchestrationEvent {
  eventId: string;
  timestamp: Date;
  projectName: string;
  eventType: 'cache_created' | 'cache_loaded' | 'cache_invalidated' | 'cache_refreshed' | 'validation_failed';
  intelligence_version: string;
  affected_sections: string[];
  mcps_involved: MCPType[];
}

export interface ProjectIntelligenceEntity {
  name: string;
  entityType: 'project_intelligence';
  observations: string[];
}

// ===== INTELLIGENCE ANALYSIS TYPES =====

export interface IntelligenceAnalysis {
  structural_health: number; // 0-1 scale
  architectural_consistency: number; // 0-1 scale
  development_momentum: number; // 0-1 scale
  complexity_assessment: ComplexityAssessment;
  risk_factors: RiskFactor[];
  optimization_opportunities: OptimizationOpportunity[];
}

export interface ComplexityAssessment {
  overall_score: number; // 0-1 scale
  structural_complexity: number;
  logical_complexity: number;
  dependency_complexity: number;
  maintenance_burden: number;
}

export interface RiskFactor {
  risk: string;
  category: 'technical_debt' | 'dependency' | 'performance' | 'security' | 'maintainability';
  severity: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'very_likely' | 'likely' | 'possible' | 'unlikely';
  mitigation_strategies: string[];
}

export interface OptimizationOpportunity {
  opportunity: string;
  type: 'performance' | 'architecture' | 'workflow' | 'maintainability' | 'efficiency';
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  priority_score: number; // impact/effort ratio
}

// ===== EXPORT CONVENIENCE TYPES =====

export type IntelligenceSection = 'structure' | 'architecture' | 'development' | 'context';
export type CacheOperationType = 'create' | 'load' | 'validate' | 'refresh' | 'invalidate';
export type IntelligenceConfidence = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
