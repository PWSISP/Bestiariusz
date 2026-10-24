// Differential test: the shipped implementation (written by Qwen) must agree with the reference
// implementation on thousands of random inputs, including inputs the hand-written tests never name.
// Added after the Qwen tasks S02-02 .. S02-08 passed (see the plan, step "Differential test").

import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng.ts';
import type { Rng } from '../../src/core/rng.ts';
import * as damage from '../../src/core/combat/damage.ts';
import * as deck from '../../src/core/combat/deck.ts';
import * as ember from '../../src/core/combat/ember.ts';
import * as enemyTurn from '../../src/core/combat/enemy-turn.ts';
import * as intent from '../../src/core/combat/intent.ts';
import * as ritual from '../../src/core/combat/ritual.ts';
import * as refDamage from '../reference/damage.ts';
import * as refDeck from '../reference/deck.ts';
import * as refEmber from '../reference/ember.ts';
import * as refEnemyTurn from '../reference/enemy-turn.ts';
import * as refIntent from '../reference/intent.ts';
import * as refRitual from '../reference/ritual.ts';

const ROUNDS = 3000;
const ELEMENTS = ['ogien', 'woda', 'ziemia', 'wiatr', 'grom'];

function subset(r: Rng, items: readonly string[]): string[] {
  return items.filter(() => r.int(0, 2) === 0);
}

const copyArg = (value: unknown): unknown =>
  typeof value === 'function' ? value : structuredClone(value);

/** Runs an implementation on a deep copy of the input (functions are passed as they are); returns the value or the error name. */
function outcome<A extends unknown[], R>(fn: (...args: A) => R, args: A): unknown {
  try {
    return { value: fn(...(args.map(copyArg) as A)) };
  } catch (error) {
    return { error: error instanceof Error ? error.constructor.name : String(error) };
  }
}

function sameOutcome<A extends unknown[], R>(
  real: (...args: A) => R,
  ref: (...args: A) => R,
  args: A,
): void {
  expect(outcome(real, args)).toEqual(outcome(ref, args));
}

describe('differential: applyDamage', () => {
  it(`agrees with the reference on ${ROUNDS} random hits`, () => {
    const r = createRng(1);
    for (let i = 0; i < ROUNDS; i++) {
      const maxHp = r.int(1, 30);
      const target = {
        hp: r.int(0, maxHp),
        maxHp,
        block: r.int(0, 15),
        resist: subset(r, ELEMENTS),
        weak: subset(r, ELEMENTS),
      };
      const hit = {
        amount: r.int(-3, 40),
        element: r.int(0, 5) === 5 ? null : r.pick(ELEMENTS),
        ...(r.int(0, 2) === 0 ? { pierce: r.int(0, 1) === 0 } : {}),
      };
      sameOutcome(damage.applyDamage, refDamage.applyDamage, [target, hit]);
    }
  });
});

describe('differential: deck', () => {
  it(`createDeck, drawCards and endTurn agree and consume the same randomness (${ROUNDS} rounds)`, () => {
    const r = createRng(2);
    for (let i = 0; i < ROUNDS; i++) {
      const pile = (max: number): string[] =>
        Array.from({ length: r.int(0, max) }, () => `c${r.int(0, 9)}`);
      const state = { draw: pile(8), hand: pile(6), discard: pile(8) };
      const n = r.int(-1, 9);
      const seed = r.int(0, 1_000_000);
      const a = createRng(seed);
      const b = createRng(seed);
      expect(deck.drawCards(structuredClone(state), n, a)).toEqual(
        refDeck.drawCards(structuredClone(state), n, b),
      );
      expect(a.next()).toBe(b.next());
      expect(deck.endTurn(structuredClone(state))).toEqual(refDeck.endTurn(structuredClone(state)));
      const cards = pile(12);
      const c = createRng(seed);
      const d = createRng(seed);
      expect(deck.createDeck(cards, c)).toEqual(refDeck.createDeck(cards, d));
      expect(c.next()).toBe(d.next());
    }
    expect(deck.HAND_LIMIT).toBe(refDeck.HAND_LIMIT);
  });
});

