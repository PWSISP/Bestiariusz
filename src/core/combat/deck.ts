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

export function createDeck(cards: readonly string[], rng: Rng): DeckState {
  return { draw: rng.shuffle(cards), hand: [], discard: [] };
}

export function drawCards(state: DeckState, n: number, rng: Rng): DeckState {
  // Return unchanged copy if n <= 0
  if (n <= 0) {
    return {
      draw: [...state.draw],
      hand: [...state.hand],
      discard: [...state.discard],
    };
  }

  // Create a deep copy of the state to avoid modifying the input
  const draw = [...state.draw];
  const hand = [...state.hand];
  let discard = [...state.discard];

  // Draw n cards one at a time
  for (let i = 0; i < n; i++) {
    // If draw pile is empty, check if we can reshuffle from discard pile
    if (draw.length === 0) {
      if (discard.length === 0) {
        // Both piles are empty, stop drawing
        break;
      }

      // Reshuffle the discard pile and make it the new draw pile
      const shuffledDiscard = rng.shuffle(discard);
      discard = [];
      // Put the reshuffled cards in the draw pile
      for (const card of shuffledDiscard) {
        draw.push(card);
      }
    }

    // Take top card from draw pile
    const card = draw.shift()!;

    // If hand is at capacity, burn the card to discard pile
    if (hand.length >= HAND_LIMIT) {
      discard.push(card);
    } else {
      // Otherwise add card to hand
      hand.push(card);
    }
  }

  return { draw, hand, discard };
}

export function endTurn(state: DeckState): DeckState {
  // Move all cards from hand to the end of discard pile
  const newDiscard = [...state.discard, ...state.hand];

  return {
    draw: [...state.draw],
    hand: [],
    discard: newDiscard,
  };
}
