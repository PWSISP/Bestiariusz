// The state of one expedition (S06): a fixed row of fights, the deck, health and ink carried between
// them. Pure: every random choice comes from the seed of the expedition (see rewards.ts).
import type { CardDef, CombatData, ExpeditionBalance } from '../combat/model.ts';
import { createRng } from '../rng.ts';
import { deriveSeed, drawRewards } from './rewards.ts';

export type CraftedCard = Extract<CardDef, { kind: 'creature' }>;

export interface RunState {
  readonly seed: number;
  /** Index of the current (or next) fight in `expedition.stages`. */
  readonly stage: number;
  readonly deck: readonly string[];
  readonly hp: number;
  readonly ink: number;
  /** Creature cards made in the Workshop during this expedition. */
  readonly crafted: readonly CraftedCard[];
  readonly status: 'active' | 'won' | 'lost';
}

function expeditionOf(data: CombatData): ExpeditionBalance {
  const expedition = data.balance.expedition;
  if (!expedition) throw new Error('The expedition is not configured');
  return expedition;
}

/** A fresh expedition: starting deck, full health, starting ink. Throws when there is no expedition. */
export function startRun(data: CombatData, seed: number): RunState {
  const expedition = expeditionOf(data);
  const deck = data.decks[expedition.deck];
  if (!deck) throw new Error(`Unknown deck: ${expedition.deck}`);
  return {
    seed,
    stage: 0,
    deck: [...deck],
    hp: data.balance.playerMaxHp,
    ink: expedition.startInk,
    crafted: [],
    status: 'active',
  };
}

/** Enemy of the current fight. Throws when the expedition is over. */
export function stageEnemy(data: CombatData, run: RunState): string {
  const enemy = expeditionOf(data).stages[run.stage];
  if (run.status !== 'active' || enemy === undefined) throw new Error('The expedition is over');
  return enemy;
}

/** Number of fights in the expedition. */
export function stageCount(data: CombatData): number {
  return expeditionOf(data).stages.length;
}

/** Seed of the current fight, different for every stage. */
export function fightSeed(run: RunState): number {
  return deriveSeed(run.seed, run.stage);
}

/** The game data with the cards crafted so far, for the combat reducer. */
export function dataForFight(data: CombatData, run: RunState): CombatData {
  if (run.crafted.length === 0) return data;
  const cards = { ...data.cards };
  for (const card of run.crafted) cards[card.id] = card;
  return { ...data, cards };
}

/**
 * Applies the end of a fight. A defeat ends the expedition. A win gives ink and health; after the
 * last fight the expedition is won, otherwise the stage advances after the reward (`takeReward`).
 * `hpLeft` is the health the player had at the end of the fight.
 */
export function finishFight(
  data: CombatData,
  run: RunState,
  outcome: { won: boolean; hpLeft: number },
): RunState {
  const expedition = expeditionOf(data);
  if (run.status !== 'active') return run;
  if (!outcome.won) return { ...run, hp: 0, status: 'lost' };
  const hp = Math.min(data.balance.playerMaxHp, Math.max(1, outcome.hpLeft) + expedition.healBetween);
  const last = run.stage >= expedition.stages.length - 1;
  return {
    ...run,
    hp: last ? Math.max(1, outcome.hpLeft) : hp,
    ink: run.ink + expedition.inkPerWin,
    status: last ? 'won' : 'active',
  };
}

/** The cards offered after the fight of the current stage; the same for the same run and stage. */
export function offerRewards(data: CombatData, run: RunState): string[] {
  const expedition = expeditionOf(data);
  const rng = createRng(deriveSeed(run.seed, 1000 + run.stage));
  return drawRewards(expedition.rewardPool, expedition.rewardChoices, rng);
}

/** Puts the chosen reward (or nothing, for `null`) in the deck and moves to the next fight. */
export function takeReward(run: RunState, cardId: string | null): RunState {
  return {
    ...run,
    deck: cardId === null ? run.deck : [...run.deck, cardId],
    stage: run.stage + 1,
  };
}

/** Adds a card made in the Workshop to the deck and pays its ink (`ink` is what is left). */
export function addCrafted(run: RunState, card: CraftedCard, ink: number): RunState {
  return {
    ...run,
    ink,
    deck: [...run.deck, card.id],
    crafted: run.crafted.some((c) => c.id === card.id) ? run.crafted : [...run.crafted, card],
  };
}
