import { describe, expect, it } from 'vitest';
import type { Balance, CombatData } from '../../src/core/combat/model.ts';
import { reduce } from '../../src/core/combat/reducer.ts';
import { createRng } from '../../src/core/rng.ts';
import { FIXTURE, SEED, makeState } from './fixtures.ts';

describe('reduce: the budget rule comes from the balance data (decision D22)', () => {
  // woda-sowa-odwaga costs 2 + 3 + 2 = 7 of the budget 10: 6 health without the rule
  const summonedHealth = (balance: Partial<Balance>): number | undefined => {
    const data: CombatData = { ...FIXTURE, balance: { ...FIXTURE.balance, ...balance } };
    const state = makeState({ hand: ['woda-sowa-odwaga'] });
    const r = reduce(
      state,
      { type: 'playCard', handIndex: 0, circle: 0 },
      { data, rng: createRng(SEED) },
    );
    return r.state.player.circles[0]?.health;
  };

  it('a summoned creature gets leftoverHealth for every unspent point', () => {
    expect(summonedHealth({ powerBudget: 10, leftoverHealth: 1 })).toBe(9);
    expect(summonedHealth({ powerBudget: 10, leftoverHealth: 2 })).toBe(12);
  });

  it('a balance without the rule changes nothing', () => {
    expect(summonedHealth({})).toBe(6);
    expect(summonedHealth({ powerBudget: 10 })).toBe(6);
    expect(summonedHealth({ powerBudget: 10, leftoverHealth: 0 })).toBe(6);
  });

  it('leftoverHealth without powerBudget is ignored instead of giving NaN', () => {
    expect(summonedHealth({ leftoverHealth: 1 })).toBe(6);
  });
});
