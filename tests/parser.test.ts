import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseText, estimatePageNumber } from '../src/indexer/parser';

describe('Parser', () => {
  it('parses markdown files into chunks', async () => {
    const result = await parseMarkdown('tests/fixtures/sample.md');

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sourceFile).toContain('sample.md');
      expect(result[0].text.length).toBeGreaterThan(0);
    }
  });

  it('parses plain-text files into chunks', async () => {
    const result = await parseText('tests/fixtures/sample.txt');

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sourceFile).toContain('sample.txt');
    }
  });

  it('returns an error object for a missing file', async () => {
    const result = await parseMarkdown('tests/fixtures/nonexistent.md');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Failed to parse');
    }
  });
});

describe('estimatePageNumber', () => {
  it('maps a character offset to a 1-based page', () => {
    expect(estimatePageNumber(0, 100, 5)).toBe(1);
    expect(estimatePageNumber(150, 100, 5)).toBe(2);
    expect(estimatePageNumber(250, 100, 5)).toBe(3);
  });

  it('clamps to the [1, pageCount] range', () => {
    expect(estimatePageNumber(99999, 100, 3)).toBe(3);
    expect(estimatePageNumber(-5, 100, 3)).toBe(1);
  });

  it('falls back to page 1 when density is unknown', () => {
    expect(estimatePageNumber(500, 0, 1)).toBe(1);
  });
});
