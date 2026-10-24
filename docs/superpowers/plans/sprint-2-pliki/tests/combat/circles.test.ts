import { describe, expect, it } from 'vitest';
import { legalActions, reduce } from '../../src/core/combat/reducer.ts';
import type { CombatAction, CombatEvent } from '../../src/core/combat/model.ts';
import { envOf, makeState } from './fixtures.ts';

// Scenarios K1-K10 of docs/zasady-walki.md. Stats in the fixture:
// sowa (woda) 1/6, jelen (ziemia) 3/7, wilk (ogien) 4/5, kruk (ogien) 3/5, kruk (wiatr) 4/3.
// Leszy: 60 HP, weak to fire (x1.5), resists earth (x0.5).

const play = (handIndex: number, circle?: number): CombatAction => ({
  type: 'playCard',
  handIndex,
  circle,
});
const END: CombatAction = { type: 'endTurn' };
const only = <T extends CombatEvent['type']>(
  events: readonly CombatEvent[],
  type: T,
): Extract<CombatEvent, { type: T }>[] =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

describe('summoning', () => {
  it('K1: a creature card goes to a free circle with stats from its symbols', () => {
    const { state, events } = reduce(makeState({ hand: ['woda-sowa-odwaga'] }), play(0, 1), envOf());
    expect(state.player.circles[0]).toBeNull();
    expect(state.player.circles[1]).toEqual({
      cardId: 'woda-sowa-odwaga',
      element: 'woda',
      form: 'sowa',
      trait: 'odwaga',
      attack: 1,
      health: 6,
      maxHealth: 6,
    });
    expect(state.player.circles[2]).toBeNull();
    expect(state.ember).toBe(2);
    expect(state.deck.hand).toEqual([]);
    expect(state.deck.discard).toEqual(['woda-sowa-odwaga']);
    expect(events).toEqual([
      { type: 'card_played', cardId: 'woda-sowa-odwaga' },
      { type: 'creature_summoned', circle: 1, cardId: 'woda-sowa-odwaga' },
    ]);
  });

  it('K2: an occupied circle rejects the card and changes nothing', () => {
    const start = makeState({ hand: ['woda-sowa-odwaga'], circles: ['ogien-wilk-smutek', null, null] });
    const result = reduce(start, play(0, 0), envOf());
    expect(result.state).toBe(start);
    expect(result.events).toEqual([{ type: 'rejected', reason: 'circle_occupied' }]);
  });

  it('K3: a creature that costs more than the ember is rejected', () => {
    const start = makeState({ hand: ['ogien-wilk-smutek'], ember: 1 });
    const result = reduce(start, play(0, 0), envOf());
    expect(result.state).toBe(start);
    expect(result.events).toEqual([{ type: 'rejected', reason: 'not_enough_ember' }]);
  });
});

describe('creature attacks at the end of the turn', () => {
  it('K4: creatures attack circle 0, 1, 2 with their element', () => {
    const start = makeState({ circles: ['ogien-wilk-smutek', 'ziemia-jelen-spryt', 'woda-sowa-odwaga'] });
    const { state, events } = reduce(start, END, envOf());
    expect(only(events, 'enemy_damaged')).toEqual([
      { type: 'enemy_damaged', source: 'creature', circle: 0, dealt: 6, blocked: 0 }, // 4 fire x1.5
      { type: 'enemy_damaged', source: 'creature', circle: 1, dealt: 1, blocked: 0 }, // 3 earth x0.5, rounded down
      { type: 'enemy_damaged', source: 'creature', circle: 2, dealt: 1, blocked: 0 },
    ]);
    expect(state.enemy.hp).toBe(52);
    expect(state.enemy.block).toBe(10); // gaszcz resolved afterwards
  });

  it('creature attacks go through the enemy block', () => {
    const start = makeState({ circles: ['ogien-wilk-smutek', null, null], enemyBlock: 4 });
    const damaged = only(reduce(start, END, envOf()).events, 'enemy_damaged');
    expect(damaged).toEqual([{ type: 'enemy_damaged', source: 'creature', circle: 0, dealt: 2, blocked: 4 }]);
  });

  it('K5: when a creature kills the enemy the rest of the turn does not happen', () => {
    const start = makeState({
      circles: ['ogien-wilk-smutek', 'ziemia-jelen-spryt', 'woda-sowa-odwaga'],
      enemyHp: 5,
    });
    const { state, events } = reduce(start, END, envOf());
    expect(state.phase).toBe('won');
    expect(state.enemy.hp).toBe(0);
    expect(events.map((e) => e.type)).toEqual(['enemy_damaged', 'combat_won']);
    expect(state.enemy.history).toEqual([]);
    expect(state.turn).toBe(3);
  });
});

