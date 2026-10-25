// Keeps the switches of the effects between sessions (S06-04). Storage can be missing or throw (private
// windows, blocked data), so every access is guarded and the defaults apply.
import { parseJuiceSettings, serializeJuiceSettings } from '../view/juice.ts';
import type { JuiceSettings } from '../view/juice.ts';

const KEY = 'bestiariusz.juice';

export function loadJuice(): JuiceSettings {
  try {
    return parseJuiceSettings(window.localStorage.getItem(KEY));
  } catch {
    return parseJuiceSettings(null);
  }
}

export function saveJuice(settings: JuiceSettings): void {
  try {
    window.localStorage.setItem(KEY, serializeJuiceSettings(settings));
  } catch {
    // The choice is kept for this session only.
  }
}
