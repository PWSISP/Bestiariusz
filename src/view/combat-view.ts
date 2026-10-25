// View model of the combat screen (S04-01): everything the screen shows, derived from the combat
// state, the game data and the one piece of UI state (which hand card is selected). Pure: it returns
// numbers and TextRefs (i18n keys + parameters), never texts, and never touches the DOM or PixiJS.
import { buildCreature } from '../core/combat/creature.ts';
import { EMBER_PER_TURN } from '../core/combat/ember.ts';
import { effectsOf } from '../core/combat/effects.ts';
import type { EnemyAction } from '../core/combat/enemy-turn.ts';
import type { CardDef, CombatData, CombatState, Effect } from '../core/combat/model.ts';
import { statRules } from '../core/combat/reducer.ts';
import { detectRitual } from '../core/combat/ritual.ts';
import { describeLegend } from '../core/legend.ts';
import type { CreatureEffectDef, CreatureSpec, ElementId } from '../core/types.ts';
import { SPECIAL_LEGENDS } from '../data/legends.ts';
import { text } from './text.ts';
import type { TextRef } from './text.ts';

export type CardKind = 'creature' | 'spell' | 'curse';
export type BlockedReason = 'not_enough_ember' | 'unplayable';

export interface CreatureDetails {
  /** "Wilk Ognia": the name of the creature as the player reads it. */
  readonly title: TextRef;
  readonly element: ElementId;
  readonly form: string;
  readonly trait: string;
  readonly attack: number;
  readonly health: number;
  readonly maxHealth: number;
  /** One sentence of legend (S03-04b). */
  readonly legend: TextRef;
  /** One line per effect of the creature's symbols. */
  readonly effects: readonly TextRef[];
}

export interface CardView {
  readonly handIndex: number;
  readonly cardId: string;
  readonly kind: CardKind;
  /** null for a curse. */
  readonly cost: number | null;
  /** Enough Ember and not a curse. */
  readonly playable: boolean;
  readonly blocked: BlockedReason | null;
  readonly selected: boolean;
  /** Element of the card (creature element or spell element), for the icon; null = none. */
  readonly element: ElementId | null;
  readonly title: TextRef;
  readonly subtitle: TextRef | null;
  readonly creature: CreatureDetails | null;
  /** Spell effects, one line each. */
  readonly lines: readonly TextRef[];
  /** The accessible name of the card button. */
  readonly label: TextRef;
}

export interface CircleView {
  readonly index: number;
  readonly creature: CreatureDetails | null;
  /** A selected, playable creature card can go here. */
  readonly dropTarget: boolean;
  /** The element of the ritual this card would complete if placed here; null = none. */
  readonly ritualCompletes: ElementId | null;
  /** The enemy's shown intent is a curse aimed at this circle. */
  readonly cursed: boolean;
  /** The accessible name of the circle button. */
  readonly label: TextRef;
}

export type IntentKind = 'attack' | 'multi' | 'shield' | 'curse' | 'steal';

export interface IntentChip {
  readonly kind: IntentKind;
  readonly amount: number;
  readonly times: number;
  /** The hit skips the circles and lands on the player. */
  readonly direct: boolean;
  /** 0-based circle for a curse, otherwise null. */
  readonly circle: number | null;
  readonly label: TextRef;
}

export interface IntentView {
  readonly actionId: string;
  readonly name: TextRef;
  readonly chips: readonly IntentChip[];
  /** Total damage of all attacks of the intent. */
  readonly damage: number;
}

export interface CombatView {
  readonly turn: number;
  readonly phase: CombatState['phase'];
  readonly enemy: {
    readonly id: string;
    readonly name: TextRef;
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    readonly resist: readonly ElementId[];
    readonly weak: readonly ElementId[];
  };
  readonly intent: IntentView;
  readonly player: {
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    readonly curses: number;
  };
  readonly ember: { readonly current: number; readonly perTurn: number };
  readonly piles: { readonly draw: number; readonly discard: number };
  readonly ritualUsed: boolean;
  readonly circles: readonly CircleView[];
  readonly hand: readonly CardView[];
}

