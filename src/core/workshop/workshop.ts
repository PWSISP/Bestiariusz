import type { CardDef, CombatData } from '../combat/model.ts';
import { evaluateCreature } from '../creatures.ts';
import type { CreatureStats } from '../creatures.ts';
import type { CreatureSpec } from '../types.ts';

/** Symbols the player has found so far; the Workshop only combines these. */
export interface Unlocked {
  readonly elements: readonly string[];
  readonly forms: readonly string[];
  readonly traits: readonly string[];
}

/** i18n keys of the reasons a creature cannot be made; the UI shows them with t(). */
export type WorkshopError =
  | 'workshop.error.unknown_symbol'
  | 'workshop.error.locked_symbol'
  | 'workshop.error.over_budget'
  | 'workshop.error.not_enough_ink';

export interface WorkshopPreview {
  /** `<element>-<form>-<trait>`: the id of the card the Workshop makes. */
  readonly cardId: string;
  readonly stats: CreatureStats;
  /** Ink the creature costs: total symbol cost x balance.workshop.inkPerPower. */
  readonly inkCost: number;
  /** Ember the card costs when played: balance.workshop.emberCost. */
  readonly emberCost: number;
  readonly card: Extract<CardDef, { kind: 'creature' }>;
}

export type PreviewResult =
  | { readonly ok: true; readonly preview: WorkshopPreview }
  | { readonly ok: false; readonly error: WorkshopError };

export type CraftResult =
  | {
      readonly ok: true;
      /** The ink left after paying. */
      readonly ink: number;
      readonly card: Extract<CardDef, { kind: 'creature' }>;
    }
  | { readonly ok: false; readonly error: WorkshopError };

/**
 * What the Workshop would make of three symbols, and what it would cost. Ink in the wallet is not
 * checked here (the screen shows the price before the player can afford it). Checks, in this order:
 * unknown symbol, symbol not unlocked, over the power budget. Throws an Error when
 * `data.balance` has no `workshop` or no `powerBudget`.
 */
export function previewCreature(
  data: CombatData,
  unlocked: Unlocked,
  spec: CreatureSpec,
): PreviewResult {
  const { workshop, powerBudget } = data.balance;
  if (!workshop || powerBudget === undefined) throw new Error('The Workshop is not configured');
  const { symbols } = data;
  if (
    !symbols.elements.some((e) => e.id === spec.element) ||
    !symbols.forms.some((f) => f.id === spec.form) ||
    !symbols.traits.some((t) => t.id === spec.trait)
  ) {
    return { ok: false, error: 'workshop.error.unknown_symbol' };
  }
  if (
    !unlocked.elements.includes(spec.element) ||
    !unlocked.forms.includes(spec.form) ||
    !unlocked.traits.includes(spec.trait)
  ) {
    return { ok: false, error: 'workshop.error.locked_symbol' };
  }
  const stats = evaluateCreature(symbols, spec, {
    powerBudget,
    leftoverHealth: data.balance.leftoverHealth ?? 0,
  });
  if (!stats.valid) return { ok: false, error: 'workshop.error.over_budget' };
  const cardId = `${spec.element}-${spec.form}-${spec.trait}`;
  return {
    ok: true,
    preview: {
      cardId,
      stats,
      inkCost: stats.cost * workshop.inkPerPower,
      emberCost: workshop.emberCost,
      card: {
        id: cardId,
        kind: 'creature',
        cost: workshop.emberCost,
        creature: { element: spec.element, form: spec.form, trait: spec.trait },
      },
    },
  };
}

/**
 * Makes the creature: the same checks as `previewCreature`, then the player must have the ink
 * (exactly enough is enough). Pure: returns the ink left and the new card; the caller stores them.
 */
export function craftCreature(
  data: CombatData,
  unlocked: Unlocked,
  ink: number,
  spec: CreatureSpec,
): CraftResult {
  const result = previewCreature(data, unlocked, spec);
  if (!result.ok) return result;
  const { inkCost, card } = result.preview;
  if (ink < inkCost) return { ok: false, error: 'workshop.error.not_enough_ink' };
  return { ok: true, ink: ink - inkCost, card };
}
