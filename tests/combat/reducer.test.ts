import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng.ts';
import { createCombat, legalActions, reduce } from '../../src/core/combat/reducer.ts';
import type { CombatAction, CombatEvent, RejectReason } from '../../src/core/combat/model.ts';
import { FIXTURE, SEED, deepFreeze, envOf, makeState } from './fixtures.ts';

const play = (handIndex: number, circle?: number): CombatAction => ({
  type: 'playCard',
  handIndex,
  circle,
});
const END: CombatAction = { type: 'endTurn' };
const kinds = (events: readonly CombatEvent[]): string[] => events.map((e) => e.type);
const SZEPTUCHA = FIXTURE.decks['szeptucha'] as readonly string[];

describe('createCombat', () => {
  it('starts turn 1 with 3 ember, five cards in hand and a shown intent', () => {
    const { state, events } = createCombat(
      FIXTURE,
      { deck: SZEPTUCHA, enemyId: 'leszy' },
      createRng(SEED),
    );
    const shuffled = createRng(SEED).shuffle(SZEPTUCHA);
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('player');
    expect(state.ember).toBe(3);
    expect(state.deck.hand).toEqual(shuffled.slice(0, 5));
    expect(state.deck.draw).toEqual(shuffled.slice(5));
    expect(state.deck.discard).toEqual([]);
    expect(state.player.hp).toBe(40);
    expect(state.player.circles).toEqual([null, null, null]);
    expect(state.enemy.hp).toBe(60);
    expect(state.ritualUsed).toBe(false);
    expect(state.intent.actionId).toBe('cios'); // no circles, full health: highest weight
    expect(events).toEqual([{ type: 'turn_started', turn: 1, intentId: 'cios' }]);
  });

  it('is deterministic for a seed, and another seed deals another hand', () => {
    const setup = { deck: SZEPTUCHA, enemyId: 'leszy' };
    expect(createCombat(FIXTURE, setup, createRng(7))).toEqual(
      createCombat(FIXTURE, setup, createRng(7)),
    );
    expect(createCombat(FIXTURE, setup, createRng(7)).state.deck.hand).not.toEqual(
      createCombat(FIXTURE, setup, createRng(8)).state.deck.hand,
    );
  });

  it('throws on an unknown enemy or card', () => {
    expect(() => createCombat(FIXTURE, { deck: SZEPTUCHA, enemyId: 'nikt' }, createRng(1))).toThrow(
      Error,
    );
    expect(() =>
      createCombat(FIXTURE, { deck: ['nie-ma'], enemyId: 'leszy' }, createRng(1)),
    ).toThrow(Error);
  });
});

describe('reduce: rejected actions', () => {
  const cases: [string, () => ReturnType<typeof makeState>, CombatAction, RejectReason][] = [
    [
      'the combat is over',
      () => ({ ...makeState({ hand: ['oklad'] }), phase: 'won' }),
      play(0),
      'combat_over',
    ],
    ['negative hand index', () => makeState({ hand: ['oklad'] }), play(-1), 'no_such_card'],
    ['hand index past the end', () => makeState({ hand: ['oklad'] }), play(1), 'no_such_card'],
    ['fractional hand index', () => makeState({ hand: ['oklad'] }), play(0.5), 'no_such_card'],
    ['a curse is not playable', () => makeState({ hand: ['klatwa'] }), play(0), 'unplayable'],
    [
      'not enough ember',
      () => makeState({ hand: ['plomien'], ember: 1 }),
      play(0),
      'not_enough_ember',
    ],
    [
      'a creature without a circle',
      () => makeState({ hand: ['woda-sowa-odwaga'] }),
      play(0),
      'circle_required',
    ],
    ['circle 3', () => makeState({ hand: ['woda-sowa-odwaga'] }), play(0, 3), 'circle_required'],
    ['circle -1', () => makeState({ hand: ['woda-sowa-odwaga'] }), play(0, -1), 'circle_required'],
    [
      'circle 1.5',
      () => makeState({ hand: ['woda-sowa-odwaga'] }),
      play(0, 1.5),
      'circle_required',
    ],
    [
      'an occupied circle',
      () => makeState({ hand: ['woda-sowa-odwaga'], circles: ['ogien-wilk-smutek', null, null] }),
      play(0, 0),
      'circle_occupied',
    ],
  ];

  it.each(cases)('%s', (_name, build, action, reason) => {
    const state = build();
    const result = reduce(state, action, envOf());
    expect(result.state).toBe(state);
    expect(result.events).toEqual([{ type: 'rejected', reason }]);
  });

  it('endTurn after the combat is over is rejected too', () => {
    const state = { ...makeState(), phase: 'lost' as const };
    expect(reduce(state, END, envOf()).events).toEqual([
      { type: 'rejected', reason: 'combat_over' },
    ]);
  });
});

