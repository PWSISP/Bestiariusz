import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import type { CombatSummary } from '../src/core/combat/summary.ts';
import { LONG_DEFEAT_TURNS, buildResultView } from '../src/view/result-view.ts';
import { keysOf } from '../src/view/text.ts';
import type { TextRef } from '../src/view/text.ts';

const read = (file: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(new URL(`../src/i18n/${file}`, import.meta.url), 'utf8')) as Record<
    string,
    string
  >;
const pl = read('pl.json');
const en = read('en.json');

const won = (over: Partial<CombatSummary> = {}): CombatSummary => ({
  outcome: 'won',
  enemyId: 'leszy',
  turns: 14,
  hpLeft: 30,
  hpMax: 40,
  ritualUsed: true,
  ...over,
});
const lost = (over: Partial<CombatSummary> = {}): CombatSummary => ({
  outcome: 'lost',
  enemyId: 'leszy',
  turns: 9,
  hpLeft: 0,
  hpMax: 40,
  ritualUsed: false,
  ...over,
});
const flavorOf = (summary: CombatSummary): string => buildResultView(summary).flavor.key;

describe('buildResultView: title, enemy and button', () => {
  it('names a win and a defeat', () => {
    expect(buildResultView(won()).outcome).toBe('won');
    expect(buildResultView(won()).title).toEqual({ key: 'result.won.title' });
    expect(buildResultView(lost()).outcome).toBe('lost');
    expect(buildResultView(lost()).title).toEqual({ key: 'result.lost.title' });
  });

  it('refers to the name of the enemy by its id', () => {
    expect(buildResultView(won()).enemyName).toEqual({ key: 'enemy.leszy.name' });
    expect(buildResultView(won({ enemyId: 'bies' })).enemyName).toEqual({ key: 'enemy.bies.name' });
  });

  it('has a single primary button "continue"', () => {
    expect(buildResultView(won()).primary).toEqual({
      id: 'continue',
      label: { key: 'result.continue' },
    });
    expect(buildResultView(lost()).primary).toEqual({
      id: 'continue',
      label: { key: 'result.continue' },
    });
  });
});

describe('buildResultView: flavour of a win', () => {
  it('is high from three quarters of the health', () => {
    expect(flavorOf(won({ hpLeft: 40 }))).toBe('result.won.flavor.high');
    expect(flavorOf(won({ hpLeft: 30 }))).toBe('result.won.flavor.high');
    expect(flavorOf(won({ hpLeft: 75, hpMax: 100 }))).toBe('result.won.flavor.high');
  });

  it('is mid from 35% up to three quarters', () => {
    expect(flavorOf(won({ hpLeft: 29 }))).toBe('result.won.flavor.mid');
    expect(flavorOf(won({ hpLeft: 14 }))).toBe('result.won.flavor.mid');
    expect(flavorOf(won({ hpLeft: 74, hpMax: 100 }))).toBe('result.won.flavor.mid');
    expect(flavorOf(won({ hpLeft: 35, hpMax: 100 }))).toBe('result.won.flavor.mid');
  });

  it('is low below 35%, also with no health left', () => {
    expect(flavorOf(won({ hpLeft: 13 }))).toBe('result.won.flavor.low');
    expect(flavorOf(won({ hpLeft: 34, hpMax: 100 }))).toBe('result.won.flavor.low');
    expect(flavorOf(won({ hpLeft: 1 }))).toBe('result.won.flavor.low');
    expect(flavorOf(won({ hpLeft: 0 }))).toBe('result.won.flavor.low');
  });

  it('compares with whole numbers, so odd maximums have no rounding surprises', () => {
    // 3/4 of 37 is 27.75: 28 is high, 27 is mid; 7/20 of 37 is 12.95: 13 is mid, 12 is low.
    expect(flavorOf(won({ hpMax: 37, hpLeft: 28 }))).toBe('result.won.flavor.high');
    expect(flavorOf(won({ hpMax: 37, hpLeft: 27 }))).toBe('result.won.flavor.mid');
    expect(flavorOf(won({ hpMax: 37, hpLeft: 13 }))).toBe('result.won.flavor.mid');
    expect(flavorOf(won({ hpMax: 37, hpLeft: 12 }))).toBe('result.won.flavor.low');
    expect(flavorOf(won({ hpMax: 1, hpLeft: 1 }))).toBe('result.won.flavor.high');
  });

  it('does not depend on the number of turns', () => {
    expect(flavorOf(won({ turns: 1 }))).toBe(flavorOf(won({ turns: 60 })));
  });
});

