import { describe, it, expect } from 'vitest';
import { initEmbedder, embed, embedBatch } from '../src/indexer/embedder';
import { TEST_CONFIG } from './setup';

// Flag to track if embedder is initialized (shared across tests)
let embedderInitialized = false;

describe('Embedder Module', () => {
  it('should initialize embedder', async () => {
    await initEmbedder();
    embedderInitialized = true;
    expect(embedderInitialized).toBe(true);
  }, TEST_CONFIG.modelInitTimeout);

  it('should embed text and return 384-dimensional vector', async () => {
    if (!embedderInitialized) {
      await initEmbedder();
    }

    const vector = await embed('Hello, world!');

    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(384);
  }, TEST_CONFIG.testTimeout);

  it('should embed batch of texts', async () => {
    if (!embedderInitialized) {
      await initEmbedder();
    }

    const texts = ['First text', 'Second text', 'Third text'];
    const vectors = await embedBatch(texts);

    expect(vectors.length).toBe(3);
    vectors.forEach((vec) => {
      expect(vec).toBeInstanceOf(Float32Array);
      expect(vec.length).toBe(384);
    });
  }, TEST_CONFIG.testTimeout);

  it('should return different vectors for different texts', async () => {
    if (!embedderInitialized) {
      await initEmbedder();
    }

    const vec1 = await embed('authentication');
    const vec2 = await embed('completely different text');

    // Vectors should be different (not identical)
    let isDifferent = false;
    for (let i = 0; i < vec1.length; i++) {
      if (Math.abs(vec1[i] - vec2[i]) > 0.001) {
        isDifferent = true;
        break;
      }
    }

    expect(isDifferent).toBe(true);
  }, TEST_CONFIG.testTimeout);
});
