#!/bin/bash
# Build script for conversation-continuity MCP server
cd /Users/Luther/RiderProjects/claude/mcp-servers/conversation-continuity

echo "🔧 Building conversation-continuity server with test mode fixes..."

# Run TypeScript compilation
npx tsc

# Run tsc-alias to resolve path aliases
npx tsc-alias

echo "✅ Build completed! Server rebuilt with fixes:"
echo "   - Fixed test mode detection logic"
echo "   - Restored diagnostic logging"
echo "   - Enhanced error handling"

echo ""
echo "🚀 To apply the fixes:"
echo "   1. Restart Claude Desktop application"
echo "   2. Test Project Intelligence Cache again"
echo ""
echo "📋 Fix Summary:"
echo "   - Test mode now properly detects production environment"
echo "   - Memory MCP operations will execute properly"
echo "   - Added detailed logging for debugging"
