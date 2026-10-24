import type { SymbolData } from './types.ts';

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
  // Find indices
  const e = symbols.elements.findIndex((el) => el.id === creature.element);
  if (e === -1) throw new RangeError('Unknown element');
  if (e >= 8) throw new RangeError('Element index too large');

  const f = symbols.forms.findIndex((form) => form.id === creature.form);
  if (f === -1) throw new RangeError('Unknown form');
  if (f >= 16) throw new RangeError('Form index too large');

  const t = symbols.traits.findIndex((trait) => trait.id === creature.trait);
  if (t === -1) throw new RangeError('Unknown trait');
  if (t >= 16) throw new RangeError('Trait index too large');

  // Validate variant
  if (!Number.isInteger(creature.variant) || creature.variant < 0 || creature.variant > 255) {
    throw new RangeError('Variant must be an integer between 0 and 255');
  }

  // Calculate P
  const P = e * 65536 + f * 4096 + t * 256 + creature.variant;

  // Calculate C (checksum)
  const C = ((P ^ Math.floor(P / 128)) * 31 + 677) % 16384;

  // Calculate V
  const V = P * 16384 + C;

  // Convert V to 7-character base-32 string
  let result = '';
  let tempV = V;
  for (let i = 0; i < 7; i++) {
    result = CODE_ALPHABET.charAt(tempV % 32) + result;
    tempV = Math.floor(tempV / 32);
  }

  return result;
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
  // Normalise input
  let normalized = code.toUpperCase();
  normalized = normalized.replace(/[-\s]/g, ''); // Remove hyphens and whitespace
  normalized = normalized.replace(/O/g, '0'); // "O" becomes "0"
  normalized = normalized.replace(/[IL]/g, '1'); // "I" and "L" become "1"

  // Check length and character set
  if (normalized.length !== 7) return null;
  for (let i = 0; i < 7; i++) {
    if (CODE_ALPHABET.indexOf(normalized[i]) === -1) return null;
  }

  // Convert base-32 string back to V
  let V = 0;
  for (let i = 0; i < 7; i++) {
    V = V * 32 + CODE_ALPHABET.indexOf(normalized[i]);
  }

  // Extract P and C
  const P = Math.floor(V / 16384);
  const C = V % 16384;

  // Check version (must be 0)
  if (Math.floor(P / 524288) !== 0) return null; // 2^19 = 524288

  // Calculate expected checksum
  const expectedC = ((P ^ Math.floor(P / 128)) * 31 + 677) % 16384;

  // Verify checksum
  if (C !== expectedC) return null;

  // Extract indices
  const e = Math.floor(P / 65536) % 8; // P / 2^16 mod 8
  const f = Math.floor(P / 4096) % 16; // P / 2^12 mod 16
  const t = Math.floor(P / 256) % 16; // P / 2^8 mod 16

  // Validate indices
  if (e >= symbols.elements.length || f >= symbols.forms.length || t >= symbols.traits.length) {
    return null;
  }

  // Return decoded creature
  return {
    element: symbols.elements[e].id,
    form: symbols.forms[f].id,
    trait: symbols.traits[t].id,
    variant: P % 256,
  };
}
