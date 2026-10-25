// Types of the combat model. Pure data: no behaviour, no imports from outside src/core.

import type { Rng } from '../rng.ts';
import type {
  CreatureSpec,
  EffectOp,
  EffectTrigger,
  ElementId,
  SymbolData,
} from '../types.ts';
import type { DeckState } from './deck.ts';
import type { EnemyAction } from './enemy-turn.ts';
import type { BossAction } from './intent.ts';

/** One atomic change a card, a creature or a ritual can make. */
export type Effect =
  | { readonly kind: 'damage'; readonly amount: number; readonly pierce?: boolean }
  | { readonly kind: 'block'; readonly amount: number }
  | { readonly kind: 'heal'; readonly amount: number }
  | { readonly kind: 'draw'; readonly count: number }
  | { readonly kind: 'ember'; readonly amount: number };

export type CardDef =
  | {
      readonly id: string;
      readonly kind: 'creature';
      readonly cost: number;
      readonly creature: CreatureSpec;
    }
  | {
      readonly id: string;
      readonly kind: 'spell';
      readonly cost: number;
      /** Element of the damage effects; null = no element. */
      readonly element: ElementId | null;
      readonly effects: readonly Effect[];
    }
  | { readonly id: string; readonly kind: 'curse' };

export interface EnemyActionDef extends BossAction {
  readonly effects: readonly EnemyAction[];
}

export interface EnemyDef {
  readonly id: string;
  readonly maxHp: number;
  readonly resist: readonly ElementId[];
  readonly weak: readonly ElementId[];
  readonly actions: readonly EnemyActionDef[];
}

/** Workshop prices (S03-07). */
export interface WorkshopBalance {
  /** Ember cost of every creature card made from three symbols (a fixed power budget means equal power). */
  readonly emberCost: number;
  /** Ink price of a creature = total symbol cost x this. */
  readonly inkPerPower: number;
}

export interface Balance {
  readonly playerMaxHp: number;
  /** Ritual effect per element; applies element damage with the ritual's element. */
  readonly ritual: Readonly<Record<ElementId, readonly Effect[]>>;
  /** Every creature has this total symbol cost at most (game design document: 10). */
  readonly powerBudget?: number;
  /** Health a creature gets for every unspent budget point; absent or 0 = no bonus (decision D22). */
  readonly leftoverHealth?: number;
  /** Prices of the Workshop (S03-07); absent when the Workshop is not available. */
  readonly workshop?: WorkshopBalance;
}

export interface CombatData {
  readonly symbols: SymbolData;
  readonly cards: Readonly<Record<string, CardDef>>;
  readonly enemies: Readonly<Record<string, EnemyDef>>;
  readonly balance: Balance;
  readonly decks: Readonly<Record<string, readonly string[]>>;
}

export interface Creature extends CreatureSpec {
  readonly cardId: string;
  readonly attack: number;
  readonly health: number;
  readonly maxHealth: number;
}

/** What the enemy will do at the end of the current player turn; shown to the player. */
export interface Intent {
  readonly actionId: string;
  readonly actions: readonly EnemyAction[];
}

export type Phase = 'player' | 'won' | 'lost';

export interface CombatState {
  /** 1-based; increases when a new player turn starts. */
  readonly turn: number;
  readonly phase: Phase;
  readonly player: {
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    /** Always 3 entries; null = empty circle. */
    readonly circles: readonly (Creature | null)[];
    readonly curses: number;
  };
  readonly enemy: {
    readonly id: string;
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    readonly resist: readonly ElementId[];
    readonly weak: readonly ElementId[];
    readonly stolen: readonly string[];
    /** Ids of the actions the enemy has used, oldest first. */
    readonly history: readonly string[];
  };
  readonly deck: DeckState;
  readonly ember: number;
  /** True after the first ritual: only one ritual per combat. */
  readonly ritualUsed: boolean;
  readonly intent: Intent;
}

export type CombatAction =
  | { readonly type: 'playCard'; readonly handIndex: number; readonly circle?: number }
  | { readonly type: 'endTurn' };

export type RejectReason =
  | 'combat_over'
  | 'no_such_card'
  | 'unplayable'
  | 'not_enough_ember'
  | 'circle_required'
  | 'circle_occupied';

export type CombatEvent =
  | { readonly type: 'turn_started'; readonly turn: number; readonly intentId: string }
  | { readonly type: 'card_played'; readonly cardId: string }
  | { readonly type: 'creature_summoned'; readonly circle: number; readonly cardId: string }
  | {
      readonly type: 'enemy_damaged';
      readonly source: 'spell' | 'creature' | 'ritual';
      readonly circle?: number;
      readonly dealt: number;
      readonly blocked: number;
    }
  | { readonly type: 'ritual'; readonly element: ElementId }
  | { readonly type: 'enemy_acted'; readonly actionId: string; readonly log: readonly string[] }
  | {
      readonly type: 'effect';
      readonly circle: number;
      readonly trigger: EffectTrigger;
      readonly op: EffectOp;
      /** Amount after scaling by the scope (always >= 1; effects that scale to 0 do not fire). */
      readonly amount: number;
    }
  | { readonly type: 'creature_died'; readonly circle: number }
  | { readonly type: 'player_damaged'; readonly amount: number }
  | { readonly type: 'combat_won' }
  | { readonly type: 'combat_lost' }
  | { readonly type: 'rejected'; readonly reason: RejectReason };

export interface CombatSetup {
  /** Card ids of the whole deck (duplicates allowed). */
  readonly deck: readonly string[];
  readonly enemyId: string;
}

/** What the reducer needs besides the state. */
export interface CombatEnv {
  readonly data: CombatData;
  /** The only source of randomness; used for shuffling the deck. */
  readonly rng: Rng;
}

export interface CombatResult {
  readonly state: CombatState;
  /** What happened, in order; `[{ type: 'rejected', ... }]` for an illegal action. */
  readonly events: readonly CombatEvent[];
}
