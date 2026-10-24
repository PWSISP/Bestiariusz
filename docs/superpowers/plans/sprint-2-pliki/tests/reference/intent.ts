// Reference implementation of intent, kept only as an oracle for tests/diff/qwen-vs-reference.test.ts.
// Do not import it from src/. Added AFTER the Qwen task so the model never sees it.

export type ConditionKind = 'playerHandAtMost' | 'bossHpBelowPct' | 'playerCirclesAtLeast';

export interface Condition {
  when: ConditionKind;
  value: number;
  bonus: number;
}

export interface BossAction {
  id: string;
  baseWeight: number;
  conditions?: readonly Condition[];
  cooldown?: number;
}

export interface IntentContext {
  playerHand: number;
  bossHp: number;
  bossMaxHp: number;
  playerCircles: number;
  history: readonly string[];
}

function holds(c: Condition, ctx: IntentContext): boolean {
  switch (c.when) {
    case 'playerHandAtMost': return ctx.playerHand <= c.value;
    case 'bossHpBelowPct': return (ctx.bossHp / ctx.bossMaxHp) * 100 < c.value;
    case 'playerCirclesAtLeast': return ctx.playerCircles >= c.value;
  }
}

export function chooseIntent(actions: readonly BossAction[], ctx: IntentContext): string {
  if (actions.length === 0) throw new Error('Boss has no actions');
  const h = ctx.history;
  const lastTwoSame = (id: string) => h.length >= 2 && h[h.length - 1] === id && h[h.length - 2] === id;
  let best: BossAction | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    const cd = a.cooldown ?? 0;
    if (cd > 0 && h.slice(-cd).includes(a.id)) continue;
    if (lastTwoSame(a.id)) continue;
    const score = a.baseWeight + (a.conditions ?? []).reduce((s, c) => s + (holds(c, ctx) ? c.bonus : 0), 0);
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return (best ?? (actions[0] as BossAction)).id;
}
