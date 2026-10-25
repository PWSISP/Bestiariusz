import type { CreatureSpec, SymbolData } from '../types.ts';
import type { Creature } from './model.ts';

/** Budget rules for creature stats (decision D22); omit for stats without the unspent-budget bonus. */
export interface StatRules {
  readonly powerBudget: number;
  /** Health per unspent budget point. */
  readonly leftoverHealth: number;
}

/**
 * Stats of a creature: form base + element bonus + trait modifier + unspent budget bonus;
 * attack >= 0, health >= 1.
 */
export function buildCreature(
  symbols: SymbolData,
  cardId: string,
  spec: CreatureSpec,
  rules?: StatRules,
): Creature {
  const element = symbols.elements.find((e) => e.id === spec.element);
  const form = symbols.forms.find((f) => f.id === spec.form);
  const trait = symbols.traits.find((t) => t.id === spec.trait);
  if (!element || !form || !trait) {
    throw new Error(`Unknown symbol in ${cardId}: ${spec.element}/${spec.form}/${spec.trait}`);
  }
  const leftover = rules
    ? Math.max(0, rules.powerBudget - (element.cost + form.cost + trait.cost)) *
      rules.leftoverHealth
    : 0;
  const attack = Math.max(0, form.baseAttack + element.attackBonus + trait.attackMod);
  const health = Math.max(1, form.baseHealth + element.healthBonus + trait.healthMod + leftover);
  return {
    cardId,
    element: spec.element,
    form: spec.form,
    trait: spec.trait,
    attack,
    health,
    maxHealth: health,
  };
}
