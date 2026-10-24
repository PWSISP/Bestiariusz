import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng.ts';
import type { Rng } from '../src/core/rng.ts';
import { HAND_LIMIT, createDeck, drawCards, endTurn } from '../src/core/combat/deck.ts';
import type { DeckState } from '../src/core/combat/deck.ts';

/** Real RNG that counts shuffles and fails on any other method. */
function spyRng(seed: number): Rng & { shuffles: number } {
  const real = createRng(seed);
  const spy = {
    shuffles: 0,
    next: (): number => {
      throw new Error('next() must not be called');
    },
    int: (): number => {
      throw new Error('int() must not be called');
    },
    pick: (): never => {
      throw new Error('pick() must not be called');
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      spy.shuffles++;
      return real.shuffle(items);
    },
  };
  return spy;
}

const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('HAND_LIMIT', () => {
  it('is 5, as in the game design document', () => {
    expect(HAND_LIMIT).toBe(5);
  });
});

describe('createDeck', () => {
  const cards = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];

  it('puts all cards in the draw pile, shuffled with one rng.shuffle call', () => {
    const rng = spyRng(20261102);
    const deck = createDeck(cards, rng);
    expect(rng.shuffles).toBe(1);
    expect(deck).toEqual({ draw: createRng(20261102).shuffle(cards), hand: [], discard: [] });
    expect([...deck.draw].sort()).toEqual(cards);
  });

  it('gives the same deck for the same seed and another order for another seed', () => {
    expect(createDeck(cards, createRng(7))).toEqual(createDeck(cards, createRng(7)));
    expect(createDeck(cards, createRng(7)).draw).not.toEqual(createDeck(cards, createRng(8)).draw);
  });

  it('does not modify the input array', () => {
    const input = Object.freeze([...cards]);
    createDeck(input, createRng(1));
    expect(input).toEqual(cards);
  });
});

describe('drawCards', () => {
  it('draws from the top, in order', () => {
    const state: DeckState = { draw: ['a', 'b', 'c', 'd'], hand: ['x'], discard: [] };
    const rng = spyRng(1);
    expect(drawCards(state, 2, rng)).toEqual({
      draw: ['c', 'd'],
      hand: ['x', 'a', 'b'],
      discard: [],
    });
    expect(rng.shuffles).toBe(0);
  });

  it('reshuffles the discard pile only when the draw pile runs out', () => {
    const state: DeckState = { draw: ['a'], hand: [], discard: ['p', 'q', 'r', 's'] };
    const rng = spyRng(42);
    const shuffled = createRng(42).shuffle(['p', 'q', 'r', 's']);
    expect(drawCards(state, 3, rng)).toEqual({
      draw: shuffled.slice(2),
      hand: ['a', shuffled[0], shuffled[1]],
      discard: [],
    });
    expect(rng.shuffles).toBe(1);
  });

  it('stops when both piles are empty', () => {
    const state: DeckState = { draw: ['a'], hand: [], discard: [] };
    const rng = spyRng(3);
    expect(drawCards(state, 5, rng)).toEqual({ draw: [], hand: ['a'], discard: [] });
    expect(rng.shuffles).toBe(0);
  });

  it('cards over the hand limit are burned to the discard pile', () => {
    const hand = Array.from({ length: HAND_LIMIT - 1 }, (_, i) => `h${i}`);
    const out = drawCards({ draw: ['a', 'b', 'c'], hand, discard: ['z'] }, 3, spyRng(5));
    expect(out.hand).toEqual([...hand, 'a']);
    expect(out.discard).toEqual(['z', 'b', 'c']);
    expect(out.draw).toEqual([]);
  });

  it('burned cards can be reshuffled in the same draw', () => {
    const hand = Array.from({ length: HAND_LIMIT }, (_, i) => `h${i}`);
    const rng = spyRng(9);
    const out = drawCards({ draw: ['a'], hand, discard: [] }, 2, rng);
    expect(rng.shuffles).toBe(1);
    expect(out).toEqual({ draw: [], hand, discard: ['a'] });
  });

  it('reshuffles again each time the draw pile runs out within one draw', () => {
    const hand = Array.from({ length: HAND_LIMIT }, (_, i) => `h${i}`);
    const rng = spyRng(11);
    const out = drawCards({ draw: [], hand, discard: ['a'] }, 3, rng);
    expect(rng.shuffles).toBe(3);
    expect(out).toEqual({ draw: [], hand, discard: ['a'] });
  });

  it('n <= 0 returns an unchanged copy', () => {
    const state: DeckState = { draw: [], hand: ['a'], discard: ['b'] };
    const rng = spyRng(1);
    const out = drawCards(state, 0, rng);
    expect(out).toEqual(state);
    expect(out).not.toBe(state);
    expect(rng.shuffles).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    const state: DeckState = {
      draw: [],
      hand: [],
      discard: ['1', '2', '3', '4', '5', '6', '7', '8'],
    };
    expect(drawCards(state, 5, createRng(77))).toEqual(drawCards(state, 5, createRng(77)));
  });

  it('never leaves more than HAND_LIMIT cards in hand and never loses a card', () => {
    const cards = Array.from({ length: 12 }, (_, i) => `c${i}`);
    const rng = createRng(20261102);
    let state = createDeck(cards, rng);
    for (let turn = 0; turn < 50; turn++) {
      state = drawCards(state, 5 + (turn % 3), rng);
      expect(state.hand.length).toBeLessThanOrEqual(HAND_LIMIT);
      expect([...state.draw, ...state.hand, ...state.discard].sort()).toEqual([...cards].sort());
      state = endTurn(state);
    }
  });
});

describe('endTurn', () => {
  it('moves the hand to the end of the discard pile, keeping order', () => {
    expect(endTurn({ draw: ['d'], hand: ['a', 'b'], discard: ['x'] })).toEqual({
      draw: ['d'],
      hand: [],
      discard: ['x', 'a', 'b'],
    });
  });

  it('does not modify the input', () => {
    const state: DeckState = { draw: ['a'], hand: ['h'], discard: ['p', 'q'] };
    const before = copy(state);
    drawCards(state, 3, createRng(11));
    endTurn(state);
    expect(state).toEqual(before);
  });
});
