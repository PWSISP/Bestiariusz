import { describe, expect, it } from 'vitest';
import type { CombatData } from '../src/core/combat/model.ts';
import type { Unlocked } from '../src/core/workshop/workshop.ts';
import { EMPTY_SELECTION, buildWorkshopView, toggleSymbol } from '../src/view/workshop-view.ts';
import type { Selection } from '../src/view/workshop-view.ts';
import { FIXTURE, deepFreeze } from './combat/fixtures.ts';

const DATA: CombatData = deepFreeze({
  ...FIXTURE,
  balance: {
    ...FIXTURE.balance,
    powerBudget: 10,
    leftoverHealth: 1,
    workshop: { emberCost: 2, inkPerPower: 4 },
  },
});
const UNLOCKED: Unlocked = deepFreeze({
  elements: ['ogien', 'woda', 'ziemia', 'wiatr'],
  forms: ['wilk', 'kruk', 'sowa', 'jelen'],
  traits: ['gniew', 'smutek', 'spryt', 'odwaga'],
});
const pick = (element: string | null, form: string | null, trait: string | null): Selection => ({
  element,
  form,
  trait,
});

describe('toggleSymbol', () => {
  it('picks a symbol in its slot and leaves the other slots alone', () => {
    const a = toggleSymbol(EMPTY_SELECTION, 'form', 'kruk');
    expect(a).toEqual(pick(null, 'kruk', null));
    expect(toggleSymbol(a, 'element', 'woda')).toEqual(pick('woda', 'kruk', null));
    expect(toggleSymbol(a, 'trait', 'smutek')).toEqual(pick(null, 'kruk', 'smutek'));
  });

  it('replaces the symbol of the slot with another one', () => {
    expect(toggleSymbol(pick('woda', null, null), 'element', 'ogien')).toEqual(
      pick('ogien', null, null),
    );
  });

  it('clears the slot when the same symbol is picked again', () => {
    expect(toggleSymbol(pick('woda', 'kruk', null), 'element', 'woda')).toEqual(
      pick(null, 'kruk', null),
    );
  });

  it('does not check the id and does not change its input', () => {
    const start = Object.freeze(pick('woda', null, null));
    expect(toggleSymbol(start, 'trait', 'nie-ma')).toEqual(pick('woda', null, 'nie-ma'));
    expect(start).toEqual(pick('woda', null, null));
  });

  it('starts from an empty selection', () => {
    expect(EMPTY_SELECTION).toEqual(pick(null, null, null));
  });
});

describe('buildWorkshopView: the columns', () => {
  const view = buildWorkshopView(DATA, UNLOCKED, 30, EMPTY_SELECTION);

  it('has three columns in the order element, form, trait', () => {
    expect(view.columns.map((c) => c.kind)).toEqual(['element', 'form', 'trait']);
  });

  it('lists the unlocked symbols in the order of the data, with their power cost', () => {
    const [elements, forms, traits] = view.columns;
    expect(elements.choices.map((c) => [c.id, c.cost])).toEqual([
      ['ogien', 3],
      ['woda', 2],
      ['ziemia', 2],
      ['wiatr', 2],
    ]);
    expect(forms.choices.map((c) => [c.id, c.cost])).toEqual([
      ['wilk', 4],
      ['kruk', 3],
      ['sowa', 3],
      ['jelen', 4],
    ]);
    expect(traits.choices.map((c) => [c.id, c.cost])).toEqual([
      ['gniew', 3],
      ['smutek', 1],
      ['spryt', 2],
      ['odwaga', 2],
    ]);
  });

  it('shows no choice for a locked symbol and ignores unknown unlocked ids', () => {
    const some: Unlocked = { elements: ['wiatr', 'lod', 'woda'], forms: [], traits: ['spryt'] };
    const v = buildWorkshopView(DATA, some, 0, EMPTY_SELECTION);
    expect(v.columns[0].choices.map((c) => c.id)).toEqual(['woda', 'wiatr']);
    expect(v.columns[1].choices).toEqual([]);
    expect(v.columns[2].choices.map((c) => c.id)).toEqual(['spryt']);
  });

  it('marks exactly the picked symbol of each column as selected', () => {
    const v = buildWorkshopView(DATA, UNLOCKED, 30, pick('ziemia', 'sowa', 'gniew'));
    for (const column of v.columns) {
      expect(column.choices.filter((c) => c.selected)).toHaveLength(1);
    }
    expect(v.columns[0].choices.find((c) => c.selected)?.id).toBe('ziemia');
    expect(v.columns[1].choices.find((c) => c.selected)?.id).toBe('sowa');
    expect(v.columns[2].choices.find((c) => c.selected)?.id).toBe('gniew');
    const empty = buildWorkshopView(DATA, UNLOCKED, 30, EMPTY_SELECTION);
    expect(empty.columns.every((col) => col.choices.every((c) => !c.selected))).toBe(true);
  });
});

