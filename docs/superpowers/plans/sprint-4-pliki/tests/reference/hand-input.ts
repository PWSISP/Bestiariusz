// Touch input of the hand (S04-02b): a small state machine that turns pointer events into "select",
// "drag" and "play" decisions. Pure: the screen feeds it events and does what the intent says.
import type { Rect } from '../../src/view/geometry.ts';

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
  | { readonly type: 'pointerDown'; readonly handIndex: number; readonly x: number; readonly y: number }
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

const NONE: HandIntent = { type: 'none' };

function circleAt(ctx: HandInputContext, x: number, y: number): number | null {
  for (let i = 0; i < ctx.circleRects.length; i++) {
    const r = ctx.circleRects[i] as Rect;
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) return i;
  }
  return null;
}

function dragging(
  handIndex: number,
  x: number,
  y: number,
  ctx: HandInputContext,
): HandInputState {
  const info = ctx.hand[handIndex] as HandCardInfo;
  const hit = info.kind === 'creature' ? circleAt(ctx, x, y) : null;
  return {
    mode: 'dragging',
    handIndex,
    x,
    y,
    overCircle: hit !== null && ctx.freeCircles[hit] === true ? hit : null,
    overCast: info.kind === 'spell' && y < ctx.castLineY,
  };
}

export function reduceHandInput(
  state: HandInputState,
  event: HandInputEvent,
  ctx: HandInputContext,
): HandInputResult {
  if (event.type === 'reset') return { state: IDLE, intent: NONE };
  // A state that points at a card that is gone counts as idle.
  const stale = state.mode !== 'idle' && !(state.handIndex >= 0 && state.handIndex < ctx.hand.length);
  const current: HandInputState = stale ? IDLE : state;
  const keep: HandInputResult = { state: current, intent: NONE };

  switch (event.type) {
    case 'pointerDown': {
      if (current.mode === 'pressing' || current.mode === 'dragging') return keep;
      const { handIndex } = event;
      if (!Number.isInteger(handIndex) || handIndex < 0 || handIndex >= ctx.hand.length) return keep;
      return {
        state: {
          mode: 'pressing',
          handIndex,
          startX: event.x,
          startY: event.y,
          wasSelected: current.mode === 'selected' && current.handIndex === handIndex,
        },
        intent: NONE,
      };
    }
    case 'pointerMove': {
      if (current.mode === 'dragging') {
        return { state: dragging(current.handIndex, event.x, event.y, ctx), intent: NONE };
      }
      if (current.mode !== 'pressing') return keep;
      const distance = Math.hypot(event.x - current.startX, event.y - current.startY);
      const info = ctx.hand[current.handIndex] as HandCardInfo;
      if (distance < DRAG_THRESHOLD || !info.playable) return keep;
      return { state: dragging(current.handIndex, event.x, event.y, ctx), intent: NONE };
    }
    case 'pointerUp': {
      if (current.mode === 'pressing') {
        const { handIndex } = current;
        const info = ctx.hand[handIndex] as HandCardInfo;
        if (!current.wasSelected) {
          return { state: { mode: 'selected', handIndex }, intent: NONE };
        }
        if (info.kind !== 'spell') return { state: IDLE, intent: NONE };
        if (info.playable) return { state: IDLE, intent: { type: 'play', handIndex } };
        return {
          state: { mode: 'selected', handIndex },
          intent: { type: 'refuse', handIndex, reason: info.blocked ?? 'unplayable' },
        };
      }
      if (current.mode === 'dragging') {
        const { handIndex } = current;
        const info = ctx.hand[handIndex] as HandCardInfo;
        if (info.kind === 'spell') {
          return event.y < ctx.castLineY
            ? { state: IDLE, intent: { type: 'play', handIndex } }
            : { state: IDLE, intent: NONE };
        }
        const circle = circleAt(ctx, event.x, event.y);
        if (circle === null) return { state: IDLE, intent: NONE };
        if (ctx.freeCircles[circle] === true) {
          return { state: IDLE, intent: { type: 'play', handIndex, circle } };
        }
        return { state: IDLE, intent: { type: 'refuse', handIndex, reason: 'circle_occupied' } };
      }
      return keep;
    }
    case 'pointerCancel':
      return current.mode === 'pressing' || current.mode === 'dragging'
        ? { state: IDLE, intent: NONE }
        : keep;
    case 'tapCircle': {
      if (current.mode !== 'selected') return keep;
      if (!Number.isInteger(event.circle) || event.circle < 0 || event.circle >= 3) return keep;
      const { handIndex } = current;
      const info = ctx.hand[handIndex] as HandCardInfo;
      if (info.kind !== 'creature') return keep;
      if (!info.playable) {
        return { state: current, intent: { type: 'refuse', handIndex, reason: info.blocked ?? 'unplayable' } };
      }
      if (ctx.freeCircles[event.circle] === true) {
        return { state: IDLE, intent: { type: 'play', handIndex, circle: event.circle } };
      }
      return { state: current, intent: { type: 'refuse', handIndex, reason: 'circle_occupied' } };
    }
    case 'tapOutside':
      return current.mode === 'selected' ? { state: IDLE, intent: NONE } : keep;
  }
}
