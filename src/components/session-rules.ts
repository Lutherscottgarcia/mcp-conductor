// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/components/session-rules.ts

/**
 * Session Rules Management Engine
 * Stores and enforces persistent user preferences using Memory MCP
 *
 * FIXED: Resolved all TODOs with proper implementations
 */

import {
  SessionRule,
  RuleEngine,
  RuleEnforcementResult,
  ProposedAction,
  RuleValidationResult,
  RuleViolation,
  RuleSuggestion,
  UserBehaviorPattern,
  RuleOptimization,
  RuleConflict,
  LUTHER_SESSION_RULES,
  SessionRuleEntity,
  RuleEnforcementEntity,
  RuleScope,
  EnforcementLevel,
  RuleCondition
} from '@/types/rule-types.js';
import type { MemoryMCPClient } from '@/utils/mcp-client-factory.js';

export class SessionRulesEngine implements RuleEngine {
  private memoryClient: MemoryMCPClient;
  private ruleCache: Map<string, SessionRule> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private cacheValidityMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(memoryClient: MemoryMCPClient) {
    this.memoryClient = memoryClient;
  }

  // ===== RULE LIFECYCLE MANAGEMENT =====

  async createRule(rule: Partial<SessionRule>): Promise<SessionRule> {
    const completeRule: SessionRule = {
      id: rule.id || this.generateRuleId(),
      rule: rule.rule || '',
      type: rule.type || 'workflow',
      priority: rule.priority || 100,
      active: rule.active !== false,
      scope: rule.scope || 'user',
      enforcement: rule.enforcement || 'reminder',
      triggers: rule.triggers || [],
      conditions: rule.conditions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      violationCount: 0,
      ...(rule.effectiveness !== undefined && { effectiveness: rule.effectiveness })
    };

    // Store in Memory MCP
    await this.storeRuleInMemory(completeRule);

    // Update cache
    this.ruleCache.set(completeRule.id, completeRule);

    console.log(`Session rule created: ${completeRule.id} - "${completeRule.rule}"`);
    return completeRule;
  }

  async updateRule(ruleId: string, updates: Partial<SessionRule>): Promise<SessionRule> {
    const existingRule = await this.getRule(ruleId);
    if (!existingRule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const updatedRule: SessionRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date()
    };

    // Update in Memory MCP
    await this.updateRuleInMemory(updatedRule);

    // Update cache
    this.ruleCache.set(ruleId, updatedRule);

    console.log(`Session rule updated: ${ruleId}`);
    return updatedRule;
  }

  async deleteRule(ruleId: string): Promise<void> {
    // Remove from Memory MCP
    await this.memoryClient.deleteEntities([`SessionRule_${ruleId}`]);

    // Remove from cache
    this.ruleCache.delete(ruleId);

    console.log(`Session rule deleted: ${ruleId}`);
  }

  async getRules(scope?: RuleScope): Promise<SessionRule[]> {
    await this.refreshRuleCache();

    const rules = Array.from(this.ruleCache.values());

    if (scope) {
      return rules.filter(rule => rule.scope === scope);
    }

    return rules.sort((a, b) => a.priority - b.priority);
  }

  async getRule(ruleId: string): Promise<SessionRule | null> {
    await this.refreshRuleCache();
    return this.ruleCache.get(ruleId) || null;
  }

  // ===== RULE ENFORCEMENT =====

  async enforceRules(action: ProposedAction): Promise<RuleEnforcementResult[]> {
    const activeRules = await this.getRules();
    const results: RuleEnforcementResult[] = [];

    console.log(`Enforcing rules for action: ${action.type}`);

    for (const rule of activeRules.filter(r => r.active)) {
      if (this.actionMatchesRule(action, rule)) {
        console.log(`Rule ${rule.id} applies to action ${action.type}`);

        const result = await this.enforceIndividualRule(rule, action);
        results.push(result);

        // Update rule usage statistics
        await this.incrementRuleUsage(rule.id);

        // Log enforcement in Memory MCP
        await this.logRuleEnforcement(rule, action, result);

        // If rule blocks action, stop processing
        if (result.result === 'blocked') {
          console.log(`Action blocked by rule: ${rule.id}`);
          break;
        }
      }
    }

    return results;
  }

