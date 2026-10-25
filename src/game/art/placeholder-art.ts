// Placeholder pictures of creatures (S04-03): vector drawings keyed by the texture ids of
// src/view/art-style.ts, so no image files are needed and the atlas stays at 0 bytes. A creature is
// three layers (see planCreatureLayers): background of the element, silhouette of the form (white,
// tinted by the plan) and the mark of the trait. Real art replaces these functions, not their callers.
import { Container, Graphics } from 'pixi.js';
import type { CreatureSpec } from '../../core/types.ts';
import { elementColor, shade } from '../../view/art-style.ts';
import { planCreatureLayers } from '../../view/creature-layers.ts';
import type { Size } from '../../view/geometry.ts';

const TAU = Math.PI * 2;

function drawBackground(g: Graphics, element: string, w: number, h: number): void {
  const color = elementColor(element);
  const light = shade(color, 1.25);
  g.rect(0, 0, w, h).fill(shade(color, 0.26));
  g.rect(0, 0, w, h * 0.5).fill({ color: shade(color, 0.5), alpha: 0.35 });
  const line = Math.max(1, h * 0.025);
  switch (element) {
    case 'ogien':
      for (let i = 0; i < 5; i++) {
        const x = (w * (i + 0.5)) / 5;
        const top = h * (0.5 + (i % 2) * 0.12);
        g.poly([x - w * 0.11, h, x, top, x + w * 0.11, h]).fill({ color: light, alpha: 0.3 });
      }
      break;
    case 'woda':
      for (let k = 0; k < 3; k++) {
        const y = h * (0.45 + 0.17 * k);
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += w / 16)
          g.lineTo(x, y + Math.sin((x / w) * TAU * 2 + k) * h * 0.035);
        g.stroke({ width: line, color: light, alpha: 0.4 });
      }
      break;
    case 'ziemia':
      g.rect(0, h * 0.62, w, h * 0.38).fill({ color: light, alpha: 0.18 });
      g.rect(0, h * 0.8, w, h * 0.2).fill({ color: light, alpha: 0.18 });
      g.ellipse(w * 0.2, h * 0.9, w * 0.13, h * 0.07).fill({ color: light, alpha: 0.3 });
      g.ellipse(w * 0.75, h * 0.86, w * 0.18, h * 0.09).fill({ color: light, alpha: 0.3 });
      break;
    case 'wiatr':
      for (let k = 0; k < 3; k++) {
        g.arc(
          w * (0.35 + 0.15 * k),
          h * (0.35 + 0.18 * k),
          w * (0.22 + 0.05 * k),
          Math.PI * 1.1,
          Math.PI * 1.9,
        );
        g.stroke({ width: line, color: light, alpha: 0.4 });
      }
      break;
    case 'grom':
      g.circle(w * 0.5, h * 0.12, w * 0.4).fill({ color: light, alpha: 0.18 });
      g.poly([
        w * 0.62,
        0,
        w * 0.4,
        h * 0.5,
        w * 0.54,
        h * 0.5,
        w * 0.44,
        h,
        w * 0.72,
        h * 0.4,
        w * 0.58,
        h * 0.4,
        w * 0.76,
        0,
      ]).fill({ color: light, alpha: 0.28 });
      break;
    default:
      break;
  }
}

