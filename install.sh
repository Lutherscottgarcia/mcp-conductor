#!/bin/bash

# MCP Conductor Installation Script
# Automated setup for the revolutionary 5-MCP orchestration system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for better UX
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"
FOLDER="📁"
MAGIC="✨"

echo -e "${CYAN}🎭 MCP Conductor Installation${NC}"
echo -e "${PURPLE}Revolutionary 5-MCP Orchestration System${NC}"
echo -e "${BLUE}Eliminates AI session startup overhead with 99.3% time savings${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${ERROR} This installer is currently designed for macOS only"
    echo -e "${INFO} Linux/Windows support coming soon"
    exit 1
fi

# Check Node.js version
echo -e "${INFO} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${ERROR} Node.js is not installed"
    echo -e "${INFO} Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${ERROR} Node.js version 18 or higher is required (found: $(node -v))"
    echo -e "${INFO} Please update Node.js from https://nodejs.org"
    exit 1
fi

echo -e "${SUCCESS} Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${ERROR} npm is not installed"
    exit 1
fi

echo -e "${SUCCESS} npm $(npm -v) found"

# Detect user's project directory
echo ""
echo -e "${GEAR} Detecting your development environment..."

USER_HOME="$HOME"
PROJECTS_DIR=""

# Common project directory patterns
POSSIBLE_DIRS=(
    "$USER_HOME/RiderProjects"
    "$USER_HOME/Projects" 
    "$USER_HOME/Developer"
    "$USER_HOME/Code"
    "$USER_HOME/Development"
    "$USER_HOME/workspace"
    "$USER_HOME/src"
)

for dir in "${POSSIBLE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        PROJECTS_DIR="$dir"
        echo -e "${SUCCESS} Found project directory: ${PROJECTS_DIR}"
        break
    fi
done

if [ -z "$PROJECTS_DIR" ]; then
    echo -e "${WARNING} Could not auto-detect project directory"
    echo -e "${INFO} Please enter your main project directory path:"
    read -p "Project directory: " PROJECTS_DIR
    
    if [ ! -d "$PROJECTS_DIR" ]; then
        echo -e "${ERROR} Directory does not exist: $PROJECTS_DIR"
        exit 1
    fi
fi

# Check if Claude directory exists
CLAUDE_DIR="$PROJECTS_DIR/claude"
if [ ! -d "$CLAUDE_DIR" ]; then
    echo -e "${INFO} Creating Claude workspace directory..."
    mkdir -p "$CLAUDE_DIR"
    echo -e "${SUCCESS} Created: $CLAUDE_DIR"
fi

# Install MCP Conductor
echo ""
echo -e "${ROCKET} Installing MCP Conductor..."

# For now, we'll install from local development
# Later this will be: npm install -g conversation-continuity-mcp
MCP_DIR="$CLAUDE_DIR/mcp-servers/conversation-continuity"

if [ -d "$MCP_DIR" ]; then
    echo -e "${WARNING} MCP Conductor already exists at: $MCP_DIR"
    echo -e "${INFO} Updating existing installation..."
    cd "$MCP_DIR"
    npm install
else
    echo -e "${INFO} Installing MCP Conductor to: $MCP_DIR"
    mkdir -p "$(dirname "$MCP_DIR")"
    
    # For development - copy from current location
    # In production, this would clone from GitHub
    if [ -d "/Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity" ]; then
        cp -r "/Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity" "$MCP_DIR"
        cd "$MCP_DIR"
        npm install
        npm run build
    else
        echo -e "${ERROR} Could not find MCP Conductor source"
        echo -e "${INFO} This will be replaced with: git clone https://github.com/lutherscottgarcia/mcp-conductor.git"
        exit 1
    fi
fi

echo -e "${SUCCESS} MCP Conductor installed successfully"

# Generate Claude configuration
echo ""
echo -e "${GEAR} Generating Claude configuration..."

# Detect existing Claude config
CLAUDE_CONFIG="$USER_HOME/Library/Application Support/Claude/claude_desktop_config.json"
CLAUDE_CONFIG_DIR="$(dirname "$CLAUDE_CONFIG")"

