import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseText } from '../src/indexer/parser';

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
