#!/bin/bash

# Setup script for Memory MCP integration
# This script helps configure the environment for proper MCP client-server communication

echo "=== Memory MCP Integration Setup ==="
echo

# Check if memory-mcp is available
if [ -z "$MEMORY_MCP_PATH" ]; then
    echo "❌ MEMORY_MCP_PATH environment variable not set"
    echo
    echo "Please set the path to your Memory MCP server:"
    echo "  export MEMORY_MCP_PATH=/path/to/memory-mcp/dist/index.js"
    echo
    echo "If you haven't installed Memory MCP yet:"
    echo "  1. Clone the memory-mcp repository"
    echo "  2. Run 'npm install' in the memory-mcp directory"
    echo "  3. Run 'npm run build' to compile it"
    echo "  4. Set MEMORY_MCP_PATH to the dist/index.js file"
    echo
    exit 1
fi

# Verify the path exists
if [ ! -f "$MEMORY_MCP_PATH" ]; then
    echo "❌ Memory MCP not found at: $MEMORY_MCP_PATH"
    echo "Please check the path and ensure Memory MCP is built"
    exit 1
fi

echo "✅ Memory MCP found at: $MEMORY_MCP_PATH"

# Set default command if not provided
if [ -z "$MEMORY_MCP_COMMAND" ]; then
    export MEMORY_MCP_COMMAND="node"
    echo "ℹ️  Using default command: node"
else
    echo "✅ Using command: $MEMORY_MCP_COMMAND"
fi

# Build conversation-continuity if needed
echo
echo "Building conversation-continuity..."
npm run build

echo
echo "=== Configuration Complete ==="
echo
echo "Environment variables set:"
echo "  MEMORY_MCP_PATH=$MEMORY_MCP_PATH"
echo "  MEMORY_MCP_COMMAND=$MEMORY_MCP_COMMAND"
echo
echo "You can now run:"
echo "  npm run test:memory-integration"
echo
echo "Or start the server with:"
echo "  npm start"
