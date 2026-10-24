// Small, frozen game data for combat tests. It is deliberately independent of src/data/*.json, so
// balancing the real data (S02-11, S03-01) does not break these tests.

import { createRng } from '../../src/core/rng.ts';
import { buildCreature } from '../../src/core/combat/creature.ts';
import type { CombatData, CombatEnv, CombatState, Intent } from '../../src/core/combat/model.ts';
import type { SymbolData } from '../../src/core/types.ts';

export const SYMBOLS: SymbolData = {
  elements: [
    { id: 'ogien', cost: 3, attackBonus: 1, healthBonus: 0 },
    { id: 'woda', cost: 2, attackBonus: 0, healthBonus: 0 },
    { id: 'ziemia', cost: 2, attackBonus: 0, healthBonus: 1 },
    { id: 'wiatr', cost: 2, attackBonus: 0, healthBonus: 0 },
    { id: 'grom', cost: 3, attackBonus: 1, healthBonus: 0 },
  ],
  forms: [
    { id: 'wilk', cost: 4, baseAttack: 3, baseHealth: 4, gender: 'm' },
    { id: 'kruk', cost: 3, baseAttack: 2, baseHealth: 3, gender: 'm' },
    { id: 'sowa', cost: 3, baseAttack: 1, baseHealth: 4, gender: 'f' },
    { id: 'waz', cost: 4, baseAttack: 3, baseHealth: 3, gender: 'm' },
    { id: 'niedzwiedz', cost: 4, baseAttack: 4, baseHealth: 7, gender: 'm' },
    { id: 'jelen', cost: 4, baseAttack: 2, baseHealth: 6, gender: 'm' },
  ],
  traits: [
    { id: 'gniew', cost: 3, attackMod: 2, healthMod: 0 },
    { id: 'smutek', cost: 1, attackMod: 0, healthMod: 1 },
    { id: 'spryt', cost: 2, attackMod: 1, healthMod: 0 },
    { id: 'odwaga', cost: 2, attackMod: 0, healthMod: 2 },
    { id: 'glod', cost: 3, attackMod: 1, healthMod: 1 },
  ],
};

const creature = (id: string, cost: number) => {
  const [element, form, trait] = id.split('-') as [string, string, string];
  return { id, kind: 'creature' as const, cost, creature: { element, form, trait } };
};

