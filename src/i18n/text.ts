// Turns the TextRefs of src/view into player-facing text; nested references are translated first.
import type { TextRef } from '../view/text.ts';

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function renderText(ref: TextRef, translate: TranslateFn): string {
  const params: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(ref.params ?? {})) {
    params[name] = typeof value === 'object' ? renderText(value, translate) : value;
  }
  return translate(ref.key, params);
}
