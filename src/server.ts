/**
 * MCP Server: Tool definitions and registration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  searchDocsTool,
  handleSearchDocs,
  type SearchDocsInput,
} from './tools/searchDocs.js';
import {
  semanticSearchDocsTool,
  handleSemanticSearch,
  type SemanticSearchInput,
} from './tools/semanticSearch.js';
import { listIndexedTool, handleListIndexed } from './tools/listIndexed.js';

export function createMCPServer(): Server {
  const server = new Server({
    name: 'nexus-local-rag-mcp',
    version: '0.1.0',
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Register tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'search_docs') {
        const result = await handleSearchDocs(args as unknown as SearchDocsInput);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'semantic_search_docs') {
        const result = await handleSemanticSearch(args as unknown as SemanticSearchInput);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      if (name === 'list_indexed') {
        const result = await handleListIndexed();
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: String(err),
              tool: name,
            }),
          },
        ],
        isError: true
      };
    }
  });

  // Register available tools
  const tools: Tool[] = [searchDocsTool, semanticSearchDocsTool, listIndexedTool];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  return server;
}

export async function startServer(): Promise<void> {
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.log('[server] MCP server started');
}
