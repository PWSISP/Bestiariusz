// What the result screen shows after a combat (S04-08). Pure: returns text references and numbers, the
// UI translates and draws them (see src/view/text.ts).
import type { CombatSummary } from '../core/combat/summary.ts';
import { text } from './text.ts';
import type { TextRef } from './text.ts';

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

export function buildResultView(summary: CombatSummary): ResultView {
  // Validate inputs according to rule 1
  if (!Number.isInteger(summary.turns) || summary.turns < 1) {
    throw new RangeError();
  }
  if (!Number.isInteger(summary.hpMax) || summary.hpMax < 1) {
    throw new RangeError();
  }
  if (!Number.isInteger(summary.hpLeft) || summary.hpLeft < 0 || summary.hpLeft > summary.hpMax) {
    throw new RangeError();
  }

  const outcome = summary.outcome;

  // Rule 12: title
  const title = outcome === 'won' ? text('result.won.title') : text('result.lost.title');

  // Rule 13: enemyName
  const enemyName = text(`enemy.${summary.enemyId}.name`);

  // Rule 14 & 15: flavor
  let flavor: TextRef;
  if (outcome === 'won') {
    // For win, check health fraction
    // Compare with whole numbers: hpLeft * 4 >= hpMax * 3 for high, hpLeft * 20 >= hpMax * 7 for mid
    const highThreshold = summary.hpMax * 3;
    const midThreshold = summary.hpMax * 7;

    if (summary.hpLeft * 4 >= highThreshold) {
      flavor = text('result.won.flavor.high');
    } else if (summary.hpLeft * 20 >= midThreshold) {
      flavor = text('result.won.flavor.mid');
    } else {
      flavor = text('result.won.flavor.low');
    }
  } else {
    // For defeat, check turns
    if (summary.turns >= LONG_DEFEAT_TURNS) {
      flavor = text('result.lost.flavor.long');
    } else {
      flavor = text('result.lost.flavor.short');
    }
  }

  // Rule 16: stats
  const stats: ResultStat[] = [
    // turns stat
    {
      id: 'turns',
      label: text('result.stat.turns', { turns: summary.turns }),
    },
    // hp stat
    {
      id: 'hp',
      label: text('result.stat.hp', { hp: summary.hpLeft, max: summary.hpMax }),
    },
    // ritual stat
    {
      id: 'ritual',
      label: summary.ritualUsed ? text('result.stat.ritual.yes') : text('result.stat.ritual.no'),
    },
  ];

  // Rule 17: primary button
  const primary = {
    id: 'continue' as const,
    label: text('result.continue'),
  };

  return {
    outcome,
    title,
    flavor,
    enemyName,
    stats,
    primary,
  };
}
