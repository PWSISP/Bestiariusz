// The data bundled into the app (JSON imports, resolved by Vite) is the data on disk: what the tests and the
// tools read is what the player fights. Runs under Vitest only (JSON imports need Vite).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCombatData } from '../../src/data/combat-schema.ts';
import { loadBundledCombatData } from '../../src/game/combat-data.ts';

describe('bundled combat data', () => {
  it('equals the data read from disk', () => {
    const fromDisk = loadCombatData((file) =>
      readFileSync(new URL(`../../src/data/${file}`, import.meta.url), 'utf8'),
    );
    expect(loadBundledCombatData()).toEqual(fromDisk);
  });
  it('contains the first enemy and the starter deck', () => {
    const data = loadBundledCombatData();
    expect(data.enemies['leszy']?.maxHp).toBe(380);
    expect(data.decks['szeptucha']?.length).toBeGreaterThan(10);
  });
});
