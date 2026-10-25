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
export function encodeCreatureCode(_symbols: SymbolData, _creature: CreatureCode): string {
  throw new Error('Not implemented');
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
export function decodeCreatureCode(_symbols: SymbolData, _code: string): CreatureCode | null {
  throw new Error('Not implemented');
}
