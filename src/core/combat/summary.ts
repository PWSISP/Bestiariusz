// What the result screen needs to know about a finished combat (S04-08). Pure: reads a state, no rules.
import type { CombatState } from './model.ts';

export interface CombatSummary {
  readonly outcome: 'won' | 'lost';
  readonly enemyId: string;
  /** Number of the turn the combat ended in (1-based). */
  readonly turns: number;
  /** Health the player has left; 0 after a defeat. */
  readonly hpLeft: number;
  readonly hpMax: number;
  /** True when the player performed the ritual during the combat. */
  readonly ritualUsed: boolean;
}

/** The summary of a finished combat, or null while the combat is still going on. */
export function summarizeCombat(state: CombatState): CombatSummary | null {
  if (state.phase === 'player') return null;
  return {
    outcome: state.phase,
    enemyId: state.enemy.id,
    turns: state.turn,
    hpLeft: Math.max(0, Math.min(state.player.hp, state.player.maxHp)),
    hpMax: state.player.maxHp,
    ritualUsed: state.ritualUsed,
  };
}
