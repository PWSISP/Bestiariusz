// Icons of the five elements (S04-04): simple polygons in the unit square, drawn by the renderer in
// the colour of the element next to the cost of a card and in the status bar. Pure data and two
// small helpers; the renderer owns the drawing.
import type { Point, Rect } from '../../src/view/geometry.ts';

/** One filled polygon: at least three points, every coordinate between 0 and 1 (y grows downwards). */
export type IconPolygon = readonly Point[];

/** An icon is the union of its polygons. */
export type ElementIcon = readonly IconPolygon[];

const p = (x: number, y: number): Point => ({ x, y });

export const ELEMENT_ICONS: Readonly<Record<string, ElementIcon>> = {
  // A flame: a tall main tip leaning right, a small tongue on the left, a belly in the lower half.
  ogien: [
    [
      p(0.58, 0.03),
      p(0.7, 0.3),
      p(0.83, 0.52),
      p(0.8, 0.76),
      p(0.64, 0.93),
      p(0.42, 0.97),
      p(0.24, 0.86),
      p(0.16, 0.64),
      p(0.2, 0.46),
      p(0.27, 0.26),
      p(0.37, 0.46),
    ],
  ],
  // A drop: pointed on top, round at the bottom, narrow and symmetric.
  woda: [
    [
      p(0.5, 0.05),
      p(0.58, 0.26),
      p(0.67, 0.46),
      p(0.72, 0.64),
      p(0.68, 0.82),
      p(0.6, 0.93),
      p(0.5, 0.96),
      p(0.4, 0.93),
      p(0.32, 0.82),
      p(0.28, 0.64),
      p(0.33, 0.46),
      p(0.42, 0.26),
    ],
  ],
  // Two peaks on a wide base.
  ziemia: [[p(0.04, 0.9), p(0.32, 0.36), p(0.45, 0.58), p(0.66, 0.16), p(0.96, 0.9)]],
  // Three wavy gusts one above the other.
  wiatr: [0.25, 0.5, 0.75].map((y) => [
    p(0.08, y - 0.05),
    p(0.3, y - 0.09),
    p(0.55, y - 0.03),
    p(0.8, y - 0.09),
    p(0.92, y - 0.05),
    p(0.92, y + 0.05),
    p(0.8, y + 0.01),
    p(0.55, y + 0.07),
    p(0.3, y + 0.01),
    p(0.08, y + 0.05),
  ]),
  // A bolt of lightning, from the top right to the bottom left.
  grom: [
    [p(0.6, 0.02), p(0.22, 0.56), p(0.46, 0.56), p(0.36, 0.98), p(0.8, 0.4), p(0.55, 0.4), p(0.74, 0.02)],
  ],
};

/** Used for an element id the table does not know: a plain diamond. */
export const FALLBACK_ICON: ElementIcon = [[p(0.5, 0.1), p(0.9, 0.5), p(0.5, 0.9), p(0.1, 0.5)]];

export function iconFor(element: string): ElementIcon {
  return Object.hasOwn(ELEMENT_ICONS, element) ? (ELEMENT_ICONS[element] as ElementIcon) : FALLBACK_ICON;
}

export function placeIcon(icon: ElementIcon, box: Rect): Point[][] {
  const side = Math.min(box.width, box.height);
  const left = box.x + (box.width - side) / 2;
  const top = box.y + (box.height - side) / 2;
  return icon.map((polygon) => polygon.map((q) => ({ x: left + q.x * side, y: top + q.y * side })));
}
