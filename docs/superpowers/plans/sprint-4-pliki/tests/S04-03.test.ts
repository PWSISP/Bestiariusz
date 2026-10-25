import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import type { CreatureSpec } from '../src/core/types.ts';
import { ART_TEXTURE_IDS } from '../src/view/art-style.ts';
import { planCreatureLayers } from '../src/view/creature-layers.ts';

const symbols = JSON.parse(fs.readFileSync(new URL('../src/data/symbols.json', import.meta.url), 'utf8')) as {
  elements: { id: string }[];
  forms: { id: string }[];
  traits: { id: string }[];
};
const ALL: CreatureSpec[] = symbols.elements.flatMap((e) =>
  symbols.forms.flatMap((f) => symbols.traits.map((t) => ({ element: e.id, form: f.id, trait: t.id }))),
);
const BOX = { width: 100, height: 140 };

describe('planCreatureLayers: the three layers', () => {
  const [bg, form, mark] = planCreatureLayers({ element: 'ogien', form: 'sowa', trait: 'gniew' }, BOX);

  it('returns background, silhouette and overlay, in this order', () => {
    expect(planCreatureLayers({ element: 'ogien', form: 'sowa', trait: 'gniew' }, BOX).map((l) => l.role)).toEqual([
      'background',
      'silhouette',
      'overlay',
    ]);
  });

  it('fills the whole box with the background of the element', () => {
    expect(bg).toEqual({ role: 'background', textureId: 'bg.ogien', x: 0, y: 0, width: 100, height: 140, tint: null, alpha: 1 });
  });

  it('centres the silhouette of the form, a little off the middle, tinted with the element colour', () => {
    expect(form?.role).toBe('silhouette');
    expect(form?.textureId).toBe('form.sowa');
    expect(form?.width).toBeCloseTo(69.3, 9);
    expect(form?.height).toBeCloseTo(77, 9);
    expect(form?.x).toBeCloseTo(15.35, 9);
    expect(form?.y).toBeCloseTo(31.5, 9);
    expect(form?.tint).toBe(0xd9542c);
    expect(form?.alpha).toBe(1);
  });

  it('puts the mark of the trait in its corner, 30% of the short side big', () => {
    expect(mark?.role).toBe('overlay');
    expect(mark?.textureId).toBe('trait.gniew');
    expect(mark?.width).toBeCloseTo(30, 9);
    expect(mark?.height).toBeCloseTo(30, 9);
    expect(mark?.x).toBeCloseTo(100 - 30 - 5, 9); // gniew: top right
    expect(mark?.y).toBeCloseTo(5, 9);
    expect(mark?.tint).toBeNull();
    expect(mark?.alpha).toBe(0.9);
  });
});

describe('planCreatureLayers: silhouettes', () => {
  it('limits a silhouette that would be wider than 90% of the box, keeping its aspect', () => {
    const [, wolf] = planCreatureLayers({ element: 'woda', form: 'wilk', trait: 'smutek' }, BOX);
    expect(wolf?.width).toBeCloseTo(90, 9);
    expect(wolf?.height).toBeCloseTo(72, 9);
    expect(wolf?.x).toBeCloseTo(5, 9);
    expect(wolf?.y).toBeCloseTo(41, 9);
  });

  it('does not limit a silhouette in a very wide box', () => {
    const [, wolf] = planCreatureLayers({ element: 'woda', form: 'wilk', trait: 'smutek' }, { width: 1000, height: 100 });
    expect(wolf?.height).toBeCloseTo(60, 9);
    expect(wolf?.width).toBeCloseTo(75, 9);
    expect(wolf?.x).toBeCloseTo(462.5, 9);
    expect(wolf?.y).toBeCloseTo(25, 9);
  });

  it('shifts each form by its own fraction of the height (raven up, serpent down)', () => {
    const y = (form: string) => planCreatureLayers({ element: 'woda', form, trait: 'gniew' }, BOX)[1]?.y ?? 0;
    const mid = (form: string) => {
      const s = planCreatureLayers({ element: 'woda', form, trait: 'gniew' }, BOX)[1];
      return (s?.y ?? 0) + (s?.height ?? 0) / 2;
    };
    expect(y('kruk')).toBeLessThan(y('wilk'));
    expect(mid('kruk')).toBeCloseTo(70 - 7, 9);
    expect(mid('waz')).toBeCloseTo(70 + 14, 9);
    expect(mid('sowa')).toBeCloseTo(70, 9);
  });

  it('tints with the colour of each element', () => {
    const tint = (element: string) => planCreatureLayers({ element, form: 'jelen', trait: 'gniew' }, BOX)[1]?.tint;
    expect(tint('woda')).toBe(0x2f7fc1);
    expect(tint('grom')).toBe(0xe8c33a);
    expect(tint('ziemia')).toBe(0x7a5c3a);
    expect(tint('wiatr')).toBe(0x8fc7b8);
    expect(new Set(['ogien', 'woda', 'ziemia', 'wiatr', 'grom'].map(tint)).size).toBe(5);
  });
});

