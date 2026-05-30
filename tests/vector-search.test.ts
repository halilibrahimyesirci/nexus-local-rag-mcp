/**
 * Vector search tests — exercise the public searchByVector API end to end
 * (cosine ranking, threshold and limit handling, and result metadata).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../src/db/client';
import { initSchema } from '../src/db/schema';
import { upsertChunk, searchByVector } from '../src/db/queries';
import { initEmbedder, embed } from '../src/indexer/embedder';

describe('searchByVector', () => {
  beforeAll(async () => {
    initDatabase();
    initSchema();
    await initEmbedder();

    const texts = [
      'SQLite is a relational database management system',
      'Vector search enables similarity queries on embeddings',
      'Approximate nearest neighbor search scales to large datasets',
      'Machine learning models generate high-dimensional embeddings',
    ];

    for (let i = 0; i < texts.length; i++) {
      const vector = await embed(texts[i]);
      upsertChunk(texts[i], vector, 'test.md', 1, i);
    }
  });

  afterAll(() => {
    closeDatabase();
  });

  it('returns chunks ranked by descending similarity', async () => {
    const query = await embed('database vector similarity');
    const results = searchByVector(query, 5, 0.2);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it('respects the limit parameter', async () => {
    const query = await embed('search');
    const results = searchByVector(query, 2, 0.0);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('respects the threshold parameter', async () => {
    const query = await embed('approximate nearest neighbor search');
    const threshold = 0.4;
    const results = searchByVector(query, 100, threshold);
    expect(results.every((r) => r.similarity >= threshold)).toBe(true);
  });

  it('returns an array even when nothing clears a high threshold', async () => {
    const query = await embed('database');
    const results = searchByVector(query, 10, 0.99);
    expect(Array.isArray(results)).toBe(true);
  });

  it('includes chunk metadata in each result', async () => {
    const query = await embed('database');
    const results = searchByVector(query, 1, 0.0);

    expect(results.length).toBeGreaterThan(0);
    const [first] = results;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('text');
    expect(first).toHaveProperty('sourceFile');
    expect(first).toHaveProperty('pageNumber');
    expect(first).toHaveProperty('chunkIndex');
    expect(first).toHaveProperty('similarity');
  });
});
