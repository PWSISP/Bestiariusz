// The only place that asks the platform for entropy: a fresh seed for a new run. Game logic never calls
// this; it receives the seed (or the Rng made from it) as an argument.

/** A random unsigned 32-bit integer from the platform's cryptographic generator. */
export function newSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] as number;
}