describe('planCreatureLayers: marks of traits', () => {
  const mark = (trait: string, box = BOX) => {
    const m = planCreatureLayers({ element: 'woda', form: 'jelen', trait }, box)[2];
    return [m?.x, m?.y];
  };

  it('places every corner of the table', () => {
    expect(mark('gniew')).toEqual([65, 5]); // top right
    expect(mark('odwaga')).toEqual([5, 5]); // top left
    expect(mark('smutek')).toEqual([5, 105]); // bottom left
    expect(mark('spryt')).toEqual([65, 105]); // bottom right
    expect(mark('glod')).toEqual([5, 105]);
  });

  it('sizes the mark by the short side of a wide box', () => {
    const m = planCreatureLayers({ element: 'woda', form: 'jelen', trait: 'odwaga' }, { width: 200, height: 100 })[2];
    expect(m?.width).toBeCloseTo(30, 9);
    expect(m?.x).toBeCloseTo(5, 9);
    const br = planCreatureLayers({ element: 'woda', form: 'jelen', trait: 'spryt' }, { width: 200, height: 100 })[2];
    expect(br?.x).toBeCloseTo(200 - 30 - 5, 9);
    expect(br?.y).toBeCloseTo(100 - 30 - 5, 9);
  });
});

describe('planCreatureLayers: all 150 creatures', () => {
  it('has 150 creatures to check', () => {
    expect(ALL).toHaveLength(150);
  });

  it('asks only for textures the placeholder art provides', () => {
    const known = new Set(ART_TEXTURE_IDS);
    const used = new Set<string>();
    for (const spec of ALL) {
      for (const layer of planCreatureLayers(spec, BOX)) {
        expect(known.has(layer.textureId), layer.textureId).toBe(true);
        used.add(layer.textureId);
      }
    }
    expect(used.size).toBe(16);
  });

  it('keeps every layer inside the box, for several box sizes', () => {
    for (const box of [BOX, { width: 80, height: 80 }, { width: 200, height: 100 }, { width: 96, height: 120 }]) {
      for (const spec of ALL) {
        for (const l of planCreatureLayers(spec, box)) {
          expect(l.x).toBeGreaterThanOrEqual(-1e-9);
          expect(l.y).toBeGreaterThanOrEqual(-1e-9);
          expect(l.x + l.width).toBeLessThanOrEqual(box.width + 1e-9);
          expect(l.y + l.height).toBeLessThanOrEqual(box.height + 1e-9);
          expect(l.width).toBeGreaterThan(0);
          expect(l.height).toBeGreaterThan(0);
          expect(l.alpha).toBeGreaterThan(0);
          expect(l.alpha).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('gives different creatures different pictures', () => {
    const keys = new Set(ALL.map((spec) => JSON.stringify(planCreatureLayers(spec, BOX))));
    expect(keys.size).toBeGreaterThan(100);
  });
});

describe('planCreatureLayers: unknown symbols and invalid boxes', () => {
  it('draws an unknown creature with the default look instead of failing', () => {
    const plan = planCreatureLayers({ element: 'mroz', form: 'zubr', trait: 'lenistwo' }, BOX);
    expect(plan.map((l) => l.textureId)).toEqual(['bg.mroz', 'form.zubr', 'trait.lenistwo']);
    expect(plan[1]?.tint).toBe(0x8a8a8a);
    expect(plan[1]?.height).toBeCloseTo(84, 9);
    expect(plan[1]?.width).toBeCloseTo(84, 9);
  });

  it.each([
    { width: 0, height: 100 },
    { width: 100, height: 0 },
    { width: -5, height: 100 },
    { width: Number.NaN, height: 100 },
    { width: 100, height: Number.POSITIVE_INFINITY },
  ])('throws a RangeError for the box %o', (box) => {
    expect(() => planCreatureLayers({ element: 'ogien', form: 'wilk', trait: 'gniew' }, box)).toThrow(RangeError);
  });

  it('does not modify its arguments and returns new objects', () => {
    const spec = Object.freeze({ element: 'ogien', form: 'wilk', trait: 'gniew' });
    const box = Object.freeze({ width: 100, height: 140 });
    const a = planCreatureLayers(spec, box);
    const b = planCreatureLayers(spec, box);
    expect(a).toEqual(b);
    expect(a[0]).not.toBe(b[0]);
  });
});
