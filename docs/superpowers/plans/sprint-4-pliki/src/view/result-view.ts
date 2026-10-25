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

export function buildResultView(_summary: CombatSummary): ResultView {
  void text;
  throw new Error('Not implemented');
}
