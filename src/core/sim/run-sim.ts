// Plays whole expeditions with the bot (S06-01), to measure how hard the expedition is. The bot takes a
// random reward and does not use the Workshop, so the numbers are a floor, not what a person reaches.
import type { CombatData } from '../combat/model.ts';
import { createRng } from '../rng.ts';
import {
  dataForFight,
  fightSeed,
  finishFight,
  offerRewards,
  stageEnemy,
  startRun,
  takeReward,
} from '../run/run.ts';
import { playGame } from './simulate.ts';

export interface RunSimResult {
  readonly seed: number;
  readonly won: boolean;
  /** Fights won before the expedition ended. */
  readonly fightsWon: number;
}

export function playRun(data: CombatData, seed: number): RunSimResult {
  let run = startRun(data, seed);
  const pick = createRng(seed ^ 0x5bd1e995);
  let fightsWon = 0;
  while (run.status === 'active') {
    const result = playGame(
      dataForFight(data, run),
      { deck: run.deck, enemyId: stageEnemy(data, run), startHp: run.hp },
      fightSeed(run),
    );
    run = finishFight(data, run, { won: result.won, hpLeft: result.hpLeft });
    if (!result.won) break;
    fightsWon += 1;
    if (run.status === 'active') {
      const offer = offerRewards(data, run);
      run = takeReward(run, offer.length > 0 ? pick.pick(offer) : null);
    }
  }
  return { seed, won: run.status === 'won', fightsWon };
}
