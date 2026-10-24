import { describe, expect, it } from 'vitest';
import { buildCreature } from '../../src/core/combat/creature.ts';
import { SYMBOLS } from './fixtures.ts';

const rules = { powerBudget: 10, leftoverHealth: 1 };
const woda = { element: 'woda', form: 'sowa', trait: 'odwaga' }; // cost 2 + 3 + 2 = 7, health 4 + 2

describe('buildCreature: unspent budget (decision D22)', () => {
  it('without rules the health is as before', () => {
    expect(buildCreature(SYMBOLS, 'x', woda).health).toBe(6);
  });

  it('adds leftoverHealth for every unspent budget point', () => {
    expect(buildCreature(SYMBOLS, 'x', woda, rules).health).toBe(9);
    expect(buildCreature(SYMBOLS, 'x', woda, { ...rules, leftoverHealth: 2 }).health).toBe(12);
    expect(buildCreature(SYMBOLS, 'x', woda, { ...rules, leftoverHealth: 0 }).health).toBe(6);
  });

  it('adds nothing for a creature that spends the whole budget or more', () => {
    const wilk = { element: 'ogien', form: 'wilk', trait: 'gniew' }; // cost 10
    expect(buildCreature(SYMBOLS, 'x', wilk, rules).health).toBe(4);
    expect(buildCreature(SYMBOLS, 'x', wilk, { ...rules, powerBudget: 7 }).health).toBe(4);
  });

  it('does not change attack, and sets maxHealth to the health', () => {
    const c = buildCreature(SYMBOLS, 'x', woda, rules);
    expect(c.attack).toBe(1);
    expect(c.maxHealth).toBe(c.health);
  });
});