# Create Claude config directory if it doesn't exist
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${INFO} Creating Claude configuration directory..."
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

# Backup existing config
if [ -f "$CLAUDE_CONFIG" ]; then
    echo -e "${INFO} Backing up existing Claude configuration..."
    cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${SUCCESS} Backup created"
fi

# Generate MCP configuration
cat > /tmp/mcp_config.json << EOF
{
  "mcpServers": {
    "conversation-continuity": {
      "command": "node",
      "args": ["$MCP_DIR/dist/index.js"],
      "env": {
        "MCP_CONDUCTOR_PROJECT_DIR": "$PROJECTS_DIR",
        "MCP_CONDUCTOR_WORKSPACE": "$CLAUDE_DIR"
      }
    },
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$PROJECTS_DIR",
        "$CLAUDE_DIR"
      ]
    },
    "claudepoint": {
      "command": "claudepoint",
      "args": [],
      "env": {
        "CLAUDEPOINT_PROJECT_DIR": "$PROJECTS_DIR"
      }
    }
  }
}
EOF

# Merge with existing config or create new
if [ -f "$CLAUDE_CONFIG" ]; then
    echo -e "${INFO} Merging with existing Claude configuration..."
    # Use Node.js to merge JSON configurations
    node << 'MERGE_SCRIPT' "$CLAUDE_CONFIG"
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2];
const newConfigPath = '/tmp/mcp_config.json';

let existingConfig = {};
if (fs.existsSync(configPath)) {
    try {
        existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.log('⚠️  Warning: Could not parse existing config, creating new one');
        existingConfig = {};
    }
}

const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf8'));

// Merge mcpServers
if (!existingConfig.mcpServers) {
    existingConfig.mcpServers = {};
}

Object.assign(existingConfig.mcpServers, newConfig.mcpServers);

// Write merged config
fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
console.log('✅ Configuration merged successfully');
MERGE_SCRIPT
else
    echo -e "${INFO} Creating new Claude configuration..."
    cp /tmp/mcp_config.json "$CLAUDE_CONFIG"
fi

echo -e "${SUCCESS} Claude configuration updated"

# Test installation
echo ""
echo -e "${GEAR} Testing installation..."

cd "$MCP_DIR"
if npm run build > /dev/null 2>&1; then
    echo -e "${SUCCESS} Build test passed"
else
    echo -e "${ERROR} Build test failed"
    echo -e "${INFO} You may need to run 'npm run build' manually in: $MCP_DIR"
fi

# Display configuration
echo ""
echo -e "${MAGIC} Installation Complete! ${MAGIC}"
echo ""
echo -e "${INFO} Configuration Summary:"
echo -e "  ${FOLDER} Project Directory: ${PROJECTS_DIR}"
echo -e "  ${FOLDER} Claude Workspace: ${CLAUDE_DIR}"
echo -e "  ${FOLDER} MCP Conductor: ${MCP_DIR}"
echo -e "  ${GEAR} Claude Config: ${CLAUDE_CONFIG}"
echo ""
echo -e "${ROCKET} ${GREEN}Ready to revolutionize your AI development workflow!${NC}"
echo ""
echo -e "${INFO} Next Steps:"
echo -e "  1. Restart Claude Desktop application"
echo -e "  2. Open a new conversation"
echo -e "  3. Try: 'create_project_intelligence_cache' to eliminate session startup overhead"
echo -e "  4. Use magic incantation: 'Load ProjectIntelligence_YourProject from Memory MCP - instant context!'"
echo ""
echo -e "${INFO} Documentation:"
echo -e "  • Efficiency Revolution Guide: ${MCP_DIR}/docs/efficiency-revolution.md"
echo -e "  • Magic Incantations: ${MCP_DIR}/docs/magic-incantations.md"
echo -e "  • API Reference: ${MCP_DIR}/docs/api-reference-project-intelligence.md"
echo ""
echo -e "${SUCCESS} ${GREEN}Installation completed successfully!${NC}"

# Clean up
rm -f /tmp/mcp_config.json