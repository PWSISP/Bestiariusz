// View model of the Workshop screen (S06-02a): which symbols the player can pick, what the creature
// would be and cost, and whether it can be made. Pure: no DOM, no PixiJS, no texts (the screen turns
// the ids into names with i18n). The rules of the Workshop itself live in src/core/workshop.
import type { CombatData } from '../core/combat/model.ts';
import type { Unlocked, WorkshopError } from '../core/workshop/workshop.ts';
import { previewCreature, craftCreature } from '../core/workshop/workshop.ts';

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
export function toggleSymbol(selection: Selection, kind: SymbolKind, id: string): Selection {
  if (selection[kind] === id) {
    // Clear the slot
    return { ...selection, [kind]: null };
  } else {
    // Set the slot to the new id
    return { ...selection, [kind]: id };
  }
}

/**
 * What the Workshop screen shows (see the task file for the rules). Throws an Error when
 * `data.balance` has no `workshop` or no `powerBudget`.
 */
export function buildWorkshopView(
  data: CombatData,
  unlocked: Unlocked,
  ink: number,
  selection: Selection,
): WorkshopView {
  const { workshop, powerBudget } = data.balance;
  if (!workshop || powerBudget === undefined) throw new Error('The Workshop is not configured');

  // Create columns with unlocked symbols in the order of data.symbols
  const elementChoices: SymbolChoice[] = [];
  for (const symbol of data.symbols.elements) {
    if (unlocked.elements.includes(symbol.id)) {
      elementChoices.push({
        id: symbol.id,
        cost: symbol.cost,
        selected: selection.element === symbol.id,
      });
    }
  }

  const formChoices: SymbolChoice[] = [];
  for (const symbol of data.symbols.forms) {
    if (unlocked.forms.includes(symbol.id)) {
      formChoices.push({
        id: symbol.id,
        cost: symbol.cost,
        selected: selection.form === symbol.id,
      });
    }
  }

  const traitChoices: SymbolChoice[] = [];
  for (const symbol of data.symbols.traits) {
    if (unlocked.traits.includes(symbol.id)) {
      traitChoices.push({
        id: symbol.id,
        cost: symbol.cost,
        selected: selection.trait === symbol.id,
      });
    }
  }

  const columns: [SymbolColumn, SymbolColumn, SymbolColumn] = [
    { kind: 'element', choices: elementChoices },
    { kind: 'form', choices: formChoices },
    { kind: 'trait', choices: traitChoices },
  ];

  // Calculate power used
  let powerUsed = 0;

  // Helper to get symbol cost or 0 if not found
  const getCost = (id: string | null, symbols: readonly { id: string; cost: number }[]): number => {
    if (id === null) return 0;
    const symbol = symbols.find((s) => s.id === id);
    return symbol ? symbol.cost : 0;
  };

  powerUsed += getCost(selection.element, data.symbols.elements);
  powerUsed += getCost(selection.form, data.symbols.forms);
  powerUsed += getCost(selection.trait, data.symbols.traits);

  const power = { used: powerUsed, max: powerBudget };

  // If any slot is null, return incomplete state
  if (selection.element === null || selection.form === null || selection.trait === null) {
    return {
      columns,
      power,
      ink,
      preview: null,
      canCraft: false,
      blocked: 'incomplete',
    };
  }

  // Try to preview the creature
  const previewResult = previewCreature(data, unlocked, {
    element: selection.element,
    form: selection.form,
    trait: selection.trait,
  });

  if (!previewResult.ok) {
    return {
      columns,
      power,
      ink,
      preview: null,
      canCraft: false,
      blocked: previewResult.error,
    };
  }

  const { cardId, stats, inkCost, emberCost } = previewResult.preview;

  // Create the preview view object
  const preview: WorkshopPreviewView = {
    cardId,
    attack: stats.attack,
    health: stats.health,
    powerCost: stats.cost,
    inkCost,
    emberCost,
  };

  // Try to craft the creature
  const craftResult = craftCreature(data, unlocked, ink, {
    element: selection.element,
    form: selection.form,
    trait: selection.trait,
  });

  return {
    columns,
    power,
    ink,
    preview,
    canCraft: craftResult.ok,
    blocked: craftResult.ok ? null : craftResult.error,
  };
}
