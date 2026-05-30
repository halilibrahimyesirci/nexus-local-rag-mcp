/**
 * Structured logging helpers and the file-size guard used across the indexer.
 */

export interface ErrorLog {
  level: 'error' | 'warn' | 'info';
  msg: string;
  file?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Structured logging (not console.error directly)
 */
export function logError(msg: string, file?: string, context?: Record<string, unknown>): void {
  const errorLog: ErrorLog = {
    level: 'error',
    msg,
    ...(file !== undefined && { file }),
    ...(context !== undefined && { context }),
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(errorLog));
}

export function logWarn(msg: string, file?: string, context?: Record<string, unknown>): void {
  const warnLog: ErrorLog = {
    level: 'warn',
    msg,
    ...(file !== undefined && { file }),
    ...(context !== undefined && { context }),
    timestamp: new Date().toISOString(),
  };

  console.warn(JSON.stringify(warnLog));
}

export function logInfo(msg: string, file?: string, context?: Record<string, unknown>): void {
  const infoLog: ErrorLog = {
    level: 'info',
    msg,
    ...(file !== undefined && { file }),
    ...(context !== undefined && { context }),
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(infoLog));
}

/**
 * Max file size: 100MB (to prevent OOM on huge PDFs)
 */
export const MAX_FILE_SIZE_MB = 100;

/**
 * Check if file is too large
 */
export function checkFileSizeLimit(fileSizeMB: number): boolean {
  return fileSizeMB <= MAX_FILE_SIZE_MB;
}
