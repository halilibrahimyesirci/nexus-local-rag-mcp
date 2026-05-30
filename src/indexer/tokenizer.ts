/**
 * Token Counting Utility
 * Rough estimation: 1 word ≈ 1.3 tokens
 * Used for 512-token chunk boundaries with 51-token overlap (~10%)
 */

const TOKENS_PER_WORD = 1.3;

/**
 * Estimate token count for text
 * This is a rough heuristic; precise counting requires ML model tokenizer
 */
export function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return Math.ceil(words.length * TOKENS_PER_WORD);
}

/**
 * Split text into chunks respecting token boundaries
 * Target: 512 tokens per chunk, 51-token overlap (~10%)
 */
export function chunkTextByTokens(
  text: string,
  targetTokens: number = 512,
  overlapTokens: number = 51
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4); // Rough: 4 chars ≈ 1 token

    if (currentTokens + wordTokens > targetTokens && currentChunk.length > 0) {
      // Flush current chunk
      chunks.push(currentChunk.join(' '));

      // Create overlap: keep last ~51 tokens worth of words
      const overlapWordCount = Math.ceil(overlapTokens / 1.3);
      currentChunk = currentChunk.slice(-overlapWordCount);
      currentTokens = Math.ceil(currentChunk.join(' ').length / 4);
    }

    currentChunk.push(word);
    currentTokens += wordTokens;
  }

  // Flush remaining chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}
