import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadCombatData } from '../../../src/data/combat-schema.ts';
import {
  addCrafted,
  dataForFight,
  fightSeed,
  finishFight,
  offerRewards,
  stageCount,
  stageEnemy,
  startRun,
  takeReward,
} from '../../../src/core/run/run.ts';
import type { CombatData } from '../../../src/core/combat/model.ts';
import { craftCreature } from '../../../src/core/workshop/workshop.ts';

const data: CombatData = loadCombatData((f) =>
  fs.readFileSync(new URL(`../../../src/data/${f}`, import.meta.url), 'utf8'),
);
const ex = data.balance.expedition!;
const win = (hpLeft: number) => ({ won: true, hpLeft });

describe('startRun', () => {
  it('starts at the first fight with the starting deck, full health and the starting ink', () => {
    const run = startRun(data, 5);
    expect(run).toMatchObject({ seed: 5, stage: 0, status: 'active', crafted: [] });
    expect(run.deck).toEqual(data.decks[ex.deck]);
    expect(run.hp).toBe(data.balance.playerMaxHp);
    expect(run.ink).toBe(ex.startInk);
    expect(stageEnemy(data, run)).toBe(ex.stages[0]);
    expect(stageCount(data)).toBe(ex.stages.length);
  });

  it('does not share the deck array with the data', () => {
    const run = startRun(data, 1);
    expect(run.deck).not.toBe(data.decks[ex.deck]);
  });

  it('throws without an expedition in the data', () => {
    const { expedition: _e, ...balance } = data.balance;
    expect(() => startRun({ ...data, balance }, 1)).toThrow('not configured');
  });
});

describe('fights', () => {
  it('give every stage its own seed, the same for the same run', () => {
    const run = startRun(data, 9);
    const next = { ...run, stage: 1 };
    expect(fightSeed(run)).toBe(fightSeed(startRun(data, 9)));
    expect(fightSeed(run)).not.toBe(fightSeed(next));
    expect(fightSeed(run)).not.toBe(fightSeed(startRun(data, 10)));
  });

  it('heal and give ink after a win, never above the maximum', () => {
    const run = startRun(data, 1);
    const after = finishFight(data, run, win(10));
    expect(after.hp).toBe(Math.min(data.balance.playerMaxHp, 10 + ex.healBetween));
    expect(after.ink).toBe(run.ink + ex.inkPerWin);
    expect(after.status).toBe('active');
    expect(finishFight(data, run, win(data.balance.playerMaxHp)).hp).toBe(
      data.balance.playerMaxHp,
    );
  });

  it('end the expedition after a defeat', () => {
    const lost = finishFight(data, startRun(data, 1), { won: false, hpLeft: 0 });
    expect(lost).toMatchObject({ status: 'lost', hp: 0 });
    expect(() => stageEnemy(data, lost)).toThrow('over');
    expect(finishFight(data, lost, win(5))).toBe(lost);
  });

  it('win the expedition with the last fight and do not heal then', () => {
    const last = { ...startRun(data, 1), stage: ex.stages.length - 1 };
    const done = finishFight(data, last, win(7));
    expect(done).toMatchObject({ status: 'won', hp: 7 });
    expect(stageEnemy(data, last)).toBe('leszy');
  });

  it('leave at least 1 health after a win with 0 left (a draw at the last moment)', () => {
    expect(finishFight(data, startRun(data, 1), win(0)).hp).toBeGreaterThanOrEqual(1);
  });
});

describe('rewards', () => {
  it('offer the configured number of different cards from the pool, the same for the same run', () => {
    const run = startRun(data, 20261102);
    const offer = offerRewards(data, run);
    expect(offer).toHaveLength(ex.rewardChoices);
    expect(new Set(offer).size).toBe(offer.length);
    for (const id of offer) expect(ex.rewardPool).toContain(id);
    expect(offerRewards(data, run)).toEqual(offer);
  });

  it('differ between stages and between expeditions', () => {
    const offers = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) offers.add(offerRewards(data, startRun(data, seed)).join());
    expect(offers.size).toBeGreaterThan(5);
    const run = startRun(data, 3);
    const a = offerRewards(data, run).join();
    const b = offerRewards(data, { ...run, stage: 1 }).join();
    const c = offerRewards(data, { ...run, stage: 2 }).join();
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it('go into the deck, and moving on advances the stage; skipping keeps the deck', () => {
    const run = startRun(data, 1);
    const taken = takeReward(run, 'iskra');
    expect(taken.deck).toEqual([...run.deck, 'iskra']);
    expect(taken.stage).toBe(1);
    expect(run.deck).not.toContain('iskra');
    const skipped = takeReward(run, null);
    expect(skipped.deck).toEqual(run.deck);
    expect(skipped.stage).toBe(1);
  });
});

describe('the Workshop in a run', () => {
  const unlocked = {
    elements: data.symbols.elements.map((e) => e.id),
    forms: data.symbols.forms.map((f) => f.id),
    traits: data.symbols.traits.map((t) => t.id),
  };

  it('adds the crafted card to the deck and to the data of the next fight, paying the ink', () => {
    const run = { ...startRun(data, 1), ink: 100 };
    const crafted = craftCreature(data, unlocked, run.ink, {
      element: 'ogien',
      form: 'kruk',
      trait: 'smutek',
    });
    if (!crafted.ok) throw new Error(crafted.error);
    const next = addCrafted(run, crafted.card, crafted.ink);
    expect(next.ink).toBe(crafted.ink);
    expect(next.deck.at(-1)).toBe('ogien-kruk-smutek');
    expect(dataForFight(data, next).cards['ogien-kruk-smutek']).toEqual(crafted.card);
    expect(data.cards['ogien-kruk-smutek']).toBeUndefined();
  });

  it('keeps one definition when the same creature is crafted twice', () => {
    const run = { ...startRun(data, 1), ink: 100 };
    const r = craftCreature(data, unlocked, 100, { element: 'woda', form: 'sowa', trait: 'spryt' });
    if (!r.ok) throw new Error(r.error);
    const twice = addCrafted(addCrafted(run, r.card, 50), r.card, 10);
    expect(twice.crafted).toHaveLength(1);
    expect(twice.deck.filter((c) => c === r.card.id)).toHaveLength(2);
  });

  it('returns the very same data when nothing was crafted', () => {
    expect(dataForFight(data, startRun(data, 1))).toBe(data);
  });
});
