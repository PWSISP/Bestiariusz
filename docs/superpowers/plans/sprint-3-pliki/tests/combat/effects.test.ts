import { describe, expect, it } from 'vitest';
import { effectsOf, hitCircles } from '../../src/core/combat/effects.ts';
import type { CombatAction, CombatEvent, CombatState, Intent } from '../../src/core/combat/model.ts';
import { reduce } from '../../src/core/combat/reducer.ts';
import { EFFECT_SYMBOLS, effectEnv, effectState } from './effect-fixtures.ts';
import { deepFreeze } from './fixtures.ts';

const END: CombatAction = { type: 'endTurn' };
const play = (handIndex: number, circle?: number): CombatAction => ({
  type: 'playCard',
  handIndex,
  circle,
});
const kinds = (events: readonly CombatEvent[]): string[] => events.map((e) => e.type);
const effectsIn = (events: readonly CombatEvent[]) =>
  events.flatMap((e) => (e.type === 'effect' ? [e] : []));
const MILD: Intent = { actionId: 'cios', actions: [{ type: 'atak', amount: 1, direct: true }] };
const hit = (amount: number, times = 1): Intent =>
  times === 1
    ? { actionId: 'cios', actions: [{ type: 'atak', amount }] }
    : { actionId: 'szpony', actions: [{ type: 'wielokrotny', amount, times }] };

describe('effectsOf', () => {
  it('lists the effects of the element, then the form, then the trait', () => {
    const list = effectsOf(EFFECT_SYMBOLS, { element: 'ogien', form: 'kruk', trait: 'gniew' });
    expect(list.map((f) => [f.trigger, f.op, f.amount])).toEqual([
      ['attack', 'strike', 1],
      ['attack', 'strike', 1],
      ['attack', 'strike', 3],
    ]);
  });

  it('has nothing for symbols without effects or unknown symbols', () => {
    expect(effectsOf(EFFECT_SYMBOLS, { element: 'lod', form: 'zubr', trait: 'lek' })).toEqual([]);
    // spryt has no effects, and a symbol without an `effects` field has none either
    const bare = {
      elements: EFFECT_SYMBOLS.elements.map(({ effects: _e, ...e }) => e),
      forms: EFFECT_SYMBOLS.forms.map(({ effects: _f, ...f }) => f),
      traits: EFFECT_SYMBOLS.traits,
    };
    expect(effectsOf(bare, { element: 'woda', form: 'sowa', trait: 'spryt' })).toEqual([]);
  });
});

describe('hitCircles', () => {
  it('reads the circles of creature hits, in order, and ignores everything else', () => {
    expect(
      hitCircles([
        'trafienie krag1 3',
        'trafienie gracz 2',
        'trafienie krag0 4',
        'zniszczono krag0',
        'tarcza 8',
        'klatwa krag2',
        'trafienie krag1 3',
      ]),
    ).toEqual([1, 0, 1]);
  });

  it('skips a hit that took no health', () => {
    expect(hitCircles(['trafienie krag0 0'])).toEqual([]);
  });
});

