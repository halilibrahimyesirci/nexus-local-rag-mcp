/**
 * Tool: list_indexed
 * Show which files are indexed and chunk counts
 * Returns: { success: true, results: [...], meta: { totalChunks } }
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { listIndexedFiles } from '../db/queries.js';

export const listIndexedTool: Tool = {
  name: 'list_indexed',
  description: 'List all indexed documents with chunk counts.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export interface IndexedFile {
  sourceFile: string;
  chunkCount: number;
}

export interface ListIndexedOutput {
  success: boolean;
  results: IndexedFile[];
  meta: {
    totalFiles: number;
    totalChunks: number;
  };
  error?: string;
}

export async function handleListIndexed(): Promise<ListIndexedOutput> {
  try {
    const files = listIndexedFiles();

    const totalChunks = files.reduce((sum, f) => sum + f.chunkCount, 0);

    return {
      success: true,
      results: files,
      meta: {
        totalFiles: files.length,
        totalChunks,
      },
    };
  } catch (err) {
    return {
      success: false,
      results: [],
      meta: {
        totalFiles: 0,
        totalChunks: 0,
      },
      error: String(err),
    };
  }
}