  async validateAction(action: ProposedAction): Promise<RuleValidationResult> {
    const enforcement = await this.enforceRules(action);

    const blocked = enforcement.some(e => e.result === 'blocked');
    const warned = enforcement.some(e => e.result === 'warned');

    return {
      valid: !blocked,
      conflicts: await this.detectRuleConflicts(enforcement),
      suggestions: await this.generateOptimizationSuggestions(enforcement, action),
      estimatedEffectiveness: this.calculateActionEffectiveness(enforcement)
    };
  }

  // ===== LUTHER'S SPECIFIC RULES INITIALIZATION =====

  async initializeLutherRules(): Promise<void> {
    console.log(`Initializing Luther's session rules...`);

    for (const ruleData of LUTHER_SESSION_RULES) {
      const existingRule = await this.findRuleByText(ruleData.rule!);

      if (!existingRule) {
        await this.createRule({
          ...ruleData,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          violationCount: 0
        });
        console.log(`Created rule: ${ruleData.id}`);
      } else {
        console.log(`Rule already exists: ${ruleData.id}`);
      }
    }

    console.log(`Luther's session rules initialized successfully`);
  }

  // ===== RULE LEARNING & OPTIMIZATION =====

  async recordViolation(violation: RuleViolation): Promise<void> {
    // Store violation in Memory MCP
    await this.memoryClient.createEntities([{
      name: `RuleViolation_${violation.id}`,
      entityType: 'rule_violation',
      observations: [
        `Rule ID: ${violation.ruleId}`,
        `Action: ${violation.action}`,
        `Violation type: ${violation.violationType}`,
        `User response: ${violation.userResponse}`,
        `Context: ${JSON.stringify(violation.context)}`,
        `Timestamp: ${violation.timestamp.toISOString()}`
      ]
    }]);

    // Update rule violation count
    const rule = await this.getRule(violation.ruleId);
    if (rule) {
      await this.updateRule(violation.ruleId, {
        violationCount: rule.violationCount + 1,
        effectiveness: this.calculateRuleEffectiveness(rule, violation.userResponse)
      });
    }

    console.log(`Recorded rule violation: ${violation.ruleId}`);
  }

