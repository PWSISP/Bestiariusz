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

export function fanLayout(
  _count: number,
  _area: Rect,
  _selectedIndex: number | null,
): FanSlot[] {
  throw new Error('Not implemented');
}
