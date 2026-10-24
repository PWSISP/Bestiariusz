import { describe, expect, it } from 'vitest';
import { countScope, scaledAmount } from '../src/core/combat/synergy.ts';
import type { BoardCreature } from '../src/core/combat/synergy.ts';

const c = (element: string): BoardCreature => ({ element });
const FIRE = c('ogien');
const WATER = c('woda');
const WIND = c('wiatr');

describe('countScope', () => {
  it('self counts 1 whatever stands around', () => {
    expect(countScope('self', [FIRE, null, null], 0)).toBe(1);
    expect(countScope('self', [FIRE, FIRE, FIRE], 2)).toBe(1);
  });

  it('sameElementOthers counts the other creatures of the same element', () => {
    expect(countScope('sameElementOthers', [FIRE, null, null], 0)).toBe(0);
    expect(countScope('sameElementOthers', [FIRE, FIRE, null], 0)).toBe(1);
    expect(countScope('sameElementOthers', [FIRE, FIRE, FIRE], 1)).toBe(2);
    expect(countScope('sameElementOthers', [FIRE, WATER, FIRE], 2)).toBe(1);
    expect(countScope('sameElementOthers', [FIRE, WATER, WATER], 0)).toBe(0);
  });

  it('sameElementAll is the same count plus the creature itself', () => {
    expect(countScope('sameElementAll', [null, FIRE, null], 1)).toBe(1);
    expect(countScope('sameElementAll', [FIRE, WATER, FIRE], 0)).toBe(2);
    expect(countScope('sameElementAll', [FIRE, FIRE, FIRE], 2)).toBe(3);
  });

  it('othersAny counts every other creature whatever its element', () => {
    expect(countScope('othersAny', [FIRE, null, null], 0)).toBe(0);
    expect(countScope('othersAny', [FIRE, WATER, null], 0)).toBe(1);
    expect(countScope('othersAny', [FIRE, WATER, WIND], 1)).toBe(2);
  });

  it('wind is not a wildcard: only the same element id counts', () => {
    expect(countScope('sameElementOthers', [WIND, FIRE, WIND], 0)).toBe(1);
    expect(countScope('sameElementAll', [FIRE, WIND, FIRE], 1)).toBe(1);
    // the Ritual treats wind as any element; here a wind creature never counts for a fire one
    expect(countScope('sameElementOthers', [FIRE, WIND, FIRE], 0)).toBe(1);
    expect(countScope('sameElementAll', [FIRE, WIND, WIND], 0)).toBe(1);
  });

  it('throws RangeError when there is no creature in that circle', () => {
    expect(() => countScope('self', [FIRE, null, null], 1)).toThrow(RangeError);
  });

  it('throws RangeError for an index outside 0-2 or not an integer', () => {
    for (const index of [-1, 3, 1.5, Number.NaN]) {
      expect(() => countScope('self', [FIRE, FIRE, FIRE], index)).toThrow(RangeError);
    }
  });

  it('throws RangeError when there are not exactly 3 circles', () => {
    expect(() => countScope('self', [FIRE, FIRE], 0)).toThrow(RangeError);
    expect(() => countScope('self', [FIRE, FIRE, FIRE, FIRE], 0)).toThrow(RangeError);
  });

  it('does not modify the circles', () => {
    const circles = Object.freeze([FIRE, WATER, FIRE] as const);
    expect(() => countScope('sameElementOthers', circles, 0)).not.toThrow();
    expect(circles).toEqual([FIRE, WATER, FIRE]);
  });
});

describe('scaledAmount', () => {
  it('multiplies the amount by the number of counted creatures', () => {
    const fx = { amount: 2, scope: 'sameElementOthers' } as const;
    expect(scaledAmount(fx, [FIRE, FIRE, FIRE], 0)).toBe(4);
    expect(scaledAmount(fx, [FIRE, FIRE, null], 0)).toBe(2);
  });

  it('is 0 when no creature is counted', () => {
    expect(scaledAmount({ amount: 3, scope: 'sameElementOthers' }, [FIRE, WATER, null], 0)).toBe(0);
    expect(scaledAmount({ amount: 3, scope: 'othersAny' }, [FIRE, null, null], 0)).toBe(0);
  });

  it('self returns the amount unchanged', () => {
    expect(scaledAmount({ amount: 5, scope: 'self' }, [null, WATER, null], 1)).toBe(5);
  });

  it('throws RangeError like countScope', () => {
    expect(() => scaledAmount({ amount: 1, scope: 'self' }, [null, null, null], 0)).toThrow(
      RangeError,
    );
  });
});
