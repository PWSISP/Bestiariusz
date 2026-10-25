// Layers of a creature picture (S04-03): background of the element, silhouette of the form and the
// mark of the trait, stacked in this order. Pure: the renderer draws what this plan says.
import type { CreatureSpec } from '../../src/core/types.ts';
import {
  backgroundTextureId,
  elementColor,
  formStyle,
  overlayTextureId,
  silhouetteTextureId,
  traitCorner,
} from '../../src/view/art-style.ts';
import type { Size } from '../../src/view/geometry.ts';

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
  if (!(Number.isFinite(box.width) && box.width > 0 && Number.isFinite(box.height) && box.height > 0)) {
    throw new RangeError(`Invalid picture size: ${box.width} x ${box.height}`);
  }
  const style = formStyle(spec.form);
  let silhouetteHeight = box.height * style.scale;
  let silhouetteWidth = silhouetteHeight * style.aspect;
  if (silhouetteWidth > box.width * 0.9) {
    silhouetteWidth = box.width * 0.9;
    silhouetteHeight = silhouetteWidth / style.aspect;
  }
  const side = Math.min(box.width, box.height);
  const size = side * 0.3;
  const margin = side * 0.05;
  const corner = traitCorner(spec.trait);
  return [
    {
      role: 'background',
      textureId: backgroundTextureId(spec.element),
      x: 0,
      y: 0,
      width: box.width,
      height: box.height,
      tint: null,
      alpha: 1,
    },
    {
      role: 'silhouette',
      textureId: silhouetteTextureId(spec.form),
      x: (box.width - silhouetteWidth) / 2,
      y: (box.height - silhouetteHeight) / 2 + style.dy * box.height,
      width: silhouetteWidth,
      height: silhouetteHeight,
      tint: elementColor(spec.element),
      alpha: 1,
    },
    {
      role: 'overlay',
      textureId: overlayTextureId(spec.trait),
      x: corner === 'tl' || corner === 'bl' ? margin : box.width - size - margin,
      y: corner === 'tl' || corner === 'tr' ? margin : box.height - size - margin,
      width: size,
      height: size,
      tint: null,
      alpha: 0.9,
    },
  ];
}