describe('reduce: spells', () => {
  it('a damage spell goes through block, spends ember and moves the card to the discard pile', () => {
    const start = makeState({ hand: ['uderzenie', 'plomien'], enemyBlock: 4 });
    const first = reduce(start, play(0), envOf());
    expect(first.state.enemy.hp).toBe(58);
    expect(first.state.enemy.block).toBe(0);
    expect(first.state.ember).toBe(2);
    expect(first.state.deck.hand).toEqual(['plomien']);
    expect(first.state.deck.discard).toEqual(['uderzenie']);
    expect(first.events).toEqual([
      { type: 'card_played', cardId: 'uderzenie' },
      { type: 'enemy_damaged', source: 'spell', dealt: 2, blocked: 4 },
    ]);
    // Płomień: 9 fire damage; Leszy is weak to fire, so 13.
    const second = reduce(first.state, play(0), envOf());
    expect(second.state.enemy.hp).toBe(45);
    expect(second.state.ember).toBe(0);
  });

  it('block spells add block to the player', () => {
    const afterOklad = reduce(makeState({ hand: ['oklad', 'mgla'] }), play(0), envOf());
    expect(afterOklad.state.player.block).toBe(6);
    expect(reduce(afterOklad.state, play(0), envOf()).state.player.block).toBe(16);
  });

  it('a spell that kills the enemy ends the combat', () => {
    const start = makeState({ hand: ['plomien', 'oklad'], enemyHp: 13 });
    const killed = reduce(start, play(0), envOf());
    expect(killed.state.phase).toBe('won');
    expect(killed.state.enemy.hp).toBe(0);
    expect(kinds(killed.events)).toEqual(['card_played', 'enemy_damaged', 'combat_won']);
    expect(reduce(killed.state, play(0), envOf()).events).toEqual([
      { type: 'rejected', reason: 'combat_over' },
    ]);
  });
});

describe('reduce: endTurn', () => {
  const CIOS = { actionId: 'cios', actions: [{ type: 'atak' as const, amount: 12, direct: true }] };

  it('resolves the shown intent, discards the hand and starts the next turn', () => {
    const start = makeState({ hand: ['uderzenie', 'oklad'], intent: CIOS, playerBlock: 5 });
    const { state, events } = reduce(start, END, envOf());
    expect(kinds(events)).toEqual(['player_damaged', 'enemy_acted', 'turn_started']);
    expect(events[1]).toEqual({
      type: 'enemy_acted',
      actionId: 'cios',
      log: ['trafienie gracz 7'],
    });
    expect(state.turn).toBe(4);
    expect(state.player.hp).toBe(33);
    expect(state.player.block).toBe(0); // player block expires at the start of the next player turn
    expect(state.ember).toBe(3);
    expect(state.enemy.history).toEqual(['cios']);
    expect(state.deck.hand).toEqual(['uderzenie', 'uderzenie', 'oklad', 'mgla', 'plomien']);
    expect(state.deck.draw).toEqual(['uderzenie', 'oklad']);
    expect(state.deck.discard).toEqual(['uderzenie', 'oklad']);
  });

  it('unused player block expires at the start of the next player turn', () => {
    const { state } = reduce(makeState({ playerBlock: 5 }), END, envOf()); // intent: gaszcz
    expect(state.player.block).toBe(0);
    expect(state.player.hp).toBe(40);
  });

  it('ember does not carry over: every turn starts with 3', () => {
    const { state } = reduce(makeState({ ember: 2 }), END, envOf());
    expect(state.ember).toBe(3);
  });

  it('enemy block expires at the start of the enemy phase, not later', () => {
    const start = makeState({ enemyBlock: 7 }); // intent: gaszcz (tarcza 10)
    expect(reduce(start, END, envOf()).state.enemy.block).toBe(10);
  });

  it('the enemy steals from the hand before it is discarded', () => {
    const intent = { actionId: 'kradziez', actions: [{ type: 'kradziez' as const }] };
    const { state } = reduce(makeState({ hand: ['uderzenie', 'oklad'], intent }), END, envOf());
    expect(state.enemy.stolen).toEqual(['oklad']);
    expect(state.deck.discard).toEqual(['uderzenie']);
  });

  it('the player dying in the enemy phase ends the combat without a new turn', () => {
    const { state, events } = reduce(
      makeState({ playerHp: 5, intent: CIOS, hand: ['oklad'] }),
      END,
      envOf(),
    );
    expect(state.phase).toBe('lost');
    expect(state.player.hp).toBe(0);
    expect(state.turn).toBe(3);
    expect(kinds(events)).toEqual(['player_damaged', 'enemy_acted', 'combat_lost']);
    expect(reduce(state, END, envOf()).events).toEqual([
      { type: 'rejected', reason: 'combat_over' },
    ]);
  });

  it('a curse is telegraphed on the circle of the strongest creature (lowest index on ties)', () => {
    // The resolving intent is a harmless "szpony" so that szpony is excluded next turn
    // (never three times in a row) and the 3-circle bonus makes "zwod" win.
    const resolving = { actionId: 'szpony', actions: [{ type: 'tarcza' as const, amount: 1 }] };
    const wilk = reduce(
      makeState({
        circles: ['ogien-wilk-smutek', 'ziemia-jelen-spryt', 'woda-sowa-odwaga'],
        intent: resolving,
        history: ['szpony'],
      }),
      END,
      envOf(),
    );
    expect(wilk.state.intent).toEqual({
      actionId: 'zwod',
      actions: [
        { type: 'klatwa', circle: 0 },
        { type: 'atak', amount: 4 },
      ],
    });
    const tie = reduce(
      makeState({
        circles: ['woda-sowa-odwaga', 'ziemia-jelen-spryt', 'ogien-kruk-odwaga'],
        intent: resolving,
        history: ['szpony'],
      }),
      END,
      envOf(),
    );
    expect(tie.state.intent.actions[0]).toEqual({ type: 'klatwa', circle: 1 });
  });
});

