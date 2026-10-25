import type { CombatData } from '../combat/model.ts';
import { evaluateCreature, listValidCreatures } from '../creatures.ts';
import type { CreatureSpec } from '../types.ts';
import { runGames, summarize } from './simulate.ts';

/** A creature whose win rate is below / above these is flagged for a closer look (plan S03-08). */
export const WIN_RATE_MIN = 0.35;
export const WIN_RATE_MAX = 0.65;

export interface BalanceOptions {
  /** Id of the deck (in `data.decks`) the creature is added to. */
  readonly baseDeck: string;
  readonly enemyId: string;
  /** Games per creature. */
  readonly games: number;
  /** First seed; every creature plays the same seeds, so the creatures are compared fairly. */
  readonly seed: number;
  /** How many copies of the creature are shuffled into the base deck. */
  readonly copies: number;
}

export type BalanceFlag = 'ok' | 'low' | 'high';

export interface BalanceRow {
  readonly element: string;
  readonly form: string;
  readonly trait: string;
  readonly cost: number;
  readonly attack: number;
  readonly health: number;
  readonly games: number;
  readonly wins: number;
  readonly winRate: number;
  readonly avgTurns: number;
  readonly flag: BalanceFlag;
}

export const CSV_HEADER =
  'element,form,trait,cost,attack,health,games,wins,win_rate,avg_turns,flag';

/** `winRate` below WIN_RATE_MIN is 'low', above WIN_RATE_MAX is 'high', the limits themselves are 'ok'. */
export function flagOf(winRate: number): BalanceFlag {
  if (winRate < WIN_RATE_MIN) return 'low';
  if (winRate > WIN_RATE_MAX) return 'high';
  return 'ok';
}

/**
 * Plays `options.games` combats for every creature the symbols allow within the power budget:
 * the base deck plus `options.copies` copies of that one creature, against `options.enemyId`,
 * played by the bot. Rows come in the order of `listValidCreatures`. Needs `balance.powerBudget`
 * and `balance.workshop` (the creature card costs `workshop.emberCost`); throws an Error without.
 * Unknown deck or enemy throws an Error.
 */
export function runBalance(data: CombatData, options: BalanceOptions): BalanceRow[] {
  const { powerBudget, workshop } = data.balance;
  if (powerBudget === undefined || !workshop) {
    throw new Error('Balance needs balance.powerBudget and balance.workshop');
  }
  const base = Object.hasOwn(data.decks, options.baseDeck)
    ? data.decks[options.baseDeck]
    : undefined;
  if (!base) throw new Error(`Unknown deck: ${options.baseDeck}`);
  if (!Object.hasOwn(data.enemies, options.enemyId)) {
    throw new Error(`Unknown enemy: ${options.enemyId}`);
  }
  const rules = { powerBudget, leftoverHealth: data.balance.leftoverHealth ?? 0 };
  return listValidCreatures(data.symbols, powerBudget).map((spec: CreatureSpec) => {
    const id = `${spec.element}-${spec.form}-${spec.trait}`;
    const withCard: CombatData = {
      ...data,
      cards: {
        ...data.cards,
        [id]: { id, kind: 'creature', cost: workshop.emberCost, creature: spec },
      },
    };
    const deck = [...base, ...Array.from({ length: options.copies }, () => id)];
    const summary = summarize(
      runGames(withCard, { deck, enemyId: options.enemyId }, options.games, options.seed),
    );
    const stats = evaluateCreature(data.symbols, spec, rules);
    return {
      ...spec,
      cost: stats.cost,
      attack: stats.attack,
      health: stats.health,
      games: summary.games,
      wins: summary.wins,
      winRate: summary.winRate,
      avgTurns: summary.avgTurns,
      flag: flagOf(summary.winRate),
    };
  });
}

/** One header line and one line per row; win rate as a fraction with 4 decimals, turns with 2. */
export function balanceToCsv(rows: readonly BalanceRow[]): string {
  const lines = rows.map((r) =>
    [
      r.element,
      r.form,
      r.trait,
      r.cost,
      r.attack,
      r.health,
      r.games,
      r.wins,
      r.winRate.toFixed(4),
      r.avgTurns.toFixed(2),
      r.flag,
    ].join(','),
  );
  return [CSV_HEADER, ...lines].join('\n') + '\n';
}
