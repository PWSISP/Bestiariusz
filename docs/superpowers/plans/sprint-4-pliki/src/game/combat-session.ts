// One combat in progress: the state, the random source and the two things the player can do. The screen
// asks it to act and gets back what happened; it never touches the state itself. Pure (no Pixi, no DOM),
// so the same code runs in tests, in the bot and in the app.
import type {
  CombatAction,
  CombatData,
  CombatEnv,
  CombatEvent,
  CombatResult,
  CombatState,
} from '../core/combat/model.ts';
import { createCombat, reduce } from '../core/combat/reducer.ts';
import { summarizeCombat } from '../core/combat/summary.ts';
import type { CombatSummary } from '../core/combat/summary.ts';
import { createRng } from '../core/rng.ts';

export const DEFAULT_DECK = 'szeptucha';
export const DEFAULT_ENEMY = 'leszy';

export interface SessionOptions {
  readonly seed: number;
  readonly deckId?: string;
  readonly enemyId?: string;
  /** Replaces the maximum health of the enemy (tests and measurements). */
  readonly enemyHp?: number | null;
  /** Replaces the maximum health of the player (tests and measurements). */
  readonly playerHp?: number | null;
}

export interface CombatSession {
  readonly data: CombatData;
  readonly seed: number;
  readonly state: CombatState;
  /** Events of the setup of the combat (first turn started). */
  readonly startEvents: readonly CombatEvent[];
  /** Plays the card in the given hand slot; creature cards need a circle (0-2). */
  play(handIndex: number, circle?: number): CombatResult;
  endTurn(): CombatResult;
  /** The summary once the combat is over, otherwise null. */
  summary(): CombatSummary | null;
}

/** The data with the health overrides applied; the input is not modified. */
export function withHealthOverrides(
  data: CombatData,
  enemyId: string,
  enemyHp: number | null | undefined,
  playerHp: number | null | undefined,
): CombatData {
  let next = data;
  if (enemyHp != null && Object.hasOwn(data.enemies, enemyId)) {
    const enemy = data.enemies[enemyId];
    if (enemy) next = { ...next, enemies: { ...next.enemies, [enemyId]: { ...enemy, maxHp: enemyHp } } };
  }
  if (playerHp != null) next = { ...next, balance: { ...next.balance, playerMaxHp: playerHp } };
  return next;
}

export function createCombatSession(data: CombatData, options: SessionOptions): CombatSession {
  const enemyId = options.enemyId ?? DEFAULT_ENEMY;
  const deckId = options.deckId ?? DEFAULT_DECK;
  const deck = Object.hasOwn(data.decks, deckId) ? data.decks[deckId] : undefined;
  if (!deck) throw new Error(`Unknown deck: ${deckId}`);
  const used = withHealthOverrides(data, enemyId, options.enemyHp, options.playerHp);
  const rng = createRng(options.seed);
  const env: CombatEnv = { data: used, rng };
  const created = createCombat(used, { deck, enemyId }, rng);
  let state = created.state;

  const act = (action: CombatAction): CombatResult => {
    const result = reduce(state, action, env);
    state = result.state;
    return result;
  };

  return {
    data: used,
    seed: options.seed,
    get state() {
      return state;
    },
    startEvents: created.events,
    play: (handIndex, circle) =>
      act(circle === undefined ? { type: 'playCard', handIndex } : { type: 'playCard', handIndex, circle }),
    endTurn: () => act({ type: 'endTurn' }),
    summary: () => summarizeCombat(state),
  };
}
