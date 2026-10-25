import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng.ts';
import { buildCreature } from '../../src/core/combat/creature.ts';
import type { CombatData } from '../../src/core/combat/model.ts';
import { createCombat, reduce } from '../../src/core/combat/reducer.ts';
import { craftCreature, previewCreature } from '../../src/core/workshop/workshop.ts';
import type { Unlocked } from '../../src/core/workshop/workshop.ts';
import { FIXTURE, SYMBOLS, deepFreeze } from '../combat/fixtures.ts';

const DATA: CombatData = {
  ...FIXTURE,
  balance: {
    ...FIXTURE.balance,
    powerBudget: 10,
    leftoverHealth: 1,
    workshop: { emberCost: 2, inkPerPower: 4 },
  },
};
const ALL: Unlocked = {
  elements: SYMBOLS.elements.map((e) => e.id),
  forms: SYMBOLS.forms.map((f) => f.id),
  traits: SYMBOLS.traits.map((t) => t.id),
};
const spec = (element: string, form: string, trait: string) => ({ element, form, trait });
const KRUK = spec('woda', 'kruk', 'smutek'); // cost 2 + 3 + 1 = 6

describe('previewCreature', () => {
  it('shows the stats, the ink price and the card', () => {
    const r = previewCreature(DATA, ALL, KRUK);
    expect(r).toEqual({
      ok: true,
      preview: {
        cardId: 'woda-kruk-smutek',
        stats: { cost: 6, valid: true, overBudgetBy: 0, attack: 2, health: 8 },
        inkCost: 24,
        emberCost: 2,
        card: { id: 'woda-kruk-smutek', kind: 'creature', cost: 2, creature: KRUK },
      },
    });
  });

  it('prices the most expensive creature at budget x ink per power', () => {
    const r = previewCreature(DATA, ALL, spec('ogien', 'wilk', 'gniew'));
    expect(r.ok && r.preview.inkCost).toBe(40);
  });

  it('refuses an unknown symbol, before anything else', () => {
    const none: Unlocked = { elements: [], forms: [], traits: [] };
    for (const bad of [
      spec('lod', 'kruk', 'smutek'),
      spec('woda', 'zubr', 'smutek'),
      spec('woda', 'kruk', 'lek'),
    ]) {
      expect(previewCreature(DATA, none, bad)).toEqual({
        ok: false,
        error: 'workshop.error.unknown_symbol',
      });
    }
  });

  it('refuses a symbol that is not unlocked, whichever kind it is', () => {
    const without = (key: keyof Unlocked, id: string): Unlocked => ({
      ...ALL,
      [key]: ALL[key].filter((x) => x !== id),
    });
    for (const locked of [
      without('elements', 'woda'),
      without('forms', 'kruk'),
      without('traits', 'smutek'),
    ]) {
      expect(previewCreature(DATA, locked, KRUK)).toEqual({
        ok: false,
        error: 'workshop.error.locked_symbol',
      });
    }
  });

  it('refuses a creature over the power budget, after the unlock check', () => {
    const tight: CombatData = { ...DATA, balance: { ...DATA.balance, powerBudget: 9 } };
    const big = spec('ogien', 'wilk', 'gniew'); // cost 10
    expect(previewCreature(tight, ALL, big)).toEqual({
      ok: false,
      error: 'workshop.error.over_budget',
    });
    expect(previewCreature(tight, { ...ALL, elements: [] }, big)).toEqual({
      ok: false,
      error: 'workshop.error.locked_symbol',
    });
  });

  it('throws when the Workshop is not configured', () => {
    const noWorkshop: CombatData = {
      ...DATA,
      balance: { playerMaxHp: 40, ritual: DATA.balance.ritual },
    };
    expect(() => previewCreature(noWorkshop, ALL, KRUK)).toThrow(Error);
  });

  it('works without the unspent-budget bonus when leftoverHealth is absent', () => {
    const plain: CombatData = {
      ...DATA,
      balance: { ...DATA.balance, leftoverHealth: undefined },
    };
    const r = previewCreature(plain, ALL, KRUK);
    expect(r.ok && r.preview.stats.health).toBe(4);
  });

  it('does not modify its arguments', () => {
    const data = deepFreeze(structuredClone(DATA));
    const unlocked = deepFreeze(structuredClone(ALL));
    expect(previewCreature(data, unlocked, deepFreeze({ ...KRUK })).ok).toBe(true);
  });
});

describe('craftCreature', () => {
  it('takes the ink and returns the card', () => {
    const r = craftCreature(DATA, ALL, 30, KRUK);
    expect(r).toEqual({
      ok: true,
      ink: 6,
      card: { id: 'woda-kruk-smutek', kind: 'creature', cost: 2, creature: KRUK },
    });
  });

  it('exactly enough ink is enough, one less is not', () => {
    const exact = craftCreature(DATA, ALL, 24, KRUK);
    expect(exact.ok && exact.ink).toBe(0);
    expect(craftCreature(DATA, ALL, 23, KRUK)).toEqual({
      ok: false,
      error: 'workshop.error.not_enough_ink',
    });
  });

  it('reports the other problems before the lack of ink', () => {
    expect(craftCreature(DATA, ALL, 0, spec('lod', 'kruk', 'smutek'))).toEqual({
      ok: false,
      error: 'workshop.error.unknown_symbol',
    });
    expect(craftCreature(DATA, { ...ALL, forms: [] }, 0, KRUK)).toEqual({
      ok: false,
      error: 'workshop.error.locked_symbol',
    });
  });

  it('makes a card the combat can use, with the stats the preview promised', () => {
    const made = craftCreature(DATA, ALL, 100, KRUK);
    if (!made.ok) throw new Error('craft failed');
    const withCard: CombatData = {
      ...DATA,
      cards: { ...DATA.cards, [made.card.id]: made.card },
    };
    const rng = createRng(5);
    const { state } = createCombat(withCard, { deck: [made.card.id], enemyId: 'leszy' }, rng);
    expect(state.deck.hand).toEqual([made.card.id]);
    const played = reduce(
      state,
      { type: 'playCard', handIndex: 0, circle: 0 },
      { data: withCard, rng },
    );
    expect(played.state.player.circles[0]).toEqual(
      buildCreature(SYMBOLS, made.card.id, KRUK, { powerBudget: 10, leftoverHealth: 1 }),
    );
    expect(played.state.player.circles[0]?.health).toBe(8);
    expect(played.state.ember).toBe(1); // 3 - the card's 2
  });
});
