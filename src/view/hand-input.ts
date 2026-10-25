// Touch input of the hand (S04-02b): a small state machine that turns pointer events into "select",
// "drag" and "play" decisions. Pure: the screen feeds it events and does what the intent says.
import type { Rect } from './geometry.ts';

/** A pointer must travel this far (CSS pixels) from where it went down before a press becomes a drag. */
export const DRAG_THRESHOLD = 8;

export type HandInputState =
  | { readonly mode: 'idle' }
  /** A card is selected (lifted); the next tap decides what happens to it. */
  | { readonly mode: 'selected'; readonly handIndex: number }
  /** The pointer is down on a card and has not moved far enough to drag. */
  | {
      readonly mode: 'pressing';
      readonly handIndex: number;
      readonly startX: number;
      readonly startY: number;
      /** The card was already selected when the pointer went down. */
      readonly wasSelected: boolean;
    }
  /** The card follows the pointer. */
  | {
      readonly mode: 'dragging';
      readonly handIndex: number;
      readonly x: number;
      readonly y: number;
      /** Index of the free circle under the pointer (creature cards only), else null. */
      readonly overCircle: number | null;
      /** A spell is above the cast line (spell cards only). */
      readonly overCast: boolean;
    };

export interface HandCardInfo {
  readonly kind: 'creature' | 'spell' | 'curse';
  /** Enough Ember and not a curse. */
  readonly playable: boolean;
  /** Why the card cannot be played; null when it can. */
  readonly blocked: 'not_enough_ember' | 'unplayable' | null;
}

export interface HandInputContext {
  /** The cards in hand, in order. */
  readonly hand: readonly HandCardInfo[];
  /** Per circle: true = empty. Three entries. */
  readonly freeCircles: readonly boolean[];
  /** Per circle: its touch area. Three entries. */
  readonly circleRects: readonly Rect[];
  /** A spell released above this y is cast. */
  readonly castLineY: number;
}

export type HandInputEvent =
  | {
      readonly type: 'pointerDown';
      readonly handIndex: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'pointerMove'; readonly x: number; readonly y: number }
  | { readonly type: 'pointerUp'; readonly x: number; readonly y: number }
  | { readonly type: 'pointerCancel' }
  /** A tap on a circle (a click on its button). */
  | { readonly type: 'tapCircle'; readonly circle: number }
  /** A tap on empty board. */
  | { readonly type: 'tapOutside' }
  /** The hand changed (a card was played, a new turn started): forget everything. */
  | { readonly type: 'reset' };

export type HandIntent =
  | { readonly type: 'none' }
  /** Play the card; `circle` is present for creature cards only. */
  | { readonly type: 'play'; readonly handIndex: number; readonly circle?: number }
  /** The player tried something that is not allowed; the screen shows why. */
  | {
      readonly type: 'refuse';
      readonly handIndex: number;
      readonly reason: 'not_enough_ember' | 'unplayable' | 'circle_occupied';
    };

export interface HandInputResult {
  readonly state: HandInputState;
  readonly intent: HandIntent;
}

export const IDLE: HandInputState = { mode: 'idle' };

export function reduceHandInput(
  _state: HandInputState,
  _event: HandInputEvent,
  _ctx: HandInputContext,
): HandInputResult {
  throw new Error('Not implemented');
}
