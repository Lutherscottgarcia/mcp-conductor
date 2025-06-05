// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/types/rule-types.ts

/**
 * Session Rules type definitions for persistent user preferences
 * Rules are stored in Memory MCP as entities and enforced by CC-MCP
 */

import type { MCPType } from './shared-types.js';

export interface SessionRule {
  id: string;
  rule: string;
  type: SessionRuleType;
  priority: number;
  active: boolean;
  scope: RuleScope;
  enforcement: EnforcementLevel;
  triggers?: string[];
  conditions?: RuleCondition[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  violationCount: number;
  effectiveness?: number; // 0-1 scale based on user satisfaction
}

export type SessionRuleType = 
  | 'approval'      // Requires user confirmation
  | 'display'       // Controls how information is shown
  | 'architecture'  // Enforces design patterns
  | 'workflow'      // Controls process flow
  | 'quality'       // Enforces quality standards
  | 'documentation' // Documentation requirements
  | 'conditional';  // Context-dependent rules

export type RuleScope = 
  | 'user'          // Applies to all user sessions
  | 'project'       // Applies to specific project
  | 'session';      // Applies to current session only

export type EnforcementLevel = 
  | 'hard_block'    // Prevents action completely
  | 'soft_block'    // Warns and waits for confirmation
  | 'reminder'      // Shows reminder but allows action
  | 'suggestion'    // Passive suggestion only
  | 'log_only';     // Just logs violation for learning

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than';
  value: any;
  caseSensitive?: boolean;
}

export interface RuleEnforcementResult {
  ruleId: string;
  action: string;
  result: EnforcementOutcome;
  message?: string;
  userPrompt?: string;
  suggestedActions?: string[];
  enforcementTime: Date;
}

export type EnforcementOutcome = 
  | 'allowed'       // Action permitted
  | 'blocked'       // Action prevented
  | 'warned'        // Warning shown, action pending
  | 'modified'      // Action modified to comply
  | 'user_override'; // User chose to override rule

export interface RuleSuggestion {
  suggestedRule: Partial<SessionRule>;
  reason: string;
  basedOnPattern: string;
  confidence: number; // 0-1 scale
  exampleViolations: string[];
}

export interface RuleViolation {
  id: string;
  ruleId: string;
  sessionId: string;
  action: string;
  violationType: 'ignored' | 'bypassed' | 'failed_condition';
  userResponse: 'complied' | 'overrode' | 'modified_rule' | 'disabled_rule';
  context: Record<string, any>;
  timestamp: Date;
}

export interface RuleValidationResult {
  valid: boolean;
  conflicts: RuleConflict[];
  suggestions: RuleOptimization[];
  estimatedEffectiveness: number;
}

export interface RuleConflict {
  conflictType: 'contradictory' | 'redundant' | 'impossible';
  description: string;
  conflictingRuleIds: string[];
  suggestedResolution: string;
}

export interface RuleOptimization {
  optimizationType: 'merge_similar' | 'adjust_priority' | 'refine_conditions' | 'change_enforcement';
  description: string;
  expectedImprovement: string;
  affectedRuleIds: string[];
}

// ===== MEMORY MCP INTEGRATION FOR RULES =====

export interface SessionRuleEntity {
  name: string; // Format: "SessionRule_{ruleId}"
  entityType: 'session_rule';
  observations: [
    string, // rule text
    string, // rule type
    string, // priority level
    string, // enforcement level
    string, // active status
    string, // scope
    string, // triggers (comma-separated)
    string, // usage statistics
    string  // effectiveness metrics
  ];
}

export interface RuleEnforcementEntity {
  name: string; // Format: "RuleEnforcement_{timestamp}"
  entityType: 'rule_enforcement';
  observations: [
    string, // rule ID that was enforced
    string, // action that was attempted
    string, // enforcement result
    string, // user response
    string, // context data
    string  // timestamp
  ];
}

// ===== LUTHER'S CURRENT SESSION RULES =====

export const LUTHER_SESSION_RULES: Partial<SessionRule>[] = [
  {
    id: 'approval_required',
    rule: 'Always check with me and wait until I\'m ready before thundering off wielding the powers of creation in my filesystem all willy nilly',
    type: 'approval',
    priority: 1,
    scope: 'user',
    enforcement: 'hard_block',
    triggers: ['artifact_create', 'file_modify', 'git_commit', 'major_change']
  },
  {
    id: 'artifact_display',
    rule: 'Always display completed work in the right hand artifact panel for review',
    type: 'display',
    priority: 2,
    scope: 'user',
    enforcement: 'reminder',
    triggers: ['code_completion', 'design_completion', 'document_creation']
  },
  {
    id: 'architecture_check',
    rule: 'Before designing and implementing new changes always remember the current architecture and look for artifacts to leverage or enhance, inventing new artifacts when that is the best solution',
    type: 'architecture',
    priority: 3,
    scope: 'user',
    enforcement: 'soft_block',
    triggers: ['new_feature', 'major_refactor', 'component_creation']
  },
  {
    id: 'file_paths',
    rule: 'Always add the complete path/filename on top of each artifact',
    type: 'documentation',
    priority: 4,
    scope: 'user',
    enforcement: 'reminder',
    triggers: ['artifact_creation', 'file_creation']
  },
  {
    id: 'documentation_first',
    rule: 'Always update design or relevant other documentation before major implementation changes',
    type: 'documentation',
    priority: 5,
    scope: 'user',
    enforcement: 'soft_block',
    triggers: ['major_implementation', 'architecture_change', 'new_component']
  }
];

// ===== RULE ENGINE INTERFACES =====

export interface RuleEngine {
  // Core rule management
  createRule(rule: Partial<SessionRule>): Promise<SessionRule>;
  updateRule(ruleId: string, updates: Partial<SessionRule>): Promise<SessionRule>;
  deleteRule(ruleId: string): Promise<void>;
  getRules(scope?: RuleScope): Promise<SessionRule[]>;
  
  // Rule enforcement
  enforceRules(action: ProposedAction): Promise<RuleEnforcementResult[]>;
  validateAction(action: ProposedAction): Promise<RuleValidationResult>;
  
  // Learning and optimization
  recordViolation(violation: RuleViolation): Promise<void>;
  suggestNewRules(patterns: UserBehaviorPattern[]): Promise<RuleSuggestion[]>;
  optimizeRules(): Promise<RuleOptimization[]>;
  
  // Memory MCP integration
  syncRulesToMemory(): Promise<void>;
  loadRulesFromMemory(): Promise<SessionRule[]>;
}

export interface ProposedAction {
  type: string;
  description: string;
  context: Record<string, any>;
  mcpsInvolved: MCPType[];
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
}

export interface UserBehaviorPattern {
  patternType: string;
  description: string;
  frequency: number;
  contexts: string[];
  userCorrections: string[];
  suggestedRule?: string;
}
