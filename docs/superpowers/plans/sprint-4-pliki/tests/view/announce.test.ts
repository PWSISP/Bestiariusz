import { describe, expect, it } from 'vitest';
import type { CombatEvent } from '../../src/core/combat/model.ts';
import { announceEvents } from '../../src/view/announce.ts';
import { keysOf } from '../../src/view/text.ts';
import { data, missingKeys, playWithBot, start } from './support.ts';

describe('announceEvents', () => {
  const { state } = start();

  it('says nothing for events that have no sentence', () => {
    const events: CombatEvent[] = [
      { type: 'card_played', cardId: 'uderzenie' },
      { type: 'enemy_acted', actionId: 'cios', log: [] },
      { type: 'rejected', reason: 'unplayable' },
      { type: 'enemy_damaged', source: 'spell', dealt: 0, blocked: 5 },
      { type: 'player_damaged', amount: 0 },
    ];
    expect(announceEvents(events, state, data)).toEqual([]);
  });

  it('describes the important events in order', () => {
    const events: CombatEvent[] = [
      { type: 'creature_summoned', circle: 1, cardId: 'ogien-wilk-smutek' },
      { type: 'enemy_damaged', source: 'creature', circle: 1, dealt: 4, blocked: 0 },
      { type: 'creature_died', circle: 0 },
      { type: 'player_damaged', amount: 7 },
      { type: 'ritual', element: 'ogien' },
      { type: 'combat_won' },
      { type: 'combat_lost' },
      { type: 'turn_started', turn: 4, intentId: 'cios' },
    ];
    const lines = announceEvents(events, state, data);
    expect(lines.map((l) => l.key)).toEqual([
      'live.summoned',
      'live.enemyHit',
      'live.creatureDied',
      'live.playerHit',
      'live.ritual',
      'live.won',
      'live.lost',
      'live.turn',
    ]);
    expect(lines[0]?.params).toMatchObject({ n: 2 });
    expect(lines[1]?.params).toEqual({ amount: 4 });
    expect(lines[2]?.params).toEqual({ n: 1 });
    expect(lines[7]?.params).toMatchObject({ turn: 4 });
  });

  it('uses only keys that exist in both language files, in a whole combat', () => {
    let lines = 0;
    for (const seed of [1, 2]) {
      playWithBot(seed, (before, events, after) => {
        for (const line of announceEvents(events, after, data)) {
          lines++;
          expect(missingKeys(line), keysOf(line).join()).toEqual([]);
        }
        expect(before).toBeDefined();
      });
    }
    expect(lines).toBeGreaterThan(20);
  });
});
