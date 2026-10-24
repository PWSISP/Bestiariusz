// Symbol definitions. Display names (name, genitive, adjective) live in the language files under
// `symbol.<kind>.<id>.*`, not here (decision D10).

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