function drawSilhouette(g: Graphics, form: string, w: number, h: number): void {
  const white = 0xffffff;
  const ell = (cx: number, cy: number, rx: number, ry: number): void => {
    g.ellipse(w * cx, h * cy, w * rx, h * ry).fill(white);
  };
  const tri = (...p: number[]): void => {
    g.poly(p.map((v, i) => v * (i % 2 === 0 ? w : h))).fill(white);
  };
  const limb = (x: number, y: number, lw: number, lh: number): void => {
    g.roundRect(w * x, h * y, w * lw, h * lh, w * lw * 0.3).fill(white);
  };
  switch (form) {
    case 'wilk':
      ell(0.42, 0.52, 0.3, 0.2);
      ell(0.76, 0.34, 0.14, 0.14);
      tri(0.84, 0.3, 1, 0.42, 0.84, 0.46);
      tri(0.68, 0.24, 0.72, 0.04, 0.8, 0.22);
      tri(0.78, 0.22, 0.86, 0.04, 0.88, 0.26);
      tri(0.14, 0.46, 0, 0.26, 0.2, 0.36);
      limb(0.2, 0.62, 0.08, 0.36);
      limb(0.34, 0.66, 0.08, 0.32);
      limb(0.52, 0.66, 0.08, 0.32);
      limb(0.64, 0.6, 0.08, 0.38);
      break;
    case 'kruk':
      ell(0.5, 0.55, 0.3, 0.2);
      ell(0.78, 0.36, 0.11, 0.12);
      tri(0.86, 0.32, 1, 0.4, 0.86, 0.44);
      tri(0.34, 0.5, 0.5, 0, 0.62, 0.5);
      tri(0.24, 0.6, 0, 0.84, 0.34, 0.72);
      limb(0.44, 0.7, 0.04, 0.28);
      limb(0.56, 0.7, 0.04, 0.28);
      break;
    case 'sowa':
      ell(0.5, 0.6, 0.3, 0.38);
      g.circle(w * 0.5, h * 0.3, w * 0.24).fill(white);
      tri(0.28, 0.2, 0.26, 0, 0.4, 0.12);
      tri(0.72, 0.2, 0.74, 0, 0.6, 0.12);
      g.circle(w * 0.41, h * 0.3, w * 0.07).cut();
      g.circle(w * 0.59, h * 0.3, w * 0.07).cut();
      tri(0.46, 0.38, 0.5, 0.46, 0.54, 0.38);
      break;
    case 'waz': {
      const line = w * 0.1;
      g.moveTo(w * 0.1, h * 0.88);
      g.bezierCurveTo(w * 0.4, h * 0.98, w * 0.5, h * 0.62, w * 0.3, h * 0.5);
      g.bezierCurveTo(w * 0.1, h * 0.38, w * 0.3, h * 0.12, w * 0.6, h * 0.2);
      g.stroke({ width: line, color: white, cap: 'round', join: 'round' });
      ell(0.72, 0.22, 0.14, 0.1);
      tri(0.84, 0.2, 0.98, 0.14, 0.9, 0.24);
      break;
    }
    case 'niedzwiedz':
      ell(0.44, 0.58, 0.34, 0.26);
      g.circle(w * 0.78, h * 0.36, w * 0.17).fill(white);
      g.circle(w * 0.68, h * 0.2, w * 0.06).fill(white);
      g.circle(w * 0.88, h * 0.2, w * 0.06).fill(white);
      limb(0.14, 0.72, 0.14, 0.26);
      limb(0.34, 0.76, 0.14, 0.22);
      limb(0.56, 0.76, 0.14, 0.22);
      limb(0.7, 0.68, 0.14, 0.3);
      break;
    case 'jelen': {
      ell(0.42, 0.6, 0.3, 0.18);
      g.poly([w * 0.58, h * 0.5, w * 0.7, h * 0.5, w * 0.78, h * 0.28, w * 0.68, h * 0.26]).fill(
        white,
      );
      ell(0.78, 0.22, 0.1, 0.09);
      const stroke = {
        width: Math.max(1.5, w * 0.03),
        color: white,
        cap: 'round',
        join: 'round',
      } as const;
      g.moveTo(w * 0.74, h * 0.16)
        .lineTo(w * 0.66, h * 0.02)
        .moveTo(w * 0.7, h * 0.1)
        .lineTo(w * 0.58, h * 0.08);
      g.moveTo(w * 0.82, h * 0.16)
        .lineTo(w * 0.9, h * 0.02)
        .moveTo(w * 0.86, h * 0.1)
        .lineTo(w * 0.98, h * 0.08);
      g.stroke(stroke);
      limb(0.2, 0.7, 0.05, 0.3);
      limb(0.32, 0.72, 0.05, 0.28);
      limb(0.5, 0.72, 0.05, 0.28);
      limb(0.6, 0.68, 0.05, 0.32);
      break;
    }
    default:
      ell(0.5, 0.5, 0.35, 0.35);
  }
}

function star(
  g: Graphics,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
): void {
  const out: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.poly(out);
}

function drawTraitMark(g: Graphics, trait: string, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  g.circle(cx, cy, r).fill({ color: 0x0b0f0c, alpha: 0.78 });
  g.circle(cx, cy, r - 0.5).stroke({ width: Math.max(1, r * 0.1), color: 0xf2eedc, alpha: 0.55 });
  switch (trait) {
    case 'gniew':
      star(g, cx, cy, r * 0.74, r * 0.34, 8);
      g.fill(0xe05a3a);
      break;
    case 'smutek':
      g.poly([cx, cy - r * 0.62, cx + r * 0.42, cy + r * 0.12, cx - r * 0.42, cy + r * 0.12]).fill(
        0x5aa2e0,
      );
      g.circle(cx, cy + r * 0.14, r * 0.42).fill(0x5aa2e0);
      break;
    case 'spryt':
      g.ellipse(cx, cy, r * 0.7, r * 0.4).fill(0x7bd88f);
      g.circle(cx, cy, r * 0.22).fill(0x0b0f0c);
      break;
    case 'odwaga':
      g.poly([
        cx - r * 0.5,
        cy - r * 0.55,
        cx + r * 0.5,
        cy - r * 0.55,
        cx + r * 0.5,
        cy + r * 0.1,
        cx,
        cy + r * 0.7,
        cx - r * 0.5,
        cy + r * 0.1,
      ]).fill(0xe8c33a);
      break;
    case 'glod':
      g.arc(cx, cy, r * 0.6, 0, Math.PI).fill(0xa070d0);
      for (let i = 0; i < 3; i++) {
        const x = cx - r * 0.4 + i * r * 0.4;
        g.poly([x - r * 0.12, cy, x, cy + r * 0.28, x + r * 0.12, cy]).fill(0xf2eedc);
      }
      break;
    default:
      g.circle(cx, cy, r * 0.28).fill(0xf2eedc);
  }
}

/** One layer drawn for a texture id (`bg.<element>`, `form.<form>`, `trait.<trait>`) in a w x h box. */
export function drawLayer(textureId: string, w: number, h: number): Graphics {
  const g = new Graphics();
  const dot = textureId.indexOf('.');
  const kind = textureId.slice(0, dot);
  const name = textureId.slice(dot + 1);
  if (kind === 'bg') drawBackground(g, name, w, h);
  else if (kind === 'form') drawSilhouette(g, name, w, h);
  else if (kind === 'trait') drawTraitMark(g, name, w, h);
  return g;
}

/** A creature picture of the given size: its three layers stacked, positioned by the layer plan. */
export function createCreatureArt(spec: CreatureSpec, box: Size): Container {
  const art = new Container();
  for (const layer of planCreatureLayers(spec, box)) {
    const g = drawLayer(layer.textureId, layer.width, layer.height);
    g.position.set(layer.x, layer.y);
    if (layer.tint !== null) g.tint = layer.tint;
    g.alpha = layer.alpha;
    art.addChild(g);
  }
  return art;
}
