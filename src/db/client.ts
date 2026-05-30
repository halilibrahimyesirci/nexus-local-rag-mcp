/**
 * Database client: opens the SQLite connection and loads sqlite-vss when available.
 * A single .nexus.db file lives in the project root by default.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DB_PATH = path.join(__dirname, '../../.nexus.db');

export let db: Database.Database | null = null;

/**
 * Initialize the database connection and load the optional sqlite-vss extension.
 * The location defaults to .nexus.db in the project root; pass `dbPath` or set the
 * NEXUS_DB_PATH environment variable to override it (use ':memory:' for tests).
 */
export function initDatabase(
  dbPath: string = process.env.NEXUS_DB_PATH ?? DEFAULT_DB_PATH
): Database.Database {
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // sqlite-vss accelerates vector search when the extension can be loaded.
    // It is optional: if loading fails we fall back to an exact in-memory scan.
    try {
      db.exec("SELECT load_extension('vss0');");
      console.log('[db] Loaded sqlite-vss extension');
    } catch {
      console.warn('[db] sqlite-vss extension not available, using fallback search');
    }

    console.log(`[db] Connected to ${dbPath}`);
    return db;
  } catch (err) {
    throw new Error(`Failed to initialize database: ${String(err)}`);
  }
}

/**
 * Get the active database instance.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[db] Closed');
  }
}
