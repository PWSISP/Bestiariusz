// What a screen reader is told after an action (S04-01): one short sentence per important event, as text
// references for the live region. Pure; the screen translates and writes them into the page.
import type { CombatData, CombatEvent, CombatState } from '../core/combat/model.ts';
import { cardTitle } from './combat-view.ts';
import { text } from './text.ts';
import type { TextRef } from './text.ts';

/** `state` is the state after the events; it names the new intent when a turn starts. */
export function announceEvents(
  events: readonly CombatEvent[],
  state: CombatState,
  data: CombatData,
): TextRef[] {
  const lines: TextRef[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'turn_started':
        lines.push(
          text('live.turn', {
            turn: event.turn,
            intent: text(`enemy.${state.enemy.id}.action.${event.intentId}`),
          }),
        );
        break;
      case 'creature_summoned':
        lines.push(
          text('live.summoned', { title: cardTitle(data, event.cardId), n: event.circle + 1 }),
        );
        break;
      case 'enemy_damaged':
        if (event.dealt > 0) lines.push(text('live.enemyHit', { amount: event.dealt }));
        break;
      case 'player_damaged':
        if (event.amount > 0) lines.push(text('live.playerHit', { amount: event.amount }));
        break;
      case 'creature_died':
        lines.push(text('live.creatureDied', { n: event.circle + 1 }));
        break;
      case 'ritual':
        lines.push(text('live.ritual', { element: text(`symbol.element.${event.element}.name`) }));
        break;
      case 'combat_won':
        lines.push(text('live.won'));
        break;
      case 'combat_lost':
        lines.push(text('live.lost'));
        break;
      case 'card_played':
      case 'enemy_acted':
      case 'effect':
      case 'rejected':
        break;
    }
  }
  return lines;
}
