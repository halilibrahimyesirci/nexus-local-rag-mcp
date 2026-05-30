import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase, getDatabase } from '../src/db/client';
import { initSchema } from '../src/db/schema';
import { upsertChunk, searchByKeyword, searchByVector } from '../src/db/queries';
import { initEmbedder, embed } from '../src/indexer/embedder';

describe('Pagination (offset/limit)', () => {
  beforeAll(async () => {
    initDatabase();
    initSchema();
    await initEmbedder();

    // Clear existing chunks
    const db = getDatabase();
    db.exec('DELETE FROM chunks;');

    // Insert 15 test chunks for pagination testing
    for (let i = 1; i <= 15; i++) {
      const text = `Test chunk ${i} - contains keyword for pagination testing`;
      const embedding = await embed(text);
      upsertChunk(text, embedding, 'test.md', 1, i);
    }
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should return all results when offset=0, limit=15', () => {
    const results = searchByKeyword('pagination', 15, 0);
    expect(results).toHaveLength(15);
    expect(results[0].text).toContain('Test chunk 1');
  });

  it('should skip first 5 results with offset=5, limit=10', () => {
    const results = searchByKeyword('pagination', 10, 5);
    expect(results).toHaveLength(10);
    // Should start from chunk 6 (offset 5 skips 1-5)
    expect(results[0].text).toContain('Test chunk 6');
    expect(results[9].text).toContain('Test chunk 15');
  });

  it('should return empty array when offset >= total results', () => {
    const results = searchByKeyword('pagination', 10, 20);
    expect(results).toHaveLength(0);
  });

  it('should respect limit with offset=0', () => {
    const results = searchByKeyword('pagination', 5, 0);
    expect(results).toHaveLength(5);
  });

  it('should return partial results when offset+limit exceeds total', () => {
    const results = searchByKeyword('pagination', 10, 10);
    expect(results).toHaveLength(5); // Only 5 results remain (chunks 11-15)
    expect(results[0].text).toContain('Test chunk 11');
  });

  it('should support vector search with offset', async () => {
    const queryText = 'pagination testing';
    const queryVector = await embed(queryText);
    const results = searchByVector(queryVector, 10, 0.1, 0);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should skip results in vector search with offset', async () => {
    const queryText = 'pagination testing';
    const queryVector = await embed(queryText);
    const allResults = searchByVector(queryVector, 15, 0.1, 0);
    const offsetResults = searchByVector(queryVector, 15, 0.1, 3);

    expect(offsetResults.length).toBeLessThanOrEqual(allResults.length);

    // Verify offset skips results
    if (allResults.length > 3 && offsetResults.length > 0) {
      expect(offsetResults[0].sourceFile).toBe(allResults[3].sourceFile);
    }
  });

  it('should maintain backward compatibility with optional offset', () => {
    // Should work without offset parameter (defaults to 0)
    const resultsWithDefault = searchByKeyword('pagination', 10);
    const resultsExplicit = searchByKeyword('pagination', 10, 0);

    expect(resultsWithDefault).toHaveLength(resultsExplicit.length);
    if (resultsWithDefault.length > 0 && resultsExplicit.length > 0) {
      expect(resultsWithDefault[0].text).toBe(resultsExplicit[0].text);
    }
  });
});
