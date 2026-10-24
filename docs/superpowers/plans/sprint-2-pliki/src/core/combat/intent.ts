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
  /** The action cannot be chosen again within this many turns after it was used. */
  cooldown?: number;
}

export interface IntentContext {
  playerHand: number;
  bossHp: number;
  bossMaxHp: number;
  playerCircles: number;
  /** Ids of earlier actions, oldest first. */
  history: readonly string[];
}

export function chooseIntent(_actions: readonly BossAction[], _ctx: IntentContext): string {
  throw new Error('Not implemented');
}
