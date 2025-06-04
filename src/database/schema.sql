-- /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/src/database/schema.sql

-- Database schema extensions for existing PostgreSQL databases
-- These tables will be added to Luther's existing fantasygm_platform and nfl_analytics databases

-- ===== FANTASYGM_PLATFORM DATABASE EXTENSIONS =====

-- Conversation sessions with MCP coordination
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    claudepoint_checkpoint_id VARCHAR(255) NULL,
    memory_entity_ids TEXT[] NULL,
    git_commit_hash VARCHAR(255) NULL,
    conversation_token_count INTEGER DEFAULT 0,
    effectiveness_score FLOAT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- MCP coordination activity log
CREATE TABLE IF NOT EXISTS mcp_coordination_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    coordination_type VARCHAR(50) NOT NULL CHECK (coordination_type IN (
        'handoff', 'rule_enforcement', 'context_sync', 'state_update', 
        'checkpoint_creation', 'context_compression', 'rule_violation'
    )),
    mcps_involved TEXT[] NOT NULL,
    coordination_success BOOLEAN NOT NULL,
    response_time_ms INTEGER DEFAULT NULL,
    metadata JSONB DEFAULT '{}',
    error_message TEXT DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Session rules tracking (complementary to Memory MCP storage)
CREATE TABLE IF NOT EXISTS session_rules_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(255) NOT NULL,
    rule_text TEXT NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    enforcement_level VARCHAR(50) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    violation_count INTEGER DEFAULT 0,
    effectiveness_score FLOAT DEFAULT NULL,
    last_used TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unified handoff packages tracking
CREATE TABLE IF NOT EXISTS unified_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handoff_id VARCHAR(255) UNIQUE NOT NULL,
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    memory_entities TEXT[] DEFAULT '{}',
    claudepoint_checkpoint_id VARCHAR(255) NOT NULL,
    git_commit_hash VARCHAR(255) DEFAULT NULL,
    filesystem_snapshot_hash VARCHAR(255) DEFAULT NULL,
    reconstruction_success BOOLEAN DEFAULT NULL,
    reconstruction_accuracy FLOAT DEFAULT NULL,
    reconstruction_time_ms INTEGER DEFAULT NULL,
    user_satisfaction_score FLOAT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    reconstructed_at TIMESTAMP DEFAULT NULL
);

-- Cross-MCP relationship tracking
CREATE TABLE IF NOT EXISTS mcp_cross_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handoff_id VARCHAR(255) REFERENCES unified_handoffs(handoff_id) ON DELETE CASCADE,
    source_mcp VARCHAR(50) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    target_mcp VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- MCP pattern analytics for learning
CREATE TABLE IF NOT EXISTS mcp_pattern_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(100) NOT NULL,
    pattern_description TEXT NOT NULL,
    mcps_involved TEXT[] NOT NULL,
    success_rate FLOAT DEFAULT 0.0,
    optimization_suggestion TEXT DEFAULT NULL,
    usage_count INTEGER DEFAULT 1,
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_project 
    ON conversation_sessions(user_id, project_name);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_start_time 
    ON conversation_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_mcp_coordination_log_session 
    ON mcp_coordination_log(session_id);

