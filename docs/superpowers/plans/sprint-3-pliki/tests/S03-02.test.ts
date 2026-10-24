import { describe, expect, it } from 'vitest';
import { evaluateCreature, listValidCreatures } from '../src/core/creatures.ts';
import type { CreatureSpec } from '../src/core/types.ts';
import { SYMBOLS } from './combat/fixtures.ts';

const RULES = { powerBudget: 10, leftoverHealth: 1 };
const spec = (element: string, form: string, trait: string): CreatureSpec => ({
  element,
  form,
  trait,
});

describe('evaluateCreature', () => {
  it('gives the unspent budget as health', () => {
    expect(evaluateCreature(SYMBOLS, spec('woda', 'kruk', 'smutek'), RULES)).toEqual({
      cost: 6,
      valid: true,
      overBudgetBy: 0,
      attack: 2,
      health: 8,
    });
  });

  it('adds element bonuses and trait modifiers', () => {
    expect(evaluateCreature(SYMBOLS, spec('ziemia', 'jelen', 'odwaga'), RULES)).toEqual({
      cost: 8,
      valid: true,
      overBudgetBy: 0,
      attack: 2,
      health: 11,
    });
    expect(evaluateCreature(SYMBOLS, spec('ogien', 'wilk', 'gniew'), RULES)).toEqual({
      cost: 10,
      valid: true,
      overBudgetBy: 0,
      attack: 6,
      health: 4,
    });
  });

  it('multiplies the unspent budget by leftoverHealth', () => {
    const s = spec('woda', 'kruk', 'smutek');
    expect(evaluateCreature(SYMBOLS, s, { powerBudget: 10, leftoverHealth: 0 }).health).toBe(4);
    expect(evaluateCreature(SYMBOLS, s, { powerBudget: 10, leftoverHealth: 2 }).health).toBe(12);
  });

  it('rates an over-budget creature as invalid but still gives it stats, without leftover', () => {
    const tight = { powerBudget: 9, leftoverHealth: 1 };
    expect(evaluateCreature(SYMBOLS, spec('grom', 'niedzwiedz', 'gniew'), tight)).toEqual({
      cost: 10,
      valid: false,
      overBudgetBy: 1,
      attack: 7,
      health: 7,
    });
  });

  it('a creature that exactly fits the budget is valid', () => {
    const r = evaluateCreature(SYMBOLS, spec('grom', 'wilk', 'gniew'), RULES);
    expect(r.valid).toBe(true);
    expect(r.overBudgetBy).toBe(0);
  });

  it('keeps attack at 0 or more and health at 1 or more', () => {
    const odd: typeof SYMBOLS = {
      elements: [{ id: 'a', cost: 1, attackBonus: -5, healthBonus: -5 }],
      forms: [{ id: 'f', cost: 1, baseAttack: 1, baseHealth: 1, gender: 'm' }],
      traits: [{ id: 't', cost: 1, attackMod: 0, healthMod: 0 }],
    };
    const r = evaluateCreature(odd, spec('a', 'f', 't'), { powerBudget: 3, leftoverHealth: 0 });
    expect(r.attack).toBe(0);
    expect(r.health).toBe(1);
  });

  it('throws an Error for an unknown symbol', () => {
    expect(() => evaluateCreature(SYMBOLS, spec('lod', 'wilk', 'gniew'), RULES)).toThrow(Error);
    expect(() => evaluateCreature(SYMBOLS, spec('grom', 'zubr', 'gniew'), RULES)).toThrow(Error);
    expect(() => evaluateCreature(SYMBOLS, spec('grom', 'wilk', 'lek'), RULES)).toThrow(Error);
  });

  it('does not modify the symbols', () => {
    const before = JSON.stringify(SYMBOLS);
    evaluateCreature(SYMBOLS, spec('woda', 'kruk', 'smutek'), RULES);
    expect(JSON.stringify(SYMBOLS)).toBe(before);
  });
});

describe('listValidCreatures', () => {
  it('lists all 150 creatures of the MVP symbols within a budget of 10', () => {
    const list = listValidCreatures(SYMBOLS, 10);
    expect(list).toHaveLength(150);
    expect(list[0]).toEqual(spec('ogien', 'wilk', 'gniew'));
    expect(list[1]).toEqual(spec('ogien', 'wilk', 'smutek'));
    expect(list[5]).toEqual(spec('ogien', 'kruk', 'gniew'));
    expect(list[149]).toEqual(spec('grom', 'jelen', 'glod'));
    expect(new Set(list.map((c) => `${c.element}:${c.form}:${c.trait}`)).size).toBe(150);
  });

  it('skips the combinations that cost more than the budget, keeping the order', () => {
    expect(listValidCreatures(SYMBOLS, 9)).toHaveLength(134);
    const eight = listValidCreatures(SYMBOLS, 8);
    expect(eight).toHaveLength(86);
    expect(eight[0]).toEqual(spec('ogien', 'wilk', 'smutek'));
    expect(eight[85]).toEqual(spec('grom', 'jelen', 'smutek'));
    expect(listValidCreatures(SYMBOLS, 6)).toEqual([
      spec('woda', 'kruk', 'smutek'),
      spec('woda', 'sowa', 'smutek'),
      spec('ziemia', 'kruk', 'smutek'),
      spec('ziemia', 'sowa', 'smutek'),
      spec('wiatr', 'kruk', 'smutek'),
      spec('wiatr', 'sowa', 'smutek'),
    ]);
  });

  it('returns an empty list when nothing fits', () => {
    expect(listValidCreatures(SYMBOLS, 5)).toEqual([]);
  });

  it('agrees with evaluateCreature about validity', () => {
    for (const budget of [5, 6, 8, 10, 12]) {
      const listed = new Set(
        listValidCreatures(SYMBOLS, budget).map((c) => `${c.element}:${c.form}:${c.trait}`),
      );
      for (const e of SYMBOLS.elements)
        for (const f of SYMBOLS.forms)
          for (const t of SYMBOLS.traits) {
            const valid = evaluateCreature(SYMBOLS, spec(e.id, f.id, t.id), {
              powerBudget: budget,
              leftoverHealth: 1,
            }).valid;
            expect(listed.has(`${e.id}:${f.id}:${t.id}`)).toBe(valid);
          }
    }
  });
});
