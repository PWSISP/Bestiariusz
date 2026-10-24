// S03-01b: the fight against the Leszy with the real data and the effect system. Needs the effects
// (S03-05); the number of wins is a range, so the exact health of the Leszy can still be tuned.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runGames, summarize } from '../../src/core/sim/simulate.ts';
import { loadCombatData } from '../../src/data/combat-schema.ts';

const data = loadCombatData((file) =>
  fs.readFileSync(new URL(`../../src/data/${file}`, import.meta.url), 'utf8'),
);

describe('the fight against the Leszy', () => {
  it('is still a fair fight for the bot: 45-65% wins with the szeptucha deck', () => {
    const results = runGames(
      data,
      { deck: data.decks['szeptucha'] as readonly string[], enemyId: 'leszy' },
      600,
      20261102,
    );
    const { winRate, turnLimit } = summarize(results);
    expect(winRate).toBeGreaterThanOrEqual(0.45);
    expect(winRate).toBeLessThanOrEqual(0.65);
    expect(turnLimit).toBe(0);
  });
});
