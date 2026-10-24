import { describe, expect, it } from 'vitest';
import { describeLegend, legendKey } from '../src/core/legend.ts';
import type { CreatureSpec } from '../src/core/types.ts';
import { SYMBOLS } from './combat/fixtures.ts';

const spec = (element: string, form: string, trait: string): CreatureSpec => ({
  element,
  form,
  trait,
});
const SPECIAL = ['grom:wilk:gniew', 'woda:waz:smutek'];

describe('legendKey', () => {
  it('joins the three ids with colons', () => {
    expect(legendKey(spec('grom', 'wilk', 'gniew'))).toBe('grom:wilk:gniew');
    expect(legendKey(spec('ziemia', 'niedzwiedz', 'odwaga'))).toBe('ziemia:niedzwiedz:odwaga');
  });
});

describe('describeLegend', () => {
  it('uses the masculine template and adjective for a masculine form', () => {
    expect(describeLegend(SYMBOLS, spec('grom', 'waz', 'gniew'), SPECIAL)).toEqual({
      key: 'legend.born.m',
      parts: {
        adjective: 'symbol.trait.gniew.adjective_m',
        form: 'symbol.form.waz.name',
        element: 'symbol.element.grom.of',
      },
    });
  });

  it('uses the feminine template and adjective for a feminine form', () => {
    expect(describeLegend(SYMBOLS, spec('woda', 'sowa', 'smutek'), SPECIAL)).toEqual({
      key: 'legend.born.f',
      parts: {
        adjective: 'symbol.trait.smutek.adjective_f',
        form: 'symbol.form.sowa.name',
        element: 'symbol.element.woda.of',
      },
    });
  });

  it('returns the special legend, and no parts, for a listed combination', () => {
    expect(describeLegend(SYMBOLS, spec('grom', 'wilk', 'gniew'), SPECIAL)).toEqual({
      key: 'legend.special.grom_wilk_gniew',
      parts: null,
    });
    expect(describeLegend(SYMBOLS, spec('woda', 'waz', 'smutek'), SPECIAL)).toEqual({
      key: 'legend.special.woda_waz_smutek',
      parts: null,
    });
  });

  it('does not treat a similar combination as special', () => {
    expect(describeLegend(SYMBOLS, spec('grom', 'wilk', 'smutek'), SPECIAL).parts).not.toBeNull();
    expect(describeLegend(SYMBOLS, spec('grom', 'wilk', 'gniew'), []).parts).not.toBeNull();
  });

  it('gives every one of the 150 creatures a legend', () => {
    let special = 0;
    for (const e of SYMBOLS.elements)
      for (const f of SYMBOLS.forms)
        for (const t of SYMBOLS.traits) {
          const legend = describeLegend(SYMBOLS, spec(e.id, f.id, t.id), SPECIAL);
          expect(legend.key).toMatch(/^legend\.(born\.[mf]|special\.[a-z_]+)$/);
          if (legend.parts === null) special++;
          else expect(legend.key).toBe(`legend.born.${f.gender}`);
        }
    expect(special).toBe(2);
  });

  it('throws an Error for an unknown symbol, special legend or not', () => {
    expect(() => describeLegend(SYMBOLS, spec('lod', 'wilk', 'gniew'), SPECIAL)).toThrow(Error);
    expect(() => describeLegend(SYMBOLS, spec('grom', 'zubr', 'gniew'), SPECIAL)).toThrow(Error);
    expect(() => describeLegend(SYMBOLS, spec('grom', 'wilk', 'lek'), SPECIAL)).toThrow(Error);
    expect(() => describeLegend(SYMBOLS, spec('lod', 'wilk', 'gniew'), ['lod:wilk:gniew'])).toThrow(
      Error,
    );
  });

  it('does not modify its arguments', () => {
    const before = JSON.stringify(SYMBOLS);
    const special = Object.freeze([...SPECIAL]);
    describeLegend(SYMBOLS, spec('woda', 'sowa', 'smutek'), special);
    expect(JSON.stringify(SYMBOLS)).toBe(before);
    expect(special).toEqual(SPECIAL);
  });
});