function cardOf(data: CombatData, id: string): CardDef {
  const card = Object.hasOwn(data.cards, id) ? data.cards[id] : undefined;
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

/** The name of a card as the player reads it ("Wilk Ognia", "Uderzenie"). */
export function cardTitle(data: CombatData, cardId: string): TextRef {
  const card = cardOf(data, cardId);
  return card.kind === 'creature' ? creatureTitle(card.creature) : text(`card.${card.id}.name`);
}

function creatureTitle(spec: CreatureSpec): TextRef {
  return text('card.title.creature', {
    form: text(`symbol.form.${spec.form}.name`),
    element: text(`symbol.element.${spec.element}.of`),
  });
}

function legendOf(data: CombatData, spec: CreatureSpec): TextRef {
  const legend = describeLegend(data.symbols, spec, SPECIAL_LEGENDS);
  if (legend.parts === null) return text(legend.key);
  return text(legend.key, {
    adjective: text(legend.parts.adjective),
    form: text(legend.parts.form),
    element: text(legend.parts.element),
  });
}

function creatureEffectLine(def: CreatureEffectDef): TextRef {
  const op = text(`fx.op.${def.op}${def.pierce ? '.pierce' : ''}`, { amount: def.amount });
  const when = text(`fx.when.${def.trigger}`);
  return def.scope === 'self'
    ? text('fx.line', { when, what: op })
    : text('fx.line.scoped', { when, what: op, scope: text(`fx.scope.${def.scope}`) });
}

function spellLine(effect: Effect): TextRef {
  switch (effect.kind) {
    case 'damage':
      return text(effect.pierce ? 'fx.damage.pierce' : 'fx.damage', { amount: effect.amount });
    case 'block':
      return text('fx.block', { amount: effect.amount });
    case 'heal':
      return text('fx.heal', { amount: effect.amount });
    case 'draw':
      return text('fx.draw', { count: effect.count });
    case 'ember':
      return text('fx.ember', { amount: effect.amount });
  }
}

function details(
  data: CombatData,
  spec: CreatureSpec,
  stats: { attack: number; health: number; maxHealth: number },
): CreatureDetails {
  return {
    title: creatureTitle(spec),
    element: spec.element,
    form: spec.form,
    trait: spec.trait,
    attack: stats.attack,
    health: stats.health,
    maxHealth: stats.maxHealth,
    legend: legendOf(data, spec),
    effects: effectsOf(data.symbols, spec).map(creatureEffectLine),
  };
}

function cardView(
  state: CombatState,
  data: CombatData,
  handIndex: number,
  selected: boolean,
): CardView {
  const cardId = state.deck.hand[handIndex] as string;
  const card = cardOf(data, cardId);
  const inPlay = state.phase === 'player';
  if (card.kind === 'curse') {
    const title = text(`card.${card.id}.name`);
    return {
      handIndex,
      cardId,
      kind: 'curse',
      cost: null,
      playable: false,
      blocked: 'unplayable',
      selected,
      element: null,
      title,
      subtitle: null,
      creature: null,
      lines: [text('card.curse.text')],
      label: text('card.a11y.curse', { title }),
    };
  }
  const affordable = card.cost <= state.ember;
  const playable = inPlay && affordable;
  const blocked: BlockedReason | null = playable ? null : 'not_enough_ember';
  if (card.kind === 'spell') {
    const title = text(`card.${card.id}.name`);
    return {
      handIndex,
      cardId,
      kind: 'spell',
      cost: card.cost,
      playable,
      blocked,
      selected,
      element: card.element,
      title,
      subtitle: null,
      creature: null,
      lines: card.effects.map(spellLine),
      label: text('card.a11y.spell', { title, cost: card.cost }),
    };
  }
  const creature = buildCreature(data.symbols, card.id, card.creature, statRules(data.balance));
  const title = creatureTitle(card.creature);
  return {
    handIndex,
    cardId,
    kind: 'creature',
    cost: card.cost,
    playable,
    blocked,
    selected,
    element: card.creature.element,
    title,
    subtitle: text(`symbol.trait.${card.creature.trait}.name`),
    creature: details(data, card.creature, creature),
    lines: [],
    label: text('card.a11y.creature', {
      title,
      cost: card.cost,
      attack: creature.attack,
      health: creature.health,
    }),
  };
}

function chipOf(action: EnemyAction): IntentChip {
  switch (action.type) {
    case 'atak':
      return {
        kind: 'attack',
        amount: action.amount,
        times: 1,
        direct: action.direct === true,
        circle: null,
        label: text(action.direct ? 'intent.attack.direct' : 'intent.attack', {
          amount: action.amount,
        }),
      };
    case 'wielokrotny':
      return {
        kind: 'multi',
        amount: action.amount,
        times: action.times,
        direct: action.direct === true,
        circle: null,
        label: text(action.direct ? 'intent.multi.direct' : 'intent.multi', {
          amount: action.amount,
          times: action.times,
        }),
      };
    case 'tarcza':
      return {
        kind: 'shield',
        amount: action.amount,
        times: 1,
        direct: false,
        circle: null,
        label: text('intent.shield', { amount: action.amount }),
      };
    case 'klatwa':
      return {
        kind: 'curse',
        amount: 0,
        times: 1,
        direct: false,
        circle: action.circle,
        label: text('intent.curse', { circle: action.circle + 1 }),
      };
    case 'kradziez':
      return {
        kind: 'steal',
        amount: 0,
        times: 1,
        direct: false,
        circle: null,
        label: text('intent.steal'),
      };
  }
}

function intentView(state: CombatState): IntentView {
  const chips = state.intent.actions.map(chipOf);
  const damage = chips.reduce(
    (sum, chip) =>
      sum + (chip.kind === 'attack' || chip.kind === 'multi' ? chip.amount * chip.times : 0),
    0,
  );
  return {
    actionId: state.intent.actionId,
    name: text(`enemy.${state.enemy.id}.action.${state.intent.actionId}`),
    chips,
    damage,
  };
}

/**
 * Builds the view of a combat state. `selectedHandIndex` is the UI selection (null = none); a
 * selection that no longer points at a card is ignored.
 */
export function buildCombatView(
  state: CombatState,
  data: CombatData,
  selectedHandIndex: number | null = null,
): CombatView {
  const hand = state.deck.hand.map((_, i) => cardView(state, data, i, i === selectedHandIndex));
  const selected = selectedHandIndex === null ? undefined : hand[selectedHandIndex];
  const placing = selected && selected.kind === 'creature' && selected.playable ? selected : null;
  const allElements = data.symbols.elements.map((e) => e.id);
  const cursedCircle = state.intent.actions.find((a) => a.type === 'klatwa')?.circle ?? null;

  const circles: CircleView[] = state.player.circles.map((creature, index) => {
    let ritualCompletes: ElementId | null = null;
    if (placing && creature === null && placing.creature) {
      const placed = state.player.circles.map((c, i) =>
        i === index ? { element: placing.creature!.element } : c ? { element: c.element } : null,
      );
      ritualCompletes = detectRitual(placed, state.ritualUsed ? allElements : []);
    }
    const spec: CreatureSpec | null = creature
      ? { element: creature.element, form: creature.form, trait: creature.trait }
      : null;
    return {
      index,
      creature: creature && spec ? details(data, spec, creature) : null,
      dropTarget: placing !== null && creature === null,
      ritualCompletes,
      cursed: cursedCircle === index,
      label:
        creature && spec
          ? text('circle.a11y.occupied', {
              n: index + 1,
              title: creatureTitle(spec),
              attack: creature.attack,
              health: creature.health,
            })
          : text('circle.a11y.empty', { n: index + 1 }),
    };
  });

  return {
    turn: state.turn,
    phase: state.phase,
    enemy: {
      id: state.enemy.id,
      name: text(`enemy.${state.enemy.id}.name`),
      hp: state.enemy.hp,
      maxHp: state.enemy.maxHp,
      block: state.enemy.block,
      resist: state.enemy.resist,
      weak: state.enemy.weak,
    },
    intent: intentView(state),
    player: {
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      block: state.player.block,
      curses: state.player.curses,
    },
    ember: { current: state.ember, perTurn: EMBER_PER_TURN },
    piles: { draw: state.deck.draw.length, discard: state.deck.discard.length },
    ritualUsed: state.ritualUsed,
    circles,
    hand,
  };
}