describe('legalActions', () => {
  it('lists playable cards and endTurn; creatures only into empty circles', () => {
    const state = makeState({
      hand: ['woda-sowa-odwaga', 'plomien', 'klatwa', 'uderzenie'],
      ember: 2,
      circles: [null, 'ogien-wilk-smutek', null],
    });
    expect(legalActions(state, envOf())).toEqual([
      { type: 'playCard', handIndex: 0, circle: 0 },
      { type: 'playCard', handIndex: 0, circle: 2 },
      { type: 'playCard', handIndex: 1 },
      { type: 'playCard', handIndex: 3 },
      { type: 'endTurn' },
    ]);
  });

  it('is empty when the combat is over', () => {
    expect(legalActions({ ...makeState(), phase: 'won' }, envOf())).toEqual([]);
  });
});

describe('invariants', () => {
  it('reduce does not modify a deeply frozen state or frozen data', () => {
    const env = { data: deepFreeze(structuredClone(FIXTURE)), rng: createRng(SEED) };
    const state = deepFreeze(
      makeState({
        hand: ['woda-sowa-odwaga', 'uderzenie'],
        circles: ['ogien-wilk-smutek', null, null],
      }),
    );
    const afterCreature = reduce(state, play(0, 1), env);
    const afterEnd = reduce(afterCreature.state, END, env);
    expect(afterEnd.state.turn).toBe(4);
  });

  it('holds over 100 random combats: hand limit, no card lost, sane numbers, legal actions never rejected', () => {
    let finished = 0;
    for (let g = 0; g < 100; g++) {
      const env = envOf(1000 + g);
      const chooser = createRng(5000 + g);
      let { state } = createCombat(FIXTURE, { deck: SZEPTUCHA, enemyId: 'leszy' }, env.rng);
      for (let step = 0; step < 400 && state.phase === 'player'; step++) {
        const action = chooser.pick(legalActions(state, env));
        const result = reduce(state, action, env);
        expect(result.events[0]?.type === 'rejected').toBe(false);
        state = result.state;
        expect(state.deck.hand.length).toBeLessThanOrEqual(5);
        expect(
          state.deck.draw.length +
            state.deck.hand.length +
            state.deck.discard.length +
            state.enemy.stolen.length,
        ).toBe(SZEPTUCHA.length + state.player.curses);
        expect(state.ember).toBeGreaterThan(-1);
        expect(state.player.hp).toBeGreaterThan(-1);
        expect(state.player.hp).toBeLessThanOrEqual(40);
        expect(state.enemy.hp).toBeGreaterThan(-1);
        expect(state.player.circles).toHaveLength(3);
      }
      if (state.phase !== 'player') finished++;
    }
    expect(finished).toBeGreaterThan(50); // random play still finishes most combats within 400 steps
  });
});