// Stats (attack/health): sowa 1/6, jelen 3/7, wilk 4/5, kruk(ogien) 3/5, kruk(wiatr) 4/3.
export const FIXTURE: CombatData = {
  symbols: SYMBOLS,
  cards: {
    'woda-sowa-odwaga': creature('woda-sowa-odwaga', 1),
    'ziemia-jelen-spryt': creature('ziemia-jelen-spryt', 2),
    'ogien-wilk-smutek': creature('ogien-wilk-smutek', 2),
    'ogien-kruk-odwaga': creature('ogien-kruk-odwaga', 1),
    'wiatr-kruk-gniew': creature('wiatr-kruk-gniew', 1),
    'ziemia-niedzwiedz-odwaga': creature('ziemia-niedzwiedz-odwaga', 3),
    uderzenie: { id: 'uderzenie', kind: 'spell', cost: 1, element: null, effects: [{ kind: 'damage', amount: 6 }] },
    plomien: { id: 'plomien', kind: 'spell', cost: 2, element: 'ogien', effects: [{ kind: 'damage', amount: 9 }] },
    oklad: { id: 'oklad', kind: 'spell', cost: 1, element: null, effects: [{ kind: 'block', amount: 6 }] },
    mgla: { id: 'mgla', kind: 'spell', cost: 2, element: null, effects: [{ kind: 'block', amount: 10 }] },
    klatwa: { id: 'klatwa', kind: 'curse' },
  },
  enemies: {
    leszy: {
      id: 'leszy',
      maxHp: 60,
      resist: ['ziemia'],
      weak: ['ogien'],
      actions: [
        { id: 'cios', baseWeight: 5, effects: [{ type: 'atak', amount: 12, direct: true }] },
        {
          id: 'gaszcz',
          baseWeight: 3,
          cooldown: 2,
          conditions: [{ when: 'bossHpBelowPct', value: 50, bonus: 3 }],
          effects: [{ type: 'tarcza', amount: 10 }],
        },
        {
          id: 'szpony',
          baseWeight: 3,
          conditions: [{ when: 'playerCirclesAtLeast', value: 2, bonus: 3 }],
          effects: [{ type: 'wielokrotny', amount: 4, times: 3 }],
        },
        {
          id: 'zwod',
          baseWeight: 2,
          cooldown: 3,
          conditions: [{ when: 'playerCirclesAtLeast', value: 3, bonus: 4 }],
          effects: [
            { type: 'klatwa', circle: 0 },
            { type: 'atak', amount: 4 },
          ],
        },
      ],
    },
  },
  balance: {
    playerMaxHp: 40,
    ritual: {
      ogien: [{ kind: 'damage', amount: 14, pierce: true }],
      grom: [{ kind: 'damage', amount: 16, pierce: true }],
      woda: [
        { kind: 'heal', amount: 10 },
        { kind: 'block', amount: 8 },
      ],
      ziemia: [{ kind: 'block', amount: 15 }],
      wiatr: [
        { kind: 'draw', count: 3 },
        { kind: 'ember', amount: 2 },
      ],
    },
  },
  decks: {
    szeptucha: [
      'woda-sowa-odwaga',
      'ziemia-jelen-spryt',
      'ogien-wilk-smutek',
      'ogien-kruk-odwaga',
      'wiatr-kruk-gniew',
      'uderzenie',
      'uderzenie',
      'uderzenie',
      'plomien',
      'oklad',
      'oklad',
      'mgla',
    ],
  },
};

export const SEED = 20261102;

export function envOf(seed: number = SEED): CombatEnv {
  return { data: FIXTURE, rng: createRng(seed) };
}

export interface StateOptions {
  hand?: string[];
  draw?: string[];
  discard?: string[];
  ember?: number;
  /** Card ids of creatures standing in circles 0..2 (null = empty). */
  circles?: (string | null)[];
  intent?: Intent;
  playerHp?: number;
  playerBlock?: number;
  enemyHp?: number;
  enemyBlock?: number;
  ritualUsed?: boolean;
  history?: string[];
}

const GAS: Intent = { actionId: 'gaszcz', actions: [{ type: 'tarcza', amount: 10 }] };

/** A mid-combat state (turn 3, Leszy 60/60, player 40/40) with the given parts replaced. */
export function makeState(o: StateOptions = {}): CombatState {
  const circles = (o.circles ?? [null, null, null]).map((id) => {
    if (id === null) return null;
    const card = FIXTURE.cards[id];
    if (!card || card.kind !== 'creature') throw new Error(`not a creature card: ${id}`);
    return buildCreature(SYMBOLS, id, card.creature);
  });
  return {
    turn: 3,
    phase: 'player',
    player: { hp: o.playerHp ?? 40, maxHp: 40, block: o.playerBlock ?? 0, circles, curses: 0 },
    enemy: {
      id: 'leszy',
      hp: o.enemyHp ?? 60,
      maxHp: 60,
      block: o.enemyBlock ?? 0,
      resist: ['ziemia'],
      weak: ['ogien'],
      stolen: [],
      history: o.history ?? [],
    },
    deck: {
      draw: o.draw ?? ['uderzenie', 'uderzenie', 'oklad', 'mgla', 'plomien', 'uderzenie', 'oklad'],
      hand: o.hand ?? [],
      discard: o.discard ?? [],
    },
    ember: o.ember ?? 3,
    ritualUsed: o.ritualUsed ?? false,
    intent: o.intent ?? GAS,
  };
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
