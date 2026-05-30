import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../src/db/queries';

describe('cosineSimilarity', () => {
  it('is ~0 for perpendicular vectors', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(Math.abs(cosineSimilarity(a, b))).toBeLessThan(0.01);
  });

  it('is 1 for identical vectors', () => {
    const v = new Float32Array([1, 2, 3, 4, 5]);
    expect(Math.abs(cosineSimilarity(v, v) - 1)).toBeLessThan(0.001);
  });

  it('handles 384-dimensional vectors', () => {
    const v = new Float32Array(384).fill(1.0);
    expect(Math.abs(cosineSimilarity(v, v) - 1)).toBeLessThan(0.001);
  });

  it('is ~-1 for opposite vectors', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([-1, -2, -3]);
    expect(cosineSimilarity(a, b)).toBeLessThan(-0.99);
  });

  it('throws when dimensions differ', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2]);
    expect(() => cosineSimilarity(a, b)).toThrow('same dimension');
  });
});