describe('differential: ember', () => {
  it(`agrees on valid and invalid numbers (${ROUNDS} rounds)`, () => {
    const r = createRng(3);
    const weird = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY];
    const num = (): number => (r.int(0, 9) === 0 ? r.pick(weird) : r.int(0, 8));
    for (let i = 0; i < ROUNDS; i++) {
      const [e, c] = [num(), num()];
      sameOutcome(ember.canAfford, refEmber.canAfford, [e, c]);
      sameOutcome(ember.spendEmber, refEmber.spendEmber, [e, c]);
      sameOutcome(ember.gainEmber, refEmber.gainEmber, [e, c]);
      const hand = Array.from({ length: r.int(0, 6) }, () => `c${r.int(0, 4)}`);
      const costs: Record<string, number | null> = Object.fromEntries(
        [0, 1, 2, 3, 4].map((k) => [`c${k}`, r.int(0, 5) === 0 ? null : r.int(0, 5)]),
      );
      const costOf = (id: string): number | null => costs[id] ?? null;
      sameOutcome(ember.playableIndexes, refEmber.playableIndexes, [hand, costOf, e]);
    }
    expect(ember.EMBER_PER_TURN).toBe(refEmber.EMBER_PER_TURN);
  });
});

describe('differential: chooseIntent', () => {
  it(`agrees with the reference on ${ROUNDS} random bosses`, () => {
    const r = createRng(4);
    const kinds = ['playerHandAtMost', 'bossHpBelowPct', 'playerCirclesAtLeast'] as const;
    for (let i = 0; i < ROUNDS; i++) {
      const actions: intent.BossAction[] = Array.from({ length: r.int(0, 5) }, (_, k) => ({
        id: `a${k}`,
        baseWeight: r.int(0, 6),
        ...(r.int(0, 1) === 0 ? { cooldown: r.int(0, 4) } : {}),
        ...(r.int(0, 1) === 0
          ? {
              conditions: Array.from({ length: r.int(0, 2) }, () => ({
                when: r.pick(kinds),
                value: r.int(0, 100),
                bonus: r.int(-2, 5),
              })),
            }
          : {}),
      }));
      const bossMaxHp = r.int(1, 60);
      const ctx: intent.IntentContext = {
        playerHand: r.int(0, 6),
        bossHp: r.int(0, bossMaxHp),
        bossMaxHp,
        playerCircles: r.int(0, 3),
        history: Array.from({ length: r.int(0, 6) }, () => `a${r.int(0, 4)}`),
      };
      sameOutcome(intent.chooseIntent, refIntent.chooseIntent, [actions, ctx]);
    }
  });
});

describe('differential: resolveEnemyTurn', () => {
  it(`agrees with the reference on ${ROUNDS} random enemy turns`, () => {
    const r = createRng(5);
    for (let i = 0; i < ROUNDS; i++) {
      const circle = (): enemyTurn.CircleCreature | null =>
        r.int(0, 3) === 0
          ? null
          : {
              element: r.pick(ELEMENTS),
              form: 'wilk',
              trait: 'gniew',
              attack: r.int(0, 8),
              health: r.int(1, 9),
            };
      const maxHp = r.int(1, 40);
      const player: enemyTurn.PlayerState = {
        hp: r.int(1, maxHp),
        maxHp,
        block: r.int(0, 12),
        circles: [circle(), circle(), circle()],
        hand: Array.from({ length: r.int(0, 5) }, () => `c${r.int(0, 5)}`),
        discard: Array.from({ length: r.int(0, 4) }, () => `c${r.int(0, 5)}`),
        curses: r.int(0, 2),
      };
      const boss: enemyTurn.BossState = {
        hp: r.int(1, 60),
        maxHp: 60,
        block: r.int(0, 10),
        stolen: [],
      };
      const actions: enemyTurn.EnemyAction[] = Array.from({ length: r.int(0, 3) }, () => {
        const direct = r.int(0, 3) === 0 ? { direct: true } : {};
        switch (r.int(0, 4)) {
          case 0:
            return { type: 'atak', amount: r.int(0, 15), ...direct };
          case 1:
            return { type: 'wielokrotny', amount: r.int(0, 6), times: r.int(0, 4), ...direct };
          case 2:
            return { type: 'tarcza', amount: r.int(0, 10) };
          case 3:
            return { type: 'klatwa', circle: r.int(0, 2) };
          default:
            return { type: 'kradziez' };
        }
      });
      sameOutcome(enemyTurn.resolveEnemyTurn, refEnemyTurn.resolveEnemyTurn, [
        player,
        boss,
        actions,
      ]);
    }
  });
});

describe('differential: detectRitual', () => {
  it(`agrees with the reference on ${ROUNDS} random circle sets`, () => {
    const r = createRng(6);
    for (let i = 0; i < ROUNDS; i++) {
      const slot = (): ritual.CircleContent =>
        r.int(0, 4) === 0 ? null : { element: r.pick(ELEMENTS) };
      const circles = Array.from({ length: r.int(0, 10) === 0 ? r.pick([0, 2, 4]) : 3 }, slot);
      const used = subset(r, ELEMENTS);
      sameOutcome(ritual.detectRitual, refRitual.detectRitual, [circles, used]);
    }
  });
});
