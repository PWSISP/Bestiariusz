import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeLegend } from '../../src/core/legend.ts';
import type { CreatureSpec } from '../../src/core/types.ts';
import { SPECIAL_LEGENDS } from '../../src/data/legends.ts';
import { renderLegend } from '../../src/i18n/legend.ts';
import type { Translate } from '../../src/i18n/legend.ts';
import { SYMBOLS } from '../combat/fixtures.ts';

const readTexts = (file: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(new URL(`../../src/i18n/${file}`, import.meta.url), 'utf8')) as Record<
    string,
    string
  >;
const pl = readTexts('pl.json');
const en = readTexts('en.json');

/** A stand-in for i18next that fills simple {name} placeholders; throws on a missing key. */
const translator =
  (texts: Record<string, string>): Translate =>
  (key, params = {}) => {
    const text = texts[key];
    if (text === undefined) throw new Error(`missing key: ${key}`);
    return text.replace(/\{(\w+)\}/g, (_m, name: string) => params[name] ?? `{${name}}`);
  };
const trPl = translator(pl);
const trEn = translator(en);
const legend = (element: string, form: string, trait: string, lang: 'pl' | 'en'): string =>
  renderLegend(
    describeLegend(SYMBOLS, { element, form, trait }, SPECIAL_LEGENDS),
    lang === 'pl' ? trPl : trEn,
  );

describe('renderLegend', () => {
  it('builds the Polish sentence with the gender of the form', () => {
    expect(legend('woda', 'sowa', 'smutek', 'pl')).toBe('Smutna Sowa zrodzona z Wody.');
    expect(legend('grom', 'waz', 'gniew', 'pl')).toBe('Gniewny Wąż zrodzony z Gromu.');
    expect(legend('ziemia', 'jelen', 'odwaga', 'pl')).toBe('Odważny Jeleń zrodzony z Ziemi.');
    expect(legend('wiatr', 'sowa', 'glod', 'pl')).toBe('Głodna Sowa zrodzona z Wiatru.');
  });

  it('builds the English sentence', () => {
    expect(legend('woda', 'sowa', 'smutek', 'en')).toBe('Sorrowful Owl born of Water.');
    expect(legend('ogien', 'niedzwiedz', 'spryt', 'en')).toBe('Cunning Bear born of Fire.');
  });

  it('uses the hand-written text of a special legend', () => {
    expect(legend('grom', 'wilk', 'gniew', 'pl')).toBe('Perunów Wilk, którego wycie poprzedza burzę.');
    expect(legend('grom', 'wilk', 'gniew', 'en')).toBe(
      'Perun’s Wolf, whose howl comes before the storm.',
    );
    expect(legend('woda', 'waz', 'smutek', 'pl')).toBe('Wąż z Topieli, który płacze za utopionymi.');
  });

  it('leaves no placeholder in any of the 150 legends, in both languages', () => {
    for (const e of SYMBOLS.elements)
      for (const f of SYMBOLS.forms)
        for (const t of SYMBOLS.traits) {
          for (const lang of ['pl', 'en'] as const) {
            const text = legend(e.id, f.id, t.id, lang);
            expect(text).not.toMatch(/[{}]/);
            expect(text.endsWith('.')).toBe(true);
          }
        }
  });
});

describe('texts of the symbols and the Workshop', () => {
  it('pl.json and en.json have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
  });

  it('every key a creature needs exists in both languages', () => {
    const keys = new Set<string>();
    const spec = (element: string, form: string, trait: string): CreatureSpec => ({
      element,
      form,
      trait,
    });
    for (const e of SYMBOLS.elements)
      for (const f of SYMBOLS.forms)
        for (const t of SYMBOLS.traits) {
          const l = describeLegend(SYMBOLS, spec(e.id, f.id, t.id), SPECIAL_LEGENDS);
          keys.add(l.key);
          for (const part of Object.values(l.parts ?? {})) keys.add(part);
        }
    for (const e of SYMBOLS.elements) keys.add(`symbol.element.${e.id}.name`);
    for (const f of SYMBOLS.forms) keys.add(`symbol.form.${f.id}.name`);
    for (const t of SYMBOLS.traits) keys.add(`symbol.trait.${t.id}.name`);
    for (const error of ['unknown_symbol', 'locked_symbol', 'over_budget', 'not_enough_ink']) {
      keys.add(`workshop.error.${error}`);
    }
    const missing = [...keys].filter((k) => !Object.hasOwn(pl, k) || !Object.hasOwn(en, k));
    expect(missing).toEqual([]);
  });
});
