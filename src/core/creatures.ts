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
  symbols: SymbolData,
  spec: CreatureSpec,
  rules: StatRules,
): CreatureStats {
  // Find the element, form and trait
  const element = symbols.elements.find((e) => e.id === spec.element);
  const form = symbols.forms.find((f) => f.id === spec.form);
  const trait = symbols.traits.find((t) => t.id === spec.trait);

  // Throw an error if any symbol is missing
  if (!element || !form || !trait) {
    throw new Error('Unknown symbol');
  }

  // Calculate cost
  const cost = element.cost + form.cost + trait.cost;

  // Determine if valid and how much over budget
  const valid = cost <= rules.powerBudget;
  const overBudgetBy = Math.max(0, cost - rules.powerBudget);

  // Calculate attack
  const attack = Math.max(0, form.baseAttack + element.attackBonus + trait.attackMod);

  // Calculate health with bonus if valid
  const bonus = valid ? (rules.powerBudget - cost) * rules.leftoverHealth : 0;
  const health = Math.max(1, form.baseHealth + element.healthBonus + trait.healthMod + bonus);

  return {
    cost,
    valid,
    overBudgetBy,
    attack,
    health,
  };
}

/**
 * Every combination of one element, one form and one trait whose cost fits `powerBudget`,
 * ordered by element, then form, then trait (each in the order of `symbols`).
 */
export function listValidCreatures(symbols: SymbolData, powerBudget: number): CreatureSpec[] {
  const validCreatures: CreatureSpec[] = [];

  // Iterate through all combinations
  for (const element of symbols.elements) {
    for (const form of symbols.forms) {
      for (const trait of symbols.traits) {
        const cost = element.cost + form.cost + trait.cost;
        if (cost <= powerBudget) {
          validCreatures.push({
            element: element.id,
            form: form.id,
            trait: trait.id,
          });
        }
      }
    }
  }

  return validCreatures;
}