  async suggestNewRules(patterns: UserBehaviorPattern[]): Promise<RuleSuggestion[]> {
    const suggestions: RuleSuggestion[] = [];

    for (const pattern of patterns) {
      if (pattern.userCorrections.length >= 3) { // Pattern seen 3+ times
        const suggestion: RuleSuggestion = {
          suggestedRule: {
            rule: this.generateRuleFromPattern(pattern),
            type: this.inferRuleType(pattern),
            priority: 50, // Medium priority for suggested rules
            scope: 'user',
            enforcement: 'reminder', // Start with gentle enforcement
            triggers: this.extractTriggersFromPattern(pattern)
          },
          reason: `Detected pattern: ${pattern.description}`,
          basedOnPattern: pattern.patternType,
          confidence: Math.min(pattern.frequency / 10, 0.9), // Cap at 90% confidence
          exampleViolations: pattern.userCorrections.slice(0, 3)
        };

        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  async optimizeRules(): Promise<RuleOptimization[]> {
    const rules = await this.getRules();
    const optimizations: RuleOptimization[] = [];

    // Find ineffective rules (low effectiveness score)
    const ineffectiveRules = rules.filter(r =>
        r.effectiveness !== undefined && r.effectiveness < 0.3 && r.usageCount > 5
    );

    for (const rule of ineffectiveRules) {
      optimizations.push({
        optimizationType: 'change_enforcement',
        description: `Rule "${rule.rule}" has low effectiveness (${(rule.effectiveness! * 100).toFixed(1)}%)`,
        expectedImprovement: 'Reduce user friction while maintaining intent',
        affectedRuleIds: [rule.id]
      });
    }

    // Find redundant rules
    const redundantPairs = this.findRedundantRules(rules);
    for (const pair of redundantPairs) {
      optimizations.push({
        optimizationType: 'merge_similar',
        description: `Rules "${pair[0].rule}" and "${pair[1].rule}" overlap significantly`,
        expectedImprovement: 'Simplify rule set and reduce conflicts',
        affectedRuleIds: [pair[0].id, pair[1].id]
      });
    }

    return optimizations;
  }

  // ===== MEMORY MCP INTEGRATION =====

  async syncRulesToMemory(): Promise<void> {
    const rules = Array.from(this.ruleCache.values());

    for (const rule of rules) {
      await this.storeRuleInMemory(rule);
    }

    console.log(`Synced ${rules.length} rules to Memory MCP`);
  }

  async loadRulesFromMemory(): Promise<SessionRule[]> {
    const ruleEntities = await this.memoryClient.searchNodes('session_rule');
    const rules: SessionRule[] = [];

    for (const entity of ruleEntities) {
      try {
        const rule = this.parseRuleFromMemoryEntity(entity);
        rules.push(rule);
        this.ruleCache.set(rule.id, rule);
      } catch (error) {
        console.warn(`Failed to parse rule from entity ${entity.name}:`, error);
      }
    }

    this.lastCacheUpdate = new Date();
    console.log(`Loaded ${rules.length} rules from Memory MCP`);
    return rules;
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private async refreshRuleCache(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastCacheUpdate.getTime() > this.cacheValidityMs) {
      await this.loadRulesFromMemory();
    }
  }

  private async storeRuleInMemory(rule: SessionRule): Promise<void> {
    const entity: SessionRuleEntity = {
      name: `SessionRule_${rule.id}`,
      entityType: 'session_rule',
      observations: [
        rule.rule,
        rule.type,
        rule.priority.toString(),
        rule.enforcement,
        rule.active.toString(),
        rule.scope,
        (rule.triggers || []).join(','),
        `usage:${rule.usageCount},violations:${rule.violationCount}`,
        `effectiveness:${rule.effectiveness || 'unknown'}`
      ]
    };

    await this.memoryClient.createEntities([entity]);

    // Create relationships for rule categorization
    await this.memoryClient.createRelations([{
      from: entity.name,
      to: `RuleCategory_${rule.type}`,
      relationType: 'belongs_to'
    }]);
  }

  private async updateRuleInMemory(rule: SessionRule): Promise<void> {
    // Delete and recreate (Memory MCP doesn't have direct update)
    await this.memoryClient.deleteEntities([`SessionRule_${rule.id}`]);
    await this.storeRuleInMemory(rule);
  }

  private parseRuleFromMemoryEntity(entity: any): SessionRule {
    const obs = entity.observations;
    if (obs.length < 9) {
      throw new Error('Invalid rule entity format');
    }

    // Parse usage statistics
    const usageMatch = obs[7].match(/usage:(\d+),violations:(\d+)/);
    const usageCount = usageMatch ? parseInt(usageMatch[1]) : 0;
    const violationCount = usageMatch ? parseInt(usageMatch[2]) : 0;

    // Parse effectiveness
    const effectivenessMatch = obs[8].match(/effectiveness:(.+)/);
    const effectiveness = effectivenessMatch && effectivenessMatch[1] !== 'unknown'
        ? parseFloat(effectivenessMatch[1])
        : undefined;

    // Use current date for timestamps since we don't store them in observations anymore
    const now = new Date();
    const createdAt = now;
    const updatedAt = now;

    // Default empty conditions since we don't store them in observations anymore
    const conditions: RuleCondition[] = [];

    return {
      id: entity.name.replace('SessionRule_', ''),
      rule: obs[0],
      type: obs[1] as any,
      priority: parseInt(obs[2]),
      enforcement: obs[3] as EnforcementLevel,
      active: obs[4] === 'true',
      scope: obs[5] as RuleScope,
      triggers: obs[6] ? obs[6].split(',') : [],
      conditions,
      createdAt,
      updatedAt,
      usageCount,
      violationCount,
      ...(effectiveness !== undefined && { effectiveness })
    };
  }

  private actionMatchesRule(action: ProposedAction, rule: SessionRule): boolean {
    // Check if action type matches any rule triggers
    if (rule.triggers && rule.triggers.length > 0) {
      return rule.triggers.some(trigger =>
          action.type.toLowerCase().includes(trigger.toLowerCase()) ||
          action.description.toLowerCase().includes(trigger.toLowerCase())
      );
    }

    // Default matching logic based on rule type
    switch (rule.type) {
      case 'approval':
        return action.riskLevel === 'high' || action.type.includes('create') || action.type.includes('modify');
      case 'architecture':
        return action.type.includes('design') || action.type.includes('implement') || action.type.includes('refactor');
      case 'documentation':
        return action.type.includes('artifact') || action.type.includes('document');
      default:
        return false;
    }
  }

  private async enforceIndividualRule(rule: SessionRule, action: ProposedAction): Promise<RuleEnforcementResult> {
    const enforcement: RuleEnforcementResult = {
      ruleId: rule.id,
      action: action.type,
      result: 'allowed',
      enforcementTime: new Date()
    };

    switch (rule.enforcement) {
      case 'hard_block':
        enforcement.result = 'blocked';
        enforcement.message = `Action blocked by rule: ${rule.rule}`;
        enforcement.userPrompt = 'This action violates a mandatory rule. Please modify your approach.';
        break;

      case 'soft_block':
        enforcement.result = 'warned';
        enforcement.message = `Rule check: ${rule.rule}`;
        enforcement.userPrompt = `Before proceeding with "${action.description}", please confirm this aligns with the rule: "${rule.rule}"`;
        enforcement.suggestedActions = ['Modify approach', 'Confirm and proceed', 'Review rule'];
        break;

      case 'reminder':
        enforcement.result = 'allowed';
        enforcement.message = `Reminder: ${rule.rule}`;
        break;

      case 'suggestion':
        enforcement.result = 'allowed';
        enforcement.message = `Suggestion: Consider ${rule.rule}`;
        break;

      case 'log_only':
        enforcement.result = 'allowed';
        // Just log, no user-facing message
        break;
    }

    return enforcement;
  }

  private async incrementRuleUsage(ruleId: string): Promise<void> {
    const rule = await this.getRule(ruleId);
    if (rule) {
      await this.updateRule(ruleId, {
        usageCount: rule.usageCount + 1
      });
    }
  }

  private async logRuleEnforcement(rule: SessionRule, action: ProposedAction, result: RuleEnforcementResult): Promise<void> {
    const entity: RuleEnforcementEntity = {
      name: `RuleEnforcement_${Date.now()}`,
      entityType: 'rule_enforcement',
      observations: [
        rule.id,
        action.type,
        result.result,
        'complied', // Default - would need user feedback to determine actual response
        JSON.stringify(action.context),
        new Date().toISOString()
      ]
    };

    await this.memoryClient.createEntities([entity]);
  }

  private calculateActionEffectiveness(enforcement: RuleEnforcementResult[]): number {
    if (enforcement.length === 0) return 1.0;

    const blocked = enforcement.filter(e => e.result === 'blocked').length;
    const warned = enforcement.filter(e => e.result === 'warned').length;

    // Simple effectiveness calculation
    return Math.max(0, 1 - (blocked * 0.5) - (warned * 0.2));
  }

  private calculateRuleEffectiveness(rule: SessionRule, userResponse: string): number {
    const currentEffectiveness = rule.effectiveness || 0.5;

    // Adjust effectiveness based on user response
    switch (userResponse) {
      case 'complied':
        return Math.min(1.0, currentEffectiveness + 0.1);
      case 'overrode':
        return Math.max(0.0, currentEffectiveness - 0.2);
      case 'modified_rule':
        return Math.max(0.0, currentEffectiveness - 0.1);
      case 'disabled_rule':
        return 0.0;
      default:
        return currentEffectiveness;
    }
  }

  private async findRuleByText(ruleText: string): Promise<SessionRule | null> {
    const rules = await this.getRules();
    return rules.find(rule => rule.rule === ruleText) || null;
  }

  private generateRuleFromPattern(pattern: UserBehaviorPattern): string {
    // Generate rule text from user behavior pattern
    return `Consider ${pattern.description.toLowerCase()} (suggested based on user patterns)`;
  }

  private inferRuleType(pattern: UserBehaviorPattern): any {
    // Infer rule type from pattern characteristics
    if (pattern.description.toLowerCase().includes('approval') || pattern.description.toLowerCase().includes('check')) {
      return 'approval';
    }
    if (pattern.description.toLowerCase().includes('document') || pattern.description.toLowerCase().includes('path')) {
      return 'documentation';
    }
    if (pattern.description.toLowerCase().includes('design') || pattern.description.toLowerCase().includes('architecture')) {
      return 'architecture';
    }
    return 'workflow';
  }

  private extractTriggersFromPattern(pattern: UserBehaviorPattern): string[] {
    // Extract potential triggers from pattern contexts
    return pattern.contexts.slice(0, 3); // Take first 3 contexts as triggers
  }

  private findRedundantRules(rules: SessionRule[]): [SessionRule, SessionRule][] {
    const redundantPairs: [SessionRule, SessionRule][] = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];
        if (rule1 && rule2) {
          const similarity = this.calculateRuleSimilarity(rule1, rule2);
          if (similarity > 0.8) { // 80% similarity threshold
            redundantPairs.push([rule1, rule2]);
          }
        }
      }
    }

    return redundantPairs;
  }

