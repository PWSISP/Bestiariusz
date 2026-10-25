import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCombatData } from '../../src/data/combat-schema.ts';
import { playRun } from '../../src/core/sim/run-sim.ts';

const data = loadCombatData((f) =>
  fs.readFileSync(new URL(`../../src/data/${f}`, import.meta.url), 'utf8'),
);
const RUNS = 40;
const results = Array.from({ length: RUNS }, (_, i) => playRun(data, 20261102 + i));

describe('the expedition played by the bot', () => {
  it('is reproducible for a seed', () => {
    expect(playRun(data, 5)).toEqual(playRun(data, 5));
  });

  it('is not trivially lost: most runs clear the first fight', () => {
    expect(results.filter((r) => r.fightsWon >= 1).length / RUNS).toBeGreaterThanOrEqual(0.8);
  });

  it('is not trivially won: the bot does not clear every expedition', () => {
    expect(results.filter((r) => r.won).length / RUNS).toBeLessThan(0.9);
  });

  it('can be won, so the boss is reachable', () => {
    expect(results.some((r) => r.won)).toBe(true);
  });
});
