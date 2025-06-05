# Session Rules API Documentation

**MCP Conductor Session Rules Engine - Complete API Reference**

The Session Rules Engine provides persistent, intelligent rule management that adapts to user behavior and maintains consistency across sessions.

## 📋 Table of Contents

- [Overview](#overview)
- [Rule Lifecycle Management](#rule-lifecycle-management)
- [Rule Enforcement](#rule-enforcement)
- [Luther's Built-in Rules](#luthers-built-in-rules)
- [Learning & Optimization](#learning--optimization)
- [Memory MCP Integration](#memory-mcp-integration)
- [API Methods Reference](#api-methods-reference)
- [Types & Interfaces](#types--interfaces)
- [Usage Examples](#usage-examples)

## Overview

### What is the Session Rules Engine?

The Session Rules Engine is a sophisticated rule management system that:
- **Stores persistent user preferences** across AI sessions
- **Enforces workflow rules** with multiple enforcement levels
- **Learns from user behavior** to optimize rule effectiveness
- **Integrates with Memory MCP** for persistent storage
- **Provides intelligent suggestions** for new rules

### Key Features

✅ **Persistent Rules** - Rules survive session restarts  
✅ **Multiple Enforcement Levels** - From suggestions to hard blocks  
✅ **Adaptive Learning** - Rules improve based on user feedback  
✅ **Smart Optimization** - Detects redundant and ineffective rules  
✅ **Memory Integration** - Seamless storage via Memory MCP  

## Rule Lifecycle Management

### Creating Rules

#### `createRule(rule: Partial<SessionRule>): Promise<SessionRule>`

Creates a new session rule with comprehensive validation and storage.

**Parameters:**
```typescript
interface SessionRule {
  id?: string;                    // Auto-generated if not provided
  rule: string;                   // Human-readable rule description
  type: RuleType;                 // 'approval' | 'architecture' | 'documentation' | 'workflow'
  priority: number;               // Lower numbers = higher priority (default: 100)
  active: boolean;                // Rule is currently enforced (default: true)
  scope: RuleScope;               // 'user' | 'session' | 'project' (default: 'user')
  enforcement: EnforcementLevel;  // 'hard_block' | 'soft_block' | 'reminder' | 'suggestion' | 'log_only'
  triggers: string[];             // Keywords that activate this rule
  conditions: RuleCondition[];    // Advanced conditional logic
}
```

**Example:**
```typescript
const approvalRule = await ruleEngine.createRule({
  rule: "Always request approval before creating or modifying artifacts",
  type: "approval",
  priority: 10,
  enforcement: "soft_block",
  triggers: ["create", "modify", "artifact"],
  scope: "user"
});
```

### Updating Rules

#### `updateRule(ruleId: string, updates: Partial<SessionRule>): Promise<SessionRule>`

Updates an existing rule with partial modifications.

**Example:**
```typescript
// Reduce enforcement level after user feedback
await ruleEngine.updateRule("rule_approval_1", {
  enforcement: "reminder",
  priority: 50
});
```

### Retrieving Rules

#### `getRules(scope?: RuleScope): Promise<SessionRule[]>`

Retrieves all active rules, optionally filtered by scope.

**Example:**
```typescript
// Get all user-level rules
const userRules = await ruleEngine.getRules("user");

// Get all rules, sorted by priority
const allRules = await ruleEngine.getRules();
```

#### `getRule(ruleId: string): Promise<SessionRule | null>`

Retrieves a specific rule by ID.

### Deleting Rules

#### `deleteRule(ruleId: string): Promise<void>`

Permanently removes a rule from storage and cache.

## Rule Enforcement

### Primary Enforcement

#### `enforceRules(action: ProposedAction): Promise<RuleEnforcementResult[]>`

Enforces all applicable rules against a proposed action.

**Parameters:**
```typescript
interface ProposedAction {
  type: string;              // Action identifier
  description: string;       // Human-readable description
  riskLevel: 'low' | 'medium' | 'high';
  context: Record<string, any>;
}
```

**Returns:**
```typescript
interface RuleEnforcementResult {
  ruleId: string;
  action: string;
  result: 'allowed' | 'warned' | 'blocked';
  enforcementTime: Date;
  message?: string;
  userPrompt?: string;
  suggestedActions?: string[];
}
```

**Example:**
```typescript
const action: ProposedAction = {
  type: "create_artifact",
  description: "Creating new React component",
  riskLevel: "medium",
  context: { artifactType: "react", complexity: "high" }
};

const results = await ruleEngine.enforceRules(action);
for (const result of results) {
  if (result.result === 'blocked') {
    console.log(`❌ Blocked: ${result.message}`);
  } else if (result.result === 'warned') {
    console.log(`⚠️ Warning: ${result.userPrompt}`);
  }
}
```

### Validation

#### `validateAction(action: ProposedAction): Promise<RuleValidationResult>`

Validates an action against all rules without side effects.

**Returns:**
```typescript
interface RuleValidationResult {
  valid: boolean;
  conflicts: RuleConflict[];
  suggestions: string[];
  estimatedEffectiveness: number;
}
```

## Luther's Built-in Rules

### Initialization

#### `initializeLutherRules(): Promise<void>`

Automatically sets up Luther's 5 core workflow rules:

1. **Approval Required** - Request approval before artifacts
2. **Artifact Display** - Display artifacts in right panel  
3. **Architecture Check** - Leverage existing architecture
4. **File Paths** - Use complete file paths
5. **Documentation First** - Update documentation before implementation

**Example:**
```typescript
// Initialize Luther's rules on first setup
await ruleEngine.initializeLutherRules();
```

### Built-in Rules Reference

| Rule ID | Rule | Type | Enforcement | Triggers |
|---------|------|------|-------------|----------|
| `luther_approval_required` | Always request approval before creating or modifying artifacts | approval | soft_block | create, modify, artifact |
| `luther_artifact_display` | Display artifacts in the right panel for easy reference | documentation | reminder | artifact, display |
| `luther_architecture_check` | Always check and leverage existing architecture before new implementations | architecture | reminder | implement, design, architecture |
| `luther_file_paths` | Always use complete file paths when referencing files | documentation | reminder | file, path |
| `luther_documentation_first` | Update documentation before implementing new features | documentation | reminder | implement, feature |

## Learning & Optimization

### Recording Violations

#### `recordViolation(violation: RuleViolation): Promise<void>`

Records when a user overrides or violates a rule for learning purposes.

**Parameters:**
```typescript
interface RuleViolation {
  id: string;
  ruleId: string;
  action: string;
  violationType: 'override' | 'ignore' | 'modify';
  userResponse: 'complied' | 'overrode' | 'modified_rule' | 'disabled_rule';
  context: Record<string, any>;
  timestamp: Date;
}
```

### Suggesting New Rules

#### `suggestNewRules(patterns: UserBehaviorPattern[]): Promise<RuleSuggestion[]>`

Analyzes user behavior patterns to suggest new rules.

**Example:**
```typescript
const patterns: UserBehaviorPattern[] = [
  {
    patternType: "frequent_correction",
    description: "User frequently corrects file path format",
    frequency: 5,
    contexts: ["file reference", "documentation"],
    userCorrections: ["Use absolute paths", "Include file extensions"]
  }
];

const suggestions = await ruleEngine.suggestNewRules(patterns);
for (const suggestion of suggestions) {
  console.log(`💡 Suggested rule: ${suggestion.suggestedRule.rule}`);
  console.log(`   Reason: ${suggestion.reason}`);
  console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
}
```

### Rule Optimization

#### `optimizeRules(): Promise<RuleOptimization[]>`

Analyzes rule effectiveness and suggests optimizations.

**Returns:**
```typescript
interface RuleOptimization {
  optimizationType: 'change_enforcement' | 'merge_similar' | 'remove_ineffective';
  description: string;
  expectedImprovement: string;
  affectedRuleIds: string[];
}
```

## Memory MCP Integration

### Synchronization

#### `syncRulesToMemory(): Promise<void>`

Manually synchronizes all cached rules to Memory MCP storage.

#### `loadRulesFromMemory(): Promise<SessionRule[]>`

Loads all rules from Memory MCP into the local cache.

**Example:**
```typescript
// Load existing rules on startup
const rules = await ruleEngine.loadRulesFromMemory();
console.log(`📥 Loaded ${rules.length} rules from Memory MCP`);

// Sync after major changes
await ruleEngine.syncRulesToMemory();
console.log(`🔄 Rules synchronized to Memory MCP`);
```

## API Methods Reference

### Core CRUD Operations

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `createRule()` | Create new rule | `Partial<SessionRule>` | `SessionRule` |
| `updateRule()` | Update existing rule | `ruleId, updates` | `SessionRule` |
| `deleteRule()` | Delete rule | `ruleId` | `void` |
| `getRule()` | Get specific rule | `ruleId` | `SessionRule \| null` |
| `getRules()` | Get all rules | `scope?` | `SessionRule[]` |

### Enforcement Operations

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `enforceRules()` | Enforce rules on action | `ProposedAction` | `RuleEnforcementResult[]` |
| `validateAction()` | Validate without enforcement | `ProposedAction` | `RuleValidationResult` |

### Learning Operations

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `recordViolation()` | Record rule violation | `RuleViolation` | `void` |
| `suggestNewRules()` | Suggest rules from patterns | `UserBehaviorPattern[]` | `RuleSuggestion[]` |
| `optimizeRules()` | Optimize rule effectiveness | none | `RuleOptimization[]` |

### Storage Operations

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `syncRulesToMemory()` | Save rules to Memory MCP | none | `void` |
| `loadRulesFromMemory()` | Load rules from Memory MCP | none | `SessionRule[]` |
| `initializeLutherRules()` | Setup Luther's built-in rules | none | `void` |

## Types & Interfaces

### Core Types

```typescript
// Rule Types
type RuleType = 'approval' | 'architecture' | 'documentation' | 'workflow';
type RuleScope = 'user' | 'session' | 'project';
type EnforcementLevel = 'hard_block' | 'soft_block' | 'reminder' | 'suggestion' | 'log_only';

// Enforcement Results
type EnforcementResult = 'allowed' | 'warned' | 'blocked';

// Learning Types
type ViolationType = 'override' | 'ignore' | 'modify';
type UserResponse = 'complied' | 'overrode' | 'modified_rule' | 'disabled_rule';
type OptimizationType = 'change_enforcement' | 'merge_similar' | 'remove_ineffective';
```

### Key Interfaces

```typescript
interface SessionRule {
  id: string;
  rule: string;
  type: RuleType;
  priority: number;
  active: boolean;
  scope: RuleScope;
  enforcement: EnforcementLevel;
  triggers: string[];
  conditions: RuleCondition[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  violationCount: number;
  effectiveness?: number;
}

interface RuleEnforcementResult {
  ruleId: string;
  action: string;
  result: EnforcementResult;
  enforcementTime: Date;
  message?: string;
  userPrompt?: string;
  suggestedActions?: string[];
}

interface ProposedAction {
  type: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  context: Record<string, any>;
}
```

## Usage Examples

### Basic Setup

```typescript
import { SessionRulesEngine } from './components/session-rules.js';
import { createMemoryMCPClient } from './utils/mcp-client-factory.js';

// Initialize the engine
const memoryClient = await createMemoryMCPClient();
const ruleEngine = new SessionRulesEngine(memoryClient);

// Load existing rules
await ruleEngine.loadRulesFromMemory();

// Initialize Luther's rules if first time
await ruleEngine.initializeLutherRules();
```

### Creating Custom Rules

```typescript
// Create a project-specific rule
const projectRule = await ruleEngine.createRule({
  rule: "Always run tests before committing code",
  type: "workflow",
  priority: 20,
  enforcement: "soft_block",
  triggers: ["commit", "push", "deploy"],
  scope: "project"
});

// Create a documentation rule
const docRule = await ruleEngine.createRule({
  rule: "Include API examples in all function documentation",
  type: "documentation", 
  priority: 40,
  enforcement: "reminder",
  triggers: ["document", "function", "api"]
});
```

### Enforcement Workflow

```typescript
// Define an action
const deployAction: ProposedAction = {
  type: "deploy_to_production",
  description: "Deploying user authentication service",
  riskLevel: "high",
  context: {
    service: "auth",
    environment: "production",
    hasTests: true,
    hasDocumentation: false
  }
};

// Enforce rules
const enforcement = await ruleEngine.enforceRules(deployAction);

// Handle results
for (const result of enforcement) {
  switch (result.result) {
    case 'blocked':
      console.log(`🚫 BLOCKED: ${result.message}`);
      console.log(`   Fix required: ${result.userPrompt}`);
      return; // Stop execution
      
    case 'warned':
      console.log(`⚠️ WARNING: ${result.message}`);
      const proceed = await askUser(result.userPrompt!);
      if (!proceed) return;
      break;
      
    case 'allowed':
      if (result.message) {
        console.log(`ℹ️ REMINDER: ${result.message}`);
      }
      break;
  }
}

console.log("✅ All rules passed, proceeding with action");
```

### Learning from User Behavior

```typescript
// Record when user overrides a rule
const violation: RuleViolation = {
  id: `violation_${Date.now()}`,
  ruleId: "luther_approval_required",
  action: "create_artifact",
  violationType: "override",
  userResponse: "overrode",
  context: {
    reason: "Emergency bug fix",
    urgency: "critical"
  },
  timestamp: new Date()
};

await ruleEngine.recordViolation(violation);

// Get optimization suggestions
const optimizations = await ruleEngine.optimizeRules();
for (const opt of optimizations) {
  console.log(`💡 Optimization: ${opt.description}`);
  console.log(`   Expected improvement: ${opt.expectedImprovement}`);
}
```

### Rule Management

```typescript
// Get all approval rules
const approvalRules = await ruleEngine.getRules("user");
const approvals = approvalRules.filter(r => r.type === "approval");

// Update rule effectiveness
for (const rule of approvals) {
  if (rule.effectiveness && rule.effectiveness < 0.5) {
    await ruleEngine.updateRule(rule.id, {
      enforcement: "reminder", // Reduce from hard_block
      priority: rule.priority + 10 // Lower priority
    });
  }
}

// Clean up ineffective rules
const optimizations = await ruleEngine.optimizeRules();
const toRemove = optimizations
  .filter(opt => opt.optimizationType === 'remove_ineffective')
  .flatMap(opt => opt.affectedRuleIds);

for (const ruleId of toRemove) {
  await ruleEngine.deleteRule(ruleId);
  console.log(`🗑️ Removed ineffective rule: ${ruleId}`);
}
```

## Advanced Features

### Rule Conditions

Rules can include complex conditional logic:

```typescript
const conditionalRule = await ruleEngine.createRule({
  rule: "Require code review for production deployments",
  type: "approval",
  enforcement: "hard_block",
  conditions: [
    {
      field: "context.environment",
      operator: "equals",
      value: "production"
    },
    {
      field: "context.hasCodeReview",
      operator: "equals", 
      value: false
    }
  ]
});
```

### Rule Effectiveness Tracking

Rules automatically track their effectiveness:

```typescript
const rule = await ruleEngine.getRule("luther_approval_required");
console.log(`Rule effectiveness: ${(rule.effectiveness * 100).toFixed(1)}%`);
console.log(`Usage count: ${rule.usageCount}`);
console.log(`Violation count: ${rule.violationCount}`);
```

### Bulk Operations

```typescript
// Bulk update rule priorities
const workflowRules = await ruleEngine.getRules();
const workflows = workflowRules.filter(r => r.type === "workflow");

for (const rule of workflows) {
  await ruleEngine.updateRule(rule.id, {
    priority: rule.priority + 20 // Lower priority for workflow rules
  });
}

// Sync all changes
await ruleEngine.syncRulesToMemory();
```

---

## 🚀 Next Steps

1. **Implement custom rules** for your specific workflow
2. **Monitor rule effectiveness** and optimize based on usage
3. **Integrate with your CI/CD** pipeline for automated enforcement
4. **Share rules** across team members via Memory MCP
5. **Contribute improvements** to the Session Rules Engine

The Session Rules API provides the foundation for intelligent, adaptive workflow management that learns and improves over time.
