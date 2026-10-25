import { describe, expect, it } from 'vitest';
import { createCombatSession, withHealthOverrides } from '../../src/game/combat-session.ts';
import { data } from '../view/support.ts';

describe('createCombatSession', () => {
  it('starts a combat of the default deck against the Leszy', () => {
    const session = createCombatSession(data, { seed: 1 });
    expect(session.state.turn).toBe(1);
    expect(session.state.phase).toBe('player');
    expect(session.state.enemy.id).toBe('leszy');
    expect(session.state.deck.hand.length).toBeGreaterThan(0);
    expect(session.startEvents.map((e) => e.type)).toContain('turn_started');
    expect(session.summary()).toBeNull();
    expect(session.seed).toBe(1);
  });

  it('is deterministic for a seed and different for another', () => {
    const hand = (seed: number): string =>
      JSON.stringify(createCombatSession(data, { seed }).state.deck.hand);
    expect(hand(7)).toBe(hand(7));
    expect(hand(7)).not.toBe(hand(8));
  });

  it('plays a card and keeps the new state', () => {
    const session = createCombatSession(data, { seed: 3 });
    const spell = session.state.deck.hand.findIndex((id) => data.cards[id]?.kind === 'spell');
    const creature = session.state.deck.hand.findIndex((id) => data.cards[id]?.kind === 'creature');
    expect(creature).toBeGreaterThanOrEqual(0);
    const result = session.play(creature, 1);
    expect(result.events.map((e) => e.type)).toContain('creature_summoned');
    expect(session.state).toBe(result.state);
    expect(session.state.player.circles[1]).not.toBeNull();
    expect(spell).toBeGreaterThanOrEqual(-1);
  });

  it('rejects an illegal play without changing the state', () => {
    const session = createCombatSession(data, { seed: 3 });
    const before = session.state;
    const result = session.play(99);
    expect(result.events).toEqual([{ type: 'rejected', reason: 'no_such_card' }]);
    expect(session.state).toBe(before);
    const creature = session.state.deck.hand.findIndex((id) => data.cards[id]?.kind === 'creature');
    expect(session.play(creature).events[0]).toEqual({
      type: 'rejected',
      reason: 'circle_required',
    });
  });

  it('ends the turn: the enemy acts and a new turn starts', () => {
    const session = createCombatSession(data, { seed: 3 });
    const result = session.endTurn();
    const types = result.events.map((e) => e.type);
    expect(types).toContain('enemy_acted');
    expect(session.state.turn).toBe(2);
  });

  it('gives a summary after the combat, for a win with a weakened enemy', () => {
    const session = createCombatSession(data, { seed: 5, enemyHp: 1 });
    expect(session.state.enemy.hp).toBe(1);
    let guard = 0;
    while (session.summary() === null && guard++ < 200) {
      const hand = session.state.deck.hand;
      const spell = hand.findIndex(
        (id) =>
          data.cards[id]?.kind === 'spell' &&
          session.play(hand.indexOf(id)).events[0]?.type !== 'rejected',
      );
      if (spell < 0) session.endTurn();
    }
    expect(session.summary()?.outcome).toBe('won');
  });

  it('gives a summary after a defeat with a weakened player', () => {
    const session = createCombatSession(data, { seed: 5, playerHp: 1 });
    expect(session.state.player.hp).toBe(1);
    let guard = 0;
    while (session.summary() === null && guard++ < 100) session.endTurn();
    expect(session.summary()).toMatchObject({ outcome: 'lost', hpLeft: 0, hpMax: 1 });
  });

  it('plays the deck and the health it is given, against the enemy it is given', () => {
    const deck = ['uderzenie', 'uderzenie', 'plomien', 'oklad', 'oklad', 'mgla'];
    const session = createCombatSession(data, { seed: 3, deck, startHp: 17, enemyId: 'utopiec' });
    expect(session.state.enemy.id).toBe('utopiec');
    expect(session.state.player.hp).toBe(17);
    expect(session.state.player.maxHp).toBe(data.balance.playerMaxHp);
    const all = [
      ...session.state.deck.hand,
      ...session.state.deck.draw,
      ...session.state.deck.discard,
    ];
    expect([...all].sort()).toEqual([...deck].sort());
  });

  it('refuses an unknown deck', () => {
    expect(() => createCombatSession(data, { seed: 1, deckId: 'nie-ma' })).toThrow('Unknown deck');
  });
});

describe('withHealthOverrides', () => {
  it('replaces the maximum health and leaves the original data alone', () => {
    const before = JSON.stringify(data);
    const next = withHealthOverrides(data, 'leszy', 12, 33);
    expect(next.enemies['leszy']?.maxHp).toBe(12);
    expect(next.balance.playerMaxHp).toBe(33);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('returns the data itself when there is nothing to override', () => {
    expect(withHealthOverrides(data, 'leszy', null, undefined)).toBe(data);
    expect(withHealthOverrides(data, 'nie-ma', 5, null)).toBe(data);
  });
});
