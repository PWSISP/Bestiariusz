// S06-01: the expedition block of balance.json and its cross-checks. Numbers are not pinned.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CombatDataError, loadCombatData, parseCombatData } from '../../src/data/combat-schema.ts';

const read = (file: string): string =>
  fs.readFileSync(new URL(`../../src/data/${file}`, import.meta.url), 'utf8');
const raw = () => ({
  symbols: JSON.parse(read('symbols.json')) as unknown,
  cards: JSON.parse(read('cards.json')) as unknown,
  enemies: JSON.parse(read('enemies.json')) as unknown,
  balance: JSON.parse(read('balance.json')) as Record<string, any>,
  decks: JSON.parse(read('decks.json')) as unknown,
});
const withExpedition = (change: Record<string, unknown>) => {
  const r = raw();
  return { ...r, balance: { ...r.balance, expedition: { ...r.balance.expedition, ...change } } };
};
const failurePath = (value: unknown): string => {
  try {
    parseCombatData(value, 'x');
  } catch (error) {
    expect(error).toBeInstanceOf(CombatDataError);
    return (error as CombatDataError).fieldPath;
  }
  throw new Error('expected parseCombatData to throw');
};

describe('the real expedition', () => {
  const { expedition } = loadCombatData(read).balance;

  it('is configured, ends with the Leszy and offers more cards than a reward shows', () => {
    expect(expedition).toBeDefined();
    expect(expedition?.stages.at(-1)).toBe('leszy');
    expect(expedition?.stages.length).toBeGreaterThanOrEqual(2);
    expect(new Set(expedition?.rewardPool).size).toBeGreaterThanOrEqual(
      expedition?.rewardChoices ?? 99,
    );
  });

  it('uses only enemies, cards and a deck that exist', () => {
    const data = loadCombatData(read);
    for (const id of expedition?.stages ?? []) expect(data.enemies[id]).toBeDefined();
    for (const id of expedition?.rewardPool ?? []) expect(data.cards[id]).toBeDefined();
    expect(data.decks[expedition?.deck ?? '']).toBeDefined();
  });
});

describe('parseCombatData: the expedition block', () => {
  it('stays optional', () => {
    const r = raw();
    const { expedition: _gone, ...balance } = r.balance;
    expect(parseCombatData({ ...r, balance }, 'x').balance.expedition).toBeUndefined();
  });

  it.each([
    ['an unknown enemy', { stages: ['utopiec', 'nikt'] }, 'balance.expedition.stages[1]'],
    ['an unknown deck', { deck: 'brak' }, 'balance.expedition.deck'],
    [
      'an unknown reward card',
      { rewardPool: ['iskra', 'brak'] },
      'balance.expedition.rewardPool[1]',
    ],
    [
      'a curse as a reward',
      { rewardPool: ['iskra', 'klatwa'] },
      'balance.expedition.rewardPool[1]',
    ],
    [
      'more choices than different cards',
      { rewardPool: ['iskra', 'iskra'], rewardChoices: 2 },
      'balance.expedition.rewardChoices',
    ],
    ['no stages', { stages: [] }, 'balance.expedition.stages'],
    ['a negative heal', { healBetween: -1 }, 'balance.expedition.healBetween'],
    ['zero choices', { rewardChoices: 0 }, 'balance.expedition.rewardChoices'],
  ])('rejects %s', (_name, change, path) => {
    expect(failurePath(withExpedition(change))).toBe(path);
  });

  it('rejects an unknown field', () => {
    expect(failurePath(withExpedition({ extra: 1 }))).toBe('balance.expedition');
  });
});