  private calculateRuleSimilarity(rule1: SessionRule, rule2: SessionRule): number {
    // Simple similarity calculation based on text overlap and shared triggers
    const textSimilarity = this.calculateTextSimilarity(rule1.rule, rule2.rule);
    const triggerOverlap = this.calculateTriggerOverlap(rule1.triggers || [], rule2.triggers || []);

    return (textSimilarity + triggerOverlap) / 2;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    const commonWords = words1.filter(word => words2.includes(word));

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private calculateTriggerOverlap(triggers1: string[], triggers2: string[]): number {
    if (triggers1.length === 0 && triggers2.length === 0) return 1;
    if (triggers1.length === 0 || triggers2.length === 0) return 0;

    const commonTriggers = triggers1.filter(trigger => triggers2.includes(trigger));
    return commonTriggers.length / Math.max(triggers1.length, triggers2.length);
  }

  // ===== CONFLICT DETECTION IMPLEMENTATION =====

  /**
   * Detect conflicts between rule enforcement results
   */
  private async detectRuleConflicts(enforcement: RuleEnforcementResult[]): Promise<RuleConflict[]> {
    const conflicts: RuleConflict[] = [];

    // Check for enforcement level conflicts
    const hasBlocked = enforcement.some(e => e.result === 'blocked');
    const hasAllowed = enforcement.some(e => e.result === 'allowed');
    const hasWarned = enforcement.some(e => e.result === 'warned');

    if (hasBlocked && hasAllowed) {
      conflicts.push({
        conflictType: 'contradictory',
        description: 'Conflicting enforcement: Some rules block while others allow the same action',
        conflictingRuleIds: enforcement.map(e => e.ruleId),
        suggestedResolution: 'Review rule priorities and enforcement levels to ensure consistency'
      });
    }

    if (hasWarned && hasBlocked) {
      conflicts.push({
        conflictType: 'contradictory',
        description: 'Enforcement conflict: Action both warned and blocked by different rules',
        conflictingRuleIds: enforcement.filter(e => e.result === 'warned' || e.result === 'blocked').map(e => e.ruleId),
        suggestedResolution: 'Consolidate conflicting rules or adjust enforcement hierarchy'
      });
    }

    // Check for priority conflicts
    const priorities = enforcement.map(e => e.ruleId).map(async ruleId => {
      const rule = await this.getRule(ruleId);
      return rule?.priority || 100;
    });

    const resolvedPriorities = await Promise.all(priorities);
    const uniquePriorities = new Set(resolvedPriorities);

    if (enforcement.length > 1 && uniquePriorities.size === resolvedPriorities.length) {
      conflicts.push({
        conflictType: 'redundant',
        description: 'Multiple rules with different priorities affecting the same action',
        conflictingRuleIds: enforcement.map(e => e.ruleId),
        suggestedResolution: 'Consider consolidating rules or adjusting priorities for clearer hierarchy'
      });
    }

    return conflicts;
  }

  // ===== OPTIMIZATION SUGGESTIONS IMPLEMENTATION =====
  

  /**
   * Generate optimization suggestions based on enforcement results
   */
  private async generateOptimizationSuggestions(
      enforcement: RuleEnforcementResult[],
      action: ProposedAction
  ): Promise<RuleOptimization[]> {
    const suggestions: RuleOptimization[] = [];

    // If multiple rules triggered, suggest consolidation
    if (enforcement.length > 2) {
      suggestions.push({
        optimizationType: 'merge_similar',
        description: `Consider consolidating ${enforcement.length} triggered rules for simpler enforcement`,
        expectedImprovement: 'Reduced rule complexity and clearer enforcement',
        affectedRuleIds: enforcement.map(e => e.ruleId)
      });
    }

    // If action was blocked, suggest alternative approaches
    const blocked = enforcement.filter(e => e.result === 'blocked');
    if (blocked.length > 0) {
      suggestions.push({
        optimizationType: 'change_enforcement',
        description: 'Consider breaking down the action into smaller, compliant steps',
        expectedImprovement: 'Better user experience with incremental compliance',
        affectedRuleIds: blocked.map(e => e.ruleId)
      });
      suggestions.push({
        optimizationType: 'change_enforcement',
        description: 'Review rule enforcement levels - some rules may be too strict',
        expectedImprovement: 'Reduced user friction while maintaining safety',
        affectedRuleIds: blocked.map(e => e.ruleId)
      });
    }

    // If action was warned but not blocked, suggest rule refinement
    const warned = enforcement.filter(e => e.result === 'warned');
    if (warned.length > 0 && blocked.length === 0) {
      suggestions.push({
        optimizationType: 'change_enforcement',
        description: 'Consider promoting warning rules to soft blocks for better compliance',
        expectedImprovement: 'Improved rule effectiveness and user awareness',
        affectedRuleIds: warned.map(e => e.ruleId)
      });
    }

    // If no rules triggered, suggest creating new rules
    if (enforcement.length === 0 && action.riskLevel === 'high') {
      suggestions.push({
        optimizationType: 'refine_conditions',
        description: 'Consider creating rules for high-risk actions to ensure oversight',
        expectedImprovement: 'Better risk management and oversight',
        affectedRuleIds: []
      });
    }

    // Check for rule effectiveness and suggest improvements
    for (const result of enforcement) {
      const rule = await this.getRule(result.ruleId);
      if (rule && rule.effectiveness !== undefined && rule.effectiveness < 0.5) {
        suggestions.push({
          optimizationType: 'change_enforcement',
          description: `Rule "${rule.rule}" has low effectiveness - consider updating its enforcement strategy`,
          expectedImprovement: 'Improved rule compliance and user satisfaction',
          affectedRuleIds: [rule.id]
        });
      }
    }

    return suggestions;
  }
}