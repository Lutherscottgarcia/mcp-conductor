# Quick Start: Memory MCP Integration

## 1. Set Environment Variables
```bash
export MEMORY_MCP_PATH="/Users/Luther/RiderProjects/[...]/memory-mcp/dist/index.js"
export MEMORY_MCP_COMMAND="node"
```

## 2. Build the Project
```bash
npm run build
```

## 3. Test the Integration
```bash
npm run test:memory-integration
```

## If Successful
You'll see:
- ✅ Memory client created successfully
- ✅ Graph read successfully
- ✅ Test entities created
- ✅ Memory MCP Integration Test PASSED

## If Failed
Check:
1. Is Memory MCP installed and built?
2. Is MEMORY_MCP_PATH correct?
3. Run `node $MEMORY_MCP_PATH` - does it start?

## Using in Code
The MCPClientFactory now automatically uses the proper connection:
```typescript
const factory = new MCPClientFactory(configs);
const memoryClient = await factory.createMemoryClient();
// Now uses proper MCP protocol instead of globalThis!
```
