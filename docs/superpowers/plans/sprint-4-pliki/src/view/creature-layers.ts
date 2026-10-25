// Layers of a creature picture (S04-03): background of the element, silhouette of the form and the
// mark of the trait, stacked in this order. Pure: the renderer draws what this plan says.
// The helpers you need are in ./art-style.ts (import them).
import type { CreatureSpec } from '../core/types.ts';
import type { Size } from './geometry.ts';

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

export function planCreatureLayers(_spec: CreatureSpec, _box: Size): LayerPlan[] {
  throw new Error('Not implemented');
}
