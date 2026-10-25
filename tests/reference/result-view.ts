// What the result screen shows after a combat (S04-08). Pure: returns text references and numbers, the
// UI translates and draws them (see src/view/text.ts).
import type { CombatSummary } from '../../src/core/combat/summary.ts';
import { text } from '../../src/view/text.ts';
import type { TextRef } from '../../src/view/text.ts';

/** From this many turns a lost combat counts as a long one. */
export const LONG_DEFEAT_TURNS = 20;

export interface ResultStat {
  readonly id: 'turns' | 'hp' | 'ritual';
  readonly label: TextRef;
}

export interface ResultView {
  readonly outcome: 'won' | 'lost';
  readonly title: TextRef;
  readonly flavor: TextRef;
  readonly enemyName: TextRef;
  /** Always three entries, in the order turns, hp, ritual. */
  readonly stats: readonly ResultStat[];
  readonly primary: { readonly id: 'continue'; readonly label: TextRef };
}

function flavorKey(summary: CombatSummary): string {
  if (summary.outcome === 'lost') {
    return summary.turns >= LONG_DEFEAT_TURNS
      ? 'result.lost.flavor.long'
      : 'result.lost.flavor.short';
  }
  if (summary.hpLeft * 4 >= summary.hpMax * 3) return 'result.won.flavor.high';
  if (summary.hpLeft * 20 >= summary.hpMax * 7) return 'result.won.flavor.mid';
  return 'result.won.flavor.low';
}

export function buildResultView(summary: CombatSummary): ResultView {
  if (!Number.isInteger(summary.turns) || summary.turns < 1) {
    throw new RangeError(`Invalid number of turns: ${summary.turns}`);
  }
  if (!Number.isInteger(summary.hpMax) || summary.hpMax < 1) {
    throw new RangeError(`Invalid maximum health: ${summary.hpMax}`);
  }
  if (!Number.isInteger(summary.hpLeft) || summary.hpLeft < 0 || summary.hpLeft > summary.hpMax) {
    throw new RangeError(`Invalid health left: ${summary.hpLeft} of ${summary.hpMax}`);
  }
  return {
    outcome: summary.outcome,
    title: text(summary.outcome === 'won' ? 'result.won.title' : 'result.lost.title'),
    flavor: text(flavorKey(summary)),
    enemyName: text(`enemy.${summary.enemyId}.name`),
    stats: [
      { id: 'turns', label: text('result.stat.turns', { turns: summary.turns }) },
      { id: 'hp', label: text('result.stat.hp', { hp: summary.hpLeft, max: summary.hpMax }) },
      {
        id: 'ritual',
        label: text(summary.ritualUsed ? 'result.stat.ritual.yes' : 'result.stat.ritual.no'),
      },
    ],
    primary: { id: 'continue', label: text('result.continue') },
  };
}
