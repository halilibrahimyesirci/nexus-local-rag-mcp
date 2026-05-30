/**
 * DB Queries: CRUD operations on chunks
 * Cosine-distance vector search, keyword search, and pagination.
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
 * Calculate cosine similarity between two vectors (Float32Array)
 * Returns value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Insert or update a chunk with embedding
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
    const embeddingBuffer = Buffer.from(embedding.buffer);

    const stmt = db.prepare(`
      INSERT INTO chunks (text, embedding, sourceFile, pageNumber, chunkIndex)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(sourceFile, pageNumber, chunkIndex) DO UPDATE SET
        text = excluded.text,
        embedding = excluded.embedding
      RETURNING id
    `);

    const row = stmt.get(text, embeddingBuffer, sourceFile, pageNumber, chunkIndex) as { id: number } | undefined;
    const chunkId = row?.id || 0;

    // Also insert into VSS table for fast vector search (HNSW approximate NN)
    try {
      const vssStmt = db.prepare(`
        INSERT OR REPLACE INTO chunks_vss(rowid, embedding)
        VALUES (?, ?)
      `);
      vssStmt.run(chunkId, embeddingBuffer);
    } catch (vssErr) {
      // VSS may not be available; continue without it
      console.debug('[queries] VSS insert skipped, fallback will work:', String(vssErr).slice(0, 50));
    }

    return chunkId;
  } catch (err) {
    throw new Error(`Failed to upsert chunk: ${String(err)}`);
  }
}

/**
 * Delete all chunks for a file
 */
export function deleteChunksByFile(sourceFile: string): number {
  const db = getDatabase();

  try {
    const stmt = db.prepare('DELETE FROM chunks WHERE sourceFile = ?');
    const result = stmt.run(sourceFile);
    return result.changes;
  } catch (err) {
    throw new Error(`Failed to delete chunks: ${String(err)}`);
  }
}

/**
 * Keyword search (exact match in text)
 * Supports pagination via offset/limit
 */
export function searchByKeyword(query: string, limit: number = 10, offset: number = 0): ChunkRow[] {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT * FROM chunks
      WHERE text LIKE ?
      LIMIT ?
      OFFSET ?
    `);

    return stmt.all(`%${query}%`, limit, offset) as ChunkRow[];
  } catch (err) {
    throw new Error(`Failed to search by keyword: ${String(err)}`);
  }
}

/**
 * List all indexed files with chunk counts
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
 * Search by vector similarity using sqlite-vss (HNSW approximate NN)
 * Falls back to JavaScript computation if VSS unavailable
 * Supports pagination via offset/limit
 * O(1) with VSS, O(n) fallback
 */
export function searchByVector(
  queryVector: Float32Array,
  limit: number = 10,
  threshold: number = 0.3,
  offset: number = 0
): Array<ChunkRow & { similarity: number }> {
  // Try VSS first for O(1) approximate NN
  const vssResult = trySearchVSS(queryVector, limit, threshold, offset);
  if (vssResult !== null) {
    return vssResult;
  }

  // Fallback: scan all chunks, compute similarity in JavaScript
  return searchByVectorFallback(queryVector, limit, threshold, offset);
}

/**
 * Attempt VSS (sqlite-vss) search for approximate nearest neighbors
 * Returns null if VSS not available; caller will fallback
 */
function trySearchVSS(
  queryVector: Float32Array,
  limit: number,
  threshold: number,
  offset: number
): Array<ChunkRow & { similarity: number }> | null {
  const db = getDatabase();

  try {
    // Check if chunks_vss table exists
    const tableCheck = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='chunks_vss'"
    ).get();

    if (!tableCheck) {
      return null;
    }

    // Serialize query vector to Buffer
    const queryBuffer = Buffer.from(queryVector.buffer);

    // VSS approximate k-NN: fetch k*2 candidates for better recall
    const candidates = db.prepare(`
      SELECT c.*
      FROM chunks c
      WHERE c.rowid IN (
        SELECT rowid FROM chunks_vss
        WHERE embedding MATCH ?
        ORDER BY distance
        LIMIT ?
      )
    `).all(queryBuffer, Math.max(limit * 2, 20)) as ChunkRow[];

    if (candidates.length === 0) {
      return null;
    }

    // Verify with cosine similarity and filter by threshold
    const scoredChunks = candidates
      .map((chunk) => {
        const embeddingVector = new Float32Array(
          chunk.embedding.buffer,
          chunk.embedding.byteOffset,
          chunk.embedding.length / 4
        );
        const similarity = cosineSimilarity(queryVector, embeddingVector);
        return { ...chunk, similarity };
      })
      .filter((chunk) => chunk.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(offset, offset + limit);

    return scoredChunks;
  } catch (err) {
    // VSS query failed; return null for fallback
    console.debug('[queries] VSS search error, using fallback:', String(err).slice(0, 50));
    return null;
  }
}

/**
 * Fallback: JavaScript-computed cosine similarity
 * Scans all chunks O(n); used when VSS unavailable
 */
function searchByVectorFallback(
  queryVector: Float32Array,
  limit: number,
  threshold: number,
  offset: number
): Array<ChunkRow & { similarity: number }> {
  const db = getDatabase();

  try {
    const stmt = db.prepare('SELECT * FROM chunks');
    const allChunks = stmt.all() as ChunkRow[];

    const scoredChunks = allChunks
      .map((chunk) => {
        const embeddingVector = new Float32Array(
          chunk.embedding.buffer,
          chunk.embedding.byteOffset,
          chunk.embedding.length / 4
        );
        const similarity = cosineSimilarity(queryVector, embeddingVector);
        return { ...chunk, similarity };
      })
      .filter((chunk) => chunk.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(offset, offset + limit);

    return scoredChunks;
  } catch (err) {
    throw new Error(`Fallback vector search failed: ${String(err)}`);
  }
}
