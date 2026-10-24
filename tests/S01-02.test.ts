import { describe, expect, it } from 'vitest';
import { clamp } from '../src/core/math.ts';

describe('clamp', () => {
  it.each([
    [5, 0, 3, 3],
    [-1, 0, 3, 0],
    [2, 0, 3, 2],
    [1, 1, 1, 1],
    [Infinity, 0, 3, 3],
    [-Infinity, 0, 3, 0],
  ])('clamp(%s, %s, %s) = %s', (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected);
  });
  it('throws RangeError when min > max', () => {
    expect(() => clamp(1, 3, 0)).toThrow(RangeError);
  });
  it.each([
    [NaN, 0, 3],
    [1, NaN, 3],
    [1, 0, NaN],
  ])('throws RangeError for NaN (%s, %s, %s)', (v, a, b) => {
    expect(() => clamp(v, a, b)).toThrow(RangeError);
  });
});
