/**
 * DB Schema: Tables for chunks, metadata, vector search
 * Vector dimension: 384 (fixed, matches embedder = Xenova/all-MiniLM-L6-v2)
 * sqlite-vss accelerates vector search when available; otherwise a JS scan is used.
 */

import { getDatabase } from './client.js';

/**
 * Create chunks table with embedding column
 * Integrate sqlite-vss for vector search
 */
export function initSchema(): void {
  const db = getDatabase();

  try {
    // Main chunks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        sourceFile TEXT NOT NULL,
        pageNumber INTEGER NOT NULL,
        chunkIndex INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sourceFile, pageNumber, chunkIndex)
      );
    `);

    // Index for fast file lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_sourceFile 
      ON chunks(sourceFile);
    `);

    // Index for page lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_page
      ON chunks(sourceFile, pageNumber);
    `);

    // sqlite-vss virtual table for O(1) approximate nearest neighbor search
    // Maps embedding vectors to rowids in chunks table
    // May not be available on all platforms; graceful fallback to JavaScript
    try {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vss USING vss0(
          embedding(384)
        );
      `);
      console.log('[schema] Created VSS virtual table');
    } catch (vssErr) {
      console.warn('[schema] VSS virtual table creation failed, will use fallback search:', String(vssErr).slice(0, 60));
    }

    console.log('[schema] Initialized chunks table with embedding support');
  } catch (err) {
    throw new Error(`Failed to initialize schema: ${String(err)}`);
  }
}
