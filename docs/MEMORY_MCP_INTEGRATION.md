# Memory MCP Integration Configuration Guide

## Overview

The conversation-continuity MCP server now uses proper client-server connections to communicate with the Memory MCP server, replacing the previous broken `globalThis` approach.

## What Changed

### Before (Broken)
- Used `globalThis.local__memory__read_graph()` - incorrect pattern
- Treated separate MCP servers as in-process functions
- Failed with "not a function" errors

### After (Fixed)
- Uses `MCPClientManager` with `StdioClientTransport` 
- Proper MCP protocol communication
- Correct client-server architecture

## Configuration

### Environment Variables

Set these environment variables to configure the Memory MCP connection:

```bash
# Command to run Memory MCP (default: "node")
export MEMORY_MCP_COMMAND="node"

# Path to Memory MCP server entry point
export MEMORY_MCP_PATH="/path/to/memory-mcp/dist/index.js"

# Optional: Force test mode (skips real MCP connections)
export MCP_TEST_MODE="false"
```

### Default Configuration

If environment variables are not set, the system uses these defaults:
- Command: `node`
- Path: `../memory-mcp/dist/index.js` (relative to conversation-continuity)

## Testing the Integration

### 1. Ensure Memory MCP is Built

```bash
cd /path/to/memory-mcp
npm install
npm run build
```

### 2. Set Environment Variables

```bash
# Example for typical setup
export MEMORY_MCP_PATH="/Users/Luther/RiderProjects/claude/mcp-servers/memory-mcp/dist/index.js"
export MEMORY_MCP_COMMAND="node"
```

### 3. Run Integration Test

```bash
cd /path/to/conversation-continuity
npm run test:memory-integration
```

Expected output:
```
=== Testing Memory MCP Integration ===

1. Creating Memory MCP client...
✅ Memory client created successfully

2. Reading current graph state...
✅ Graph read successfully: X entities, Y relations

3. Creating test entities...
✅ Test entities created

...
```

## Troubleshooting

### Connection Fails

1. **Check Memory MCP is accessible:**
   ```bash
   ls -la $MEMORY_MCP_PATH
   # Should show the index.js file
   ```

2. **Test Memory MCP directly:**
   ```bash
   node $MEMORY_MCP_PATH
   # Should start without errors
   ```

3. **Enable debug logging:**
   ```bash
   export DEBUG="*"
   npm run test:memory-integration
   ```

### Wrong Tool Names

If you see errors about tool names not being found:

1. List available tools after connection (check MCPClientManager logs)
2. Memory MCP tools should NOT have prefixes like `local__memory__`
3. Correct tool names are: `read_graph`, `create_entities`, etc.

### Test Mode Activating Unexpectedly

If the system falls back to test mode when it shouldn't:

1. Check environment variables are set correctly
2. Ensure Memory MCP server is running and accessible
3. Look for connection errors in logs

## Architecture

```
┌─────────────────────────┐     ┌──────────────────┐
│ Conversation-Continuity │     │   Memory MCP     │
│         Server          │     │     Server       │
├─────────────────────────┤     ├──────────────────┤
│   MCPClientManager      │────▶│  stdio transport │
│   MemoryClientAdapterV2 │     │  MCP protocol    │
└─────────────────────────┘     └──────────────────┘
```

## Files Modified

1. **src/utils/mcp-client-manager.ts** - New client connection manager
2. **src/utils/memory-client-adapter-v2.ts** - New adapter using proper MCP calls
3. **src/utils/mcp-client-factory.ts** - Updated to use new components
4. **src/test-memory-integration.ts** - Integration test script

## Next Steps

After verifying Memory MCP works:

1. Apply same pattern to Filesystem MCP
2. Implement Git MCP when SDK available
3. Update Database MCP clients
4. Remove all `globalThis` references
5. Implement connection pooling for performance

## Additional Notes

- The MCPClientManager supports reconnection with exponential backoff
- Connection state is tracked and available via `isConnected()`
- Each MCP type can have different transport configurations
- Test mode is still available for development without real MCPs
