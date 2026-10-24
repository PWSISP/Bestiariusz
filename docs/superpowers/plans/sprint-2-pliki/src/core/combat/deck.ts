import type { Rng } from '../rng.ts';

/** Cards in hand never exceed this number (game design document: hand of five). */
export const HAND_LIMIT = 5;

export interface DeckState {
  /** Draw pile; index 0 is the top card. */
  draw: string[];
  /** Cards in hand, in the order they were drawn. */
  hand: string[];
  /** Discard pile; new cards are appended at the end. */
  discard: string[];
}

export function createDeck(_cards: readonly string[], _rng: Rng): DeckState {
  throw new Error('Not implemented');
}

export function drawCards(_state: DeckState, _n: number, _rng: Rng): DeckState {
  throw new Error('Not implemented');
}

export function endTurn(_state: DeckState): DeckState {
  throw new Error('Not implemented');
}
