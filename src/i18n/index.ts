import { createInstance } from 'i18next';
import type { i18n } from 'i18next';
import ICU from 'i18next-icu';
import en from './en.json';
import pl from './pl.json';

export type Lang = 'pl' | 'en';
export type TranslationKey = keyof typeof pl;

let instance: i18n | null = null;

/** Initialises i18next with ICU; calling it again re-initialises with the new language. */
export async function initI18n(lang: Lang): Promise<void> {
  const next = createInstance().use(ICU);
  await next.init({
    lng: lang,
    fallbackLng: 'pl',
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    interpolation: { escapeValue: false },
    resources: { pl: { translation: pl }, en: { translation: en } },
  });
  instance = next;
}

export async function setLanguage(lang: Lang): Promise<void> {
  await initialised().changeLanguage(lang);
}

export function getLanguage(): Lang {
  return initialised().language as Lang;
}

/** Translates a key; throws before initI18n(); an unknown key returns the key itself. */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return initialised().t(key, params);
}

/**
 * Translates a key known only at runtime (the keys built by src/view); an unknown key returns itself.
 * Prefer `t` when the key is a literal: it is checked against pl.json at compile time.
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  return initialised().t(key, params);
}

function initialised(): i18n {
  if (!instance) throw new Error('i18n is not initialised');
  return instance;
}
