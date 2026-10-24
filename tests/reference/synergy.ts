import type { CreatureEffectDef, EffectScope } from '../../src/core/types.ts';

/** The only thing synergy counting needs to know about a creature standing in a circle. */
export interface BoardCreature {
  readonly element: string;
}

/**
 * How many creatures the `scope` of an effect counts, seen from the creature in circle `index`:
 * - `self`: always 1;
 * - `sameElementOthers`: other creatures with the same element as the creature at `index`;
 * - `sameElementAll`: the same, plus the creature itself;
 * - `othersAny`: all other creatures, whatever their element.
 * `circles` must have exactly 3 entries and `index` must point at a creature, otherwise RangeError.
 */
export function countScope(
  scope: EffectScope,
  circles: readonly (BoardCreature | null)[],
  index: number,
): number {
  const me = circles.length === 3 && Number.isInteger(index) ? circles[index] : undefined;
  if (!me) throw new RangeError(`No creature in circle ${index}`);
  const sameElement = circles.filter((c) => c !== null && c.element === me.element).length;
  switch (scope) {
    case 'self':
      return 1;
    case 'sameElementAll':
      return sameElement;
    case 'sameElementOthers':
      return sameElement - 1;
    case 'othersAny':
      return circles.filter((c, i) => c !== null && i !== index).length;
    default:
      throw new RangeError(`Unknown scope: ${String(scope)}`);
  }
}

/** `effect.amount` multiplied by `countScope(effect.scope, circles, index)`; 0 when nothing is counted. */
export function scaledAmount(
  effect: Pick<CreatureEffectDef, 'amount' | 'scope'>,
  circles: readonly (BoardCreature | null)[],
  index: number,
): number {
  return effect.amount * countScope(effect.scope, circles, index);
}
