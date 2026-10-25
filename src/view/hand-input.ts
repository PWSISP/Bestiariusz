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
  state: HandInputState,
  event: HandInputEvent,
  ctx: HandInputContext,
): HandInputResult {
  // Normalise first, at the very top of the function
  const current = hasValidIndex(state) ? state : IDLE;

  // Helper to check if a point is inside a rect (excluding bottom/right edges)
  function isInsideRect(x: number, y: number, rect: Rect): boolean {
    return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
  }

  // Helper to find circle at position
  function circleAt(x: number, y: number, context: HandInputContext): number | null {
    for (let i = 0; i < context.circleRects.length; i++) {
      if (isInsideRect(x, y, context.circleRects[i])) {
        return i;
      }
    }
    return null;
  }

  // Helper to check if state has valid index
  function hasValidIndex(s: HandInputState): boolean {
    if (s.mode === 'idle') return true;
    return s.handIndex >= 0 && s.handIndex < ctx.hand.length;
  }

  switch (event.type) {
    case 'reset':
      return { state: IDLE, intent: { type: 'none' } };

    case 'pointerDown':
      // In pressing or dragging: ignored
      if (current.mode === 'pressing' || current.mode === 'dragging') {
        return { state: current, intent: { type: 'none' } };
      }

      // Invalid handIndex: ignored
      if (
        event.handIndex < 0 ||
        event.handIndex >= ctx.hand.length ||
        !Number.isInteger(event.handIndex)
      ) {
        return { state: current, intent: { type: 'none' } };
      }

      // Valid press
      return {
        state: {
          mode: 'pressing',
          handIndex: event.handIndex,
          startX: event.x,
          startY: event.y,
          wasSelected: current.mode === 'selected' && current.handIndex === event.handIndex,
        },
        intent: { type: 'none' },
      };

    case 'pointerMove':
      // In dragging: update position and recomputed overCircle/overCast
      if (current.mode === 'dragging') {
        const circle = circleAt(event.x, event.y, ctx);
        // For spells, never report a circle even when over one
        const overCircle =
          ctx.hand[current.handIndex].kind === 'spell'
            ? null
            : circle !== null && ctx.freeCircles[circle]
              ? circle
              : null;
        const overCast = ctx.hand[current.handIndex].kind === 'spell' && event.y < ctx.castLineY;

        return {
          state: {
            ...current,
            x: event.x,
            y: event.y,
            overCircle,
            overCast,
          },
          intent: { type: 'none' },
        };
      }

      // In pressing: check if drag threshold is exceeded or card is not playable
      if (current.mode === 'pressing') {
        const dx = event.x - current.startX;
        const dy = event.y - current.startY;
        const distance = Math.hypot(dx, dy);

        // If distance below threshold or card not playable: ignored
        if (distance < DRAG_THRESHOLD || !ctx.hand[current.handIndex].playable) {
          return { state: current, intent: { type: 'none' } };
        }

        // Start dragging
        const circle = circleAt(event.x, event.y, ctx);
        // For spells, never report a circle even when over one
        const overCircle =
          ctx.hand[current.handIndex].kind === 'spell'
            ? null
            : circle !== null && ctx.freeCircles[circle]
              ? circle
              : null;
        const overCast = ctx.hand[current.handIndex].kind === 'spell' && event.y < ctx.castLineY;

        return {
          state: {
            mode: 'dragging',
            handIndex: current.handIndex,
            x: event.x,
            y: event.y,
            overCircle,
            overCast,
          },
          intent: { type: 'none' },
        };
      }

      // In other states: ignored
      return { state: current, intent: { type: 'none' } };

    case 'pointerUp':
      if (current.mode === 'pressing') {
        const info = ctx.hand[current.handIndex];

        // If was not selected before the press
        if (!current.wasSelected) {
          return {
            state: {
              mode: 'selected',
              handIndex: current.handIndex,
            },
            intent: { type: 'none' },
          };
        }

        // If was already selected
        if (info.kind !== 'spell') {
          // For creatures and curses, cancel selection
          return {
            state: IDLE,
            intent: { type: 'none' },
          };
        } else {
          // For spells
          if (info.playable) {
            // Play the spell
            return {
              state: IDLE,
              intent: { type: 'play', handIndex: current.handIndex },
            };
          } else {
            // Refuse the spell
            return {
              state: {
                mode: 'selected',
                handIndex: current.handIndex,
              },
              intent: {
                type: 'refuse',
                handIndex: current.handIndex,
                reason: info.blocked || 'unplayable',
              },
            };
          }
        }
      } else if (current.mode === 'dragging') {
        // Use the position of the event, not the last move
        const circle = circleAt(event.x, event.y, ctx);

        if (ctx.hand[current.handIndex].kind === 'spell') {
          // Spell released above cast line
          if (event.y < ctx.castLineY) {
            return {
              state: IDLE,
              intent: { type: 'play', handIndex: current.handIndex },
            };
          } else {
            return {
              state: IDLE,
              intent: { type: 'none' },
            };
          }
        } else {
          // Creature released
          if (circle !== null) {
            if (ctx.freeCircles[circle]) {
              // Free circle - play the creature
              return {
                state: IDLE,
                intent: { type: 'play', handIndex: current.handIndex, circle },
              };
            } else {
              // Occupied circle - refuse
              return {
                state: IDLE,
                intent: { type: 'refuse', handIndex: current.handIndex, reason: 'circle_occupied' },
              };
            }
          } else {
            // Not over a circle - cancel
            return {
              state: IDLE,
              intent: { type: 'none' },
            };
          }
        }
      }

      // In other states: ignored
      return { state: current, intent: { type: 'none' } };

    case 'pointerCancel':
      if (current.mode === 'pressing' || current.mode === 'dragging') {
        return { state: IDLE, intent: { type: 'none' } };
      }
      // In other states: ignored
      return { state: current, intent: { type: 'none' } };

    case 'tapCircle': {
      // Only in selected mode
      if (current.mode !== 'selected') {
        return { state: current, intent: { type: 'none' } };
      }

      // Invalid circle index
      if (
        event.circle < 0 ||
        event.circle >= ctx.circleRects.length ||
        !Number.isInteger(event.circle)
      ) {
        return { state: current, intent: { type: 'none' } };
      }

      const info = ctx.hand[current.handIndex];

      // Not a creature
      if (info.kind !== 'creature') {
        return { state: current, intent: { type: 'none' } };
      }

      // Card not playable
      if (!info.playable) {
        return {
          state: current,
          intent: {
            type: 'refuse',
            handIndex: current.handIndex,
            reason: info.blocked || 'unplayable',
          },
        };
      }

      // Circle is free - play the creature
      if (ctx.freeCircles[event.circle]) {
        return {
          state: IDLE,
          intent: { type: 'play', handIndex: current.handIndex, circle: event.circle },
        };
      } else {
        // Circle is occupied - refuse
        return {
          state: current,
          intent: { type: 'refuse', handIndex: current.handIndex, reason: 'circle_occupied' },
        };
      }
    }

    case 'tapOutside':
      if (current.mode === 'selected') {
        return { state: IDLE, intent: { type: 'none' } };
      }
      // In other states: ignored
      return { state: current, intent: { type: 'none' } };
  }
}
