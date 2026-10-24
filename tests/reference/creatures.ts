import type { StatRules } from '../../src/core/combat/creature.ts';
import type { CreatureSpec, SymbolData } from '../../src/core/types.ts';

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
  const element = symbols.elements.find((e) => e.id === spec.element);
  const form = symbols.forms.find((f) => f.id === spec.form);
  const trait = symbols.traits.find((t) => t.id === spec.trait);
  if (!element) throw new Error(`Unknown element: ${spec.element}`);
  if (!form) throw new Error(`Unknown form: ${spec.form}`);
  if (!trait) throw new Error(`Unknown trait: ${spec.trait}`);
  const cost = element.cost + form.cost + trait.cost;
  const valid = cost <= rules.powerBudget;
  const bonus = valid ? (rules.powerBudget - cost) * rules.leftoverHealth : 0;
  return {
    cost,
    valid,
    overBudgetBy: Math.max(0, cost - rules.powerBudget),
    attack: Math.max(0, form.baseAttack + element.attackBonus + trait.attackMod),
    health: Math.max(1, form.baseHealth + element.healthBonus + trait.healthMod + bonus),
  };
}

/**
 * Every combination of one element, one form and one trait whose cost fits `powerBudget`,
 * ordered by element, then form, then trait (each in the order of `symbols`).
 */
export function listValidCreatures(symbols: SymbolData, powerBudget: number): CreatureSpec[] {
  const out: CreatureSpec[] = [];
  for (const element of symbols.elements) {
    for (const form of symbols.forms) {
      for (const trait of symbols.traits) {
        if (element.cost + form.cost + trait.cost <= powerBudget) {
          out.push({ element: element.id, form: form.id, trait: trait.id });
        }
      }
    }
  }
  return out;
}
