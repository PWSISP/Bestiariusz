// View model of the Workshop screen (S06-02a): which symbols the player can pick, what the creature
// would be and cost, and whether it can be made. Pure: no DOM, no PixiJS, no texts (the screen turns
// the ids into names with i18n). The rules of the Workshop itself live in src/core/workshop.
import type { CombatData } from '../core/combat/model.ts';
import type { Unlocked, WorkshopError } from '../core/workshop/workshop.ts';

export type SymbolKind = 'element' | 'form' | 'trait';

/** The symbols picked so far; null = nothing picked in that slot. */
export interface Selection {
  readonly element: string | null;
  readonly form: string | null;
  readonly trait: string | null;
}

export const EMPTY_SELECTION: Selection = { element: null, form: null, trait: null };

export interface SymbolChoice {
  readonly id: string;
  /** Power cost of the symbol. */
  readonly cost: number;
  readonly selected: boolean;
}

export interface SymbolColumn {
  readonly kind: SymbolKind;
  readonly choices: readonly SymbolChoice[];
}

/** Why the creature cannot be made now; 'incomplete' = fewer than three symbols picked. */
export type CraftBlock = WorkshopError | 'incomplete';

export interface WorkshopPreviewView {
  /** `<element>-<form>-<trait>`: the id of the card that would be made. */
  readonly cardId: string;
  readonly attack: number;
  readonly health: number;
  /** Total power cost of the three symbols. */
  readonly powerCost: number;
  readonly inkCost: number;
  readonly emberCost: number;
}

export interface WorkshopView {
  /** Always three columns, in the order element, form, trait. */
  readonly columns: readonly [SymbolColumn, SymbolColumn, SymbolColumn];
  readonly power: { readonly used: number; readonly max: number };
  readonly ink: number;
  readonly preview: WorkshopPreviewView | null;
  readonly canCraft: boolean;
  readonly blocked: CraftBlock | null;
}

/** Picks the symbol, or clears the slot when that symbol is already picked there. Returns a new selection. */
export function toggleSymbol(_selection: Selection, _kind: SymbolKind, _id: string): Selection {
  throw new Error('Not implemented');
}

/**
 * What the Workshop screen shows (see the task file for the rules). Throws an Error when
 * `data.balance` has no `workshop` or no `powerBudget`.
 */
export function buildWorkshopView(
  _data: CombatData,
  _unlocked: Unlocked,
  _ink: number,
  _selection: Selection,
): WorkshopView {
  throw new Error('Not implemented');
}
