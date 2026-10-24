import type { TranslationKey } from '../i18n/index.ts';
import { t } from '../i18n/index.ts';

/** A 48 dp button whose visible text (also its accessible name) comes from i18n. */
export function createButton(labelKey: TranslationKey, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ui-button';
  button.textContent = t(labelKey);
  button.addEventListener('click', onClick);
  return button;
}
