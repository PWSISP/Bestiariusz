/** Deterministic random number generator (PCG32). All game randomness goes through it. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max]; always consumes exactly one next(). */
  int(min: number, max: number): number;
  /** Random element; consumes one int(). */
  pick<T>(items: readonly T[]): T;
  /** Fisher–Yates from the end; does not mutate the input; consumes length - 1 int() calls. */
  shuffle<T>(items: readonly T[]): T[];
}

/** Seed: integer 0..4294967295, otherwise RangeError. */
export function createRng(seed: number): Rng {
  // Validate seed
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Invalid seed');
  }

  // PCG32 constants (64-bit state, fixed stream)
  const MULTIPLIER = 6364136223846793005n;
  const INC = 54n * 2n + 1n;

  // Initialize state
  let state = 0n;

  // Step function - advance the generator once
  function step(): bigint {
    const old = state;
    state = (old * MULTIPLIER + INC) & 0xffffffffffffffffn;
    return old;
  }

  // Seeding: step, add the seed, step again
  step();
  state = (state + BigInt(seed)) & 0xffffffffffffffffn;
  step();

  // u32 function - generate 32-bit value using bit operations
  function u32(): number {
    const old = step();
    const xorshifted = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn);
    const rot = Number(old >> 59n) & 31;
    return ((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0;
  }

  // next() - generate float in [0, 1)
  function next(): number {
    return u32() / 4294967296;
  }

  // int(min, max) - integer in [min, max]
  function int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError('Invalid bounds for int');
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  // pick(items) - pick random element from array
  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('Cannot pick from empty array');
    }
    return items[int(0, items.length - 1)];
  }

  // shuffle(items) - Fisher-Yates shuffle
  function shuffle<T>(items: readonly T[]): T[] {
    if (items.length <= 1) {
      return [...items];
    }

    const result = [...items];
    for (let i = items.length - 1; i > 0; i--) {
      const j = int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  return {
    next,
    int,
    pick,
    shuffle,
  };
}
