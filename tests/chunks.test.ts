/**
 * Chunk storage tests: upsert, conflict-replace, delete-by-file, listing, and pagination.
 * These run against an in-memory database and don't need the embedding model.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../src/db/client';
import { initSchema } from '../src/db/schema';
import {
  upsertChunk,
  deleteChunksByFile,
  listIndexedFiles,
  searchByKeyword,
} from '../src/db/queries';

function vec(fill: number): Float32Array {
  return new Float32Array(384).fill(fill);
}

describe('chunk storage', () => {
  beforeAll(() => {
    initDatabase();
    initSchema();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('stores chunks and lists them by file', () => {
    upsertChunk('alpha one', vec(0.1), 'a.md', 1, 0);
    upsertChunk('alpha two', vec(0.1), 'a.md', 1, 1);
    upsertChunk('beta one', vec(0.2), 'b.md', 1, 0);

    const files = listIndexedFiles();
    expect(files.find((f) => f.sourceFile === 'a.md')?.chunkCount).toBe(2);
    expect(files.find((f) => f.sourceFile === 'b.md')?.chunkCount).toBe(1);
  });

  it('replaces a chunk on conflict instead of duplicating it', () => {
    upsertChunk('updated alpha', vec(0.3), 'a.md', 1, 0);

    const rows = searchByKeyword('updated alpha', 10, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0].sourceFile).toBe('a.md');
    // a.md still has exactly two chunks (one updated, one untouched).
    expect(listIndexedFiles().find((f) => f.sourceFile === 'a.md')?.chunkCount).toBe(2);
  });

  it('deletes every chunk for a file', () => {
    const removed = deleteChunksByFile('a.md');
    expect(removed).toBe(2);
    expect(listIndexedFiles().some((f) => f.sourceFile === 'a.md')).toBe(false);
  });

  it('paginates keyword results in insertion order', () => {
    for (let i = 0; i < 6; i++) {
      upsertChunk(`page item ${i}`, vec(0.4), 'c.md', 1, i);
    }

    const firstTwo = searchByKeyword('page item', 2, 0);
    const nextTwo = searchByKeyword('page item', 2, 2);

    expect(firstTwo).toHaveLength(2);
    expect(nextTwo).toHaveLength(2);
    expect(firstTwo[0].text).toContain('page item 0');
    expect(nextTwo[0].text).toContain('page item 2');
  });
});
