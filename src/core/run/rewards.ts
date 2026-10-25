// Seeds and rewards of an expedition (S06-03). Pure: all randomness comes from the seed or from the
// injected Rng, so the same expedition seed always gives the same rewards.
import type { Rng } from '../rng.ts';

/**
 * A seed for one part of an expedition (a fight, a reward offer), derived from the seed of the
 * expedition and a salt. Pure and well mixed (see the task file for the exact steps).
 * Throws RangeError when `seed` is not an integer from 0 to 4294967295 or `salt` is not an integer
 * from 0 to 1000000.
 */
export function deriveSeed(seed: number, salt: number): number {
  // Validate inputs
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new RangeError('seed must be an integer from 0 to 4294967295');
  }
  if (!Number.isInteger(salt) || salt < 0 || salt > 1000000) {
    throw new RangeError('salt must be an integer from 0 to 1000000');
  }

  // Compute the hash using the exact steps specified
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * At most `count` different cards from `pool`, in random order. Repeated ids in the pool count once.
 * Throws RangeError when `count` is not an integer >= 0.
 */
export function drawRewards(pool: readonly string[], count: number, rng: Rng): string[] {
  // Validate count
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('count must be an integer >= 0');
  }

  // Handle edge cases
  if (count === 0 || pool.length === 0) {
    return [];
  }

  // Get unique cards while preserving order of first appearance
  const uniqueCards = Array.from(new Set(pool));

  // If we want more cards than available, just return all available cards
  if (count >= uniqueCards.length) {
    const shuffled = rng.shuffle([...uniqueCards]);
    return shuffled;
  }

  // Shuffle the unique cards and take the first count items
  const shuffled = rng.shuffle([...uniqueCards]);
  return shuffled.slice(0, count);
}