describe('effect order (S03-05)', () => {
  it('1. summon effects fire right after the summon, before the ritual', () => {
    // two fire creatures and the wind creature (a wildcard) make a fire ritual
    const s = effectState({
      circles: ['ogien-wilk-smutek', 'ogien-kruk-odwaga', null],
      hand: ['wiatr-kruk-gniew'],
      draw: ['oklad', 'mgla'],
    });
    const r = reduce(s, play(0, 2), effectEnv());
    expect(kinds(r.events)).toEqual([
      'card_played',
      'creature_summoned',
      'effect',
      'ritual',
      'enemy_damaged',
    ]);
    expect(effectsIn(r.events)).toEqual([
      { type: 'effect', circle: 2, trigger: 'summon', op: 'draw', amount: 1 },
    ]);
    expect(r.state.deck.hand).toEqual(['oklad']); // the summon effect drew a card
  });

  it('2. attack effects follow the hit of the same creature, circle 0 to 2', () => {
    const s = effectState({ circles: ['ogien-wilk-smutek', 'ogien-kruk-odwaga', null], intent: MILD });
    const r = reduce(s, END, effectEnv());
    const order = r.events
      .filter((e) => e.type === 'enemy_damaged' || e.type === 'effect')
      .map((e) =>
        e.type === 'effect' ? `effect:${e.circle}:${e.op}` : `hit:${e.source}:${e.circle ?? '-'}`,
      );
    expect(order).toEqual([
      'hit:creature:0',
      'effect:0:strike', // ogien x 1 other fire creature
      'hit:creature:0',
      'hit:creature:1',
      'effect:1:strike', // ogien
      'hit:creature:1',
      'effect:1:strike', // kruk
      'hit:creature:1',
    ]);
    // 4 + 1 + 3 + 1 + 1 pierce hits, the enemy has no block and no resistances
    expect(r.state.enemy.hp).toBe(60 - 4 - 1 - 3 - 1 - 1);
  });

  it('3. one creature resolves its element, then its form, then its trait', () => {
    const s = effectState({
      circles: ['ogien-kruk-gniew', 'ogien-wilk-smutek', 'ogien-kruk-odwaga'],
      intent: MILD,
    });
    const r = reduce(s, END, effectEnv());
    const ofCircle0 = effectsIn(r.events).filter((e) => e.circle === 0);
    expect(ofCircle0.map((e) => e.amount)).toEqual([2, 1, 3]); // element x2 others, form, trait
  });

  it('4. end-of-turn effects come after all attacks and before the enemy acts', () => {
    const base = effectState({
      circles: ['ziemia-jelen-spryt', 'woda-sowa-odwaga', null],
      intent: { actionId: 'cios', actions: [{ type: 'atak', amount: 12, direct: true }] },
      playerHp: 39,
    });
    const hurt = {
      ...base,
      player: {
        ...base.player,
        circles: base.player.circles.map((c, i) => (i === 0 && c ? { ...c, health: 4 } : c)),
      },
    };
    const r = reduce(hurt, END, effectEnv());
    expect(kinds(r.events)).toEqual([
      'enemy_damaged', // circle 0
      'enemy_damaged', // circle 1
      'effect', // circle 0: ziemia guard
      'effect', // circle 0: jelen regen
      'effect', // circle 1: woda mend
      'player_damaged',
      'enemy_acted',
      'turn_started',
    ]);
    expect(effectsIn(r.events).map((e) => `${e.circle}:${e.op}:${e.amount}`)).toEqual([
      '0:guard:3',
      '0:regen:1',
      '1:mend:2',
    ]);
    // mend is capped at the maximum (39 -> 40) and the 3 block took part of the 12 damage
    expect(r.state.player.hp).toBe(40 - 9);
    expect(r.state.player.circles[0]?.health).toBe(5);
  });

  it('5. a creature that survives a hit reacts after the enemy acted; a destroyed one does not', () => {
    const survives = reduce(
      effectState({ circles: ['ogien-wilk-smutek', null, null], intent: hit(2) }),
      END,
      effectEnv(),
    );
    const afterActed = kinds(survives.events).slice(kinds(survives.events).indexOf('enemy_acted'));
    expect(afterActed).toEqual(['enemy_acted', 'effect', 'turn_started']);
    expect(survives.state.player.circles[0]?.attack).toBe(5); // wilk: +1 attack when damaged

    const destroyed = reduce(
      effectState({ circles: ['ogien-wilk-smutek', null, null], intent: hit(20) }),
      END,
      effectEnv(),
    );
    expect(kinds(destroyed.events)).toContain('creature_died');
    expect(effectsIn(destroyed.events).filter((e) => e.trigger === 'damaged')).toEqual([]);
  });

  it('6. a creature reacts once for every hit it survived', () => {
    const s = effectState({ circles: ['ziemia-niedzwiedz-odwaga', null, null], intent: hit(3, 3) });
    const r = reduce(s, END, effectEnv());
    const damaged = effectsIn(r.events).filter((e) => e.trigger === 'damaged');
    expect(damaged.map((e) => e.op)).toEqual([
      'strike', 'growHealth', 'strike', 'growHealth', 'strike', 'growHealth',
    ]);
    // 10 health - 3 hits of 3 = 1, then +2 maximum and current health three times
    expect(r.state.player.circles[0]?.health).toBe(7);
    expect(r.state.player.circles[0]?.maxHealth).toBe(16);
    // creature attack 4 (ziemia resists nothing here), then 3 strikes of 2
    expect(r.state.enemy.hp).toBe(60 - 4 - 6);
  });

  it('7. an effect that scales to zero does not fire and leaves no event', () => {
    const s = effectState({ circles: ['ogien-wilk-smutek', null, null], intent: MILD });
    const r = reduce(s, END, effectEnv());
    expect(effectsIn(r.events)).toEqual([]);
  });

  it('8. the combat ends in the middle of the effects: nothing after the killing blow', () => {
    const s = effectState({
      circles: ['ogien-kruk-odwaga', 'ogien-wilk-smutek', null],
      enemyHp: 5,
      intent: MILD,
    });
    const r = reduce(s, END, effectEnv());
    expect(r.state.phase).toBe('won');
    expect(r.state.enemy.hp).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: 'combat_won' });
    expect(kinds(r.events).filter((k) => k === 'combat_won')).toHaveLength(1);
    expect(r.events.some((e) => e.type === 'enemy_damaged' && e.circle === 1)).toBe(false);
    expect(r.events.some((e) => e.type === 'enemy_acted')).toBe(false);
  });

  it('9. growing stats stay for the next turns and regeneration stops at the maximum', () => {
    const s = effectState({
      circles: ['wiatr-waz-gniew', 'ziemia-jelen-spryt', null],
      intent: MILD,
    });
    const first = reduce(s, END, effectEnv());
    expect(first.state.player.circles[0]?.attack).toBe(6); // waz: +1 attack at every attack
    const second = reduce({ ...first.state, intent: MILD }, END, effectEnv());
    expect(second.state.player.circles[0]?.attack).toBe(7);
    expect(second.state.player.circles[1]?.health).toBe(7); // jelen already at its maximum
    expect(second.state.player.circles[1]?.maxHealth).toBe(7);
  });

  it('10. summon effects pay and heal: kindle adds ember, mend stops at the maximum hp', () => {
    const kindle = reduce(
      effectState({ circles: [null, null, null], hand: ['woda-sowa-odwaga'], ember: 3 }),
      play(0, 0),
      effectEnv(),
    );
    expect(kindle.state.ember).toBe(3); // 3 - 1 for the card + 1 kindled by the owl
    const owl = reduce(
      effectState({
        circles: [null, null, null],
        hand: ['woda-sowa-smutek', 'ogien-wilk-smutek'],
        ember: 3,
        playerHp: 38,
      }),
      play(0, 0),
      effectEnv(),
    );
    // sowa: summon kindle 1 (self); smutek: summon mend 1 x other creatures (none yet)
    expect(effectsIn(owl.events)).toEqual([
      { type: 'effect', circle: 0, trigger: 'summon', op: 'kindle', amount: 1 },
    ]);
    expect(owl.state.ember).toBe(3);
    const second = reduce(owl.state, play(0, 1), effectEnv()); // wilk-smutek: mend 1 x 1 other
    expect(effectsIn(second.events)).toEqual([
      { type: 'effect', circle: 1, trigger: 'summon', op: 'mend', amount: 1 },
    ]);
    expect(second.state.player.hp).toBe(39);
  });
});