CREATE INDEX IF NOT EXISTS idx_mcp_coordination_log_type_timestamp 
    ON mcp_coordination_log(coordination_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_session_rules_analytics_rule_id 
    ON session_rules_analytics(rule_id);

CREATE INDEX IF NOT EXISTS idx_unified_handoffs_handoff_id 
    ON unified_handoffs(handoff_id);

CREATE INDEX IF NOT EXISTS idx_unified_handoffs_session 
    ON unified_handoffs(session_id);

CREATE INDEX IF NOT EXISTS idx_mcp_cross_references_handoff 
    ON mcp_cross_references(handoff_id);

CREATE INDEX IF NOT EXISTS idx_mcp_pattern_analytics_type 
    ON mcp_pattern_analytics(pattern_type);

-- ===== NFL_ANALYTICS DATABASE EXTENSIONS =====
-- (These tables would be created in the nfl_analytics database)

-- Conversation effectiveness metrics for analytics
CREATE TABLE IF NOT EXISTS conversation_effectiveness_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL, -- References conversation_sessions from platform DB
    context_reconstruction_accuracy FLOAT DEFAULT NULL,
    handoff_success_rate FLOAT DEFAULT NULL,
    rule_compliance_rate FLOAT DEFAULT NULL,
    user_satisfaction_score FLOAT DEFAULT NULL,
    token_efficiency_ratio FLOAT DEFAULT NULL,
    mcp_coordination_latency_ms INTEGER DEFAULT NULL,
    total_mcp_operations INTEGER DEFAULT 0,
    successful_mcp_operations INTEGER DEFAULT 0,
    analysis_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User workflow patterns for learning
CREATE TABLE IF NOT EXISTS user_workflow_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSONB NOT NULL DEFAULT '{}',
    effectiveness_score FLOAT DEFAULT NULL,
    frequency_count INTEGER DEFAULT 1,
    confidence_score FLOAT DEFAULT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Context usage patterns for optimization
CREATE TABLE IF NOT EXISTS context_usage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    context_type VARCHAR(100) NOT NULL,
    context_size_tokens INTEGER DEFAULT NULL,
    retrieval_time_ms INTEGER DEFAULT NULL,
    usage_effectiveness FLOAT DEFAULT NULL,
    compression_ratio FLOAT DEFAULT NULL,
    user_found_useful BOOLEAN DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- MCP performance metrics
CREATE TABLE IF NOT EXISTS mcp_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcp_type VARCHAR(50) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_type VARCHAR(100) DEFAULT NULL,
    payload_size_bytes INTEGER DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    session_id UUID DEFAULT NULL
);

-- ===== ANALYTICS INDEXES =====

CREATE INDEX IF NOT EXISTS idx_conversation_effectiveness_session 
    ON conversation_effectiveness_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_conversation_effectiveness_date 
    ON conversation_effectiveness_metrics(analysis_date);

CREATE INDEX IF NOT EXISTS idx_user_workflow_patterns_user 
    ON user_workflow_patterns(user_id);

CREATE INDEX IF NOT EXISTS idx_user_workflow_patterns_type 
    ON user_workflow_patterns(pattern_type);

CREATE INDEX IF NOT EXISTS idx_context_usage_patterns_session 
    ON context_usage_patterns(session_id);

CREATE INDEX IF NOT EXISTS idx_context_usage_patterns_type 
    ON context_usage_patterns(context_type);