describe('buildWorkshopView: power and ink', () => {
  it('starts at 0 of the budget and passes the ink through', () => {
    const v = buildWorkshopView(DATA, UNLOCKED, 17, EMPTY_SELECTION);
    expect(v.power).toEqual({ used: 0, max: 10 });
    expect(v.ink).toBe(17);
  });

  it('adds up the cost of the picked symbols', () => {
    expect(buildWorkshopView(DATA, UNLOCKED, 0, pick('woda', null, null)).power.used).toBe(2);
    expect(buildWorkshopView(DATA, UNLOCKED, 0, pick('woda', 'kruk', null)).power.used).toBe(5);
    expect(buildWorkshopView(DATA, UNLOCKED, 0, pick('woda', 'kruk', 'smutek')).power.used).toBe(6);
    expect(buildWorkshopView(DATA, UNLOCKED, 0, pick('ogien', 'wilk', 'gniew')).power.used).toBe(
      10,
    );
  });

  it('counts a picked symbol that is not unlocked and ignores an unknown id', () => {
    expect(buildWorkshopView(DATA, UNLOCKED, 0, pick('grom', 'kruk', 'smutek')).power.used).toBe(7);
    expect(buildWorkshopView(DATA, UNLOCKED, 0, pick('lod', 'kruk', null)).power.used).toBe(3);
  });

  it('takes the maximum from the power budget of the data', () => {
    const tight: CombatData = { ...DATA, balance: { ...DATA.balance, powerBudget: 8 } };
    expect(buildWorkshopView(tight, UNLOCKED, 0, EMPTY_SELECTION).power.max).toBe(8);
  });
});

describe('buildWorkshopView: the preview and the verdict', () => {
  it('is incomplete until three symbols are picked', () => {
    for (const selection of [
      EMPTY_SELECTION,
      pick('woda', null, null),
      pick('woda', 'kruk', null),
      pick(null, 'kruk', 'smutek'),
      pick('woda', null, 'smutek'),
    ]) {
      const v = buildWorkshopView(DATA, UNLOCKED, 99, selection);
      expect(v.preview).toBeNull();
      expect(v.canCraft).toBe(false);
      expect(v.blocked).toBe('incomplete');
    }
  });

  it('previews the creature and allows making it when the ink is enough', () => {
    const v = buildWorkshopView(DATA, UNLOCKED, 30, pick('woda', 'kruk', 'smutek'));
    expect(v.preview).toEqual({
      cardId: 'woda-kruk-smutek',
      attack: 2,
      health: 8,
      powerCost: 6,
      inkCost: 24,
      emberCost: 2,
    });
    expect(v.canCraft).toBe(true);
    expect(v.blocked).toBeNull();
  });

  it('allows exactly enough ink and refuses one ink less, keeping the preview', () => {
    const exact = buildWorkshopView(DATA, UNLOCKED, 24, pick('woda', 'kruk', 'smutek'));
    expect(exact.canCraft).toBe(true);
    const poor = buildWorkshopView(DATA, UNLOCKED, 23, pick('woda', 'kruk', 'smutek'));
    expect(poor.canCraft).toBe(false);
    expect(poor.blocked).toBe('workshop.error.not_enough_ink');
    expect(poor.preview).toEqual(exact.preview);
  });

  it('prices the dearest creature at the whole budget', () => {
    const v = buildWorkshopView(DATA, UNLOCKED, 40, pick('ogien', 'wilk', 'gniew'));
    expect(v.preview).toMatchObject({ cardId: 'ogien-wilk-gniew', powerCost: 10, inkCost: 40 });
    expect(v.canCraft).toBe(true);
  });

  it('refuses a locked symbol without a preview', () => {
    const v = buildWorkshopView(DATA, UNLOCKED, 99, pick('grom', 'kruk', 'smutek'));
    expect(v.preview).toBeNull();
    expect(v.canCraft).toBe(false);
    expect(v.blocked).toBe('workshop.error.locked_symbol');
  });

  it('refuses an unknown symbol before a locked one', () => {
    const v = buildWorkshopView(DATA, UNLOCKED, 99, pick('lod', 'kruk', 'smutek'));
    expect(v.blocked).toBe('workshop.error.unknown_symbol');
    expect(v.preview).toBeNull();
  });

  it('refuses a creature over the power budget', () => {
    const tight: CombatData = { ...DATA, balance: { ...DATA.balance, powerBudget: 5 } };
    const v = buildWorkshopView(tight, UNLOCKED, 99, pick('woda', 'kruk', 'smutek'));
    expect(v.preview).toBeNull();
    expect(v.canCraft).toBe(false);
    expect(v.blocked).toBe('workshop.error.over_budget');
    expect(v.power).toEqual({ used: 6, max: 5 });
  });

  it('throws an Error when the Workshop is not configured', () => {
    const noWorkshop: CombatData = {
      ...DATA,
      balance: { playerMaxHp: 40, ritual: DATA.balance.ritual, powerBudget: 10 },
    };
    const noBudget: CombatData = {
      ...DATA,
      balance: { playerMaxHp: 40, ritual: DATA.balance.ritual },
    };
    expect(() => buildWorkshopView(noWorkshop, UNLOCKED, 0, EMPTY_SELECTION)).toThrow(Error);
    expect(() => buildWorkshopView(noBudget, UNLOCKED, 0, EMPTY_SELECTION)).toThrow(Error);
  });

  it('is deterministic and does not change its arguments', () => {
    const selection = Object.freeze(pick('woda', 'kruk', 'smutek'));
    const a = buildWorkshopView(DATA, UNLOCKED, 30, selection);
    const b = buildWorkshopView(DATA, UNLOCKED, 30, selection);
    expect(a).toEqual(b);
    expect(selection).toEqual(pick('woda', 'kruk', 'smutek'));
  });
});
