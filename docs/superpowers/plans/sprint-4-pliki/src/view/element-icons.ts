// Icons of the five elements (S04-04): simple polygons in the unit square, drawn by the renderer in
// the colour of the element next to the cost of a card and in the status bar. Pure data and two
// small helpers; the renderer owns the drawing.
import type { Point, Rect } from './geometry.ts';

/** One filled polygon: at least three points, every coordinate between 0 and 1 (y grows downwards). */
export type IconPolygon = readonly Point[];

/** An icon is the union of its polygons. */
export type ElementIcon = readonly IconPolygon[];

export const ELEMENT_ICONS: Readonly<Record<string, ElementIcon>> = {};

/** Used for an element id the table does not know. */
export const FALLBACK_ICON: ElementIcon = [];

export function iconFor(_element: string): ElementIcon {
  throw new Error('Not implemented');
}

export function placeIcon(_icon: ElementIcon, _box: Rect): Point[][] {
  throw new Error('Not implemented');
}
