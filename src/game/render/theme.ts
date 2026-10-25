// Colours, fonts and small drawing helpers shared by the combat scene and the result screen.
import { Text } from 'pixi.js';
import type { Graphics } from 'pixi.js';

export const FONT = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const COLORS = {
  bgTop: 0x0b1310,
  bgBottom: 0x1a2b22,
  panel: 0x13201a,
  panelEdge: 0x3a5a46,
  text: 0xf1ecd9,
  dim: 0x9fb0a2,
  gold: 0xe3b54a,
  red: 0xd9503f,
  redDark: 0x3a1713,
  green: 0x62c370,
  blue: 0x4aa3df,
  violet: 0x9b59b6,
  white: 0xffffff,
} as const;

export interface LabelOptions {
  readonly bold?: boolean;
  readonly align?: 'left' | 'center' | 'right';
  /** Wrap width in pixels; 0 = no wrapping. */
  readonly wrap?: number;
  /** Anchor 0-1 in both directions. */
  readonly anchor?: readonly [number, number];
  readonly stroke?: number;
}

/** A text label. The string is already translated; this layer never writes words itself. */
export function label(
  content: string,
  size: number,
  color: number,
  options: LabelOptions = {},
): Text {
  const wrap = options.wrap ?? 0;
  const t = new Text({
    text: content,
    style: {
      fontFamily: FONT,
      fontSize: size,
      fontWeight: options.bold ? '700' : '400',
      fill: color,
      align: options.align ?? 'left',
      wordWrap: wrap > 0,
      wordWrapWidth: wrap,
      lineHeight: Math.round(size * 1.2),
      ...(options.stroke === undefined
        ? {}
        : {
            stroke: {
              color: options.stroke,
              width: Math.max(2, size * 0.18),
              join: 'round' as const,
            },
          }),
    },
  });
  const [ax, ay] = options.anchor ?? [0, 0];
  t.anchor.set(ax, ay);
  return t;
}

export function lerpColor(a: number, b: number, t: number): number {
  const ch = (shift: number): number => {
    const x = (a >> shift) & 0xff;
    const y = (b >> shift) & 0xff;
    return Math.round(x + (y - x) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A vertical gradient from top to bottom colour, drawn as bands. */
export function drawGradient(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
): void {
  const bands = 28;
  for (let i = 0; i < bands; i++) {
    g.rect(x, y + (h * i) / bands, w, h / bands + 1).fill(lerpColor(top, bottom, i / (bands - 1)));
  }
}

/** A horizontal bar with a dark back and a coloured fill (0-1). */
export function drawBar(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fraction: number,
  fill: number,
  back: number,
): void {
  const r = h / 2;
  g.roundRect(x, y, w, h, r).fill(back);
  const filled = Math.max(0, Math.min(1, fraction)) * w;
  if (filled > 0) g.roundRect(x, y, Math.max(h, filled), h, r).fill(fill);
  g.roundRect(x, y, w, h, r).stroke({ width: 1, color: COLORS.panelEdge, alpha: 0.8 });
}
