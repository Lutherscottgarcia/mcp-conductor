#!/bin/bash
# Test script to verify Project Intelligence Cache fixes

echo "🧪 Testing Project Intelligence Cache Fixes"
echo "=========================================="

echo ""
echo "🔍 Environment Check:"
echo "MCP_TEST_MODE: ${MCP_TEST_MODE:-'not set'}"
echo "NODE_ENV: ${NODE_ENV:-'not set'}"

echo ""
echo "📁 Build Status Check:"
if [ -f "dist/index.js" ]; then
    echo "✅ dist/index.js exists"
    echo "📅 Last modified: $(stat -f %Sm dist/index.js)"
else
    echo "❌ dist/index.js missing - run rebuild first!"
    exit 1
fi

echo ""
echo "🔍 Checking for fix indicators in compiled code:"
if grep -q "PROD MODE" dist/index.js; then
    echo "✅ New logging system detected in compiled code"
else
    echo "❌ New logging system not found - rebuild may have failed"
fi

if grep -q "MCP_TEST_MODE.*false" dist/index.js; then
    echo "✅ Fixed test mode detection logic found"
else
    echo "❌ Fixed test mode detection not found"
fi

echo ""
echo "🎯 Ready to test! Run these commands in Claude:"
echo "1. create_project_intelligence_cache({ projectName: 'MCPConductor' })"
echo "2. load_project_intelligence_cache({ projectName: 'MCPConductor' })"
echo ""
echo "Expected: Both operations should now work properly with detailed logging!"
