import type { CombatAction, CombatEnv, CombatState } from '../combat/model.ts';
import { legalActions } from '../combat/reducer.ts';

/**
 * A greedy test player, deliberately simple and deterministic: it scores every legal action and
 * takes the best one; it ends the turn when nothing scores above zero.
 */
export function chooseBotAction(state: CombatState, env: CombatEnv): CombatAction {
  const incoming = state.intent.actions.reduce(
    (sum, a) =>
      sum + (a.type === 'atak' ? a.amount : a.type === 'wielokrotny' ? a.amount * a.times : 0),
    0,
  );
  const circles = state.player.circles;
  const standing = circles.filter((c) => c !== null).length;
  let best: CombatAction = { type: 'endTurn' };
  let bestScore = 0;

  for (const action of legalActions(state, env)) {
    if (action.type !== 'playCard') continue;
    const card = env.data.cards[state.deck.hand[action.handIndex] as string];
    if (!card) continue;
    let score = 0;
    if (card.kind === 'creature') {
      const element = card.creature.element;
      const matching = circles.filter(
        (c) => c && (c.element === element || c.element === 'wiatr' || element === 'wiatr'),
      ).length;
      const completesRitual = !state.ritualUsed && standing === 2 && matching === 2;
      score = 10 + 4 * matching + (completesRitual ? 30 : 0) - (action.circle ?? 0) * 0.01;
    } else if (card.kind === 'spell') {
      for (const fx of card.effects) {
        if (fx.kind === 'damage')
          score += 6 + fx.amount * 0.5 + (fx.amount >= state.enemy.hp ? 100 : 0);
        if (fx.kind === 'block') score += standing === 0 && incoming > state.player.block ? 8 : 1;
      }
    }
    if (score > bestScore) {
      best = action;
      bestScore = score;
    }
  }
  return best;
}
