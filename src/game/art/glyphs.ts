// Small vector glyphs of the combat screen: element icons (S04-04), the symbols of intents and the
// stat badges. Everything is drawn into a rectangle with a single colour, so the same glyph works on
// a card, in the status bar and in the grey-scale accessibility check.
import type { Graphics } from 'pixi.js';
import type { IntentKind } from '../../view/combat-view.ts';
import { iconFor, placeIcon } from '../../view/element-icons.ts';
import type { Rect } from '../../view/geometry.ts';

/** The icon of an element filled with one colour. */
export function drawElementIcon(g: Graphics, element: string, box: Rect, color: number): void {
  for (const polygon of placeIcon(iconFor(element), box)) {
    g.poly(polygon.flatMap((p) => [p.x, p.y])).fill(color);
  }
}

export type GlyphName = IntentKind | 'heart' | 'sword' | 'shield' | 'pile' | 'ember';

function blade(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  flip: boolean,
): void {
  const s = flip ? -1 : 1;
  const px = (u: number): number => x + s * u * size;
  g.poly([
    px(0.5),
    y,
    px(0.62),
    y + size * 0.1,
    px(0.2),
    y + size * 0.62,
    px(0.1),
    y + size * 0.52,
  ]).fill(color);
  g.poly([
    px(0.08),
    y + size * 0.5,
    px(0.22),
    y + size * 0.64,
    px(0.14),
    y + size * 0.7,
    px(0),
    y + size * 0.56,
  ]).fill(color);
  g.poly([
    px(0.18),
    y + size * 0.62,
    px(0.1),
    y + size * 0.9,
    px(0.02),
    y + size * 0.82,
    px(0.08),
    y + size * 0.58,
  ]).fill(color);
}

/** A glyph in the box, one colour. */
export function drawGlyph(g: Graphics, name: GlyphName, box: Rect, color: number): void {
  const { x, y, width: w, height: h } = box;
  const size = Math.min(w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (name) {
    case 'attack':
    case 'sword':
      blade(g, x + size * 0.1, y + size * 0.05, size * 0.9, color, false);
      break;
    case 'multi':
      blade(g, x + size * 0.02, y + size * 0.05, size * 0.8, color, false);
      blade(g, x + size * 0.98, y + size * 0.05, size * 0.8, color, true);
      break;
    case 'shield':
      g.poly([
        x + w * 0.12,
        y + h * 0.1,
        x + w * 0.88,
        y + h * 0.1,
        x + w * 0.88,
        y + h * 0.52,
        cx,
        y + h * 0.94,
        x + w * 0.12,
        y + h * 0.52,
      ]).fill(color);
      break;
    case 'curse':
      g.circle(cx, cy - size * 0.08, size * 0.38).fill(color);
      g.roundRect(cx - size * 0.22, cy + size * 0.2, size * 0.44, size * 0.26, size * 0.06).fill(
        color,
      );
      g.circle(cx - size * 0.15, cy - size * 0.1, size * 0.09).cut();
      g.circle(cx + size * 0.15, cy - size * 0.1, size * 0.09).cut();
      break;
    case 'steal':
      g.moveTo(x + w * 0.2, y + h * 0.15).lineTo(x + w * 0.2, y + h * 0.6);
      g.arc(cx, y + h * 0.6, w * 0.3, Math.PI, 0, true);
      g.lineTo(x + w * 0.8, y + h * 0.4);
      g.stroke({ width: Math.max(2, size * 0.14), color, cap: 'round', join: 'round' });
      break;
    case 'heart':
      g.moveTo(cx, y + h * 0.88);
      g.bezierCurveTo(x - w * 0.15, y + h * 0.45, x + w * 0.2, y - h * 0.1, cx, y + h * 0.28);
      g.bezierCurveTo(x + w * 0.8, y - h * 0.1, x + w * 1.15, y + h * 0.45, cx, y + h * 0.88);
      g.fill(color);
      break;
    case 'pile':
      g.roundRect(x + w * 0.22, y + h * 0.05, w * 0.56, h * 0.7, size * 0.08).fill({
        color,
        alpha: 0.5,
      });
      g.roundRect(x + w * 0.14, y + h * 0.15, w * 0.56, h * 0.7, size * 0.08).fill({
        color,
        alpha: 0.75,
      });
      g.roundRect(x + w * 0.06, y + h * 0.25, w * 0.56, h * 0.7, size * 0.08).fill(color);
      break;
    case 'ember':
      drawElementIcon(g, 'ogien', box, color);
      break;
  }
}
