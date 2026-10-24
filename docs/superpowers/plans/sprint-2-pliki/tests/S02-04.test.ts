import { describe, expect, it } from 'vitest';
import {
  EMBER_PER_TURN,
  canAfford,
  gainEmber,
  playableIndexes,
  spendEmber,
} from '../src/core/combat/ember.ts';

describe('ember', () => {
  it('a turn gives 3 ember, as in the game design document', () => {
    expect(EMBER_PER_TURN).toBe(3);
  });

  it('canAfford compares the cost with the ember', () => {
    expect(canAfford(3, 3)).toBe(true);
    expect(canAfford(3, 2)).toBe(true);
    expect(canAfford(2, 3)).toBe(false);
    expect(canAfford(0, 0)).toBe(true);
    expect(canAfford(0, 1)).toBe(false);
  });

  it('spendEmber subtracts the cost', () => {
    expect(spendEmber(3, 2)).toBe(1);
    expect(spendEmber(3, 3)).toBe(0);
    expect(spendEmber(2, 0)).toBe(2);
  });

  it('spendEmber refuses to go below zero', () => {
    expect(() => spendEmber(2, 3)).toThrow(RangeError);
    expect(() => spendEmber(0, 1)).toThrow(RangeError);
  });

  it('gainEmber adds and has no cap', () => {
    expect(gainEmber(1, 2)).toBe(3);
    expect(gainEmber(3, 2)).toBe(5);
    expect(gainEmber(0, 0)).toBe(0);
  });

  it.each([[-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'invalid number %s throws RangeError in every function',
    (bad) => {
      expect(() => canAfford(bad, 1)).toThrow(RangeError);
      expect(() => canAfford(1, bad)).toThrow(RangeError);
      expect(() => spendEmber(bad, 1)).toThrow(RangeError);
      expect(() => spendEmber(1, bad)).toThrow(RangeError);
      expect(() => gainEmber(bad, 1)).toThrow(RangeError);
      expect(() => gainEmber(1, bad)).toThrow(RangeError);
      expect(() => playableIndexes(['a'], () => 1, bad)).toThrow(RangeError);
    },
  );

  const costs: Record<string, number | null> = { cheap: 1, mid: 2, dear: 3, curse: null, free: 0 };
  const costOf = (id: string): number | null => costs[id] ?? null;

  it('playableIndexes lists affordable cards in hand order', () => {
    expect(playableIndexes(['dear', 'cheap', 'mid', 'free'], costOf, 2)).toEqual([1, 2, 3]);
    expect(playableIndexes(['dear', 'cheap', 'mid', 'free'], costOf, 3)).toEqual([0, 1, 2, 3]);
    expect(playableIndexes(['dear', 'mid'], costOf, 1)).toEqual([]);
    expect(playableIndexes([], costOf, 3)).toEqual([]);
  });

  it('a card with cost null (a curse) is never playable', () => {
    expect(playableIndexes(['curse', 'cheap', 'curse'], costOf, 3)).toEqual([1]);
  });

  it('a card played twice from the same hand is listed twice', () => {
    expect(playableIndexes(['cheap', 'cheap'], costOf, 1)).toEqual([0, 1]);
  });
});
