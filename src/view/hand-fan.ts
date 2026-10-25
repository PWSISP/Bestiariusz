// The fan of cards in the player's hand (S04-02a). Pure geometry: where every card sits.
import type { Rect } from './geometry.ts';

export const CARD_WIDTH = 92;
export const CARD_HEIGHT = 128;
/** Largest distance between the centres of two neighbouring cards. */
export const MAX_STEP = 69;
/** Free space kept between the outer cards and the sides of the area. */
export const SIDE_MARGIN = 8;
/** Free space between the lowest card and the bottom of the area. */
export const BOTTOM_GAP = 12;
/** Rotation (radians) a card gets for every slot it is away from the middle, and its largest absolute value. */
export const ROTATION_PER_SLOT = 0.05;
export const MAX_ROTATION = 0.2;
/** Pixels a card sinks for the square of its distance (in slots) from the middle: the arc of the fan. */
export const ARC_DROP = 4;
/** How far the selected card rises, and how much bigger it is drawn. */
export const LIFT = 56;
export const SELECTED_SCALE = 1.1;

export interface FanSlot {
  /** Centre of the card. */
  readonly x: number;
  readonly y: number;
  /** Radians, clockwise positive. */
  readonly rotation: number;
  readonly scale: number;
  /** Drawing order; higher is drawn on top. */
  readonly z: number;
}

export function fanLayout(count: number, area: Rect, selectedIndex: number | null): FanSlot[] {
  // Rule 1: count must be an integer >= 0, otherwise throw a RangeError
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError();
  }

  // Rule 1: count 0 returns []
  if (count === 0) {
    return [];
  }

  // Calculate step - how much horizontal space between cards
  let step: number;
  if (count === 1) {
    step = 0;
  } else {
    const availableWidth = area.width - 2 * SIDE_MARGIN - CARD_WIDTH;
    step = Math.max(0, Math.min(MAX_STEP, availableWidth / (count - 1)));
  }

  // Calculate resting Y position
  const restY = area.y + area.height - BOTTOM_GAP - CARD_HEIGHT / 2;

  // Check if selectedIndex is valid
  const isValidSelection =
    selectedIndex !== null &&
    Number.isInteger(selectedIndex) &&
    selectedIndex >= 0 &&
    selectedIndex < count;

  // Create the slots
  const slots: FanSlot[] = [];

  for (let i = 0; i < count; i++) {
    // Rule 2: offset calculation
    const offset = i - (count - 1) / 2;

    // Rule 4: x position
    const x = area.x + area.width / 2 + offset * step;

    // Rule 6: rotation calculation with limits
    let rotation = offset * ROTATION_PER_SLOT;
    if (rotation > MAX_ROTATION) rotation = MAX_ROTATION;
    if (rotation < -MAX_ROTATION) rotation = -MAX_ROTATION;

    // Rule 16: selected card properties
    if (isValidSelection && i === selectedIndex) {
      slots.push({
        x,
        y: restY - LIFT, // Rule 16: selected card rises above the fan
        rotation: 0, // Rule 16: selected card has no rotation
        scale: SELECTED_SCALE, // Rule 16: selected card is bigger
        z: count, // Rule 16: selected card is drawn on top (above all others)
      });
    } else {
      // Rule 16: non-selected cards
      const y = restY + ARC_DROP * offset * offset; // Rule 5: arc drop calculation
      const scale = 1; // Rule 16: non-selected cards have normal scale
      const z = i; // Rule 16: drawing order (lower index drawn below)

      slots.push({
        x,
        y,
        rotation,
        scale,
        z,
      });
    }
  }

  return slots;
}
