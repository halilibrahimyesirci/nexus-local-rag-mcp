#!/usr/bin/env node
/**
 * CLI entry point.
 * Built:       node dist/index.js --dir ./my-docs   (after `npm run build`)
 * From source: npm run dev -- --dir ./my-docs
 */

import { resolve, basename } from 'path';
import { readdirSync, existsSync, lstatSync } from 'fs';
import { initDatabase, closeDatabase } from './db/client.js';
import { initSchema } from './db/schema.js';
import { initEmbedder, embed } from './indexer/embedder.js';
import { parsePDF, parseMarkdown, parseText, type Chunk } from './indexer/parser.js';
import { upsertChunk, deleteChunksByFile } from './db/queries.js';
import { watchDirectory, stopWatcher } from './indexer/watcher.js';
import { startServer } from './server.js';

const SUPPORTED_EXTENSIONS = ['.pdf', '.md', '.txt'];

function isSupportedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function indexFile(filePath: string): Promise<void> {
  try {
    const fileName = basename(filePath).toLowerCase();

    let chunks: Chunk[] | { error: string; file: string };
    if (fileName.endsWith('.pdf')) {
      chunks = await parsePDF(filePath);
    } else if (fileName.endsWith('.md')) {
      chunks = await parseMarkdown(filePath);
    } else if (fileName.endsWith('.txt')) {
      chunks = await parseText(filePath);
    } else {
      return;
    }

    if ('error' in chunks) {
      console.error(`[indexer] Error parsing ${chunks.file}: ${chunks.error}`);
      return;
    }

    // Clear the file's previous chunks so an edited/shrunk file leaves no stale rows.
    deleteChunksByFile(basename(filePath));

    let embeddedCount = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await embed(chunk.text);
        upsertChunk(chunk.text, embedding, chunk.sourceFile, chunk.pageNumber, chunk.chunkIndex);
        embeddedCount++;
      } catch (err) {
        console.error(`[indexer] Failed to embed chunk from ${filePath}:`, err);
      }
    }

    console.log(`[indexer] Indexed ${basename(filePath)}: ${embeddedCount}/${chunks.length} chunks`);
  } catch (err) {
    console.error(`[indexer] Exception while indexing ${filePath}:`, err);
  }
}

async function indexDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    console.error(`[indexer] Directory not found: ${dirPath}`);
    process.exit(1);
  }

  let indexedCount = 0;
  for (const file of readdirSync(dirPath)) {
    const fullPath = resolve(dirPath, file as string);
    if (lstatSync(fullPath).isFile() && isSupportedFile(String(file))) {
      await indexFile(fullPath);
      indexedCount++;
    }
  }

  if (indexedCount === 0) {
    console.warn(`[indexer] No .pdf, .md or .txt files found in ${dirPath}`);
  } else {
    console.log(`[indexer] Finished: indexed ${indexedCount} files in ${dirPath}`);
  }
}

function installShutdownHandlers(): void {
  let closing = false;
  const shutdown = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    console.log('\n[index] Shutting down...');
    await stopWatcher();
    closeDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const dirIndex = args.indexOf('--dir');
    if (dirIndex === -1 || !args[dirIndex + 1]) {
      console.error('Usage: node dist/index.js --dir <path-to-docs>');
      process.exit(1);
    }

    const docsDir = resolve(args[dirIndex + 1]);
    console.log(`[index] Indexing documents in: ${docsDir}`);

    initDatabase();
    initSchema();

    console.log('[index] Loading embedding model (first run downloads ~80MB)...');
    await initEmbedder();

    await indexDirectory(docsDir);

    watchDirectory(
      docsDir,
      async (filePath: string) => {
        if (isSupportedFile(filePath)) {
          console.log(`[watcher] Re-indexing ${filePath}`);
          await indexFile(filePath);
        }
      },
      (filePath: string) => {
        if (isSupportedFile(filePath)) {
          const removed = deleteChunksByFile(basename(filePath));
          console.log(`[watcher] Removed ${removed} chunk(s) for deleted file ${basename(filePath)}`);
        }
      }
    );

    installShutdownHandlers();

    await startServer();
    console.log('[index] Ready for queries. Press Ctrl+C to exit.');
  } catch (err) {
    console.error('[index] Fatal error:', err);
    process.exit(1);
  }
}

main();
