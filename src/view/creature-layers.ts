// Layers of a creature picture (S04-03): background of the element, silhouette of the form and the
// mark of the trait, stacked in this order. Pure: the renderer draws what this plan says.
// The helpers you need are in ./art-style.ts (import them).
import type { CreatureSpec } from '../core/types.ts';
import type { Size } from './geometry.ts';
import {
  backgroundTextureId,
  silhouetteTextureId,
  overlayTextureId,
  formStyle,
  elementColor,
  traitCorner,
} from './art-style.ts';

export type LayerRole = 'background' | 'silhouette' | 'overlay';

export interface LayerPlan {
  readonly role: LayerRole;
  /** Id of a placeholder texture (see ART_TEXTURE_IDS in art-style.ts). */
  readonly textureId: string;
  /** Top-left corner and size of the layer inside the picture box, in the units of the box. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Colour multiplied into the texture (0xRRGGBB), or null for none. */
  readonly tint: number | null;
  readonly alpha: number;
}

export function planCreatureLayers(spec: CreatureSpec, box: Size): LayerPlan[] {
  // Rule 1: Check that box dimensions are valid
  if (
    !Number.isFinite(box.width) ||
    !Number.isFinite(box.height) ||
    box.width <= 0 ||
    box.height <= 0
  ) {
    throw new RangeError('Box dimensions must be finite numbers greater than 0');
  }

  // Background layer (rule 3)
  const background: LayerPlan = {
    role: 'background',
    textureId: backgroundTextureId(spec.element),
    x: 0,
    y: 0,
    width: box.width,
    height: box.height,
    tint: null,
    alpha: 1,
  };

  // Silhouette layer (rule 4)
  const style = formStyle(spec.form);
  let height = box.height * style.scale;
  let width = height * style.aspect;

  if (width > box.width * 0.9) {
    width = box.width * 0.9;
    height = width / style.aspect;
  }

  const x = (box.width - width) / 2;
  const y = (box.height - height) / 2 + style.dy * box.height;

  const silhouette: LayerPlan = {
    role: 'silhouette',
    textureId: silhouetteTextureId(spec.form),
    x,
    y,
    width,
    height,
    tint: elementColor(spec.element),
    alpha: 1,
  };

  // Overlay layer (rule 5)
  const side = Math.min(box.width, box.height);
  const size = side * 0.3;
  const margin = side * 0.05;

  let overlayX = 0;
  let overlayY = 0;

  const corner = traitCorner(spec.trait);
  switch (corner) {
    case 'tl':
      overlayX = margin;
      overlayY = margin;
      break;
    case 'tr':
      overlayX = box.width - size - margin;
      overlayY = margin;
      break;
    case 'bl':
      overlayX = margin;
      overlayY = box.height - size - margin;
      break;
    case 'br':
      overlayX = box.width - size - margin;
      overlayY = box.height - size - margin;
      break;
  }

  const overlay: LayerPlan = {
    role: 'overlay',
    textureId: overlayTextureId(spec.trait),
    x: overlayX,
    y: overlayY,
    width: size,
    height: size,
    tint: null,
    alpha: 0.9,
  };

  // Return the layers in the required order
  return [background, silhouette, overlay];
}
