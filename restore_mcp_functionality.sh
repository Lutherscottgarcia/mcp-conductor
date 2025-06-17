#!/bin/bash
# /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity/restore_mcp_functionality.sh

# MCP Functionality Restoration Script
# Ensures Memory MCP, Filesystem MCP, Claudepoint MCP, and Project Intelligence Cache are working

echo "🔧 MCP Functionality Restoration Script"
echo "======================================="
echo ""

# Function to check if Claude Desktop is running
check_claude_running() {
    if pgrep -f "Claude" > /dev/null; then
        echo "✅ Claude Desktop is running"
        return 0
    else
        echo "❌ Claude Desktop is not running - please start Claude Desktop first"
        return 1
    fi
}

# Function to test NPX MCP packages
test_npx_packages() {
    echo "🧪 Testing NPX MCP packages..."
    
    # Test Memory MCP
    echo "Testing Memory MCP..."
    timeout 5s npx -y @modelcontextprotocol/server-memory > /dev/null 2>&1 &
    memory_pid=$!
    sleep 2
    if kill -0 $memory_pid 2>/dev/null; then
        echo "✅ Memory MCP package works"
        kill $memory_pid 2>/dev/null
    else
        echo "❌ Memory MCP package failed"
    fi
    
    # Test Filesystem MCP
    echo "Testing Filesystem MCP..."
    timeout 5s npx -y @modelcontextprotocol/server-filesystem /Users/Luther/RiderProjects > /dev/null 2>&1 &
    filesystem_pid=$!
    sleep 2
    if kill -0 $filesystem_pid 2>/dev/null; then
        echo "✅ Filesystem MCP package works"
        kill $filesystem_pid 2>/dev/null
    else
        echo "❌ Filesystem MCP package failed"
    fi
}

# Function to check Claude Desktop config
check_config() {
    echo ""
    echo "📋 Checking Claude Desktop configuration..."
    
    config_file="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    
    if [[ -f "$config_file" ]]; then
        echo "✅ Config file exists: $config_file"
        
        # Check for required MCPs
        if grep -q '"memory"' "$config_file"; then
            echo "✅ Memory MCP configured"
        else
            echo "❌ Memory MCP not configured"
        fi
        
        if grep -q '"filesystem"' "$config_file"; then
            echo "✅ Filesystem MCP configured" 
        else
            echo "❌ Filesystem MCP not configured"
        fi
        
        if grep -q '"conversation-continuity"' "$config_file"; then
            echo "✅ Conversation-continuity MCP configured"
        else
            echo "❌ Conversation-continuity MCP not configured"
        fi
    else
        echo "❌ Config file not found: $config_file"
        echo "   Run: cp claude_desktop_config_UPGRADED.json '$config_file'"
    fi
}

# Function to test build status
check_build() {
    echo ""
    echo "🏗️ Checking build status..."
    
    if [[ -f "dist/index.js" ]]; then
        echo "✅ Build exists: dist/index.js"
        echo "📅 Last modified: $(stat -f %Sm dist/index.js)"
    else
        echo "❌ Build missing - run: npm run build"
    fi
}

# Main restoration steps
main() {
    echo "Starting MCP restoration process..."
    echo ""
    
    # Check if Claude Desktop is running
    if ! check_claude_running; then
        echo ""
        echo "🚨 Please start Claude Desktop and run this script again"
        exit 1
    fi
    
    # Test NPX packages
    test_npx_packages
    
    # Check configuration
    check_config
    
    # Check build status
    check_build
    
    echo ""
    echo "📋 Next Steps in Claude Desktop:"
    echo "================================"
    echo ""
    echo "1. Open a NEW conversation in Claude Desktop"
    echo ""
    echo "2. Test MCP functionality:"
    echo "   check_mcp_health"
    echo ""
    echo "3. Test Memory MCP:"
    echo "   read_graph"
    echo ""
    echo "4. Test Filesystem MCP:"
    echo "   list_directory({\"path\": \"/Users/Luther/RiderProjects\"})"
    echo ""
    echo "5. Create/verify Project Intelligence Cache:"
    echo "   create_entities([{\"name\": \"ProjectIntelligence_MCPConductor_EFFICIENCY_COMPLETE\", \"entityType\": \"project_intelligence\", \"observations\": [\"MCP Conductor - Revolutionary system with working Memory, Filesystem, and Claudepoint MCPs\"]}])"
    echo ""
    echo "6. Use the Magic Incantation:"
    echo "   Load ProjectIntelligence_MCPConductor_EFFICIENCY_COMPLETE from Memory MCP - instant context!"
    echo ""
    echo "🎯 If any tests fail:"
    echo "   - Restart Claude Desktop completely (⌘+Q, wait 10 seconds, restart)"
    echo "   - Check that config file matches claude_desktop_config_UPGRADED.json"
    echo "   - Run 'npm run build' if dist/index.js is missing/old"
    echo ""
    echo "✅ When all tests pass, you're ready for FantasyGM database work!"
}

# Run main function
main
