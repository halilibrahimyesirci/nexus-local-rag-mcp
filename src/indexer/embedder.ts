/**
 * Embedder: Transformers.js local embedding via Xenova/all-MiniLM-L6-v2
 * Produces 384-dimensional vectors (fixed, do not change — breaks DB schema)
 * Chunking lives in the parser; this module only turns text into vectors.
 */

import { env, pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

// Configure model caching
const cacheDir = path.join(process.cwd(), '.transformers-cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

env.cacheDir = cacheDir;
env.allowLocalModels = true;

// Allow remote download on first run (model ~80MB, cached locally thereafter)
// This is safe: after first download, env.allowRemoteModels can be false for offline use
env.allowRemoteModels = true;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const VECTOR_DIMENSION = 384; // Fixed, do not change

let embedder: any = null;

/**
 * Initialize embedder (one-time download of ~80MB model)
 * Blocks until model loaded
 */
export async function initEmbedder(): Promise<void> {
  try {
    if (!embedder) {
      embedder = await pipeline('feature-extraction', MODEL_NAME);
      console.log(`[embedder] Loaded ${MODEL_NAME}`);
    }
  } catch (err) {
    throw new Error(`Failed to initialize embedder: ${String(err)}`);
  }
}

/**
 * Embed single text chunk → 384-dim vector
 * Returns Float32Array for sqlite-vss BLOB storage
 */
export async function embed(text: string): Promise<Float32Array> {
  if (!embedder) {
    throw new Error('Embedder not initialized. Call initEmbedder() first.');
  }

  try {
    const result = await embedder(text, { pooling: 'mean', normalize: true });

    // result is a Tensor, convert to Float32Array
    const vector = new Float32Array(result.data as ArrayBuffer);

    if (vector.length !== VECTOR_DIMENSION) {
      throw new Error(
        `Expected ${VECTOR_DIMENSION}-dim vector, got ${vector.length}-dim`
      );
    }

    return vector;
  } catch (err) {
    throw new Error(`Failed to embed text: ${String(err)}`);
  }
}

/**
 * Batch embed multiple texts
 * Returns array of vectors
 */
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  if (!embedder) {
    throw new Error('Embedder not initialized. Call initEmbedder() first.');
  }

  const vectors: Float32Array[] = [];

  for (const text of texts) {
    vectors.push(await embed(text));
  }

  return vectors;
}
