import { describe, expect, it } from 'vitest';
import type { CombatData } from '../../src/core/combat/model.ts';
import {
  CSV_HEADER,
  playGame,
  runGames,
  summarize,
  toCsv,
} from '../../src/core/sim/simulate.ts';
import type { GameResult } from '../../src/core/sim/simulate.ts';
import { FIXTURE, SEED } from '../combat/fixtures.ts';

const SETUP = { deck: FIXTURE.decks['szeptucha'] as readonly string[], enemyId: 'leszy' };

describe('playGame', () => {
  it('is deterministic: the same seed gives the same result', () => {
    expect(playGame(FIXTURE, SETUP, SEED)).toEqual(playGame(FIXTURE, SETUP, SEED));
  });

  it('the bot never makes an illegal move over 200 seeds', () => {
    // playGame throws if the reducer rejects a bot action
    expect(runGames(FIXTURE, SETUP, 200, SEED)).toHaveLength(200);
  });

  it('the bot plays sensibly: it beats the 60 HP fixture Leszy in most games', () => {
    const summary = summarize(runGames(FIXTURE, SETUP, 200, SEED));
    expect(summary.winRate).toBeGreaterThan(0.8);
  });

  it('stops at the turn limit when the enemy cannot be beaten', () => {
    const wall: CombatData = {
      ...FIXTURE,
      enemies: { leszy: { ...(FIXTURE.enemies['leszy'] as CombatData['enemies'][string]), maxHp: 1_000_000 } },
    };
    const result = playGame(wall, SETUP, SEED, 12);
    expect(result.reason === 'turn_limit' || result.reason === 'lost').toBe(true);
    expect(result.won).toBe(false);
    expect(result.turns).toBeLessThanOrEqual(13);
  });
});

describe('summarize and toCsv', () => {
  const results: GameResult[] = [
    { seed: 1, won: true, turns: 8, hpLeft: 10, ritual: true, reason: 'won' },
    { seed: 2, won: false, turns: 6, hpLeft: 0, ritual: false, reason: 'lost' },
    { seed: 3, won: true, turns: 10, hpLeft: 20, ritual: true, reason: 'won' },
    { seed: 4, won: false, turns: 40, hpLeft: 30, ritual: false, reason: 'turn_limit' },
  ];

  it('computes the report numbers', () => {
    expect(summarize(results)).toEqual({
      games: 4,
      wins: 2,
      winRate: 0.5,
      avgTurns: 16,
      avgHpLeftOnWin: 15,
      ritualRate: 0.5,
      turnLimit: 1,
    });
  });

  it('handles an empty list without NaN', () => {
    expect(summarize([])).toEqual({
      games: 0,
      wins: 0,
      winRate: 0,
      avgTurns: 0,
      avgHpLeftOnWin: 0,
      ritualRate: 0,
      turnLimit: 0,
    });
  });

  it('writes a header and one line per game', () => {
    expect(CSV_HEADER).toBe('seed,won,turns,hp_left,ritual,reason');
    expect(toCsv(results)).toBe(
      'seed,won,turns,hp_left,ritual,reason\n1,1,8,10,1,won\n2,0,6,0,0,lost\n3,1,10,20,1,won\n4,0,40,30,0,turn_limit\n',
    );
  });
});
