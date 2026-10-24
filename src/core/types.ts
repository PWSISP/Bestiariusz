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

/** When a creature effect fires (docs/efekty-symboli.md, "Kiedy działają efekty"). */
export type EffectTrigger = 'summon' | 'attack' | 'damaged' | 'turnEnd';

/** What a creature effect does. A new operation is one new case in `applyOp` (effects.ts). */
export type EffectOp =
  'strike' | 'guard' | 'mend' | 'draw' | 'kindle' | 'growAttack' | 'growHealth' | 'regen';

/** What the effect amount is multiplied by: how many creatures of the given kind stand in the circles. */
export type EffectScope = 'self' | 'sameElementOthers' | 'sameElementAll' | 'othersAny';

/** One effect of a symbol. Resolved amount = amount x number of creatures counted by `scope`. */
export interface CreatureEffectDef {
  trigger: EffectTrigger;
  op: EffectOp;
  amount: number;
  scope: EffectScope;
  /** Only for `strike`: ignores the enemy block. */
  pierce?: boolean;
}

export interface ElementDef {
  id: string;
  cost: number;
  attackBonus: number;
  healthBonus: number;
  effects?: readonly CreatureEffectDef[];
}

export interface FormDef {
  id: string;
  cost: number;
  baseAttack: number;
  baseHealth: number;
  gender: Gender;
  effects?: readonly CreatureEffectDef[];
}

export interface TraitDef {
  id: string;
  cost: number;
  attackMod: number;
  healthMod: number;
  effects?: readonly CreatureEffectDef[];
}

export interface SymbolData {
  readonly elements: readonly ElementDef[];
  readonly forms: readonly FormDef[];
  readonly traits: readonly TraitDef[];
}
