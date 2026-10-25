// Look of the placeholder art (S04-03): colours, proportions and corners per symbol. Pure data and two
// tiny helpers. Unknown symbol ids (new symbols arrive with the data, decision D11) get a neutral
// default instead of an error, so a missing entry shows up as a grey card, never as a crash.

/** Where the trait mark sits on the card: top-left, top-right, bottom-left, bottom-right. */
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export interface FormStyle {
  /** Height of the silhouette as a fraction of the picture height. */
  readonly scale: number;
  /** Width divided by height of the silhouette. */
  readonly aspect: number;
  /** Vertical shift as a fraction of the picture height; positive = down. */
  readonly dy: number;
}

export const ELEMENT_COLORS: Readonly<Record<string, number>> = {
  ogien: 0xd9542c,
  woda: 0x2f7fc1,
  ziemia: 0x7a5c3a,
  wiatr: 0x8fc7b8,
  grom: 0xe8c33a,
};

export const FORM_STYLES: Readonly<Record<string, FormStyle>> = {
  wilk: { scale: 0.6, aspect: 1.25, dy: 0.05 },
  kruk: { scale: 0.5, aspect: 1.2, dy: -0.05 },
  sowa: { scale: 0.55, aspect: 0.9, dy: 0 },
  waz: { scale: 0.5, aspect: 1.5, dy: 0.1 },
  niedzwiedz: { scale: 0.7, aspect: 1.1, dy: 0.05 },
  jelen: { scale: 0.7, aspect: 0.95, dy: 0 },
};

export const TRAIT_CORNERS: Readonly<Record<string, Corner>> = {
  gniew: 'tr',
  smutek: 'bl',
  spryt: 'br',
  odwaga: 'tl',
  glod: 'bl',
};

export const DEFAULT_ELEMENT_COLOR = 0x8a8a8a;
export const DEFAULT_FORM_STYLE: FormStyle = { scale: 0.6, aspect: 1, dy: 0 };
export const DEFAULT_CORNER: Corner = 'tr';

export function elementColor(element: string): number {
  return Object.hasOwn(ELEMENT_COLORS, element)
    ? (ELEMENT_COLORS[element] as number)
    : DEFAULT_ELEMENT_COLOR;
}

export function formStyle(form: string): FormStyle {
  return Object.hasOwn(FORM_STYLES, form) ? (FORM_STYLES[form] as FormStyle) : DEFAULT_FORM_STYLE;
}

export function traitCorner(trait: string): Corner {
  return Object.hasOwn(TRAIT_CORNERS, trait) ? (TRAIT_CORNERS[trait] as Corner) : DEFAULT_CORNER;
}

/** Ids of the placeholder textures; a layer asks for one of these. */
export const backgroundTextureId = (element: string): string => `bg.${element}`;
export const silhouetteTextureId = (form: string): string => `form.${form}`;
export const overlayTextureId = (trait: string): string => `trait.${trait}`;

/** Every texture the placeholder art provides: 5 backgrounds, 6 silhouettes, 5 trait marks. */
export const ART_TEXTURE_IDS: readonly string[] = [
  ...Object.keys(ELEMENT_COLORS).map(backgroundTextureId),
  ...Object.keys(FORM_STYLES).map(silhouetteTextureId),
  ...Object.keys(TRAIT_CORNERS).map(overlayTextureId),
];

/** Multiplies the red, green and blue channels of a 0xRRGGBB colour by `factor`; rounds and stays within 0-255. */
export function shade(color: number, factor: number): number {
  const channel = (shift: number): number =>
    Math.max(0, Math.min(255, Math.round(((color >> shift) & 0xff) * factor)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
