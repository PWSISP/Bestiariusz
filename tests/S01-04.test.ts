import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../src/core/rng.ts';

const TWO32 = 4294967296;
const u32s = (seed: number, n: number): number[] => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next() * TWO32);
};

describe('PCG32 reference vectors', () => {
  it('seed 42 matches the published PCG32 demo output', () => {
    expect(u32s(42, 6)).toEqual([
      0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e,
    ]);
  });
  it('canonical seed 20261102', () => {
    expect(u32s(20261102, 4)).toEqual([2382011530, 2784460958, 3497812807, 405242244]);
  });
  it('seeds 5 and 4294967295', () => {
    expect(u32s(5, 2)).toEqual([2644768073, 2880917919]);
    expect(u32s(0xffffffff, 2)).toEqual([406254218, 1097992594]);
  });
});

describe('derived methods', () => {
  it('int(1, 6) for seed 20261102', () => {
    const r = createRng(20261102);
    expect(Array.from({ length: 10 }, () => r.int(1, 6))).toEqual([4, 4, 5, 1, 3, 6, 4, 3, 3, 3]);
  });
  it('shuffle of 0..9 for seed 7', () => {
    expect(createRng(7).shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([
      7, 1, 9, 8, 2, 4, 5, 0, 3, 6,
    ]);
  });
  it('next() stays in [0, 1)', () => {
    const r = createRng(1);
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int covers both bounds and is roughly uniform', () => {
    const r = createRng(99);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i++) counts[r.int(1, 6) - 1] += 1;
    for (const c of counts) {
      expect(c).toBeGreaterThan(9000);
      expect(c).toBeLessThan(11000);
    }
  });
  it('int always consumes exactly one next(), even for a single value', () => {
    const a = createRng(3);
    const b = createRng(3);
    expect(a.int(5, 5)).toBe(5);
    b.next();
    expect(a.next()).toBe(b.next());
  });
  it('pick consumes one int and returns an element', () => {
    const a = createRng(11);
    const b = createRng(11);
    expect(a.pick(['x', 'y', 'z'])).toBe(['x', 'y', 'z'][b.int(0, 2)]);
  });
  it('shuffle returns a permutation, keeps the input and consumes length-1 draws', () => {
    const input = [1, 2, 3, 4, 5];
    const a = createRng(8);
    const b = createRng(8);
    const out = a.shuffle(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    for (let i = 4; i >= 1; i--) b.int(0, i);
    expect(a.next()).toBe(b.next());
  });
  it('shuffle of 0 or 1 items consumes nothing', () => {
    const a = createRng(8);
    const b = createRng(8);
    expect(a.shuffle([])).toEqual([]);
    expect(a.shuffle([7])).toEqual([7]);
    expect(a.next()).toBe(b.next());
  });
  it('same seed gives equal independent generators', () => {
    const a = createRng(5);
    const b = createRng(5);
    a.next();
    expect(b.next()).toBe(createRng(5).next());
  });
  it('never calls Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    const r = createRng(1);
    r.next();
    r.int(1, 3);
    r.pick([1, 2]);
    r.shuffle([1, 2, 3]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('input validation (RangeError)', () => {
  it.each([NaN, -1, 1.5, 2 ** 32, Infinity])('rejects seed %s', (seed) => {
    expect(() => createRng(seed)).toThrow(RangeError);
  });
  it.each([0, 4294967295])('accepts seed %s', (seed) => {
    const r = createRng(seed);
    expect(r.next()).not.toBe(r.next());
  });
  it.each([
    [2, 1],
    [1.5, 3],
    [NaN, 3],
    [1, Infinity],
  ])('int(%s, %s) throws', (a, b) => {
    expect(() => createRng(1).int(a, b)).toThrow(RangeError);
  });
  it('pick on an empty array throws', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});
