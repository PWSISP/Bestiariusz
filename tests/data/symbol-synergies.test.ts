// S03-06 ("every synergy has a test as described"): the effects of the five elements and the whole
// effect table of docs/efekty-symboli.md, checked on the REAL data in src/data/. Changing an effect
// in that table is a rule change: change the document, this test and the data together, with the
// owner's consent.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCreature } from '../../src/core/combat/creature.ts';
import { resolveCreatureEffects } from '../../src/core/combat/effects.ts';
import type { CombatEnv, CombatEvent, CombatState } from '../../src/core/combat/model.ts';
import { createRng } from '../../src/core/rng.ts';
import type { CreatureEffectDef, CreatureSpec } from '../../src/core/types.ts';
import { loadCombatData } from '../../src/data/combat-schema.ts';
import { SEED, makeState } from '../combat/fixtures.ts';

const data = loadCombatData((file) =>
  fs.readFileSync(new URL(`../../src/data/${file}`, import.meta.url), 'utf8'),
);
const env = (): CombatEnv => ({ data, rng: createRng(SEED) });

const spec = (element: string, form = 'wilk', trait = 'smutek'): CreatureSpec => ({
  element,
  form,
  trait,
});

/** Circles 0..2 hold creatures of the given specs; the enemy is plain (no resistances) with 100 health. */
function board(
  specs: (CreatureSpec | null)[],
  o: { playerHp?: number; ember?: number; enemyBlock?: number } = {},
): CombatState {
  const base = makeState({ playerHp: o.playerHp, ember: o.ember, enemyBlock: o.enemyBlock });
  return {
    ...base,
    player: {
      ...base.player,
      circles: specs.map((s, i) => (s ? buildCreature(data.symbols, `c${i}`, s) : null)),
    },
    enemy: { ...base.enemy, hp: 100, maxHp: 100, resist: [], weak: [] },
  };
}

function resolve(state: CombatState, trigger: CreatureEffectDef['trigger'], index: number) {
  const events: CombatEvent[] = [];
  const next = resolveCreatureEffects(state, trigger, index, env(), events);
  const effects = events.flatMap((e) => (e.type === 'effect' ? [e] : []));
  return { next, effects };
}

describe('the effect table (docs/efekty-symboli.md, chapter 4)', () => {
  const T = (
    trigger: CreatureEffectDef['trigger'],
    op: CreatureEffectDef['op'],
    amount: number,
    scope: CreatureEffectDef['scope'],
    pierce?: true,
  ): CreatureEffectDef =>
    pierce ? { trigger, op, amount, scope, pierce } : { trigger, op, amount, scope };

  it.each([
    ['ogien', T('attack', 'strike', 1, 'sameElementOthers', true)],
    ['woda', T('summon', 'mend', 1, 'self')],
    ['ziemia', T('summon', 'guard', 3, 'self')],
    ['wiatr', T('summon', 'kindle', 1, 'self')],
    ['grom', T('attack', 'strike', 2, 'sameElementOthers', true)],
    ['wilk', T('damaged', 'growAttack', 1, 'self')],
    ['kruk', T('attack', 'strike', 1, 'self', true)],
    ['sowa', T('summon', 'kindle', 1, 'self')],
    ['waz', T('attack', 'growAttack', 1, 'self')],
    ['niedzwiedz', T('damaged', 'strike', 2, 'self')],
    ['jelen', T('turnEnd', 'regen', 1, 'self')],
  ])('%s has exactly the effect written in the table', (id, effect) => {
    const symbol = [...data.symbols.elements, ...data.symbols.forms].find((s) => s.id === id);
    expect(symbol?.effects).toEqual([effect]);
  });
});

describe('the synergies of the five elements', () => {
  it('Ogień: every other fire creature adds a piercing hit of 1, whatever the block', () => {
    const fire = spec('ogien');
    const two = resolve(board([fire, fire, null], { enemyBlock: 50 }), 'attack', 0);
    expect(two.effects).toEqual([
      { type: 'effect', circle: 0, trigger: 'attack', op: 'strike', amount: 1 },
    ]);
    expect(two.next.enemy.hp).toBe(99);
    const three = resolve(board([fire, fire, fire]), 'attack', 0);
    expect(three.effects[0]?.amount).toBe(2);
    expect(three.next.enemy.hp).toBe(98);
  });

  it('Ogień: alone, or among other elements (also wind), it does nothing', () => {
    const fire = spec('ogien');
    expect(resolve(board([fire, null, null]), 'attack', 0).effects).toEqual([]);
    expect(resolve(board([fire, spec('woda'), spec('wiatr')]), 'attack', 0).effects).toEqual([]);
  });

  it('Grom: every other thunder creature adds a piercing hit of 2', () => {
    const thunder = spec('grom');
    const two = resolve(board([thunder, null, thunder], { enemyBlock: 50 }), 'attack', 2);
    expect(two.effects).toEqual([
      { type: 'effect', circle: 2, trigger: 'attack', op: 'strike', amount: 2 },
    ]);
    expect(two.next.enemy.hp).toBe(98);
    const three = resolve(board([thunder, thunder, thunder]), 'attack', 1);
    expect(three.effects[0]?.amount).toBe(4);
    expect(three.next.enemy.hp).toBe(96);
    expect(resolve(board([thunder, spec('ogien'), null]), 'attack', 0).effects).toEqual([]);
  });

  it('Woda: on summoning heals 1, up to the maximum health', () => {
    const water = spec('woda');
    const hurt = resolve(board([water, null, null], { playerHp: 30 }), 'summon', 0);
    expect(hurt.effects).toEqual([
      { type: 'effect', circle: 0, trigger: 'summon', op: 'mend', amount: 1 },
    ]);
    expect(hurt.next.player.hp).toBe(31);
    expect(resolve(board([water, null, null]), 'summon', 0).next.player.hp).toBe(40);
  });

  it('Ziemia: on summoning gives 3 block', () => {
    const r = resolve(board([null, spec('ziemia'), null]), 'summon', 1);
    expect(r.effects).toEqual([
      { type: 'effect', circle: 1, trigger: 'summon', op: 'guard', amount: 3 },
    ]);
    expect(r.next.player.block).toBe(3);
  });

  it('Wiatr: on summoning gives 1 ember', () => {
    const r = resolve(board([null, null, spec('wiatr')], { ember: 0 }), 'summon', 2);
    expect(r.effects).toEqual([
      { type: 'effect', circle: 2, trigger: 'summon', op: 'kindle', amount: 1 },
    ]);
    expect(r.next.ember).toBe(1);
  });
});
