import type { StatRules } from './combat/creature.ts';
import type { CreatureSpec, SymbolData } from './types.ts';

export interface CreatureStats {
  /** element.cost + form.cost + trait.cost */
  readonly cost: number;
  /** cost <= rules.powerBudget */
  readonly valid: boolean;
  /** max(0, cost - rules.powerBudget) */
  readonly overBudgetBy: number;
  readonly attack: number;
  readonly health: number;
}

/**
 * Rates a creature: its cost, whether it fits the power budget and its stats.
 * - attack = max(0, form.baseAttack + element.attackBonus + trait.attackMod)
 * - health = max(1, form.baseHealth + element.healthBonus + trait.healthMod + bonus)
 * - bonus = (powerBudget - cost) x leftoverHealth for a valid creature, 0 for an invalid one.
 * Invalid creatures still get attack and health. An unknown symbol id throws an Error.
 */
export function evaluateCreature(
  _symbols: SymbolData,
  _spec: CreatureSpec,
  _rules: StatRules,
): CreatureStats {
  throw new Error('Not implemented');
}

/**
 * Every combination of one element, one form and one trait whose cost fits `powerBudget`,
 * ordered by element, then form, then trait (each in the order of `symbols`).
 */
export function listValidCreatures(_symbols: SymbolData, _powerBudget: number): CreatureSpec[] {
  throw new Error('Not implemented');
}
