/**
 * Watcher: File system monitoring for automatic re-indexing
 * Uses chokidar for cross-platform file watching
 */

import { watch as chokidarWatch, type FSWatcher } from 'chokidar';
import path from 'path';

let watcher: FSWatcher | null = null;

/**
 * Initialize file watcher for auto re-indexing on file changes
 * Only watches .pdf, .md, .txt files
 */
export function watchDirectory(
  dirPath: string,
  onFileChange: (filePath: string) => Promise<void> | void
): FSWatcher {
  watcher = chokidarWatch(dirPath, {
    ignored: /(^|[\/\\])\.|\.nexus\.db|\.cache/, // Ignore hidden files, DB, cache
    persistent: true,
    ignoreInitial: true, // initial files are handled by the startup scan, not the watcher
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher.on('add', (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.pdf', '.md', '.txt'].includes(ext)) {
      console.log(`[watcher] File added: ${filePath}`);
      onFileChange(filePath);
    }
  });

  watcher.on('change', (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.pdf', '.md', '.txt'].includes(ext)) {
      console.log(`[watcher] File changed: ${filePath}`);
      onFileChange(filePath);
    }
  });

  watcher.on('unlink', (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.pdf', '.md', '.txt'].includes(ext)) {
      console.log(`[watcher] File deleted: ${filePath}`);
      // TODO: remove this file's chunks from the database on unlink
    }
  });

  watcher.on('error', (err: Error) => {
    console.error('[watcher] Error:', err);
  });

  return watcher;
}

/**
 * Stop file watcher
 */
export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
    console.log('[watcher] Stopped');
  }
}