describe('strikes and the end of the combat', () => {
  it('a piercing strike ignores the enemy block', () => {
    const s = effectState({ circles: ['ogien-wilk-smutek', 'ogien-kruk-odwaga', null], intent: MILD });
    const walled: CombatState = { ...s, enemy: { ...s.enemy, hp: 50, maxHp: 50, block: 100 } };
    const r = reduce(walled, END, effectEnv());
    // the creatures' own hits (4 and 3) are absorbed by the block; the three piercing strikes
    // (fire for each other fire creature, twice, and the raven's own) take 1 health each; the
    // block itself expires only when the enemy acts, after all of this
    expect(r.state.enemy.hp).toBe(47);
  });

  it('a summon effect that kills the enemy ends the combat before the ritual', () => {
    const killer = {
      ...EFFECT_SYMBOLS,
      elements: EFFECT_SYMBOLS.elements.map((e) =>
        e.id === 'wiatr'
          ? {
              ...e,
              effects: [
                { trigger: 'summon', op: 'strike', amount: 99, scope: 'self', pierce: true },
              ] as const,
            }
          : e,
      ),
    };
    const env = effectEnv();
    const s = effectState({
      circles: ['ogien-wilk-smutek', 'ogien-kruk-odwaga', null],
      hand: ['wiatr-kruk-gniew'],
    });
    const r = reduce(s, play(0, 2), { ...env, data: { ...env.data, symbols: killer } });
    expect(r.state.phase).toBe('won');
    expect(r.state.ritualUsed).toBe(false);
    expect(kinds(r.events)).toEqual([
      'card_played',
      'creature_summoned',
      'effect',
      'enemy_damaged',
      'combat_won',
    ]);
  });
});

describe('effects and the reducer contract', () => {
  it('are deterministic for a seed', () => {
    const run = (): { state: CombatState; events: CombatEvent[] } => {
      let state = effectState({ circles: ['ogien-kruk-gniew', 'ogien-wilk-smutek', null], intent: MILD });
      const events: CombatEvent[] = [];
      for (let i = 0; i < 3 && state.phase === 'player'; i++) {
        const r = reduce(state, END, effectEnv(7));
        state = r.state;
        events.push(...r.events);
      }
      return { state, events };
    };
    expect(run()).toEqual(run());
  });

  it('never modify the state they were given', () => {
    const s = deepFreeze(
      effectState({ circles: ['ogien-kruk-gniew', 'ogien-wilk-smutek', 'ziemia-jelen-spryt'], intent: hit(2) }),
    );
    expect(() => reduce(s, END, effectEnv())).not.toThrow();
  });

  it('leave a combat without effects exactly as it was', () => {
    const symbols = {
      elements: EFFECT_SYMBOLS.elements.map(({ effects: _e, ...e }) => e),
      forms: EFFECT_SYMBOLS.forms.map(({ effects: _f, ...f }) => f),
      traits: EFFECT_SYMBOLS.traits.map(({ effects: _t, ...t }) => t),
    };
    const env = effectEnv();
    const plain = { ...env, data: { ...env.data, symbols } };
    const s = effectState({ circles: ['ogien-kruk-gniew', 'ogien-wilk-smutek', null], intent: MILD });
    const r = reduce(s, END, plain);
    expect(effectsIn(r.events)).toEqual([]);
    expect(r.state.enemy.hp).toBe(60 - 5 - 4); // only the two creature hits
  });
});
