// Reference implementation of deck, kept only as an oracle for tests/diff/qwen-vs-reference.test.ts.
// Do not import it from src/. Added AFTER the Qwen task so the model never sees it.
import type { Rng } from '../../src/core/rng.ts';

export const HAND_LIMIT = 5;

export interface DeckState {
  draw: string[];
  hand: string[];
  discard: string[];
}

export function createDeck(cards: readonly string[], rng: Rng): DeckState {
  return { draw: rng.shuffle(cards), hand: [], discard: [] };
}

export function drawCards(state: DeckState, n: number, rng: Rng): DeckState {
  let draw = state.draw.slice();
  const hand = state.hand.slice();
  let discard = state.discard.slice();
  for (let i = 0; i < n; i++) {
    if (draw.length === 0) {
      if (discard.length === 0) break;
      draw = rng.shuffle(discard);
      discard = [];
    }
    const card = draw.shift() as string;
    if (hand.length >= HAND_LIMIT) discard.push(card);
    else hand.push(card);
  }
  return { draw, hand, discard };
}

export function endTurn(state: DeckState): DeckState {
  return { draw: state.draw.slice(), hand: [], discard: [...state.discard, ...state.hand] };
}
