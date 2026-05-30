/**
 * Tool: search_docs
 * Keyword search across indexed chunks
 * Returns: { success: true, results: [...], meta: { count, query } }
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchByKeyword } from '../db/queries.js';

export const searchDocsTool: Tool = {
  name: 'search_docs',
  description: 'Search indexed documents by keyword. Returns matching chunks with file and page reference. Supports pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "authentication", "API token")',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 10)',
      },
      offset: {
        type: 'number',
        description: 'Number of results to skip for pagination (default: 0)',
      },
    },
    required: ['query'],
  },
};

export interface SearchDocsInput {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  text: string;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
}

export interface SearchDocsOutput {
  success: boolean;
  results: SearchResult[];
  meta: {
    count: number;
    query: string;
  };
  error?: string;
}

export async function handleSearchDocs(input: SearchDocsInput): Promise<SearchDocsOutput> {
  try {
    const { query, limit = 10, offset = 0 } = input;

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        results: [],
        meta: { count: 0, query },
        error: 'Query cannot be empty',
      };
    }

    const rows = searchByKeyword(query, limit, offset);

    return {
      success: true,
      results: rows.map((row) => ({
        text: row.text,
        sourceFile: row.sourceFile,
        pageNumber: row.pageNumber,
        chunkIndex: row.chunkIndex,
      })),
      meta: {
        count: rows.length,
        query,
      },
    };
  } catch (err) {
    return {
      success: false,
      results: [],
      meta: { count: 0, query: input.query },
      error: String(err),
    };
  }
}
