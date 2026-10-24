// Symbol definitions. Display names (name, genitive, adjective) live in the language files under
// `symbol.<kind>.<id>.*`, not here (decision D10).

/** Symbol ids come from the data files (decision D11), so they are plain strings. */
export type ElementId = string;
export type FormId = string;
export type TraitId = string;

/** A creature is defined by exactly three symbols. */
export interface CreatureSpec {
  readonly element: ElementId;
  readonly form: FormId;
  readonly trait: TraitId;
}

export type Gender = 'm' | 'f';

export interface ElementDef {
  id: string;
  cost: number;
  attackBonus: number;
  healthBonus: number;
}

export interface FormDef {
  id: string;
  cost: number;
  baseAttack: number;
  baseHealth: number;
  gender: Gender;
}

export interface TraitDef {
  id: string;
  cost: number;
  attackMod: number;
  healthMod: number;
}

export interface SymbolData {
  readonly elements: readonly ElementDef[];
  readonly forms: readonly FormDef[];
  readonly traits: readonly TraitDef[];
}
