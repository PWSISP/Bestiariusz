import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.ts';
import { deriveSeed, drawRewards } from '../src/core/run/rewards.ts';

const POOL = [
  'iskra',
  'piorun',
  'zrodlo',
  'podmuch',
  'skala',
  'ognisko',
  'grom-kruk-smutek',
  'woda-jelen-odwaga',
];

describe('deriveSeed', () => {
  it.each([
    [0, 0, 301794027],
    [1, 0, 2980047484],
    [0, 1, 3140136926],
    [20261102, 0, 107933772],
    [20261102, 1, 3705280566],
    [20261102, 1003, 2681204602],
    [4294967295, 7, 3610910960],
    [123456789, 999999, 422687205],
  ])('deriveSeed(%i, %i) is %i', (seed, salt, expected) => {
    expect(deriveSeed(seed, salt)).toBe(expected);
  });

  it('is an unsigned 32-bit integer for any valid input', () => {
    for (let seed = 0; seed < 4294967295; seed += 99_999_937) {
      for (const salt of [0, 1, 2, 17, 1003, 1_000_000]) {
        const value = deriveSeed(seed, salt);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(4294967295);
      }
    }
  });

  it('gives different seeds for different salts and for different seeds', () => {
    const bySalt = new Set(Array.from({ length: 100 }, (_, salt) => deriveSeed(1, salt)));
    const bySeed = new Set(Array.from({ length: 100 }, (_, seed) => deriveSeed(seed, 3)));
    expect(bySalt.size).toBe(100);
    expect(bySeed.size).toBe(100);
  });

  it('is the same every time for the same input', () => {
    expect(deriveSeed(42, 5)).toBe(deriveSeed(42, 5));
  });

  it('is accepted by createRng', () => {
    expect(() => createRng(deriveSeed(4294967295, 1_000_000))).not.toThrow();
  });

  it.each([
    ['negative seed', -1, 0],
    ['fractional seed', 1.5, 0],
    ['seed above 32 bits', 4294967296, 0],
    ['NaN seed', Number.NaN, 0],
    ['string seed', '5' as unknown as number, 0],
    ['negative salt', 1, -1],
    ['fractional salt', 1, 0.5],
    ['salt above the limit', 1, 1_000_001],
    ['NaN salt', 1, Number.NaN],
    ['Infinity salt', 1, Number.POSITIVE_INFINITY],
  ])('throws RangeError for %s', (_name, seed, salt) => {
    expect(() => deriveSeed(seed, salt)).toThrow(RangeError);
  });
});

describe('drawRewards', () => {
  it.each([
    [1, ['podmuch', 'piorun', 'grom-kruk-smutek']],
    [42, ['iskra', 'piorun', 'grom-kruk-smutek']],
    [20261102, ['ognisko', 'podmuch', 'zrodlo']],
  ])('draws the same three cards for seed %i every time', (seed, expected) => {
    expect(drawRewards(POOL, 3, createRng(seed))).toEqual(expected);
    expect(drawRewards(POOL, 3, createRng(seed))).toEqual(expected);
  });

  it('returns different cards of the pool', () => {
    for (let seed = 0; seed < 200; seed++) {
      const cards = drawRewards(POOL, 3, createRng(seed));
      expect(cards).toHaveLength(3);
      expect(new Set(cards).size).toBe(3);
      for (const card of cards) expect(POOL).toContain(card);
    }
  });

  it('offers every card of the pool sooner or later', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      for (const card of drawRewards(POOL, 3, createRng(seed))) seen.add(card);
    }
    expect([...seen].sort()).toEqual([...POOL].sort());
  });

  it('counts a repeated id of the pool once', () => {
    expect(drawRewards(['a', 'a', 'b', 'b', 'a', 'c'], 3, createRng(7))).toEqual(['c', 'a', 'b']);
  });

  it('returns fewer cards when the pool is smaller than the count', () => {
    expect(drawRewards(['a', 'b', 'c'], 5, createRng(7))).toEqual(['c', 'a', 'b']);
  });

  it('returns an empty list for an empty pool or a count of 0, without touching the rng', () => {
    const rng = createRng(9);
    const expectedNext = createRng(9).next();
    expect(drawRewards([], 3, rng)).toEqual([]);
    expect(drawRewards(POOL, 0, rng)).toEqual([]);
    expect(rng.next()).toBe(expectedNext);
  });

  it('shuffles with exactly one rng.shuffle call of the unique ids', () => {
    const drawn = createRng(9);
    drawRewards(POOL, 3, drawn);
    const shuffled = createRng(9);
    shuffled.shuffle(POOL);
    expect(drawn.next()).toBe(shuffled.next());
  });

  it('does not change the pool and returns a new array', () => {
    const pool = [...POOL];
    const frozen = Object.freeze([...POOL]);
    const result = drawRewards(frozen, 3, createRng(1));
    expect(pool).toEqual(POOL);
    expect(frozen).toEqual(POOL);
    expect(result).not.toBe(frozen);
  });

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('throws RangeError for a %s count, even for an empty pool', (_name, count) => {
    expect(() => drawRewards(POOL, count, createRng(1))).toThrow(RangeError);
    expect(() => drawRewards([], count, createRng(1))).toThrow(RangeError);
  });
});
