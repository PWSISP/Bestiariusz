import type { ElementId, FormId, TraitId } from '../types.ts';

export interface CircleCreature {
  element: ElementId;
  form: FormId;
  trait: TraitId;
  attack: number;
  health: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  block: number;
  circles: Array<CircleCreature | null>;
  hand: string[];
  discard: string[];
  curses: number;
}

export interface BossState {
  hp: number;
  maxHp: number;
  block: number;
  stolen: string[];
}

export type EnemyAction =
  /** direct: true = the hit goes to the player and skips the circles. */
  | { type: 'atak'; amount: number; direct?: boolean }
  | { type: 'wielokrotny'; amount: number; times: number; direct?: boolean }
  | { type: 'tarcza'; amount: number }
  | { type: 'klatwa'; circle: number }
  | { type: 'kradziez' };

export interface EnemyTurnResult {
  player: PlayerState;
  boss: BossState;
  log: string[];
}

export function resolveEnemyTurn(
  _player: PlayerState,
  _boss: BossState,
  _actions: readonly EnemyAction[],
): EnemyTurnResult {
  throw new Error('Not implemented');
}
