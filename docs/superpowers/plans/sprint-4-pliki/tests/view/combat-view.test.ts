import { describe, expect, it } from 'vitest';
import { reduce } from '../../src/core/combat/reducer.ts';
import type { CombatState, Creature } from '../../src/core/combat/model.ts';
import { buildCombatView } from '../../src/view/combat-view.ts';
import type { CombatView } from '../../src/view/combat-view.ts';
import type { TextRef } from '../../src/view/text.ts';
import { data, missingKeys, playWithBot, start } from './support.ts';

function allRefs(view: CombatView): TextRef[] {
  const refs: TextRef[] = [view.enemy.name, view.intent.name, ...view.intent.chips.map((c) => c.label)];
  for (const card of view.hand) {
    refs.push(card.title, card.label, ...card.lines);
    if (card.subtitle) refs.push(card.subtitle);
    if (card.creature) refs.push(card.creature.legend, ...card.creature.effects);
  }
  for (const circle of view.circles) {
    refs.push(circle.label);
    if (circle.creature) refs.push(circle.creature.legend, ...circle.creature.effects);
  }
  return refs;
}

const creature = (cardId: string, element: string, form: string, trait: string, attack = 3, health = 5): Creature => ({
  cardId,
  element,
  form,
  trait,
  attack,
  health,
  maxHealth: health,
});

