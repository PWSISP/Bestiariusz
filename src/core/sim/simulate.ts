import { createRng } from '../rng.ts';
import type { CombatData, CombatSetup } from '../combat/model.ts';
import { createCombat, reduce } from '../combat/reducer.ts';
import { chooseBotAction } from './bot.ts';

export type EndReason = 'won' | 'lost' | 'turn_limit';

export interface GameResult {
  readonly seed: number;
  readonly won: boolean;
  readonly turns: number;
  readonly hpLeft: number;
  readonly ritual: boolean;
  readonly reason: EndReason;
}

export interface Summary {
  readonly games: number;
  readonly wins: number;
  readonly winRate: number;
  readonly avgTurns: number;
  readonly avgHpLeftOnWin: number;
  readonly ritualRate: number;
  readonly turnLimit: number;
}

export function playGame(
  data: CombatData,
  setup: CombatSetup,
  seed: number,
  turnLimit: number = 40,
): GameResult {
  const env = { data, rng: createRng(seed) };
  let { state } = createCombat(data, setup, env.rng);
  while (state.phase === 'player' && state.turn <= turnLimit) {
    const action = chooseBotAction(state, env);
    const result = reduce(state, action, env);
    if (result.events[0]?.type === 'rejected') {
      throw new Error(`Bot played an illegal action: ${JSON.stringify(action)}`);
    }
    state = result.state;
  }
  const reason: EndReason =
    state.phase === 'won' ? 'won' : state.phase === 'lost' ? 'lost' : 'turn_limit';
  return {
    seed,
    won: reason === 'won',
    turns: state.turn,
    hpLeft: state.player.hp,
    ritual: state.ritualUsed,
    reason,
  };
}

export function runGames(
  data: CombatData,
  setup: CombatSetup,
  games: number,
  baseSeed: number,
  turnLimit: number = 40,
): GameResult[] {
  return Array.from({ length: games }, (_, i) => playGame(data, setup, baseSeed + i, turnLimit));
}

export function summarize(results: readonly GameResult[]): Summary {
  const games = results.length;
  const won = results.filter((r) => r.won);
  const mean = (xs: readonly number[]): number =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    games,
    wins: won.length,
    winRate: games === 0 ? 0 : won.length / games,
    avgTurns: mean(results.map((r) => r.turns)),
    avgHpLeftOnWin: mean(won.map((r) => r.hpLeft)),
    ritualRate: games === 0 ? 0 : results.filter((r) => r.ritual).length / games,
    turnLimit: results.filter((r) => r.reason === 'turn_limit').length,
  };
}

export const CSV_HEADER = 'seed,won,turns,hp_left,ritual,reason';

export function toCsv(results: readonly GameResult[]): string {
  const rows = results.map(
    (r) => `${r.seed},${r.won ? 1 : 0},${r.turns},${r.hpLeft},${r.ritual ? 1 : 0},${r.reason}`,
  );
  return [CSV_HEADER, ...rows].join('\n') + '\n';
}
