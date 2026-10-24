/** Ember (Żar) a player gets at the start of every turn. */
export const EMBER_PER_TURN = 3;

function validateNumber(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || !Number.isFinite(value)) {
    throw new RangeError(`Invalid ${name}: must be a non-negative integer`);
  }
}

export function canAfford(ember: number, cost: number): boolean {
  validateNumber(ember, 'ember');
  validateNumber(cost, 'cost');
  return cost <= ember;
}

export function spendEmber(ember: number, cost: number): number {
  validateNumber(ember, 'ember');
  validateNumber(cost, 'cost');
  if (cost > ember) {
    throw new RangeError('Not enough ember to spend');
  }
  return ember - cost;
}

export function gainEmber(ember: number, amount: number): number {
  validateNumber(ember, 'ember');
  validateNumber(amount, 'amount');
  return ember + amount;
}

/** Indexes of the cards in `hand` that can be played now; a card whose cost is null is never playable. */
export function playableIndexes(
  hand: readonly string[],
  costOf: (cardId: string) => number | null,
  ember: number,
): number[] {
  validateNumber(ember, 'ember');
  const result: number[] = [];
  for (let i = 0; i < hand.length; i++) {
    const cardId = hand[i];
    const cost = costOf(cardId);
    if (cost !== null && canAfford(ember, cost)) {
      result.push(i);
    }
  }
  return result;
}
