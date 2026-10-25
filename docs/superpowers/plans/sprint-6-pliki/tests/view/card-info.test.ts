import { describe, expect, it } from 'vitest';
import { describeCard } from '../../src/view/card-info.ts';
import { keysOf } from '../../src/view/text.ts';
import { data, en, pl } from './support.ts';

describe('describeCard', () => {
  it('describes a spell with its cost, element and one line per effect', () => {
    const info = describeCard(data, 'ognisko');
    expect(info).toMatchObject({ kind: 'spell', cost: 1, element: 'ogien', stats: null });
    expect(info.lines).toHaveLength(2);
    expect(info.title).toEqual({ key: 'card.ognisko.name' });
  });

  it('describes a creature with its stats and the lines of its symbols', () => {
    const info = describeCard(data, 'grom-kruk-smutek');
    expect(info.kind).toBe('creature');
    expect(info.stats?.attack).toBeGreaterThan(0);
    expect(info.stats?.health).toBeGreaterThan(0);
    expect(info.cost).toBe(2);
    expect(info.element).toBe('grom');
  });

  it('describes a curse without a cost', () => {
    expect(describeCard(data, 'klatwa')).toMatchObject({ kind: 'curse', cost: null, stats: null });
  });

  it('throws for an unknown card, also for a built-in object name', () => {
    expect(() => describeCard(data, 'nie-ma')).toThrow('Unknown card');
    expect(() => describeCard(data, 'constructor')).toThrow('Unknown card');
  });

  it('only uses texts that exist in both languages, for every card of the reward pool', () => {
    for (const id of data.balance.expedition!.rewardPool) {
      const info = describeCard(data, id);
      for (const key of [info.title, ...info.lines].flatMap(keysOf))
        expect([pl[key], en[key]], `${id}: ${key}`).not.toContain(undefined);
    }
  });
});
