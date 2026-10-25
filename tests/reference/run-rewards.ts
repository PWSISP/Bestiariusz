// Reference implementation of S06-03 (written by Claude, not by Qwen). It checks that the test is
// satisfiable and is what Claude takes over with after five failed Qwen attempts. Not part of the app.
import type { Rng } from '../../src/core/rng.ts';

const MAX_SEED = 0xffffffff;

export function deriveSeed(seed: number, salt: number): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) throw new RangeError('Invalid seed');
  if (!Number.isInteger(salt) || salt < 0 || salt > 1_000_000) throw new RangeError('Invalid salt');
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function drawRewards(pool: readonly string[], count: number, rng: Rng): string[] {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('Invalid count');
  const unique = [...new Set(pool)];
  if (count === 0 || unique.length === 0) return [];
  return rng.shuffle(unique).slice(0, count);
}
