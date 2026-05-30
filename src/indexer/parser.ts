/**
 * Parser: PDF, MD, TXT → chunks with page/file metadata
 * Respects 512-token chunk size, 51-token overlap (~10%)
 * PDF text is extracted with pdf-parse; chunking is delegated to the tokenizer.
 */

import pdfParse from 'pdf-parse';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import { chunkTextByTokens } from './tokenizer.js';
import { logError, logWarn, MAX_FILE_SIZE_MB, checkFileSizeLimit } from './errors.js';

export interface Chunk {
  text: string;
  sourceFile: string;
  pageNumber: number;
  chunkIndex: number;
}

export interface ParseError {
  error: string;
  file: string;
}

/**
 * Parse PDF file, split into chunks by 512-token boundary (51-token overlap)
 * Tracks page numbers using text distribution heuristic
 * Enforces MAX_FILE_SIZE_MB limit
 */
export async function parsePDF(filePath: string): Promise<Chunk[] | ParseError> {
  try {
    // Check file size first
    const stats = statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (!checkFileSizeLimit(fileSizeMB)) {
      logWarn(`PDF exceeds ${MAX_FILE_SIZE_MB}MB limit`, filePath, {
        fileSizeMB: fileSizeMB.toFixed(2),
      });
      return {
        error: `File too large: ${fileSizeMB.toFixed(2)}MB (limit: ${MAX_FILE_SIZE_MB}MB)`,
        file: filePath,
      };
    }

    const fileBuffer = readFileSync(filePath);
    const data = await pdfParse(fileBuffer);

    const chunks: Chunk[] = [];
    let globalChunkIndex = 0;

    const fullText = data.text || '';

    if (fullText.trim().length === 0) {
      logWarn('PDF contains no extractable text', filePath);
      return chunks;
    }

    // Get page count from PDF metadata (default to 1 if unavailable)
    const pageCount = (data as any).numpages || 1;

    // Split by 512-token boundary with 51-token overlap
    const tokenChunks = chunkTextByTokens(fullText, 512, 51);

    // Create page-to-character mapping for heuristic page detection
    const charPerPage = fullText.length / pageCount;
    let charOffset = 0;

    for (const chunkText of tokenChunks) {
      if (chunkText.trim().length > 0) {
        // Detect page: based on chunk's starting position in full text
        // Find where this chunk starts by searching for it in the full text
        const chunkStartInFullText = fullText.indexOf(chunkText, charOffset);
        const estimatedPage = Math.min(
          pageCount,
          Math.max(1, Math.floor(chunkStartInFullText / charPerPage) + 1)
        );

        chunks.push({
          text: chunkText,
          sourceFile: path.basename(filePath),
          pageNumber: estimatedPage,
          chunkIndex: globalChunkIndex++,
        });

        charOffset = chunkStartInFullText + chunkText.length;
      }
    }

    return chunks;
  } catch (err) {
    logError(`Failed to parse PDF: ${String(err)}`, filePath);
    return {
      error: `Failed to parse PDF: ${String(err)}`,
      file: filePath,
    };
  }
}

/**
 * Parse Markdown file with token-based chunking
 */
export async function parseMarkdown(filePath: string): Promise<Chunk[] | ParseError> {
  try {
    const content = readFileSync(filePath, 'utf-8');

    if (content.trim().length === 0) {
      return [];
    }

    const tokenChunks = chunkTextByTokens(content, 512, 51);
    const chunks: Chunk[] = tokenChunks
      .filter((text) => text.trim().length > 0)
      .map((text, index) => ({
        text,
        sourceFile: path.basename(filePath),
        pageNumber: 1,
        chunkIndex: index,
      }));

    return chunks;
  } catch (err) {
    return {
      error: `Failed to parse Markdown: ${String(err)}`,
      file: filePath,
    };
  }
}

/**
 * Parse plain text file with token-based chunking
 */
export async function parseText(filePath: string): Promise<Chunk[] | ParseError> {
  try {
    const content = readFileSync(filePath, 'utf-8');

    if (content.trim().length === 0) {
      return [];
    }

    const tokenChunks = chunkTextByTokens(content, 512, 51);
    const chunks: Chunk[] = tokenChunks
      .filter((text) => text.trim().length > 0)
      .map((text, index) => ({
        text,
        sourceFile: path.basename(filePath),
        pageNumber: 1,
        chunkIndex: index,
      }));

    return chunks;
  } catch (err) {
    return {
      error: `Failed to parse text: ${String(err)}`,
      file: filePath,
    };
  }
}
