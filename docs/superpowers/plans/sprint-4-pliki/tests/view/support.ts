// Shared helpers of the view tests: the real game data, both language files and a bot that produces
// many real combat states.
import fs from 'node:fs';
import { createRng } from '../../src/core/rng.ts';
import type { CombatData, CombatEnv, CombatEvent, CombatState } from '../../src/core/combat/model.ts';
import { createCombat, reduce } from '../../src/core/combat/reducer.ts';
import { chooseBotAction } from '../../src/core/sim/bot.ts';
import { loadCombatData } from '../../src/data/combat-schema.ts';
import { keysOf } from '../../src/view/text.ts';
import type { TextRef } from '../../src/view/text.ts';

const read = (path: string): string => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

export const data: CombatData = loadCombatData((file) => read(`../../src/data/${file}`));
export const pl: Record<string, string> = JSON.parse(read('../../src/i18n/pl.json'));
export const en: Record<string, string> = JSON.parse(read('../../src/i18n/en.json'));
export const DECK = data.decks['szeptucha'] as readonly string[];

/** The keys of the reference that are missing in pl.json or en.json (empty = fine). */
export function missingKeys(ref: TextRef): string[] {
  return keysOf(ref).filter((key) => !Object.hasOwn(pl, key) || !Object.hasOwn(en, key));
}

export function start(seed = 20261102): { state: CombatState; env: CombatEnv; events: readonly CombatEvent[] } {
  const rng = createRng(seed);
  const env: CombatEnv = { data, rng };
  const { state, events } = createCombat(data, { deck: DECK, enemyId: 'leszy' }, rng);
  return { state, env, events };
}

/** Plays a whole combat with the bot; calls `visit` with the state before every action and the events it produced. */
export function playWithBot(
  seed: number,
  visit: (before: CombatState, events: readonly CombatEvent[], after: CombatState) => void,
  maxTurns = 40,
): CombatState {
  const { state: first, env } = start(seed);
  let state = first;
  while (state.phase === 'player' && state.turn <= maxTurns) {
    const action = chooseBotAction(state, env);
    const result = reduce(state, action, env);
    visit(state, result.events, result.state);
    state = result.state;
  }
  return state;
}
