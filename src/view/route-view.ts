// View model of the route screen (S06-01): the row of fights, how far the player is, and the three
// numbers carried between fights. Pure: ids and numbers, the screen turns them into texts.
import type { CombatData } from '../core/combat/model.ts';
import type { RunState } from '../core/run/run.ts';
import { text } from './text.ts';
import type { TextRef } from './text.ts';

export interface StageView {
  readonly index: number;
  readonly enemyId: string;
  readonly name: TextRef;
  readonly boss: boolean;
  readonly state: 'done' | 'current' | 'upcoming';
}

export interface RouteView {
  readonly stages: readonly StageView[];
  readonly hp: number;
  readonly hpMax: number;
  readonly ink: number;
  readonly deckSize: number;
  /** The player can open the Workshop (the data has its prices). */
  readonly workshop: boolean;
  /** Number of the current fight, 1-based, and the number of fights. */
  readonly step: { readonly current: number; readonly total: number };
}

export function buildRouteView(data: CombatData, run: RunState): RouteView {
  const expedition = data.balance.expedition;
  if (!expedition) throw new Error('The expedition is not configured');
  const last = expedition.stages.length - 1;
  return {
    stages: expedition.stages.map((enemyId, index) => ({
      index,
      enemyId,
      name: text(`enemy.${enemyId}.name`),
      boss: index === last,
      state: index < run.stage ? 'done' : index === run.stage ? 'current' : 'upcoming',
    })),
    hp: run.hp,
    hpMax: data.balance.playerMaxHp,
    ink: run.ink,
    deckSize: run.deck.length,
    workshop: data.balance.workshop !== undefined && data.balance.powerBudget !== undefined,
    step: { current: Math.min(run.stage, last) + 1, total: expedition.stages.length },
  };
}