describe('enemy attacks on the circles', () => {
  const ATAK = (amount: number) => ({ actionId: 'x', actions: [{ type: 'atak' as const, amount }] });

  it('K6: the strongest creature takes the hit; a dead creature frees its circle', () => {
    const start = makeState({
      circles: ['woda-sowa-odwaga', 'ogien-wilk-smutek', 'ziemia-jelen-spryt'],
      intent: ATAK(8),
      draw: ['woda-sowa-odwaga', 'uderzenie', 'oklad', 'mgla', 'plomien', 'uderzenie'],
    });
    const env = envOf();
    const { state, events } = reduce(start, END, env);
    expect(only(events, 'enemy_acted')[0]?.log).toEqual(['trafienie krag1 5', 'zniszczono krag1']);
    expect(only(events, 'creature_died')).toEqual([{ type: 'creature_died', circle: 1 }]);
    expect(state.player.hp).toBe(40); // excess damage is lost, the player is untouched
    expect(state.player.circles.map((c) => c?.cardId ?? null)).toEqual([
      'woda-sowa-odwaga',
      null,
      'ziemia-jelen-spryt',
    ]);
    // The freed circle can be used again in the next turn.
    const next = legalActions(state, env);
    expect(next).toContainEqual({ type: 'playCard', handIndex: 0, circle: 1 });
    expect(next).not.toContainEqual({ type: 'playCard', handIndex: 0, circle: 0 });
  });

  it('K7: on equal attack the lowest circle is hit, and damage stays on the creature', () => {
    const start = makeState({ circles: ['ogien-kruk-odwaga', null, 'ogien-kruk-odwaga'], intent: ATAK(3) });
    const { state, events } = reduce(start, END, envOf());
    expect(only(events, 'enemy_acted')[0]?.log).toEqual(['trafienie krag0 3']);
    expect(state.player.circles[0]?.health).toBe(2);
    expect(state.player.circles[2]?.health).toBe(5);
  });

  it('K8: a multi-attack retargets after each hit', () => {
    const start = makeState({
      circles: ['ogien-wilk-smutek', null, 'woda-sowa-odwaga'],
      intent: { actionId: 'szpony', actions: [{ type: 'wielokrotny', amount: 4, times: 3 }] },
    });
    const { state, events } = reduce(start, END, envOf());
    expect(only(events, 'enemy_acted')[0]?.log).toEqual([
      'trafienie krag0 4',
      'trafienie krag0 1',
      'zniszczono krag0',
      'trafienie krag2 4',
    ]);
    expect(state.player.circles.map((c) => c?.health ?? null)).toEqual([null, null, 2]);
    expect(state.player.hp).toBe(40);
  });

  it('K9: a curse destroys the creature, adds a curse card and the curse cannot be played', () => {
    const start = makeState({
      circles: ['ogien-wilk-smutek', null, 'ziemia-jelen-spryt'],
      intent: {
        actionId: 'zwod',
        actions: [
          { type: 'klatwa', circle: 0 },
          { type: 'atak', amount: 4 },
        ],
      },
    });
    const { state, events } = reduce(start, END, envOf());
    expect(only(events, 'enemy_acted')[0]?.log).toEqual([
      'zniszczono krag0',
      'klatwa krag0',
      'trafienie krag2 4',
    ]);
    expect(state.player.circles.map((c) => c?.health ?? null)).toEqual([null, null, 3]);
    expect(state.player.curses).toBe(1);
    expect(state.deck.discard).toEqual(['klatwa']);
    // Once drawn, the curse takes a slot in the hand and cannot be played.
    const stuck = makeState({ hand: ['klatwa'] });
    expect(reduce(stuck, play(0), envOf()).events).toEqual([{ type: 'rejected', reason: 'unplayable' }]);
  });

  it('K10: a direct attack skips the circles and hits the player through block', () => {
    const start = makeState({
      circles: ['ziemia-jelen-spryt', null, null],
      playerBlock: 5,
      intent: { actionId: 'cios', actions: [{ type: 'atak', amount: 12, direct: true }] },
    });
    const { state, events } = reduce(start, END, envOf());
    expect(only(events, 'enemy_acted')[0]?.log).toEqual(['trafienie gracz 7']);
    expect(only(events, 'player_damaged')).toEqual([{ type: 'player_damaged', amount: 7 }]);
    expect(state.player.hp).toBe(33);
    expect(state.player.circles[0]?.health).toBe(7);
  });
});
