import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../src/i18n/en.json';
import pl from '../src/i18n/pl.json';
import { getLanguage, initI18n, setLanguage, t } from '../src/i18n/index.ts';

describe('Polish plurals', () => {
  beforeEach(async () => {
    await initI18n('pl');
  });
  it.each([
    [0, '0 kart'],
    [1, '1 karta'],
    [2, '2 karty'],
    [4, '4 karty'],
    [5, '5 kart'],
    [12, '12 kart'],
    [22, '22 karty'],
    [25, '25 kart'],
    [101, '101 kart'],
    [112, '112 kart'],
    [1.5, '1,5 karty'],
  ])('cards.count for %s', (count, text) => {
    expect(t('cards.count', { count })).toBe(text);
  });
});

describe('English plurals and language switching', () => {
  it('switches at runtime', async () => {
    await initI18n('pl');
    await setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('cards.count', { count: 1 })).toBe('1 card');
    expect(t('cards.count', { count: 2 })).toBe('2 cards');
    expect(t('screen.test.switch')).toBe('Switch screen');
  });
  it('initI18n can be called again with another language', async () => {
    await initI18n('pl');
    await initI18n('en');
    expect(getLanguage()).toBe('en');
  });
});

describe('resources', () => {
  it('PL and EN have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
  });
  it('no translation is empty and every message formats', async () => {
    for (const lang of ['pl', 'en'] as const) {
      await initI18n(lang);
      for (const key of Object.keys(pl) as (keyof typeof pl)[]) {
        const text = t(key, { count: 1 });
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toBe(key);
      }
    }
  });
  it('unknown keys do not compile and return the key at runtime', async () => {
    await initI18n('pl');
    // @ts-expect-error — the key is not in pl.json
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
  it('t() before initialisation throws', async () => {
    vi.resetModules();
    const fresh = await import('../src/i18n/index.ts');
    expect(() => fresh.t('app.title')).toThrow('i18n is not initialised');
  });
});
