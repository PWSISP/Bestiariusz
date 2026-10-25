// Icons of the five elements (S04-04): simple polygons in the unit square, drawn by the renderer in
// the colour of the element next to the cost of a card and in the status bar. Pure data and two
// small helpers; the renderer owns the drawing.
import type { Point, Rect } from './geometry.ts';

/** One filled polygon: at least three points, every coordinate between 0 and 1 (y grows downwards). */
export type IconPolygon = readonly Point[];

/** An icon is the union of its polygons. */
export type ElementIcon = readonly IconPolygon[];

export const ELEMENT_ICONS: Readonly<Record<string, ElementIcon>> = {
  ogien: [
    [
      { x: 0.7, y: 0.05 },
      { x: 0.85, y: 0.6 },
      { x: 0.82, y: 0.85 },
      { x: 0.6, y: 0.97 },
      { x: 0.35, y: 0.97 },
      { x: 0.15, y: 0.8 },
      { x: 0.15, y: 0.55 },
      { x: 0.3, y: 0.3 },
      { x: 0.4, y: 0.5 },
      { x: 0.5, y: 0.3 },
    ],
  ],
  woda: [
    [
      { x: 0.5, y: 0.05 },
      { x: 0.76, y: 0.5 },
      { x: 0.82, y: 0.65 },
      { x: 0.74, y: 0.85 },
      { x: 0.5, y: 0.95 },
      { x: 0.26, y: 0.85 },
      { x: 0.18, y: 0.65 },
      { x: 0.24, y: 0.5 },
    ],
  ],
  ziemia: [
    [
      { x: 0.05, y: 0.95 },
      { x: 0.5, y: 0.1 },
      { x: 0.95, y: 0.95 },
    ],
  ],
  wiatr: [
    [
      { x: 0.1, y: 0.15 },
      { x: 0.8, y: 0.15 },
      { x: 0.9, y: 0.21 },
      { x: 0.8, y: 0.27 },
      { x: 0.1, y: 0.27 },
    ],
    [
      { x: 0.1, y: 0.43 },
      { x: 0.8, y: 0.43 },
      { x: 0.9, y: 0.49 },
      { x: 0.8, y: 0.55 },
      { x: 0.1, y: 0.55 },
    ],
    [
      { x: 0.1, y: 0.71 },
      { x: 0.8, y: 0.71 },
      { x: 0.9, y: 0.77 },
      { x: 0.8, y: 0.83 },
      { x: 0.1, y: 0.83 },
    ],
  ],
  grom: [
    [
      { x: 0.55, y: 0.02 },
      { x: 0.85, y: 0.02 },
      { x: 0.6, y: 0.42 },
      { x: 0.78, y: 0.42 },
      { x: 0.2, y: 0.98 },
      { x: 0.38, y: 0.52 },
      { x: 0.22, y: 0.52 },
    ],
  ],
};

/** Used for an element id the table does not know. */
export const FALLBACK_ICON: ElementIcon = [
  [
    { x: 0.5, y: 0.1 },
    { x: 0.9, y: 0.5 },
    { x: 0.5, y: 0.9 },
    { x: 0.1, y: 0.5 },
  ],
];

export function iconFor(element: string): ElementIcon {
  if (Object.hasOwn(ELEMENT_ICONS, element)) {
    return ELEMENT_ICONS[element];
  }
  return FALLBACK_ICON;
}

export function placeIcon(icon: ElementIcon, box: Rect): Point[][] {
  const side = Math.min(box.width, box.height);
  const left = box.x + (box.width - side) / 2;
  const top = box.y + (box.height - side) / 2;

  return icon.map((polygon) =>
    polygon.map((point) => ({
      x: left + point.x * side,
      y: top + point.y * side,
    })),
  );
}
