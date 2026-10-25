// Text references: the view layer never builds texts for the player, it returns keys with parameters.
// The UI translates a reference with `renderText` (src/i18n/text.ts); parameters may be references too.

export type TextParam = number | string | TextRef;

export interface TextRef {
  /** Key in pl.json / en.json. */
  readonly key: string;
  readonly params?: Readonly<Record<string, TextParam>>;
}

export function text(key: string, params?: Readonly<Record<string, TextParam>>): TextRef {
  return params === undefined ? { key } : { key, params };
}

/** Every key a reference needs, nested ones included (used by the tests that check both language files). */
export function keysOf(ref: TextRef): string[] {
  const keys = [ref.key];
  for (const value of Object.values(ref.params ?? {})) {
    if (typeof value === 'object') keys.push(...keysOf(value));
  }
  return keys;
}
