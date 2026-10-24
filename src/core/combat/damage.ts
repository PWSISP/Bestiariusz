import type { ElementId } from '../types.ts';

export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  resist: readonly ElementId[];
  weak: readonly ElementId[];
}

export interface Hit {
  amount: number;
  /** null = no element: resistances and weaknesses do not apply. */
  element: ElementId | null;
  /** true = the hit ignores block. */
  pierce?: boolean;
}

export interface DamageResult {
  /** A new object; the input is never modified. */
  target: Combatant;
  blocked: number;
  dealt: number;
  overkill: number;
  killed: boolean;
}

export function applyDamage(_target: Combatant, _hit: Hit): DamageResult {
  throw new Error('Not implemented');
}
