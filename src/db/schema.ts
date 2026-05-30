/**
 * Database schema: the chunks table and its lookup indexes.
 * Vector dimension is 384 (must match the embedder, Xenova/all-MiniLM-L6-v2).
 */

import { getDatabase } from './client.js';

export function initSchema(): void {
  const db = getDatabase();

  try {
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

    db.exec(`CREATE INDEX IF NOT EXISTS idx_chunks_sourceFile ON chunks(sourceFile);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chunks_page ON chunks(sourceFile, pageNumber);`);
  } catch (err) {
    throw new Error(`Failed to initialize schema: ${String(err)}`);
  }
}
