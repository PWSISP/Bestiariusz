import type { CreatureEffectDef, EffectScope } from '../types.ts';

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
  // Validate circles array
  if (circles.length !== 3) {
    throw new RangeError('circles must have exactly 3 entries');
  }

  // Validate index
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    throw new RangeError('index must be an integer between 0 and 2');
  }

  // Check if the creature at index is null
  if (circles[index] === null) {
    throw new RangeError('creature in circle must not be null');
  }

  const creature = circles[index]!;
  let count = 0;

  switch (scope) {
    case 'self':
      return 1;

    case 'sameElementOthers':
      for (let i = 0; i < 3; i++) {
        if (i !== index && circles[i] !== null && circles[i]!.element === creature.element) {
          count++;
        }
      }
      return count;

    case 'sameElementAll':
      for (let i = 0; i < 3; i++) {
        if (circles[i] !== null && circles[i]!.element === creature.element) {
          count++;
        }
      }
      return count;

    case 'othersAny':
      for (let i = 0; i < 3; i++) {
        if (i !== index && circles[i] !== null) {
          count++;
        }
      }
      return count;

    default:
      throw new RangeError(`Unknown scope: ${scope}`);
  }
}

/** `effect.amount` multiplied by `countScope(effect.scope, circles, index)`; 0 when nothing is counted. */
export function scaledAmount(
  effect: Pick<CreatureEffectDef, 'amount' | 'scope'>,
  circles: readonly (BoardCreature | null)[],
  index: number,
): number {
  const count = countScope(effect.scope, circles, index);
  return effect.amount * count;
}