describe('buildCombatView: the opening state', () => {
  const { state } = start();
  const view = buildCombatView(state, data);

  it('mirrors the numbers of the state', () => {
    expect(view.turn).toBe(1);
    expect(view.phase).toBe('player');
    expect(view.player).toEqual({ hp: 40, maxHp: 40, block: 0, curses: 0 });
    expect(view.enemy.hp).toBe(380);
    expect(view.enemy.maxHp).toBe(380);
    expect(view.ember).toEqual({ current: 3, perTurn: 3 });
    expect(view.piles).toEqual({ draw: 7, discard: 0 });
    expect(view.hand).toHaveLength(5);
    expect(view.circles).toHaveLength(3);
    expect(view.circles.every((c) => c.creature === null && !c.dropTarget && !c.cursed)).toBe(true);
    expect(view.ritualUsed).toBe(false);
  });

  it('lists the hand in order with kind, cost and playability', () => {
    expect(view.hand.map((c) => c.handIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(view.hand.map((c) => c.cardId)).toEqual(state.deck.hand);
    for (const card of view.hand) {
      expect(card.selected).toBe(false);
      expect(card.playable).toBe(true);
      expect(card.blocked).toBeNull();
    }
  });

  it('shows the intent of the enemy with its chips', () => {
    expect(view.intent.actionId).toBe(state.intent.actionId);
    expect(view.intent.chips.length).toBe(state.intent.actions.length);
    expect(view.intent.name.key).toBe(`enemy.leszy.action.${state.intent.actionId}`);
  });
});

describe('cards', () => {
  it('describes a creature card with the stats the reducer will give the creature', () => {
    let checked = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const { state, env } = start(seed);
      const view = buildCombatView(state, data);
      state.deck.hand.forEach((id, handIndex) => {
        const card = data.cards[id];
        if (card?.kind !== 'creature') return;
        const placed = reduce(state, { type: 'playCard', handIndex, circle: 0 }, env).state.player.circles[0];
        const shown = view.hand[handIndex]?.creature;
        expect(placed).not.toBeNull();
        expect(shown?.attack).toBe((placed as Creature).attack);
        expect(shown?.health).toBe((placed as Creature).health);
        expect(shown?.maxHealth).toBe((placed as Creature).maxHealth);
        checked += 1;
      });
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('builds the title from the form and the genitive of the element', () => {
    const { state } = start();
    const withWolf: CombatState = {
      ...state,
      deck: { ...state.deck, hand: ['ogien-wilk-smutek', 'uderzenie', 'klatwa'] },
    };
    const [wolf, strike, curse] = buildCombatView(withWolf, data).hand;
    expect(wolf?.title).toEqual({
      key: 'card.title.creature',
      params: {
        form: { key: 'symbol.form.wilk.name' },
        element: { key: 'symbol.element.ogien.of' },
      },
    });
    expect(wolf?.subtitle).toEqual({ key: 'symbol.trait.smutek.name' });
    expect(wolf?.element).toBe('ogien');
    expect(strike?.title.key).toBe('card.uderzenie.name');
    expect(strike?.lines).toEqual([{ key: 'fx.damage', params: { amount: 6 } }]);
    expect(curse?.kind).toBe('curse');
    expect(curse?.cost).toBeNull();
    expect(curse?.playable).toBe(false);
    expect(curse?.blocked).toBe('unplayable');
  });

  it('marks a card as blocked when the Ember is too low, and spares the cheap ones', () => {
    const { state } = start();
    const poor: CombatState = {
      ...state,
      ember: 1,
      deck: { ...state.deck, hand: ['plomien', 'uderzenie', 'ogien-wilk-smutek'] },
    };
    const [flame, strike, wolf] = buildCombatView(poor, data).hand;
    expect([flame?.playable, strike?.playable, wolf?.playable]).toEqual([false, true, false]);
    expect([flame?.blocked, strike?.blocked, wolf?.blocked]).toEqual([
      'not_enough_ember',
      null,
      'not_enough_ember',
    ]);
  });

  it('makes nothing playable once the combat is over', () => {
    const { state } = start();
    const over = buildCombatView({ ...state, phase: 'won' }, data);
    expect(over.hand.every((c) => !c.playable)).toBe(true);
  });

  it('writes one line per effect of a creature, with the scope when there is one', () => {
    const { state } = start();
    const board: CombatState = {
      ...state,
      deck: { ...state.deck, hand: ['ogien-kruk-odwaga'] },
    };
    const lines = buildCombatView(board, data).hand[0]?.creature?.effects ?? [];
    expect(lines).toEqual([
      {
        key: 'fx.line.scoped',
        params: {
          when: { key: 'fx.when.attack' },
          what: { key: 'fx.op.strike.pierce', params: { amount: 1 } },
          scope: { key: 'fx.scope.sameElementOthers' },
        },
      },
      {
        key: 'fx.line',
        params: { when: { key: 'fx.when.attack' }, what: { key: 'fx.op.strike.pierce', params: { amount: 1 } } },
      },
    ]);
  });
});

describe('selection and drop targets', () => {
  const { state } = start();
  const hand: CombatState = {
    ...state,
    player: {
      ...state.player,
      circles: [creature('c0', 'ogien', 'wilk', 'gniew'), null, null],
    },
    deck: { ...state.deck, hand: ['ogien-kruk-odwaga', 'uderzenie', 'plomien'] },
  };

  it('marks the selected card and nothing else', () => {
    const view = buildCombatView(hand, data, 1);
    expect(view.hand.map((c) => c.selected)).toEqual([false, true, false]);
  });

  it('highlights the free circles for a selected creature card only', () => {
    const creatureSelected = buildCombatView(hand, data, 0);
    expect(creatureSelected.circles.map((c) => c.dropTarget)).toEqual([false, true, true]);
    const spellSelected = buildCombatView(hand, data, 1);
    expect(spellSelected.circles.every((c) => !c.dropTarget)).toBe(true);
    const nothing = buildCombatView(hand, data, null);
    expect(nothing.circles.every((c) => !c.dropTarget)).toBe(true);
  });

  it('does not highlight circles for a creature the player cannot afford', () => {
    const view = buildCombatView({ ...hand, ember: 0 }, data, 0);
    expect(view.circles.every((c) => !c.dropTarget)).toBe(true);
  });

  it('ignores a selection that points at no card', () => {
    const view = buildCombatView(hand, data, 9);
    expect(view.hand.every((c) => !c.selected)).toBe(true);
    expect(view.circles.every((c) => !c.dropTarget)).toBe(true);
  });

  it('announces the ritual a creature would complete', () => {
    const two: CombatState = {
      ...hand,
      player: {
        ...hand.player,
        circles: [
          creature('a', 'ogien', 'wilk', 'gniew'),
          creature('b', 'wiatr', 'kruk', 'spryt'),
          null,
        ],
      },
    };
    const view = buildCombatView(two, data, 0);
    expect(view.circles[2]?.ritualCompletes).toBe('ogien');
    expect(view.circles[0]?.ritualCompletes).toBeNull();
    const used = buildCombatView({ ...two, ritualUsed: true }, data, 0);
    expect(used.circles[2]?.ritualCompletes).toBeNull();
    const other = buildCombatView({ ...two, deck: { ...two.deck, hand: ['woda-sowa-odwaga'] } }, data, 0);
    expect(other.circles[2]?.ritualCompletes).toBeNull();
  });
});

describe('intent', () => {
  const { state } = start();
  const withIntent = (actionId: string, actions: CombatState['intent']['actions']): CombatState => ({
    ...state,
    intent: { actionId, actions },
  });

  it('sums the damage of all attacks', () => {
    const claws = buildCombatView(withIntent('szpony', [{ type: 'wielokrotny', amount: 4, times: 3 }]), data);
    expect(claws.intent.damage).toBe(12);
    expect(claws.intent.chips[0]).toMatchObject({ kind: 'multi', amount: 4, times: 3, direct: false });
    const blow = buildCombatView(withIntent('cios', [{ type: 'atak', amount: 12, direct: true }]), data);
    expect(blow.intent.damage).toBe(12);
    expect(blow.intent.chips[0]).toMatchObject({ kind: 'attack', direct: true });
    expect(blow.intent.chips[0]?.label.key).toBe('intent.attack.direct');
  });

  it('shows a shield without damage and a curse with its circle, and marks the cursed circle', () => {
    const thicket = buildCombatView(withIntent('gaszcz', [{ type: 'tarcza', amount: 10 }]), data);
    expect(thicket.intent.damage).toBe(0);
    expect(thicket.intent.chips[0]?.kind).toBe('shield');
    const feint = buildCombatView(
      withIntent('zwod', [{ type: 'klatwa', circle: 1 }, { type: 'atak', amount: 4 }]),
      data,
    );
    expect(feint.intent.damage).toBe(4);
    expect(feint.intent.chips.map((c) => c.kind)).toEqual(['curse', 'attack']);
    expect(feint.intent.chips[0]).toMatchObject({ circle: 1, label: { key: 'intent.curse', params: { circle: 2 } } });
    expect(feint.circles.map((c) => c.cursed)).toEqual([false, true, false]);
  });

  it('shows a theft', () => {
    const view = buildCombatView(withIntent('x', [{ type: 'kradziez' }]), data);
    expect(view.intent.chips[0]?.kind).toBe('steal');
  });
});

describe('purity', () => {
  it('does not change the state and returns equal views for equal input', () => {
    const { state } = start();
    const frozen = JSON.parse(JSON.stringify(state)) as CombatState;
    const a = buildCombatView(state, data, 2);
    const b = buildCombatView(state, data, 2);
    expect(a).toEqual(b);
    expect(state).toEqual(frozen);
  });
});

describe('every text the view asks for exists in both language files', () => {
  it('holds in all states of 40 bot-played combats', () => {
    const missing = new Set<string>();
    let states = 0;
    for (let seed = 1; seed <= 40; seed++) {
      playWithBot(seed, (before) => {
        states += 1;
        for (const selected of [null, 0, 2]) {
          for (const ref of allRefs(buildCombatView(before, data, selected))) {
            for (const key of missingKeys(ref)) missing.add(key);
          }
        }
      });
    }
    expect(states).toBeGreaterThan(500);
    expect([...missing]).toEqual([]);
  });

  it('holds for every card in the data and every effect in the symbols', () => {
    const { state } = start();
    const ids = Object.keys(data.cards);
    const all: CombatState = { ...state, deck: { ...state.deck, hand: ids } };
    for (const ref of allRefs(buildCombatView(all, data))) expect(missingKeys(ref)).toEqual([]);
    const keys = new Set<string>();
    for (const list of [data.symbols.elements, data.symbols.forms, data.symbols.traits]) {
      for (const symbol of list) {
        for (const fx of symbol.effects ?? []) {
          keys.add(`fx.when.${fx.trigger}`);
          keys.add(`fx.op.${fx.op}${fx.pierce ? '.pierce' : ''}`);
          if (fx.scope !== 'self') keys.add(`fx.scope.${fx.scope}`);
        }
      }
    }
    for (const key of keys) expect(missingKeys({ key }), key).toEqual([]);
    for (const op of ['strike', 'guard', 'mend', 'draw', 'kindle', 'growAttack', 'growHealth', 'regen']) {
      expect(missingKeys({ key: `fx.op.${op}` }), op).toEqual([]);
    }
  });
});
