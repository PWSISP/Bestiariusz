import type { ElementId } from '../types.ts';

export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  resist: readonly ElementId[];
  weak: readonly ElementId[];
}

export interface Hit {
  amount: number;
  /** null = no element: resistances and weaknesses do not apply. */
  element: ElementId | null;
  /** true = the hit ignores block. */
  pierce?: boolean;
}

export interface DamageResult {
  /** A new object; the input is never modified. */
  target: Combatant;
  blocked: number;
  dealt: number;
  overkill: number;
  killed: boolean;
}

export function applyDamage(target: Combatant, hit: Hit): DamageResult {
  // Step 1: If hit.amount <= 0, nothing happens
  if (hit.amount <= 0) {
    return {
      target: { ...target },
      blocked: 0,
      dealt: 0,
      overkill: 0,
      killed: false,
    };
  }

  // Step 2: Element modifier
  let amount = hit.amount;
  if (hit.element !== null) {
    const hasResist = target.resist.includes(hit.element);
    const hasWeak = target.weak.includes(hit.element);

    if (hasResist && !hasWeak) {
      // Element in resist and not in weak: amount = Math.floor(amount * 0.5)
      amount = Math.floor(amount * 0.5);
    } else if (hasWeak && !hasResist) {
      // Element in weak and not in resist: amount = Math.floor(amount * 1.5)
      amount = Math.floor(amount * 1.5);
    }
    // If in both or neither, amount remains unchanged
  }

  // Step 3: Block absorption
  let blocked = 0;
  if (hit.pierce !== true) {
    // Block absorbs first
    blocked = Math.min(target.block, amount);
    amount -= blocked;
  }

  // Step 4: Health damage
  const dealt = Math.min(amount, target.hp);
  const overkill = amount - dealt;

  // Step 5: Determine if killed
  const killed = target.hp > 0 && target.hp - dealt <= 0;

  // Return new target object with updated values
  const newTarget = {
    ...target,
    hp: target.hp - dealt,
    block: hit.pierce === true ? target.block : target.block - blocked,
  };

  return {
    target: newTarget,
    blocked,
    dealt,
    overkill,
    killed,
  };
}
