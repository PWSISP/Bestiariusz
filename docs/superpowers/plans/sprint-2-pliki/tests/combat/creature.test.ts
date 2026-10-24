import { describe, expect, it } from 'vitest';
import { buildCreature } from '../../src/core/combat/creature.ts';
import { SYMBOLS } from './fixtures.ts';
import type { SymbolData } from '../../src/core/types.ts';

describe('buildCreature', () => {
  it('adds form base, element bonus and trait modifier', () => {
    // ogien (+1 attack) + wilk (3/4) + gniew (+2 attack)
    expect(buildCreature(SYMBOLS, 'ogien-wilk-gniew', { element: 'ogien', form: 'wilk', trait: 'gniew' })).toEqual({
      cardId: 'ogien-wilk-gniew',
      element: 'ogien',
      form: 'wilk',
      trait: 'gniew',
      attack: 6,
      health: 4,
      maxHealth: 4,
    });
    // ziemia (+1 health) + jelen (2/6) + odwaga (+2 health)
    const jelen = buildCreature(SYMBOLS, 'x', { element: 'ziemia', form: 'jelen', trait: 'odwaga' });
    expect([jelen.attack, jelen.health, jelen.maxHealth]).toEqual([2, 9, 9]);
  });

  it('attack never goes below 0 and health never below 1', () => {
    const weak: SymbolData = {
      elements: [{ id: 'e', cost: 1, attackBonus: -5, healthBonus: -9 }],
      forms: [{ id: 'f', cost: 1, baseAttack: 1, baseHealth: 2, gender: 'm' }],
      traits: [{ id: 't', cost: 1, attackMod: -1, healthMod: -1 }],
    };
    const c = buildCreature(weak, 'w', { element: 'e', form: 'f', trait: 't' });
    expect([c.attack, c.health, c.maxHealth]).toEqual([0, 1, 1]);
  });

  it('throws on an unknown symbol', () => {
    expect(() => buildCreature(SYMBOLS, 'x', { element: 'mroz', form: 'wilk', trait: 'gniew' })).toThrow(Error);
    expect(() => buildCreature(SYMBOLS, 'x', { element: 'ogien', form: 'lis', trait: 'gniew' })).toThrow(Error);
    expect(() => buildCreature(SYMBOLS, 'x', { element: 'ogien', form: 'wilk', trait: 'duma' })).toThrow(Error);
  });
});
