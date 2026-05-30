/**
 * Database queries: chunk storage, keyword search, and cosine vector search.
 */

import { getDatabase } from './client.js';

export interface ChunkRow {
  id: number;
  text: string;
  embedding: Buffer;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
  createdAt: string;
}

/**
 * Cosine similarity between two equal-length vectors. Range -1..1 (higher = closer).
 */
export function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Insert a chunk, or replace it when (sourceFile, pageNumber, chunkIndex) already exists.
 * Returns the row id.
 */
export function upsertChunk(
  text: string,
  embedding: Float32Array,
  sourceFile: string,
  pageNumber: number,
  chunkIndex: number
): number {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      INSERT INTO chunks (text, embedding, sourceFile, pageNumber, chunkIndex)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(sourceFile, pageNumber, chunkIndex) DO UPDATE SET
        text = excluded.text,
        embedding = excluded.embedding
      RETURNING id
    `);

    const row = stmt.get(
      text,
      Buffer.from(embedding.buffer),
      sourceFile,
      pageNumber,
      chunkIndex
    ) as { id: number } | undefined;

    return row?.id ?? 0;
  } catch (err) {
    throw new Error(`Failed to upsert chunk: ${String(err)}`);
  }
}

/**
 * Delete every chunk that belongs to a source file. Returns the number removed.
 */
export function deleteChunksByFile(sourceFile: string): number {
  const db = getDatabase();

  try {
    return db.prepare('DELETE FROM chunks WHERE sourceFile = ?').run(sourceFile).changes;
  } catch (err) {
    throw new Error(`Failed to delete chunks: ${String(err)}`);
  }
}

/**
 * Keyword search (case-insensitive substring) with pagination, in stable insertion order.
 */
export function searchByKeyword(query: string, limit = 10, offset = 0): ChunkRow[] {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT * FROM chunks
      WHERE text LIKE ?
      ORDER BY id
      LIMIT ? OFFSET ?
    `);

    return stmt.all(`%${query}%`, limit, offset) as ChunkRow[];
  } catch (err) {
    throw new Error(`Failed to search by keyword: ${String(err)}`);
  }
}

/**
 * List indexed files with their chunk counts.
 */
export function listIndexedFiles(): Array<{ sourceFile: string; chunkCount: number }> {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT sourceFile, COUNT(*) as chunkCount
      FROM chunks
      GROUP BY sourceFile
      ORDER BY sourceFile
    `);

    return stmt.all() as Array<{ sourceFile: string; chunkCount: number }>;
  } catch (err) {
    throw new Error(`Failed to list indexed files: ${String(err)}`);
  }
}

/**
 * Semantic search: rank all chunks by cosine similarity to the query vector, keep those
 * at or above `threshold`, and page with limit/offset. This is an exact O(n) scan, which
 * is fast for the document collections this server is meant for.
 */
export function searchByVector(
  queryVector: Float32Array,
  limit = 10,
  threshold = 0.3,
  offset = 0
): Array<ChunkRow & { similarity: number }> {
  const db = getDatabase();

  try {
    const rows = db.prepare('SELECT * FROM chunks').all() as ChunkRow[];

    return rows
      .map((chunk) => {
        const vec = new Float32Array(
          chunk.embedding.buffer,
          chunk.embedding.byteOffset,
          chunk.embedding.length / 4
        );
        return { ...chunk, similarity: cosineSimilarity(queryVector, vec) };
      })
      .filter((chunk) => chunk.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(offset, offset + limit);
  } catch (err) {
    throw new Error(`Vector search failed: ${String(err)}`);
  }
}
