// Seeds and rewards of an expedition (S06-03). Pure: all randomness comes from the seed or from the
// injected Rng, so the same expedition seed always gives the same rewards.
import type { Rng } from '../rng.ts';

/**
 * A seed for one part of an expedition (a fight, a reward offer), derived from the seed of the
 * expedition and a salt. Pure and well mixed (see the task file for the exact steps).
 * Throws RangeError when `seed` is not an integer from 0 to 4294967295 or `salt` is not an integer
 * from 0 to 1000000.
 */
export function deriveSeed(_seed: number, _salt: number): number {
  throw new Error('Not implemented');
}

/**
 * At most `count` different cards from `pool`, in random order. Repeated ids in the pool count once.
 * Throws RangeError when `count` is not an integer >= 0.
 */
export function drawRewards(_pool: readonly string[], _count: number, _rng: Rng): string[] {
  throw new Error('Not implemented');
}
