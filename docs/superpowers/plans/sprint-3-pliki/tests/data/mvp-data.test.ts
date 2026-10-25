// S03-01: the real data in src/data/ (the 150 MVP creatures with their effects, the budget rules,
// the Workshop prices). Balance numbers are NOT pinned here, so balancing does not break the tests.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCreature } from '../../src/core/combat/creature.ts';
import { CombatDataError, loadCombatData, parseCombatData } from '../../src/data/combat-schema.ts';

const read = (file: string): string =>
  fs.readFileSync(new URL(`../../src/data/${file}`, import.meta.url), 'utf8');
const data = loadCombatData(read);
const raw = () => ({
  symbols: JSON.parse(read('symbols.json')) as unknown,
  cards: JSON.parse(read('cards.json')) as unknown,
  enemies: JSON.parse(read('enemies.json')) as unknown,
  balance: JSON.parse(read('balance.json')) as Record<string, unknown>,
  decks: JSON.parse(read('decks.json')) as unknown,
});
const { symbols, balance } = data;

describe('the symbols', () => {
  it('are 5 elements, 6 forms and 5 traits: 150 creatures', () => {
    expect([symbols.elements.length, symbols.forms.length, symbols.traits.length]).toEqual([5, 6, 5]);
  });

  it('keep the order the creature code relies on', () => {
    expect(symbols.elements.map((e) => e.id)).toEqual(['ogien', 'woda', 'ziemia', 'wiatr', 'grom']);
    expect(symbols.forms.map((f) => f.id)).toEqual([
      'wilk', 'kruk', 'sowa', 'waz', 'niedzwiedz', 'jelen',
    ]);
    expect(symbols.traits.map((t) => t.id)).toEqual(['gniew', 'smutek', 'spryt', 'odwaga', 'glod']);
  });

  it('every element and every form has an effect; traits only change the numbers', () => {
    for (const e of symbols.elements) expect(e.effects?.length ?? 0).toBeGreaterThan(0);
    for (const f of symbols.forms) expect(f.effects?.length ?? 0).toBeGreaterThan(0);
    for (const t of symbols.traits) expect(t.effects ?? []).toEqual([]);
  });
});

describe('the budget rules', () => {
  it('set the budget to 10, one health per unspent point, and the Workshop prices', () => {
    expect(balance.powerBudget).toBe(10);
    expect(balance.leftoverHealth).toBe(1);
    expect(balance.workshop).toEqual({ emberCost: 2, inkPerPower: 4 });
  });

  it('every one of the 150 combinations fits the budget of 10', () => {
    let count = 0;
    let dearest = 0;
    for (const e of symbols.elements)
      for (const f of symbols.forms)
        for (const t of symbols.traits) {
          const cost = e.cost + f.cost + t.cost;
          expect(cost).toBeLessThanOrEqual(10);
          dearest = Math.max(dearest, cost);
          count++;
        }
    expect(count).toBe(150);
    expect(dearest).toBe(10);
  });

  it('every creature has at least 1 attack and at least 3 health', () => {
    const rules = { powerBudget: 10, leftoverHealth: 1 };
    for (const e of symbols.elements)
      for (const f of symbols.forms)
        for (const t of symbols.traits) {
          const c = buildCreature(symbols, 'x', { element: e.id, form: f.id, trait: t.id }, rules);
          expect(c.attack).toBeGreaterThanOrEqual(1);
          expect(c.health).toBeGreaterThanOrEqual(3);
        }
  });
});

describe('the schema of the budget rules', () => {
  const fieldPathOf = (input: unknown): string | null => {
    try {
      parseCombatData(input);
      return null;
    } catch (error) {
      if (!(error instanceof CombatDataError)) throw error;
      return error.fieldPath;
    }
  };

  it('accepts the real data', () => {
    expect(fieldPathOf(raw())).toBeNull();
  });

  it('rejects leftoverHealth without powerBudget', () => {
    const r = raw();
    delete r.balance['powerBudget'];
    delete r.balance['workshop'];
    expect(fieldPathOf(r)).toBe('balance.leftoverHealth');
  });

  it('rejects the Workshop without powerBudget', () => {
    const r = raw();
    delete r.balance['powerBudget'];
    r.balance['leftoverHealth'] = 0;
    expect(fieldPathOf(r)).toBe('balance.workshop');
  });

  it('rejects a negative or fractional leftoverHealth and a zero ink price', () => {
    for (const [key, value, path] of [
      ['leftoverHealth', -1, 'balance.leftoverHealth'],
      ['leftoverHealth', 0.5, 'balance.leftoverHealth'],
      ['workshop', { emberCost: 2, inkPerPower: 0 }, 'balance.workshop.inkPerPower'],
      ['powerBudget', 0, 'balance.powerBudget'],
    ] as const) {
      const r = raw();
      r.balance[key] = value;
      expect(fieldPathOf(r)).toBe(path);
    }
  });

  it('still accepts the old balance without the new fields', () => {
    const r = raw();
    r.balance = { playerMaxHp: r.balance['playerMaxHp'], ritual: r.balance['ritual'] };
    expect(fieldPathOf(r)).toBeNull();
  });
});
