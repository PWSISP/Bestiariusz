/** Ember (Żar) a player gets at the start of every turn. */
export const EMBER_PER_TURN = 3;

export function canAfford(_ember: number, _cost: number): boolean {
  throw new Error('Not implemented');
}

export function spendEmber(_ember: number, _cost: number): number {
  throw new Error('Not implemented');
}

export function gainEmber(_ember: number, _amount: number): number {
  throw new Error('Not implemented');
}

/** Indexes of the cards in `hand` that can be played now; a card whose cost is null is never playable. */
export function playableIndexes(
  _hand: readonly string[],
  _costOf: (cardId: string) => number | null,
  _ember: number,
): number[] {
  throw new Error('Not implemented');
}
