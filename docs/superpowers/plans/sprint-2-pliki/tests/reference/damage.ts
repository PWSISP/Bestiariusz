// Reference implementation of damage, kept only as an oracle for tests/diff/qwen-vs-reference.test.ts.
// Do not import it from src/. Added AFTER the Qwen task so the model never sees it.

import type { ElementId } from '../../src/core/types.ts';

export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  resist: readonly ElementId[];
  weak: readonly ElementId[];
}

export interface Hit {
  amount: number;
  element: ElementId | null;
  pierce?: boolean;
}

export interface DamageResult {
  target: Combatant;
  blocked: number;
  dealt: number;
  overkill: number;
  killed: boolean;
}

export function applyDamage(target: Combatant, hit: Hit): DamageResult {
  if (hit.amount <= 0) {
    return { target: { ...target }, blocked: 0, dealt: 0, overkill: 0, killed: false };
  }
  let amount = hit.amount;
  if (hit.element !== null) {
    const r = target.resist.includes(hit.element);
    const w = target.weak.includes(hit.element);
    if (r && !w) amount = Math.floor(amount * 0.5);
    else if (w && !r) amount = Math.floor(amount * 1.5);
  }
  let block = target.block;
  let blocked = 0;
  if (hit.pierce !== true) {
    blocked = Math.min(block, amount);
    block -= blocked;
    amount -= blocked;
  }
  const dealt = Math.min(amount, target.hp);
  const hp = target.hp - dealt;
  return {
    target: { ...target, hp, block },
    blocked,
    dealt,
    overkill: amount - dealt,
    killed: target.hp > 0 && hp === 0,
  };
}
