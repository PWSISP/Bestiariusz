// Frozen symbols WITH effects for the effect-order tests. Independent of src/data/*.json: balancing
// the real effects (S03-01) does not break these tests. Stats are those of tests/combat/fixtures.ts.

import { buildCreature } from '../../src/core/combat/creature.ts';
import type { CombatData, CombatEnv, CombatState } from '../../src/core/combat/model.ts';
import { createRng } from '../../src/core/rng.ts';
import type { CreatureEffectDef, SymbolData } from '../../src/core/types.ts';
import { FIXTURE, SEED, SYMBOLS, makeState } from './fixtures.ts';
import type { StateOptions } from './fixtures.ts';

const fx = (
  trigger: CreatureEffectDef['trigger'],
  op: CreatureEffectDef['op'],
  amount: number,
  scope: CreatureEffectDef['scope'],
  pierce?: boolean,
): CreatureEffectDef => (pierce === undefined ? { trigger, op, amount, scope } : { trigger, op, amount, scope, pierce });

const ELEMENT_EFFECTS: Record<string, CreatureEffectDef[]> = {
  ogien: [fx('attack', 'strike', 1, 'sameElementOthers', true)],
  woda: [fx('turnEnd', 'mend', 2, 'self')],
  ziemia: [fx('turnEnd', 'guard', 3, 'sameElementAll')],
  wiatr: [fx('summon', 'draw', 1, 'self')],
  grom: [fx('attack', 'strike', 2, 'sameElementOthers', true)],
};
const FORM_EFFECTS: Record<string, CreatureEffectDef[]> = {
  wilk: [fx('damaged', 'growAttack', 1, 'self')],
  kruk: [fx('attack', 'strike', 1, 'self', true)],
  sowa: [fx('summon', 'kindle', 1, 'self')],
  waz: [fx('attack', 'growAttack', 1, 'self')],
  niedzwiedz: [fx('damaged', 'strike', 2, 'self')],
  jelen: [fx('turnEnd', 'regen', 1, 'self')],
};
const TRAIT_EFFECTS: Record<string, CreatureEffectDef[]> = {
  gniew: [fx('attack', 'strike', 3, 'self', true)],
  odwaga: [fx('damaged', 'growHealth', 2, 'self')],
  smutek: [fx('summon', 'mend', 1, 'othersAny')],
};

export const EFFECT_SYMBOLS: SymbolData = {
  elements: SYMBOLS.elements.map((e) => ({ ...e, effects: ELEMENT_EFFECTS[e.id] ?? [] })),
  forms: SYMBOLS.forms.map((f) => ({ ...f, effects: FORM_EFFECTS[f.id] ?? [] })),
  traits: SYMBOLS.traits.map((t) => ({ ...t, effects: TRAIT_EFFECTS[t.id] ?? [] })),
};

const creature = (id: string, cost: number) => {
  const [element, form, trait] = id.split('-') as [string, string, string];
  return { id, kind: 'creature' as const, cost, creature: { element, form, trait } };
};

export const EFFECT_DATA: CombatData = {
  ...FIXTURE,
  symbols: EFFECT_SYMBOLS,
  cards: {
    ...FIXTURE.cards,
    'ogien-kruk-gniew': creature('ogien-kruk-gniew', 2),
    'ogien-kruk-smutek': creature('ogien-kruk-smutek', 1),
    'wiatr-waz-gniew': creature('wiatr-waz-gniew', 1),
    'ziemia-niedzwiedz-spryt': creature('ziemia-niedzwiedz-spryt', 2),
    'woda-sowa-smutek': creature('woda-sowa-smutek', 1),
  },
};

export function effectEnv(seed: number = SEED): CombatEnv {
  return { data: EFFECT_DATA, rng: createRng(seed) };
}

/** Enemy without resistances, so damage numbers in the tests are plain. */
export function plainEnemy(state: CombatState): CombatState {
  return { ...state, enemy: { ...state.enemy, resist: [], weak: [] } };
}

/** Like makeState, but circles may hold the creature cards of EFFECT_DATA and the enemy is plain. */
export function effectState(o: StateOptions = {}): CombatState {
  const { circles = [null, null, null], ...rest } = o;
  const base = makeState(rest);
  const filled = circles.map((id) => {
    if (id === null) return null;
    const card = EFFECT_DATA.cards[id];
    if (!card || card.kind !== 'creature') throw new Error(`not a creature card: ${id}`);
    return buildCreature(EFFECT_SYMBOLS, id, card.creature);
  });
  return plainEnemy({ ...base, player: { ...base.player, circles: filled } });
}
