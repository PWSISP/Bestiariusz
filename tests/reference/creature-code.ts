import type { SymbolData } from '../../src/core/types.ts';

/** The alphabet of creature codes (Crockford Base32): the value of a digit is its index here. */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A creature as a shareable code: three symbols, a visual variant (0-255) and nothing else. */
export interface CreatureCode {
  readonly element: string;
  readonly form: string;
  readonly trait: string;
  readonly variant: number;
}

/**
 * Writes a creature as exactly 7 characters of CODE_ALPHABET.
 * 1. e, f, t = index of the element, form and trait in `symbols.elements`, `.forms`, `.traits`.
 *    An unknown id, or an index that does not fit (e >= 8, f >= 16, t >= 16), throws RangeError.
 * 2. `variant` must be an integer 0-255, otherwise RangeError.
 * 3. P = e x 2^16 + f x 2^12 + t x 2^8 + variant (version 0 adds nothing).
 * 4. C = ((P XOR floor(P / 128)) x 31 + 677) mod 16384. P < 2^21, so a bitwise XOR is safe here.
 * 5. V = P x 16384 + C can exceed 2^32: use plain arithmetic, not bitwise operators, on V.
 * 6. V as 7 base-32 digits, most significant first, padded with "0".
 */
export function encodeCreatureCode(symbols: SymbolData, creature: CreatureCode): string {
  const e = symbols.elements.findIndex((x) => x.id === creature.element);
  const f = symbols.forms.findIndex((x) => x.id === creature.form);
  const t = symbols.traits.findIndex((x) => x.id === creature.trait);
  if (e < 0 || e >= 8) throw new RangeError(`Element not encodable: ${creature.element}`);
  if (f < 0 || f >= 16) throw new RangeError(`Form not encodable: ${creature.form}`);
  if (t < 0 || t >= 16) throw new RangeError(`Trait not encodable: ${creature.trait}`);
  const variant = creature.variant;
  if (!Number.isInteger(variant) || variant < 0 || variant > 255) {
    throw new RangeError(`Variant must be an integer 0-255, got ${variant}`);
  }
  const payload = e * 2 ** 16 + f * 2 ** 12 + t * 2 ** 8 + variant;
  let value = payload * 16384 + checksum(payload);
  let out = '';
  for (let i = 0; i < 7; i++) {
    out = CODE_ALPHABET.charAt(value % 32) + out;
    value = Math.floor(value / 32);
  }
  return out;
}

function checksum(payload: number): number {
  return ((payload ^ Math.floor(payload / 128)) * 31 + 677) % 16384;
}

/**
 * Reads a code written by `encodeCreatureCode`; returns null for anything else.
 * 1. Normalise: uppercase, remove every "-" and whitespace character, "O" -> "0", "I" and "L" -> "1".
 * 2. The result must be exactly 7 characters of CODE_ALPHABET, otherwise null.
 * 3. V -> P = floor(V / 16384) and C = V mod 16384.
 * 4. null when C is not the checksum of P, when floor(P / 2^19) (the version) is not 0, or when
 *    e = floor(P / 2^16) mod 8, f = floor(P / 2^12) mod 16 or t = floor(P / 2^8) mod 16 is not an
 *    index of `symbols.elements`, `.forms`, `.traits`.
 * 5. Otherwise { element, form, trait, variant: P mod 256 } with the ids found at those indexes.
 */
export function decodeCreatureCode(symbols: SymbolData, code: string): CreatureCode | null {
  const text = code.toUpperCase().replace(/[-\s]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (text.length !== 7) return null;
  let value = 0;
  for (const ch of text) {
    const digit = CODE_ALPHABET.indexOf(ch);
    if (digit < 0) return null;
    value = value * 32 + digit;
  }
  const payload = Math.floor(value / 16384);
  if (value % 16384 !== checksum(payload)) return null;
  if (Math.floor(payload / 2 ** 19) !== 0) return null;
  const element = symbols.elements[Math.floor(payload / 2 ** 16) % 8];
  const form = symbols.forms[Math.floor(payload / 2 ** 12) % 16];
  const trait = symbols.traits[Math.floor(payload / 2 ** 8) % 16];
  if (!element || !form || !trait) return null;
  return { element: element.id, form: form.id, trait: trait.id, variant: payload % 256 };
}
