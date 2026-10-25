// What the reward and Workshop screens show of one card (S06). Pure: TextRefs and numbers only.
import { buildCreature } from '../core/combat/creature.ts';
import { effectsOf } from '../core/combat/effects.ts';
import type { CombatData } from '../core/combat/model.ts';
import { statRules } from '../core/combat/reducer.ts';
import { cardTitle, creatureEffectLine, spellLine } from './combat-view.ts';
import { text } from './text.ts';
import type { TextRef } from './text.ts';

export interface CardInfo {
  readonly cardId: string;
  readonly kind: 'creature' | 'spell' | 'curse';
  readonly title: TextRef;
  readonly cost: number | null;
  readonly element: string | null;
  /** "3/5" for a creature; null for the others. */
  readonly stats: { readonly attack: number; readonly health: number } | null;
  /** One line per effect. */
  readonly lines: readonly TextRef[];
}

/** Throws an Error for an id that is not in `data.cards`. */
export function describeCard(data: CombatData, cardId: string): CardInfo {
  const card = Object.hasOwn(data.cards, cardId) ? data.cards[cardId] : undefined;
  if (!card) throw new Error(`Unknown card: ${cardId}`);
  const title = cardTitle(data, cardId);
  if (card.kind === 'curse') {
    return {
      cardId,
      kind: 'curse',
      title,
      cost: null,
      element: null,
      stats: null,
      lines: [text('card.curse.text')],
    };
  }
  if (card.kind === 'spell') {
    return {
      cardId,
      kind: 'spell',
      title,
      cost: card.cost,
      element: card.element,
      stats: null,
      lines: card.effects.map(spellLine),
    };
  }
  const built = buildCreature(data.symbols, card.id, card.creature, statRules(data.balance));
  return {
    cardId,
    kind: 'creature',
    title,
    cost: card.cost,
    element: card.creature.element,
    stats: { attack: built.attack, health: built.health },
    lines: effectsOf(data.symbols, card.creature).map(creatureEffectLine),
  };
}
