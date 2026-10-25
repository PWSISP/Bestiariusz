// The legend through the real i18next + ICU, as the app will use it. tests/i18n/legend.test.ts
// checks the same texts with a stand-in translator.
import { describe, expect, it } from 'vitest';
import { describeLegend } from '../../src/core/legend.ts';
import { SPECIAL_LEGENDS } from '../../src/data/legends.ts';
import { initI18n, t } from '../../src/i18n/index.ts';
import type { TranslationKey } from '../../src/i18n/index.ts';
import { renderLegend } from '../../src/i18n/legend.ts';
import type { Translate } from '../../src/i18n/legend.ts';
import { SYMBOLS } from '../combat/fixtures.ts';

const translate: Translate = (key, params) => t(key as TranslationKey, params);
const legend = (element: string, form: string, trait: string): string =>
  renderLegend(describeLegend(SYMBOLS, { element, form, trait }, SPECIAL_LEGENDS), translate);

describe('legend with i18next', () => {
  it('Polish', async () => {
    await initI18n('pl');
    expect(legend('woda', 'sowa', 'smutek')).toBe('Smutna Sowa zrodzona z Wody.');
    expect(legend('grom', 'waz', 'gniew')).toBe('Gniewny Wąż zrodzony z Gromu.');
    expect(legend('grom', 'wilk', 'gniew')).toBe('Perunów Wilk, którego wycie poprzedza burzę.');
  });

  it('English', async () => {
    await initI18n('en');
    expect(legend('woda', 'sowa', 'smutek')).toBe('Sorrowful Owl born of Water.');
    expect(legend('grom', 'wilk', 'gniew')).toBe('Perun’s Wolf, whose howl comes before the storm.');
  });

  it('formats all 150 legends in both languages without a placeholder left', async () => {
    for (const lang of ['pl', 'en'] as const) {
      await initI18n(lang);
      for (const e of SYMBOLS.elements)
        for (const f of SYMBOLS.forms)
          for (const tr of SYMBOLS.traits) {
            expect(legend(e.id, f.id, tr.id)).not.toMatch(/[{}]/);
          }
    }
  });
});
