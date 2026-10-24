import { describe, expect, it } from 'vitest';
import { chooseIntent } from '../src/core/combat/intent.ts';
import type { BossAction, IntentContext } from '../src/core/combat/intent.ts';

// Baba Jaga from the game design document: the more the player's hand shrinks, the more she curses.
const BABA: readonly BossAction[] = [
  { id: 'atak', baseWeight: 5 },
  {
    id: 'klatwa',
    baseWeight: 3,
    conditions: [{ when: 'playerHandAtMost', value: 2, bonus: 4 }],
    cooldown: 2,
  },
  {
    id: 'kradziez',
    baseWeight: 2,
    conditions: [{ when: 'playerHandAtMost', value: 4, bonus: 2 }],
  },
  {
    id: 'sluga',
    baseWeight: 1,
    conditions: [
      { when: 'bossHpBelowPct', value: 50, bonus: 5 },
      { when: 'playerCirclesAtLeast', value: 3, bonus: 1 },
    ],
    cooldown: 3,
  },
];

const ctx = (over: Partial<IntentContext> = {}): IntentContext => ({
  playerHand: 5,
  bossHp: 100,
  bossMaxHp: 100,
  playerCircles: 0,
  history: [],
  ...over,
});

describe('chooseIntent', () => {
  it('picks the highest base weight', () => {
    expect(chooseIntent(BABA, ctx())).toBe('atak');
  });

  it('condition bonuses change the choice', () => {
    expect(chooseIntent(BABA, ctx({ playerHand: 2 }))).toBe('klatwa'); // 3 + 4 = 7 > 5
    expect(chooseIntent(BABA, ctx({ bossHp: 40, playerCircles: 3 }))).toBe('sluga'); // 1 + 5 + 1 = 7 > 5
  });

  it('bossHpBelowPct is a strict comparison', () => {
    expect(chooseIntent(BABA, ctx({ bossHp: 50 }))).toBe('atak'); // exactly 50% is not below 50
    expect(chooseIntent(BABA, ctx({ bossHp: 49 }))).toBe('sluga'); // 1 + 5 = 6 > 5
  });

  it('ties go to the earlier action', () => {
    // atak is excluded (twice in a row): klatwa 3, kradziez 2 + 2 = 4, sluga 1
    expect(chooseIntent(BABA, ctx({ playerHand: 3, history: ['atak', 'atak'] }))).toBe('kradziez');
    const tie: BossAction[] = [
      { id: 'a', baseWeight: 4 },
      { id: 'b', baseWeight: 4 },
    ];
    expect(chooseIntent(tie, ctx())).toBe('a');
  });

  it('cooldown excludes recently used actions', () => {
    expect(chooseIntent(BABA, ctx({ playerHand: 2, history: ['klatwa'] }))).toBe('atak');
    expect(chooseIntent(BABA, ctx({ playerHand: 2, history: ['klatwa', 'atak'] }))).toBe('atak');
    expect(chooseIntent(BABA, ctx({ playerHand: 2, history: ['klatwa', 'atak', 'kradziez'] }))).toBe(
      'klatwa',
    );
  });

  it('no action three times in a row', () => {
    expect(chooseIntent(BABA, ctx({ history: ['atak', 'atak'] }))).toBe('klatwa');
    expect(chooseIntent(BABA, ctx({ history: ['atak', 'kradziez', 'atak'] }))).toBe('atak');
  });

  it('falls back to the first action when every action is excluded', () => {
    const only: BossAction[] = [{ id: 'cios', baseWeight: 1 }];
    expect(chooseIntent(only, ctx({ history: ['cios', 'cios'] }))).toBe('cios');
    const two: BossAction[] = [
      { id: 'x', baseWeight: 1, cooldown: 1 },
      { id: 'y', baseWeight: 9, cooldown: 2 },
    ];
    expect(chooseIntent(two, ctx({ history: ['y', 'x'] }))).toBe('x');
  });

  it('throws on an empty action list', () => {
    expect(() => chooseIntent([], ctx())).toThrow(Error);
  });

  it('does not modify its arguments', () => {
    const actions = Object.freeze(BABA.map((a) => Object.freeze({ ...a })));
    const context = Object.freeze(
      ctx({ playerHand: 2, history: Object.freeze(['atak']) as readonly string[] }),
    );
    expect(chooseIntent(actions, context)).toBe('klatwa');
  });
});
