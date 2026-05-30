/**
 * Tool: semantic_search_docs
 * Vector similarity search across indexed chunks
 * Embeds query and finds cosine-similar documents
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchByVector } from '../db/queries.js';
import { embed } from '../indexer/embedder.js';

export const semanticSearchDocsTool: Tool = {
  name: 'semantic_search_docs',
  description: 'Search indexed documents by semantic meaning (vector similarity). Useful for conceptual searches. Supports pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query in natural language (e.g., "How to handle errors?")',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 10)',
      },
      threshold: {
        type: 'number',
        description: 'Minimum similarity score (0-1, default: 0.3)',
      },
      offset: {
        type: 'number',
        description: 'Number of results to skip for pagination (default: 0)',
      },
    },
    required: ['query'],
  },
};

export interface SemanticSearchInput {
  query: string;
  limit?: number;
  threshold?: number;
  offset?: number;
}

export interface SemanticSearchResult {
  text: string;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
}

export interface SemanticSearchOutput {
  success: boolean;
  results: SemanticSearchResult[];
  meta: {
    count: number;
    query: string;
    threshold: number;
  };
  error?: string;
}

export async function handleSemanticSearch(
  input: SemanticSearchInput
): Promise<SemanticSearchOutput> {
  try {
    const { query, limit = 10, threshold = 0.3, offset = 0 } = input;

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        results: [],
        meta: { count: 0, query, threshold },
        error: 'Query cannot be empty',
      };
    }

    // Embed the query
    const queryVector = await embed(query);

    // Search by vector similarity
    const rows = searchByVector(queryVector, limit, threshold, offset);

    return {
      success: true,
      results: rows.map((row) => ({
        text: row.text,
        sourceFile: row.sourceFile,
        pageNumber: row.pageNumber,
        chunkIndex: row.chunkIndex,
        similarity: row.similarity,
      })),
      meta: {
        count: rows.length,
        query,
        threshold,
      },
    };
  } catch (err) {
    return {
      success: false,
      results: [],
      meta: { count: 0, query: input.query, threshold: input.threshold || 0.3 },
      error: String(err),
    };
  }
}
