// Reference implementation of S06-02a (written by Claude, not by Qwen). It checks that the test is
// satisfiable and is what Claude takes over with after five failed Qwen attempts. Not part of the app.
import type { CombatData } from '../../src/core/combat/model.ts';
import { craftCreature, previewCreature } from '../../src/core/workshop/workshop.ts';
import type { Unlocked, WorkshopError } from '../../src/core/workshop/workshop.ts';

export type SymbolKind = 'element' | 'form' | 'trait';

export interface Selection {
  readonly element: string | null;
  readonly form: string | null;
  readonly trait: string | null;
}

export const EMPTY_SELECTION: Selection = { element: null, form: null, trait: null };

export interface SymbolChoice {
  readonly id: string;
  readonly cost: number;
  readonly selected: boolean;
}

export interface SymbolColumn {
  readonly kind: SymbolKind;
  readonly choices: readonly SymbolChoice[];
}

export type CraftBlock = WorkshopError | 'incomplete';

export interface WorkshopPreviewView {
  readonly cardId: string;
  readonly attack: number;
  readonly health: number;
  readonly powerCost: number;
  readonly inkCost: number;
  readonly emberCost: number;
}

export interface WorkshopView {
  readonly columns: readonly [SymbolColumn, SymbolColumn, SymbolColumn];
  readonly power: { readonly used: number; readonly max: number };
  readonly ink: number;
  readonly preview: WorkshopPreviewView | null;
  readonly canCraft: boolean;
  readonly blocked: CraftBlock | null;
}

export function toggleSymbol(selection: Selection, kind: SymbolKind, id: string): Selection {
  return { ...selection, [kind]: selection[kind] === id ? null : id };
}

export function buildWorkshopView(
  data: CombatData,
  unlocked: Unlocked,
  ink: number,
  selection: Selection,
): WorkshopView {
  const max = data.balance.powerBudget;
  if (max === undefined || !data.balance.workshop) throw new Error('The Workshop is not configured');
  const column = (
    kind: SymbolKind,
    defs: readonly { id: string; cost: number }[],
    ids: readonly string[],
  ): SymbolColumn => ({
    kind,
    choices: defs
      .filter((d) => ids.includes(d.id))
      .map((d) => ({ id: d.id, cost: d.cost, selected: selection[kind] === d.id })),
  });
  const { symbols } = data;
  const cost = (defs: readonly { id: string; cost: number }[], id: string | null): number =>
    defs.find((d) => d.id === id)?.cost ?? 0;
  const used =
    cost(symbols.elements, selection.element) +
    cost(symbols.forms, selection.form) +
    cost(symbols.traits, selection.trait);
  const base = {
    columns: [
      column('element', symbols.elements, unlocked.elements),
      column('form', symbols.forms, unlocked.forms),
      column('trait', symbols.traits, unlocked.traits),
    ] as const,
    power: { used, max },
    ink,
  };
  const { element, form, trait } = selection;
  if (element === null || form === null || trait === null) {
    return { ...base, preview: null, canCraft: false, blocked: 'incomplete' };
  }
  const spec = { element, form, trait };
  const shown = previewCreature(data, unlocked, spec);
  if (!shown.ok) return { ...base, preview: null, canCraft: false, blocked: shown.error };
  const { preview } = shown;
  const view: WorkshopPreviewView = {
    cardId: preview.cardId,
    attack: preview.stats.attack,
    health: preview.stats.health,
    powerCost: preview.stats.cost,
    inkCost: preview.inkCost,
    emberCost: preview.emberCost,
  };
  const crafted = craftCreature(data, unlocked, ink, spec);
  return crafted.ok
    ? { ...base, preview: view, canCraft: true, blocked: null }
    : { ...base, preview: view, canCraft: false, blocked: crafted.error };
}
