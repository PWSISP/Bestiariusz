import { describe, expect, it } from 'vitest';
import { reduce } from '../../src/core/combat/reducer.ts';
import type { CombatAction } from '../../src/core/combat/model.ts';
import { envOf, makeState } from './fixtures.ts';

// Scenarios R1-R7 of docs/zasady-walki.md: the Ritual (Obrzęd) fires the moment the third creature
// of one element (wind counts as any) enters the circles, once per combat.

const play = (handIndex: number, circle?: number): CombatAction => ({
  type: 'playCard',
  handIndex,
  circle,
});
const kinds = (r: ReturnType<typeof reduce>): string[] => r.events.map((e) => e.type);

describe('Ritual (Obrzęd)', () => {
  const FIRE_PAIR = ['ogien-wilk-smutek', 'ogien-kruk-odwaga', null];

  it('R1: wind completes a fire ritual; fire damage pierces block and hits the weakness', () => {
    const start = makeState({ hand: ['wiatr-kruk-gniew'], circles: FIRE_PAIR });
    const result = reduce(start, play(0, 2), envOf());
    expect(kinds(result)).toEqual(['card_played', 'creature_summoned', 'ritual', 'enemy_damaged']);
    expect(result.events[2]).toEqual({ type: 'ritual', element: 'ogien' });
    // 14 fire x1.5 (weak) = 21
    expect(result.events[3]).toEqual({ type: 'enemy_damaged', source: 'ritual', dealt: 21, blocked: 0 });
    expect(result.state.enemy.hp).toBe(39);
    expect(result.state.ritualUsed).toBe(true);
  });

  it('R2: a second ritual in the same combat does not fire', () => {
    const start = makeState({ hand: ['wiatr-kruk-gniew'], circles: FIRE_PAIR, ritualUsed: true });
    const result = reduce(start, play(0, 2), envOf());
    expect(kinds(result)).toEqual(['card_played', 'creature_summoned']);
    expect(result.state.enemy.hp).toBe(60);
  });

  it('R2b: the limit is one ritual per combat, not one per element', () => {
    const start = makeState({
      hand: ['woda-sowa-odwaga'],
      circles: ['woda-sowa-odwaga', 'woda-sowa-odwaga', null],
      ritualUsed: true,
    });
    expect(kinds(reduce(start, play(0, 2), envOf()))).toEqual(['card_played', 'creature_summoned']);
  });

  it('R3: a ritual that kills the enemy wins the combat', () => {
    const start = makeState({ hand: ['wiatr-kruk-gniew'], circles: FIRE_PAIR, enemyHp: 10 });
    const result = reduce(start, play(0, 2), envOf());
    expect(result.state.phase).toBe('won');
    expect(kinds(result)).toEqual(['card_played', 'creature_summoned', 'ritual', 'enemy_damaged', 'combat_won']);
  });

  it('R4: mixed elements or an empty circle give no ritual', () => {
    const mixed = makeState({ hand: ['woda-sowa-odwaga'], circles: FIRE_PAIR });
    expect(kinds(reduce(mixed, play(0, 2), envOf()))).toEqual(['card_played', 'creature_summoned']);
    const gap = makeState({ hand: ['ogien-kruk-odwaga'], circles: ['ogien-wilk-smutek', null, null] });
    expect(kinds(reduce(gap, play(0, 2), envOf()))).toEqual(['card_played', 'creature_summoned']);
  });

  it('R5: ritual damage ignores the enemy block', () => {
    const start = makeState({ hand: ['wiatr-kruk-gniew'], circles: FIRE_PAIR, enemyBlock: 10 });
    const result = reduce(start, play(0, 2), envOf());
    expect(result.state.enemy.block).toBe(10);
    expect(result.state.enemy.hp).toBe(39);
  });

  it('R6: water heals 10 (up to the maximum) and gives 8 block', () => {
    const start = makeState({
      hand: ['woda-sowa-odwaga'],
      circles: ['woda-sowa-odwaga', 'woda-sowa-odwaga', null],
      playerHp: 35,
    });
    const { state } = reduce(start, play(0, 2), envOf());
    expect(state.player.hp).toBe(40);
    expect(state.player.block).toBe(8);
  });

  it('R6: earth gives 15 block; wind draws 3 cards and gives 2 ember', () => {
    const earth = makeState({
      hand: ['ziemia-jelen-spryt'],
      circles: ['ziemia-jelen-spryt', 'ziemia-jelen-spryt', null],
    });
    expect(reduce(earth, play(0, 2), envOf()).state.player.block).toBe(15);

    const wind = makeState({
      hand: ['wiatr-kruk-gniew'],
      circles: ['wiatr-kruk-gniew', 'wiatr-kruk-gniew', null],
    });
    const { state } = reduce(wind, play(0, 2), envOf());
    expect(state.ember).toBe(4); // 3 - 1 for the card + 2 from the ritual
    expect(state.deck.hand).toEqual(['uderzenie', 'uderzenie', 'oklad']);
  });

  it('R7: the ritual is checked when a creature enters, not at the end of the turn', () => {
    const start = makeState({
      circles: ['ogien-wilk-smutek', 'ogien-kruk-odwaga', 'wiatr-kruk-gniew'],
    });
    const { events } = reduce(start, { type: 'endTurn' }, envOf());
    expect(events.map((e) => e.type)).not.toContain('ritual');
  });
});