describe('buildResultView: flavour of a defeat', () => {
  it('is short before LONG_DEFEAT_TURNS and long from it', () => {
    expect(LONG_DEFEAT_TURNS).toBe(20);
    expect(flavorOf(lost({ turns: 1 }))).toBe('result.lost.flavor.short');
    expect(flavorOf(lost({ turns: 19 }))).toBe('result.lost.flavor.short');
    expect(flavorOf(lost({ turns: 20 }))).toBe('result.lost.flavor.long');
    expect(flavorOf(lost({ turns: 45 }))).toBe('result.lost.flavor.long');
  });

  it('does not depend on the health left', () => {
    expect(flavorOf(lost({ hpLeft: 0, turns: 25 }))).toBe(
      flavorOf(lost({ hpLeft: 30, turns: 25 })),
    );
  });
});

describe('buildResultView: statistics', () => {
  it('lists turns, health and ritual, in this order', () => {
    const view = buildResultView(won({ turns: 14, hpLeft: 30, hpMax: 40, ritualUsed: true }));
    expect(view.stats).toEqual([
      { id: 'turns', label: { key: 'result.stat.turns', params: { turns: 14 } } },
      { id: 'hp', label: { key: 'result.stat.hp', params: { hp: 30, max: 40 } } },
      { id: 'ritual', label: { key: 'result.stat.ritual.yes' } },
    ]);
  });

  it('says that the ritual was not performed', () => {
    expect(buildResultView(lost({ ritualUsed: false })).stats[2]).toEqual({
      id: 'ritual',
      label: { key: 'result.stat.ritual.no' },
    });
  });

  it('shows 0 health after a defeat', () => {
    expect(buildResultView(lost()).stats[1]?.label).toEqual({
      key: 'result.stat.hp',
      params: { hp: 0, max: 40 },
    });
  });
});

describe('buildResultView: texts and arguments', () => {
  const REFS = (view: ReturnType<typeof buildResultView>): TextRef[] => [
    view.title,
    view.flavor,
    view.enemyName,
    ...view.stats.map((s) => s.label),
    view.primary.label,
  ];

  it('uses only keys that exist in both language files', () => {
    const summaries = [
      won({ hpLeft: 40 }),
      won({ hpLeft: 20 }),
      won({ hpLeft: 2 }),
      lost({ turns: 5 }),
      lost({ turns: 30, ritualUsed: true }),
    ];
    const flavors = new Set<string>();
    for (const summary of summaries) {
      const view = buildResultView(summary);
      flavors.add(view.flavor.key);
      for (const ref of REFS(view)) {
        for (const key of keysOf(ref)) {
          expect(Object.hasOwn(pl, key), `pl: ${key}`).toBe(true);
          expect(Object.hasOwn(en, key), `en: ${key}`).toBe(true);
        }
      }
    }
    expect(flavors.size).toBe(5);
  });

  it.each([
    { turns: 0 },
    { turns: -3 },
    { turns: 2.5 },
    { turns: Number.NaN },
    { hpMax: 0 },
    { hpMax: 12.5 },
    { hpLeft: -1 },
    { hpLeft: 41 },
    { hpLeft: 1.5 },
    { hpLeft: Number.NaN },
  ])('throws a RangeError for %o', (over) => {
    expect(() => buildResultView(won(over))).toThrow(RangeError);
  });

  it('does not modify the summary and returns new objects each time', () => {
    const summary = Object.freeze(won());
    const a = buildResultView(summary);
    const b = buildResultView(summary);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.stats).not.toBe(b.stats);
  });
});
