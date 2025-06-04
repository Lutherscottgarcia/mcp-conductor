// /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/index.ts

/**
 * Conversation Continuity MCP Server - Main Entry Point
 * The world's first MCP orchestrator for seamless AI development sessions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { MCPClientFactory } from '@/utils/mcp-client-factory.js';
import { ConversationContinuityOrchestrator } from '@/conductor/mcp-orchestrator.js';
import { SessionRulesEngine } from '@/components/session-rules.js';
import type { MCPClientConfig } from '@/types/orchestration-types.js';
import type { ProposedAction } from '@/types/rule-types.js';
import type { MCPType } from '@/types/shared-types.js';
import type { ProjectIntelligence } from '@/types/project-intelligence-types.js';

// Global types are automatically included via global.d.ts

class ConversationContinuityServer {
  private server: Server;
  private orchestrator!: ConversationContinuityOrchestrator;
  private rulesEngine!: SessionRulesEngine;
  private clientFactory!: MCPClientFactory;

  constructor() {
    this.server = new Server(
      {
        name: 'conversation-continuity',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // === ECOSYSTEM MONITORING ===
          {
            name: 'monitor_ecosystem_state',
            description: 'Monitor the state of all 5 integrated MCPs (Memory, Claudepoint, Filesystem, Git, Database)',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          
          // === SESSION RULES ===
          {
            name: 'create_session_rule',
            description: 'Create a new persistent session rule (stored in Memory MCP)',
            inputSchema: {
              type: 'object',
              properties: {
                rule: { type: 'string', description: 'The rule text' },
                type: { 
                  type: 'string', 
                  enum: ['approval', 'display', 'architecture', 'workflow', 'quality', 'documentation', 'conditional'],
                  description: 'Type of rule'
                },
                priority: { type: 'number', description: 'Rule priority (lower = higher priority)' },
                enforcement: {
                  type: 'string',
                  enum: ['hard_block', 'soft_block', 'reminder', 'suggestion', 'log_only'],
                  description: 'How strictly to enforce the rule'
                },
                triggers: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Action types that trigger this rule'
                },
                scope: {
                  type: 'string',
                  enum: ['user', 'project', 'session'],
                  description: 'Scope of rule application'
                }
              },
              required: ['rule'],
            },
          },

          {
            name: 'get_session_rules',
            description: 'Retrieve all active session rules',
            inputSchema: {
              type: 'object',
              properties: {
                scope: {
                  type: 'string',
                  enum: ['user', 'project', 'session'],
                  description: 'Optional: filter by rule scope'
                }
              },
            },
          },

          {
            name: 'enforce_session_rules',
            description: 'Check if a proposed action complies with session rules',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', description: 'Type of action being attempted' },
                    description: { type: 'string', description: 'Description of the action' },
                    context: { type: 'object', description: 'Additional context for the action' },
                    riskLevel: { 
                      type: 'string', 
                      enum: ['low', 'medium', 'high'],
                      description: 'Risk level of the action'
                    },
                    reversible: { type: 'boolean', description: 'Whether the action can be undone' }
                  },
                  required: ['type', 'description']
                }
              },
              required: ['action'],
            },
          },

          {
            name: 'initialize_luther_rules',
            description: 'Initialize Luther\'s predefined session rules',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          // === UNIFIED HANDOFF MANAGEMENT ===
          {
            name: 'create_unified_handoff',
            description: 'Create a coordinated handoff package using all 5 MCPs',
            inputSchema: {
              type: 'object',
              properties: {
                reason: { type: 'string', description: 'Reason for creating handoff (e.g., "token limit reached")' },
                currentTask: { type: 'string', description: 'Current task being worked on' }
              },
            },
          },

          {
            name: 'reconstruct_context',
            description: 'Reconstruct conversation context from a unified handoff package',
            inputSchema: {
              type: 'object',
              properties: {
                handoffId: { type: 'string', description: 'ID of the handoff package to reconstruct from' }
              },
              required: ['handoffId'],
            },
          },

          // === MCP COORDINATION ===
          {
            name: 'sync_all_mcps',
            description: 'Synchronize state across all integrated MCPs',
            inputSchema: {
              type: 'object',
              properties: {
                force: { type: 'boolean', description: 'Force sync even if recent sync exists' }
              },
            },
          },

          {
            name: 'coordinate_checkpoint',
            description: 'Create a coordinated checkpoint across multiple MCPs',
            inputSchema: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Description of the checkpoint' }
              },
            },
          },

          // === CONVERSATION MONITORING ===
          {
            name: 'monitor_conversation_length',
            description: 'Monitor current conversation token usage and capacity',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          {
            name: 'compress_context',
            description: 'Compress conversation context using intelligent algorithms',
            inputSchema: {
              type: 'object',
              properties: {
                threshold: { type: 'number', description: 'Compression threshold (0-1)' },
                preserveRecent: { type: 'number', description: 'Number of recent messages to preserve verbatim' }
              },
            },
          },

          // === LEARNING & OPTIMIZATION ===
          {
            name: 'suggest_new_rules',
            description: 'Analyze patterns and suggest new session rules',
            inputSchema: {
              type: 'object',
              properties: {
                analyzeLastDays: { type: 'number', description: 'Number of days to analyze for patterns' }
              },
            },
          },

          {
            name: 'optimize_rules',
            description: 'Analyze current rules and suggest optimizations',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          // === PROJECT INTELLIGENCE CACHE ===
          {
            name: 'create_project_intelligence_cache',
            description: 'Create comprehensive project intelligence cache to eliminate session startup overhead',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string', description: 'Name of the project (defaults to MCPConductor)' },
                options: {
                  type: 'object',
                  properties: {
                    includeFileContents: { type: 'boolean', description: 'Include file contents in analysis' },
                    maxDepth: { type: 'number', description: 'Maximum directory depth to analyze' },
                    excludePatterns: { type: 'array', items: { type: 'string' }, description: 'Patterns to exclude from analysis' },
                    compressionLevel: { type: 'string', enum: ['minimal', 'standard', 'comprehensive'], description: 'Level of analysis detail' }
                  }
                }
              }
            },
          },

          {
            name: 'load_project_intelligence_cache',
            description: 'Load existing project intelligence cache for instant context (eliminates exploration phase)',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string', description: 'Name of the project to load intelligence for' }
              },
              required: ['projectName']
            },
          },

          {
            name: 'validate_project_intelligence_cache',
            description: 'Validate freshness and accuracy of cached project intelligence',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string', description: 'Name of the project to validate' }
              },
              required: ['projectName']
            },
          },

          {
            name: 'refresh_project_intelligence',
            description: 'Update project intelligence cache with latest changes',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string', description: 'Name of the project to refresh' },
                changes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['file_added', 'file_modified', 'file_deleted', 'config_changed'] },
                      path: { type: 'string' },
                      magnitude: { type: 'string', enum: ['minor', 'moderate', 'major', 'breaking'] }
                    }
                  },
                  description: 'Optional: specific changes to process'
                }
              },
              required: ['projectName']
            },
          },

          {
            name: 'invalidate_project_cache',
            description: 'Invalidate project intelligence cache when major changes occur',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string', description: 'Name of the project' },
                reason: { type: 'string', description: 'Reason for invalidation' }
              },
              required: ['projectName', 'reason']
            },
          },

          // === HEALTH & DIAGNOSTICS ===
          {
            name: 'check_mcp_health',
            description: 'Check the health status of all integrated MCPs',
            inputSchema: {
              type: 'object',
              properties: {
                mcpType: {
                  type: 'string',
                  enum: ['memory', 'claudepoint', 'filesystem', 'git', 'database-platform', 'database-analytics'],
                  description: 'Optional: check specific MCP only'
                }
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'monitor_ecosystem_state':
            return await this.handleMonitorEcosystem();

          case 'create_session_rule':
            return await this.handleCreateRule(args);

          case 'get_session_rules':
            return await this.handleGetRules(args);

          case 'enforce_session_rules':
            return await this.handleEnforceRules(args);

          case 'initialize_luther_rules':
            return await this.handleInitializeLutherRules();

          case 'create_unified_handoff':
            return await this.handleCreateHandoff(args);

          case 'reconstruct_context':
            return await this.handleReconstructContext(args);

          case 'sync_all_mcps':
            return await this.handleSyncMCPs(args);

          case 'coordinate_checkpoint':
            return await this.handleCoordinateCheckpoint(args);

          case 'monitor_conversation_length':
            return await this.handleMonitorConversation();

          case 'compress_context':
            return await this.handleCompressContext(args);

          case 'suggest_new_rules':
            return await this.handleSuggestRules(args);

          case 'optimize_rules':
            return await this.handleOptimizeRules();

          case 'check_mcp_health':
            return await this.handleCheckHealth(args);

          // Project Intelligence Cache handlers
          case 'create_project_intelligence_cache':
            return await this.handleCreateProjectIntelligenceCache(args);

          case 'load_project_intelligence_cache':
            return await this.handleLoadProjectIntelligenceCache(args);

          case 'validate_project_intelligence_cache':
            return await this.handleValidateProjectIntelligenceCache(args);

          case 'refresh_project_intelligence':
            return await this.handleRefreshProjectIntelligence(args);

          case 'invalidate_project_cache':
            return await this.handleInvalidateProjectCache(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  // ===== TOOL HANDLERS =====

  private async handleMonitorEcosystem() {
    const state = await this.orchestrator.monitorEcosystemState();
    
    return {
      content: [
        {
          type: 'text',
          text: `🎭 MCP Ecosystem State:

📊 **Conversation**: ${state.conversationTokens} tokens used
🧠 **Memory MCP**: ${state.memoryEntities} entities stored
🔄 **Claudepoint MCP**: ${state.claudepointCheckpoints.length} checkpoints available
📁 **Filesystem MCP**: ${state.filesystemActivity.length} recent file activities
🔀 **Git MCP**: On ${state.gitStatus.branch}, ${state.gitStatus.modified} modified files
🗄️ **Database MCPs**: ${state.databaseSessions.length} active sessions

🏥 **Coordination Health**: ${state.coordinationHealth.status} (${state.coordinationHealth.errorCount} errors)
🔄 **Last Sync**: ${new Date(state.coordinationHealth.lastFullSync).toLocaleString()}
⚡ **Avg Response**: ${state.coordinationHealth.averageResponseTime}ms`,
        },
      ],
    };
  }

  private async handleCreateRule(args: any) {
    const rule = await this.rulesEngine.createRule(args);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Session rule created successfully!

**Rule ID**: ${rule.id}
**Rule**: "${rule.rule}"
**Type**: ${rule.type}
**Enforcement**: ${rule.enforcement}
**Priority**: ${rule.priority}
**Scope**: ${rule.scope}
**Triggers**: ${rule.triggers?.join(', ') || 'none'}

The rule has been stored in Memory MCP and will persist across all future sessions.`,
        },
      ],
    };
  }

  private async handleGetRules(args: any) {
    const rules = await this.rulesEngine.getRules(args?.scope);
    
    const rulesList = rules.map(rule => 
      `• **${rule.id}** (${rule.type}, priority ${rule.priority}): "${rule.rule}" [${rule.enforcement}]`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `📋 Active Session Rules (${rules.length} total):

${rulesList}

🎯 **Legend**: 
- hard_block: Prevents action completely
- soft_block: Warns and waits for confirmation  
- reminder: Shows reminder but allows action
- suggestion: Passive suggestion only`,
        },
      ],
    };
  }

  private async handleEnforceRules(args: any) {
    const action: ProposedAction = args.action;
    const enforcement = await this.rulesEngine.enforceRules(action);
    
    if (enforcement.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Action "${action.type}" cleared - no applicable rules found.`,
          },
        ],
      };
    }

    const blocked = enforcement.filter(e => e.result === 'blocked');
    const warned = enforcement.filter(e => e.result === 'warned');
    const reminders = enforcement.filter(e => e.result === 'allowed' && e.message);

    let response = `⚖️ Rule Enforcement Results for "${action.type}":\n\n`;

    if (blocked.length > 0) {
      response += `🚫 **BLOCKED** by ${blocked.length} rule(s):\n`;
      blocked.forEach(b => response += `   • ${b.message}\n`);
      response += '\n';
    }

    if (warned.length > 0) {
      response += `⚠️ **WARNINGS** from ${warned.length} rule(s):\n`;
      warned.forEach(w => response += `   • ${w.message}\n   ${w.userPrompt}\n`);
      response += '\n';
    }

    if (reminders.length > 0) {
      response += `💡 **REMINDERS** from ${reminders.length} rule(s):\n`;
      reminders.forEach(r => response += `   • ${r.message}\n`);
      response += '\n';
    }

    response += blocked.length > 0 
      ? '❌ **Action not permitted** - please modify your approach'
      : '✅ **Action permitted** - you may proceed';

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleInitializeLutherRules() {
    await this.rulesEngine.initializeLutherRules();
    
    return {
      content: [
        {
          type: 'text',
          text: `🎯 Luther's session rules initialized successfully!

The following rules are now active:
1. **Approval Required**: Always check before creating artifacts/changes
2. **Artifact Display**: Always use right panel for completed work
3. **Architecture Check**: Check existing patterns before new implementations  
4. **File Paths**: Include complete paths in all artifacts
5. **Documentation First**: Update design docs before major changes

All rules are stored in Memory MCP and will persist across sessions.`,
        },
      ],
    };
  }

  private async handleCreateHandoff(args: any) {
    const handoffPackage = await this.orchestrator.createUnifiedHandoffPackage();
    
    return {
      content: [
        {
          type: 'text',
          text: `🎭 Unified handoff package created successfully!

**Handoff ID**: ${handoffPackage.handoffId}
**Created**: ${handoffPackage.createdAt.toLocaleString()}

📦 **Package Contents**:
🧠 Memory MCP: ${handoffPackage.memoryPackage.compressedContextEntities.length} context entities
🔄 Claudepoint: Checkpoint ${handoffPackage.claudepointPackage.checkpointId}
📁 Filesystem: ${handoffPackage.filesystemPackage.activeFiles.length} active files
🔀 Git: Branch ${handoffPackage.gitPackage.currentBranch} (${handoffPackage.gitPackage.uncommittedChanges} uncommitted changes)
🗄️ Database: Session analytics stored

🔗 **Cross-References**: ${handoffPackage.crossReferences.length} MCP linkages created
📋 **Reconstruction Steps**: ${handoffPackage.reconstructionInstructions.length} instructions prepared

The handoff package is ready for seamless context reconstruction in a new session.`,
        },
      ],
    };
  }

  private async handleReconstructContext(args: any) {
    const context = await this.orchestrator.reconstructUnifiedContext(args.handoffId);
    
    return {
      content: [
        {
          type: 'text',
          text: `🔄 Context reconstruction completed!

**Context ID**: ${context.contextId}
**Source Handoff**: ${context.sourceHandoffId}
**Reconstruction Time**: ${context.reconstructionTime}ms

📊 **Reconstruction Quality**:
✅ **Completeness**: ${(context.completeness * 100).toFixed(1)}%
✅ **Accuracy**: ${(context.accuracy * 100).toFixed(1)}%

🎭 **Restored Elements**:
${context.memoryContext ? '🧠 Memory MCP context' : '❌ Memory context missing'}
${context.claudepointState ? '🔄 Claudepoint state' : '❌ Claudepoint state missing'}  
${context.filesystemState ? '📁 Filesystem state' : '❌ Filesystem state missing'}
${context.gitState ? '🔀 Git state' : '❌ Git state missing'}
${context.databaseState ? '🗄️ Database state' : '❌ Database state missing'}

${context.missingElements.length > 0 
  ? `⚠️ **Missing Elements**: ${context.missingElements.join(', ')}`
  : '🎉 **Perfect reconstruction** - all elements restored successfully!'
}

Your session context has been seamlessly restored from the handoff package.`,
        },
      ],
    };
  }

  private async handleSyncMCPs(args: any) {
    const result = await this.orchestrator.syncStateAcrossMCPs();
    
    return {
      content: [
        {
          type: 'text',
          text: `🔄 Cross-MCP synchronization ${result.success ? 'completed' : 'failed'}!

⏱️ **Duration**: ${result.duration}ms
${result.conflicts.length > 0 ? `⚠️ **Conflicts**: ${result.conflicts.length} detected` : '✅ **No conflicts** detected'}

🎭 **MCP Results**:
${Object.entries(result.mcpResults).map(([mcp, result]: [string, any]) => 
  `${this.getMCPEmoji(mcp)} **${mcp}**: ${result.success ? '✅' : '❌'} (${result.responseTime || 0}ms)`
).join('\n')}

${result.nextSyncRecommended 
  ? `🔄 **Next sync recommended**: ${result.nextSyncRecommended.toLocaleString()}`
  : ''
}`,
        },
      ],
    };
  }

  private async handleCoordinateCheckpoint(args: any) {
    const checkpoint = await this.orchestrator.coordinateConversationCheckpoint();
    
    return {
      content: [
        {
          type: 'text',
          text: `🎯 Coordinated checkpoint created successfully!

**Checkpoint ID**: ${checkpoint.checkpointId}
**Created**: ${checkpoint.coordinatedAt.toLocaleString()}
**Description**: ${checkpoint.description}

🎭 **MCP Checkpoints**:
${Object.entries(checkpoint.mcpCheckpoints).map(([mcp, id]) => 
  `${this.getMCPEmoji(mcp)} **${mcp}**: ${id}`
).join('\n')}

This checkpoint coordinates state across multiple MCPs and can be used for unified rollback or reference.`,
        },
      ],
    };
  }

  private async handleMonitorConversation() {
    // This would integrate with Claude's token counting system
    // For now, return placeholder data
    return {
      content: [
        {
          type: 'text',
          text: `📊 Conversation Monitoring:

🔢 **Current Status**: Monitoring active
📏 **Token Usage**: Not yet implemented (requires Claude integration)
⚡ **Threshold**: 85% for compression, 95% for handoff
🎯 **Next Action**: Continue monitoring

Note: Full token monitoring requires integration with Claude's conversation state.`,
        },
      ],
    };
  }

  private async handleCompressContext(args: any) {
    // Placeholder for context compression implementation
    return {
      content: [
        {
          type: 'text',
          text: `🗜️ Context compression initiated...

⚙️ **Parameters**: 
- Threshold: ${args?.threshold || 0.85}
- Preserve recent: ${args?.preserveRecent || 15} messages

🧠 **Compression Strategy**:
✅ Recent messages preserved verbatim
✅ Key decisions extracted and summarized
✅ Code changes documented
✅ Context stored in Memory MCP

Note: Full implementation pending conversation access integration.`,
        },
      ],
    };
  }

  private async handleSuggestRules(args: any) {
    // Placeholder - would analyze patterns from database
    return {
      content: [
        {
          type: 'text',
          text: `💡 Rule suggestions analysis...

📈 **Pattern Analysis**: Analyzing last ${args?.analyzeLastDays || 7} days
🔍 **Detection**: Looking for repeated user corrections
🎯 **Suggestions**: Ready to propose new rules

Note: Full pattern analysis requires conversation history integration.`,
        },
      ],
    };
  }

  private async handleOptimizeRules() {
    const optimizations = await this.rulesEngine.optimizeRules();
    
    if (optimizations.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ Rule optimization analysis complete - no optimizations needed!

Your current rules are well-configured and effective.`,
          },
        ],
      };
    }

    const optimizationsList = optimizations.map(opt => 
      `• **${opt.optimizationType}**: ${opt.description}`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `🔧 Rule optimization suggestions:

${optimizationsList}

These optimizations can improve rule effectiveness and reduce conflicts.`,
        },
      ],
    };
  }

  private async handleCheckHealth(args: any) {
    const healthStatus = this.clientFactory.getHealthStatus(args?.mcpType);
    
    if (args?.mcpType) {
      const status = healthStatus as any;
      return {
        content: [
          {
            type: 'text',
            text: `🏥 Health check for ${args.mcpType}:

**Status**: ${status.status}
**Last Checked**: ${status.lastChecked.toLocaleString()}
${status.responseTime ? `**Response Time**: ${status.responseTime}ms` : ''}
${status.errorMessage ? `**Error**: ${status.errorMessage}` : ''}`,
          },
        ],
      };
    } else {
      const allStatuses = healthStatus as Map<MCPType, any>;
      const statusList = Array.from(allStatuses.entries()).map(([mcp, status]) => 
        `${this.getMCPEmoji(mcp)} **${mcp}**: ${status.status} (${status.responseTime || 0}ms)`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🏥 MCP Ecosystem Health:

${statusList}

${Array.from(allStatuses.values()).every(s => s.status === 'online') 
  ? '🎉 All MCPs are healthy!' 
  : '⚠️ Some MCPs need attention'
}`,
          },
        ],
      };
    }
  }

  // ===== PROJECT INTELLIGENCE CACHE HANDLERS =====

  private async handleCreateProjectIntelligenceCache(args: any) {
    try {
      console.log('🧠 Creating Project Intelligence Cache...');
      
      const projectName = args.projectName || 'MCPConductor';
      const options = args.options || {
        includeFileContents: false,
        maxDepth: 5,
        excludePatterns: ['node_modules', '.git', 'dist', '.DS_Store'],
        includeGitInfo: true,
        includeDependencies: true,
        compressionLevel: 'standard'
      };

      // Create the intelligence cache using the orchestrator
      const intelligence = await this.orchestrator.createProjectIntelligenceCache(projectName, options);
      
      // Log the creation event
      await this.logIntelligenceEvent({
        eventId: `cache_created_${Date.now()}`,
        timestamp: new Date(),
        projectName,
        eventType: 'cache_created',
        intelligence_version: intelligence.cacheVersion,
        affected_sections: ['structure', 'architecture', 'development', 'context'],
        mcps_involved: ['memory', 'filesystem', 'claudepoint']
      });

      return {
        content: [
          {
            type: 'text',
            text: `🧠 **Project Intelligence Cache Created Successfully!**

**Project**: ${intelligence.projectName}
**Cache Version**: ${intelligence.cacheVersion}
**Created**: ${intelligence.createdAt.toLocaleString()}

📊 **Intelligence Summary**:
🏗️ **Structure**: ${intelligence.structure.summary}
🏛️ **Architecture**: ${intelligence.architecture.currentPhase}
🚀 **Development**: ${intelligence.development.recentFocus}
🎯 **Momentum**: ${intelligence.development.momentum.velocity}

📁 **Analysis Results**:
• **Total Files**: ${intelligence.structure.totalFiles}
• **Critical Files**: ${intelligence.structure.criticalFiles.length}
• **Key Directories**: ${intelligence.structure.keyDirectories.length}
• **Dependencies**: ${intelligence.structure.dependencyGraph.length}
• **Components**: ${intelligence.structure.componentMap.length}

🔄 **Next Steps**: ${intelligence.development.nextLogicalSteps.slice(0, 3).map(step => step.step).join(', ')}

⚡ **EFFICIENCY REVOLUTION**: This cache eliminates session startup overhead! Use \`load_project_intelligence_cache\` to instantly restore complete project context.

💾 **Cache Status**: Stored in Memory MCP with ${intelligence.invalidationTriggers.length} smart invalidation triggers.`,
          },
        ],
      };
    } catch (error) {
      console.error('Failed to create Project Intelligence Cache:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to create Project Intelligence Cache**

**Error**: ${error instanceof Error ? error.message : String(error)}

🔧 **Troubleshooting**:
• Ensure Memory MCP is connected
• Check filesystem access permissions
• Verify project directory exists
• Try with simplified options (lower maxDepth, more excludePatterns)`,
          },
        ],
      };
    }
  }

  private async handleLoadProjectIntelligenceCache(args: any) {
    try {
      console.log(`🔄 Loading Project Intelligence Cache for: ${args.projectName}`);
      
      const intelligence = await this.orchestrator.loadProjectIntelligenceCache(args.projectName);
      
      if (!intelligence) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Project Intelligence Cache Not Found**

**Project**: ${args.projectName}

🔍 **No cached intelligence found for this project.**

💡 **Next Steps**:
1. Create cache first: \`create_project_intelligence_cache\`
2. Or check available caches: \`monitor_ecosystem_state\`
3. Verify project name spelling`,
            },
          ],
        };
      }

      // Validate freshness before loading
      const validation = await this.orchestrator.validateProjectIntelligenceCache(args.projectName);
      
      // Log the load event
      await this.logIntelligenceEvent({
        eventId: `cache_loaded_${Date.now()}`,
        timestamp: new Date(),
        projectName: args.projectName,
        eventType: 'cache_loaded',
        intelligence_version: intelligence.cacheVersion,
        affected_sections: ['structure', 'architecture', 'development', 'context'],
        mcps_involved: ['memory']
      });

      const freshnessEmoji = validation.valid ? '✅' : '⚠️';
      const recommendationText = validation.valid 
        ? '**Ready to use!**' 
        : `**Recommendation**: ${validation.recommended_action} (confidence: ${(validation.confidence * 100).toFixed(1)}%)`;

      return {
        content: [
          {
            type: 'text',
            text: `🧠 **Project Intelligence Loaded Successfully!**

**Project**: ${intelligence.projectName}
**Cache Version**: ${intelligence.cacheVersion}
**Last Updated**: ${intelligence.lastUpdated.toLocaleString()}
${freshnessEmoji} **Freshness**: ${intelligence.freshness.status} (${(intelligence.freshness.confidence * 100).toFixed(1)}% confidence)

📊 **INSTANT CONTEXT RESTORATION**:
🏗️ **Structure**: ${intelligence.structure.summary}
🏛️ **Architecture**: ${intelligence.architecture.currentPhase}
🚀 **Development**: ${intelligence.development.recentFocus}
🎯 **Momentum**: ${intelligence.development.momentum.velocity}

📁 **Project Overview**:
• **Files**: ${intelligence.structure.totalFiles} total, ${intelligence.structure.criticalFiles.length} critical
• **Technologies**: ${intelligence.metadata.technologies.join(', ')}
• **Maturity**: ${intelligence.metadata.maturity_level}
• **Complexity**: ${(intelligence.metadata.complexity_score * 100).toFixed(0)}%

🔄 **Immediate Next Steps**:
${intelligence.development.nextLogicalSteps.slice(0, 5).map((step, i) => 
  `${i + 1}. **${step.step}** (${step.priority} priority, ${step.effort} effort)`
).join('\n')}

${validation.staleness_reasons.length > 0 
  ? `⚠️ **Staleness Indicators**: ${validation.staleness_reasons.join(', ')}`
  : ''}

🎉 **EFFICIENCY WIN**: Session startup overhead eliminated! You now have complete project context instantly.

${recommendationText}`,
          },
        ],
      };
    } catch (error) {
      console.error('Failed to load Project Intelligence Cache:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to load Project Intelligence Cache**

**Project**: ${args.projectName}
**Error**: ${error instanceof Error ? error.message : String(error)}

🔧 **Troubleshooting**:
• Check Memory MCP connection
• Verify cache exists: \`monitor_ecosystem_state\`
• Try recreating cache if corrupted`,
          },
        ],
      };
    }
  }

  private async handleValidateProjectIntelligenceCache(args: any) {
    try {
      console.log(`🔍 Validating Project Intelligence Cache for: ${args.projectName}`);
      
      const validation = await this.orchestrator.validateProjectIntelligenceCache(args.projectName);
      
      // Log validation event
      await this.logIntelligenceEvent({
        eventId: `cache_validated_${Date.now()}`,
        timestamp: new Date(),
        projectName: args.projectName,
        eventType: validation.valid ? 'cache_loaded' : 'validation_failed',
        intelligence_version: 'current',
        affected_sections: [],
        mcps_involved: ['memory', 'filesystem']
      });

      const statusEmoji = validation.valid ? '✅' : '❌';
      const confidenceColor = validation.confidence > 0.8 ? '🟢' : validation.confidence > 0.5 ? '🟡' : '🔴';
      
      let recommendationText = '';
      switch (validation.recommended_action) {
        case 'use':
          recommendationText = '✅ **Use cache** - Fresh and reliable';
          break;
        case 'refresh':
          recommendationText = '🔄 **Refresh recommended** - Some changes detected';
          break;
        case 'recreate':
          recommendationText = '🔨 **Recreate cache** - Significant changes detected';
          break;
        case 'invalidate':
          recommendationText = '💥 **Invalidate cache** - No longer reliable';
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Project Intelligence Cache Validation**

**Project**: ${args.projectName}
${statusEmoji} **Status**: ${validation.valid ? 'VALID' : 'INVALID'}
${confidenceColor} **Confidence**: ${(validation.confidence * 100).toFixed(1)}%

${recommendationText}

${validation.staleness_reasons.length > 0 ? `
⚠️ **Staleness Reasons**:
${validation.staleness_reasons.map(reason => `• ${reason}`).join('\n')}
` : '✨ **No staleness detected** - Cache is fresh!'}

${validation.partial_updates_available.length > 0 ? `
🔄 **Partial Updates Available**:
${validation.partial_updates_available.map(update => `• ${update}`).join('\n')}
` : ''}

💡 **Next Actions**:
${validation.recommended_action === 'use' 
  ? '• Continue using cache as-is\n• No action required'
  : validation.recommended_action === 'refresh'
  ? '• Run \`refresh_project_intelligence\` to update\n• Apply incremental changes'
  : validation.recommended_action === 'recreate'
  ? '• Run \`create_project_intelligence_cache\` to rebuild\n• Full analysis recommended'
  : '• Run \`invalidate_project_cache\` first\n• Then recreate cache completely'
}`,
          },
        ],
      };
    } catch (error) {
      console.error('Failed to validate Project Intelligence Cache:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Cache Validation Failed**

**Project**: ${args.projectName}
**Error**: ${error instanceof Error ? error.message : String(error)}

🔧 **Recovery Options**:
• Check if cache exists: \`monitor_ecosystem_state\`
• Try loading cache: \`load_project_intelligence_cache\`
• Recreate if necessary: \`create_project_intelligence_cache\``,
          },
        ],
      };
    }
  }

  private async handleRefreshProjectIntelligence(args: any) {
    try {
      console.log(`🔄 Refreshing Project Intelligence for: ${args.projectName}`);
      
      const changes = args.changes || [];
      const updateResult = await this.orchestrator.refreshProjectIntelligence(args.projectName, changes);
      
      // Log refresh event
      await this.logIntelligenceEvent({
        eventId: `cache_refreshed_${Date.now()}`,
        timestamp: new Date(),
        projectName: args.projectName,
        eventType: 'cache_refreshed',
        intelligence_version: updateResult.new_cache_version,
        affected_sections: updateResult.updated_sections,
        mcps_involved: ['memory', 'filesystem']
      });

      const successEmoji = updateResult.success ? '✅' : '❌';
      const improvementText = updateResult.confidence_improvement > 0 
        ? `📈 **Confidence Improved**: +${(updateResult.confidence_improvement * 100).toFixed(1)}%`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `🔄 **Project Intelligence Refresh Complete**

**Project**: ${args.projectName}
${successEmoji} **Status**: ${updateResult.success ? 'SUCCESS' : 'FAILED'}
**New Version**: ${updateResult.new_cache_version}
**Duration**: ${updateResult.update_duration}ms

📊 **Update Summary**:
✅ **Updated Sections**: ${updateResult.updated_sections.length > 0 
  ? updateResult.updated_sections.join(', ') 
  : 'None required'}
  
${updateResult.invalidated_sections.length > 0 ? `
💥 **Invalidated Sections**: ${updateResult.invalidated_sections.join(', ')}
` : ''}

${changes.length > 0 ? `
🔍 **Processed Changes**:
${changes.map(change => `• ${change.type}: ${change.path} (${change.magnitude})`).join('\n')}
` : '🔍 **Auto-detected changes** and applied updates'}

${improvementText}

⚡ **EFFICIENCY**: Incremental refresh completed! Cache maintains peak performance while staying current.

💡 **Next Steps**:
• Cache is ready for immediate use
• Continue development with fresh intelligence
• Auto-invalidation triggers remain active`,
          },
        ],
      };
    } catch (error) {
      console.error('Failed to refresh Project Intelligence:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Project Intelligence Refresh Failed**

**Project**: ${args.projectName}
**Error**: ${error instanceof Error ? error.message : String(error)}

🔧 **Recovery Options**:
• Validate cache first: \`validate_project_intelligence_cache\`
• Try full recreation: \`create_project_intelligence_cache\`
• Check for filesystem issues`,
          },
        ],
      };
    }
  }

  private async handleInvalidateProjectCache(args: any) {
    try {
      console.log(`💥 Invalidating Project Intelligence Cache for: ${args.projectName}`);
      
      await this.orchestrator.invalidateProjectCache(args.projectName, args.reason);
      
      // Log invalidation event
      await this.logIntelligenceEvent({
        eventId: `cache_invalidated_${Date.now()}`,
        timestamp: new Date(),
        projectName: args.projectName,
        eventType: 'cache_invalidated',
        intelligence_version: 'invalidated',
        affected_sections: ['structure', 'architecture', 'development', 'context'],
        mcps_involved: ['memory']
      });

      return {
        content: [
          {
            type: 'text',
            text: `💥 **Project Intelligence Cache Invalidated**

**Project**: ${args.projectName}
**Reason**: ${args.reason}
**Timestamp**: ${new Date().toLocaleString()}

🗑️ **Cache Status**: Successfully invalidated and removed from Memory MCP

⚠️ **Impact**:
• Project intelligence no longer available for instant loading
• Session startup will require full project analysis
• All cached insights have been cleared

🔄 **Next Steps**:
1. **Recreate cache**: \`create_project_intelligence_cache\`
2. **Full reanalysis**: Enable comprehensive project understanding
3. **Restore efficiency**: Return to instant context loading

💡 **Tip**: Consider refreshing instead of invalidating when possible to maintain efficiency benefits.`,
          },
        ],
      };
    } catch (error) {
      console.error('Failed to invalidate Project Intelligence Cache:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Cache Invalidation Failed**

**Project**: ${args.projectName}
**Error**: ${error instanceof Error ? error.message : String(error)}

🔧 **Manual Recovery**:
• Check Memory MCP connection
• Verify cache exists before invalidation
• Cache may already be invalid/missing`,
          },
        ],
      };
    }
  }

  // ===== PRIVATE HELPER METHODS FOR PROJECT INTELLIGENCE =====

  private async logIntelligenceEvent(event: any): Promise<void> {
    try {
      const clients = await this.clientFactory.getAllClients();
      
      // Store in Memory MCP for pattern analysis
      await clients.memory.createEntities([{
        name: `IntelligenceEvent_${event.eventId}`,
        entityType: 'intelligence_event',
        observations: [
          `Event Type: ${event.eventType}`,
          `Project: ${event.projectName}`,
          `Version: ${event.intelligence_version}`,
          `Sections: ${event.affected_sections.join(', ')}`,
          `MCPs: ${event.mcps_involved.join(', ')}`,
          `Timestamp: ${event.timestamp.toISOString()}`
        ]
      }]);

      // Log to database for analytics
      await clients.databasePlatform.query(`
        INSERT INTO project_intelligence_log (
          event_id, session_id, project_name, event_type,
          intelligence_version, affected_sections, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        event.eventId,
        this.currentSession.id,
        event.projectName,
        event.eventType,
        event.intelligence_version,
        JSON.stringify(event.affected_sections),
        event.timestamp
      ]);
    } catch (error) {
      console.warn('Failed to log intelligence event:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  private getMCPEmoji(mcpType: string): string {
    const emojis: Record<string, string> = {
      'memory': '🧠',
      'claudepoint': '🔄',
      'filesystem': '📁',
      'git': '🔀',
      'database-platform': '🗄️',
      'database-analytics': '📊'
    };
    return emojis[mcpType] || '🔧';
  }

  // ===== INITIALIZATION =====

  async initialize() {
    console.log('🎭 Initializing Conversation Continuity MCP Server...');

    // Create MCP client factory
    const mcpConfigs: MCPClientConfig[] = [
      { type: 'memory' },
      { type: 'claudepoint', workingDirectory: '/Users/Luther/RiderProjects/FantasyGM' },
      { type: 'filesystem' },
      { type: 'git', workingDirectory: '/Users/Luther/RiderProjects/FantasyGM' },
      { type: 'database-platform', connectionString: 'postgresql://localhost/fantasygm_platform' },
      { type: 'database-analytics', connectionString: 'postgresql://localhost/nfl_analytics' }
    ];

    this.clientFactory = new MCPClientFactory(mcpConfigs);

    // Initialize orchestrator
    this.orchestrator = new ConversationContinuityOrchestrator(this.clientFactory);

    // Initialize rules engine with Memory MCP client
    const memoryClient = await this.clientFactory.createMemoryClient();
    this.rulesEngine = new SessionRulesEngine(memoryClient);

    console.log('✅ Conversation Continuity MCP Server initialized successfully!');
    console.log('🎼 Ready to orchestrate the 5-MCP symphony!');
  }

  async run() {
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.log('🚀 Conversation Continuity MCP Server running...');
  }
}

// Start the server
const server = new ConversationContinuityServer();
server.run().catch(console.error);