CREATE INDEX IF NOT EXISTS idx_mcp_performance_metrics_type_timestamp 
    ON mcp_performance_metrics(mcp_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_mcp_performance_metrics_session 
    ON mcp_performance_metrics(session_id);

-- ===== SAMPLE DATA INSERTION =====

-- Insert sample coordination patterns
INSERT INTO mcp_pattern_analytics (pattern_type, pattern_description, mcps_involved, success_rate) VALUES
    ('handoff_creation', 'Creating unified handoff packages', ARRAY['memory', 'claudepoint', 'filesystem', 'git', 'database'], 0.95),
    ('rule_enforcement', 'Enforcing session rules via Memory MCP', ARRAY['memory', 'database'], 0.88),
    ('context_sync', 'Synchronizing context across MCPs', ARRAY['memory', 'filesystem', 'git'], 0.92),
    ('checkpoint_coordination', 'Coordinating checkpoints across MCPs', ARRAY['claudepoint', 'memory', 'database'], 0.90)
ON CONFLICT DO NOTHING;

-- Insert sample workflow patterns
INSERT INTO user_workflow_patterns (user_id, pattern_name, pattern_type, pattern_data, effectiveness_score, frequency_count) VALUES
    ('luther', 'approval_before_artifacts', 'user_preference', '{"triggers": ["artifact_create", "file_modify"], "enforcement": "hard_block"}', 0.95, 25),
    ('luther', 'architecture_check_first', 'workflow_pattern', '{"triggers": ["new_feature", "refactor"], "effectiveness": 0.85}', 0.85, 18),
    ('luther', 'documentation_updates', 'quality_gate', '{"triggers": ["major_change"], "compliance_rate": 0.90}', 0.90, 12)
ON CONFLICT DO NOTHING;

-- ===== FUNCTIONS AND TRIGGERS =====

-- Function to update effectiveness scores based on user feedback
CREATE OR REPLACE FUNCTION update_rule_effectiveness()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE session_rules_analytics 
    SET effectiveness_score = (
        CASE 
            WHEN NEW.coordination_success THEN 
                COALESCE(effectiveness_score, 0.5) + 0.1
            ELSE 
                GREATEST(0.0, COALESCE(effectiveness_score, 0.5) - 0.2)
        END
    ),
    updated_at = NOW()
    WHERE rule_id = (NEW.metadata->>'ruleId')
    AND NEW.coordination_type = 'rule_enforcement';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update rule effectiveness
CREATE TRIGGER trigger_update_rule_effectiveness
    AFTER INSERT ON mcp_coordination_log
    FOR EACH ROW
    WHEN (NEW.coordination_type = 'rule_enforcement' AND NEW.metadata ? 'ruleId')
    EXECUTE FUNCTION update_rule_effectiveness();

-- Function to calculate session effectiveness
CREATE OR REPLACE FUNCTION calculate_session_effectiveness(session_uuid UUID)
RETURNS FLOAT AS $$
DECLARE
    total_operations INTEGER;
    successful_operations INTEGER;
    rule_compliance_rate FLOAT;
    effectiveness FLOAT;
BEGIN
    -- Count total and successful MCP operations
    SELECT 
        COUNT(*), 
        COUNT(*) FILTER (WHERE coordination_success = true)
    INTO total_operations, successful_operations
    FROM mcp_coordination_log 
    WHERE session_id = session_uuid;
    
    -- Calculate rule compliance rate
    SELECT 
        COALESCE(
            COUNT(*) FILTER (WHERE coordination_success = true)::FLOAT / 
            NULLIF(COUNT(*), 0), 
            1.0
        )
    INTO rule_compliance_rate
    FROM mcp_coordination_log 
    WHERE session_id = session_uuid 
    AND coordination_type = 'rule_enforcement';
    
    -- Calculate overall effectiveness
    effectiveness := (
        CASE WHEN total_operations > 0 
        THEN (successful_operations::FLOAT / total_operations) * 0.7 + rule_compliance_rate * 0.3
        ELSE 1.0 END
    );
    
    RETURN GREATEST(0.0, LEAST(1.0, effectiveness));
END;
$$ LANGUAGE plpgsql;

-- ===== VIEWS FOR EASY QUERYING =====

-- View for session overview with effectiveness
CREATE OR REPLACE VIEW session_overview AS
SELECT 
    cs.id,
    cs.user_id,
    cs.project_name,
    cs.start_time,
    cs.end_time,
    cs.conversation_token_count,
    cs.claudepoint_checkpoint_id,
    calculate_session_effectiveness(cs.id) as calculated_effectiveness,
    COUNT(mcl.id) as total_mcp_operations,
    COUNT(mcl.id) FILTER (WHERE mcl.coordination_success = true) as successful_operations,
    COUNT(uh.id) as handoff_count
FROM conversation_sessions cs
LEFT JOIN mcp_coordination_log mcl ON cs.id = mcl.session_id
LEFT JOIN unified_handoffs uh ON cs.id = uh.session_id
GROUP BY cs.id, cs.user_id, cs.project_name, cs.start_time, cs.end_time, 
         cs.conversation_token_count, cs.claudepoint_checkpoint_id;

-- View for MCP health summary
CREATE OR REPLACE VIEW mcp_health_summary AS
SELECT 
    mcp_type,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    ROUND(AVG(response_time_ms)::NUMERIC, 2) as avg_response_time_ms,
    ROUND((COUNT(*) FILTER (WHERE success = true)::FLOAT / COUNT(*))::NUMERIC, 3) as success_rate,
    MAX(timestamp) as last_operation
FROM mcp_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY mcp_type
ORDER BY success_rate DESC;

-- View for rule effectiveness summary
CREATE OR REPLACE VIEW rule_effectiveness_summary AS
SELECT 
    sra.rule_id,
    sra.rule_text,
    sra.rule_type,
    sra.enforcement_level,
    sra.usage_count,
    sra.violation_count,
    sra.effectiveness_score,
    ROUND((sra.usage_count::FLOAT / NULLIF(sra.usage_count + sra.violation_count, 0))::NUMERIC, 3) as compliance_rate,
    sra.last_used,
    sra.updated_at
FROM session_rules_analytics sra
ORDER BY sra.effectiveness_score DESC NULLS LAST;