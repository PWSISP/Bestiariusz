// Reference implementation of ember, kept only as an oracle for tests/diff/qwen-vs-reference.test.ts.
// Do not import it from src/. Added AFTER the Qwen task so the model never sees it.
export const EMBER_PER_TURN = 3;

function check(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0)
    throw new RangeError(`${name} must be an integer >= 0, got ${value}`);
}

export function canAfford(ember: number, cost: number): boolean {
  check('ember', ember);
  check('cost', cost);
  return cost <= ember;
}

export function spendEmber(ember: number, cost: number): number {
  if (!canAfford(ember, cost)) throw new RangeError(`Not enough ember: ${ember} < ${cost}`);
  return ember - cost;
}

export function gainEmber(ember: number, amount: number): number {
  check('ember', ember);
  check('amount', amount);
  return ember + amount;
}

export function playableIndexes(
  hand: readonly string[],
  costOf: (cardId: string) => number | null,
  ember: number,
): number[] {
  check('ember', ember);
  const out: number[] = [];
  hand.forEach((id, i) => {
    const cost = costOf(id);
    if (cost !== null && canAfford(ember, cost)) out.push(i);
  });
  return out;
}
