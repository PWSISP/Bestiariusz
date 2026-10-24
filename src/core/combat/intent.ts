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

export function chooseIntent(actions: readonly BossAction[], ctx: IntentContext): string {
  if (actions.length === 0) {
    throw new Error();
  }

  // Check if an action is excluded based on cooldown and history
  const isExcluded = (action: BossAction): boolean => {
    // Check cooldown - if action has cooldown and its id appears in recent history
    if (action.cooldown !== undefined && action.cooldown > 0) {
      const recentHistory = ctx.history.slice(-action.cooldown);
      if (recentHistory.includes(action.id)) {
        return true;
      }
    }

    // Check no three times in a row - if last two entries are the same as this action
    if (ctx.history.length >= 2) {
      const lastIndex = ctx.history.length - 1;
      const secondLastIndex = ctx.history.length - 2;
      if (ctx.history[lastIndex] === action.id && ctx.history[secondLastIndex] === action.id) {
        return true;
      }
    }

    return false;
  };

  // Calculate score for an action
  const calculateScore = (action: BossAction): number => {
    let score = action.baseWeight || 0;

    if (action.conditions?.length) {
      for (const condition of action.conditions) {
        if (condition.when === 'playerHandAtMost') {
          if (ctx.playerHand <= condition.value) {
            score += condition.bonus;
          }
        } else if (condition.when === 'bossHpBelowPct') {
          const pct = (ctx.bossHp / ctx.bossMaxHp) * 100;
          if (pct < condition.value) {
            // Strictly less
            score += condition.bonus;
          }
        } else if (condition.when === 'playerCirclesAtLeast') {
          if (ctx.playerCircles >= condition.value) {
            score += condition.bonus;
          }
        }
      }
    }

    return score;
  };

  // Filter out excluded actions
  const availableActions = actions.filter((action) => !isExcluded(action));

  // If all actions are excluded, return the first action
  if (availableActions.length === 0) {
    return actions[0].id;
  }

  // Find the action with highest score, with tie-breaking to first in list
  let bestAction = availableActions[0];
  let bestScore = calculateScore(bestAction);

  for (let i = 1; i < availableActions.length; i++) {
    const action = availableActions[i];
    const score = calculateScore(action);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction.id;
}
