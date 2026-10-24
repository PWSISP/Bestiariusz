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
  _scope: EffectScope,
  _circles: readonly (BoardCreature | null)[],
  _index: number,
): number {
  throw new Error('Not implemented');
}

/** `effect.amount` multiplied by `countScope(effect.scope, circles, index)`; 0 when nothing is counted. */
export function scaledAmount(
  _effect: Pick<CreatureEffectDef, 'amount' | 'scope'>,
  _circles: readonly (BoardCreature | null)[],
  _index: number,
): number {
  throw new Error('Not implemented');
}
