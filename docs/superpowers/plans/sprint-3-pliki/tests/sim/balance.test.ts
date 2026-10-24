import { describe, expect, it } from 'vitest';
import type { CombatData, EnemyDef } from '../../src/core/combat/model.ts';
import { evaluateCreature, listValidCreatures } from '../../src/core/creatures.ts';
import {
  WIN_RATE_MAX,
  WIN_RATE_MIN,
  balanceToCsv,
  flagOf,
  runBalance,
} from '../../src/core/sim/balance.ts';
import { FIXTURE, SYMBOLS, deepFreeze } from '../combat/fixtures.ts';

const DATA: CombatData = {
  ...FIXTURE,
  balance: {
    ...FIXTURE.balance,
    powerBudget: 10,
    leftoverHealth: 1,
    workshop: { emberCost: 2, inkPerPower: 4 },
  },
  decks: { ...FIXTURE.decks, rdzen: ['uderzenie', 'uderzenie', 'plomien', 'oklad', 'mgla'] },
};
const OPTIONS = { baseDeck: 'rdzen', enemyId: 'leszy', games: 3, seed: 100, copies: 4 };

describe('flagOf', () => {
  it('flags a win rate outside 35-65%, the limits themselves are fine', () => {
    expect([WIN_RATE_MIN, WIN_RATE_MAX]).toEqual([0.35, 0.65]);
    expect(flagOf(0.35)).toBe('ok');
    expect(flagOf(0.3499)).toBe('low');
    expect(flagOf(0.5)).toBe('ok');
    expect(flagOf(0.65)).toBe('ok');
    expect(flagOf(0.6501)).toBe('high');
    expect(flagOf(0)).toBe('low');
    expect(flagOf(1)).toBe('high');
  });
});

describe('runBalance', () => {
  const rows = runBalance(deepFreeze(structuredClone(DATA)), OPTIONS);

  it('gives one row per valid creature, in the order of listValidCreatures', () => {
    const specs = listValidCreatures(SYMBOLS, 10);
    expect(rows).toHaveLength(150);
    expect(rows.map((r) => [r.element, r.form, r.trait])).toEqual(
      specs.map((s) => [s.element, s.form, s.trait]),
    );
  });

  it('describes the creature with its rated cost and stats', () => {
    const rules = { powerBudget: 10, leftoverHealth: 1 };
    for (const row of rows) {
      const stats = evaluateCreature(SYMBOLS, row, rules);
      expect([row.cost, row.attack, row.health]).toEqual([stats.cost, stats.attack, stats.health]);
    }
  });

  it('counts games and wins, and derives the win rate and the flag from them', () => {
    for (const row of rows) {
      expect(row.games).toBe(3);
      expect(row.wins).toBeGreaterThanOrEqual(0);
      expect(row.wins).toBeLessThanOrEqual(3);
      expect(row.winRate).toBeCloseTo(row.wins / 3, 10);
      expect(row.flag).toBe(flagOf(row.winRate));
      expect(row.avgTurns).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a seed', () => {
    expect(runBalance(DATA, OPTIONS)).toEqual(rows);
  });

  it('uses the power budget of the data', () => {
    const tight: CombatData = { ...DATA, balance: { ...DATA.balance, powerBudget: 8 } };
    expect(runBalance(tight, OPTIONS)).toHaveLength(86);
  });

  it('really puts the creature into the deck: with only shields besides it, it must do the killing', () => {
    const weak: CombatData = {
      ...DATA,
      decks: { ...DATA.decks, tarcze: ['oklad', 'oklad', 'mgla'] },
      enemies: { leszy: { ...(DATA.enemies['leszy'] as EnemyDef), maxHp: 1, resist: [], weak: [] } },
    };
    const result = runBalance(weak, { ...OPTIONS, baseDeck: 'tarcze', games: 2 });
    for (const row of result) expect(row.wins).toBe(2);
  });

  it('throws an Error without the Workshop prices, or for an unknown deck or enemy', () => {
    const noWorkshop: CombatData = {
      ...DATA,
      balance: { playerMaxHp: 40, ritual: DATA.balance.ritual },
    };
    expect(() => runBalance(noWorkshop, OPTIONS)).toThrow(Error);
    expect(() => runBalance(DATA, { ...OPTIONS, baseDeck: 'nie-ma' })).toThrow(Error);
    expect(() => runBalance(DATA, { ...OPTIONS, baseDeck: 'toString' })).toThrow(Error);
    expect(() => runBalance(DATA, { ...OPTIONS, enemyId: 'nikt' })).toThrow(Error);
    expect(() => runBalance(DATA, { ...OPTIONS, enemyId: '__proto__' })).toThrow(Error);
  });
});

describe('balanceToCsv', () => {
  it('writes a header and one line per row', () => {
    const csv = balanceToCsv([
      {
        element: 'ogien',
        form: 'wilk',
        trait: 'gniew',
        cost: 10,
        attack: 6,
        health: 4,
        games: 200,
        wins: 87,
        winRate: 0.435,
        avgTurns: 17.456,
        flag: 'ok',
      },
    ]);
    expect(csv).toBe(
      'element,form,trait,cost,attack,health,games,wins,win_rate,avg_turns,flag\n' +
        'ogien,wilk,gniew,10,6,4,200,87,0.4350,17.46,ok\n',
    );
  });

  it('writes just the header for no rows', () => {
    expect(balanceToCsv([])).toBe('element,form,trait,cost,attack,health,games,wins,win_rate,avg_turns,flag\n');
  });
});
