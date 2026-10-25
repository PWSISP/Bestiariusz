import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, decodeCreatureCode, encodeCreatureCode } from '../src/core/creature-code.ts';
import type { CreatureCode } from '../src/core/creature-code.ts';
import { createRng } from '../src/core/rng.ts';
import type { SymbolData } from '../src/core/types.ts';

// Frozen copy of the symbols: the order of the arrays is part of the code format.
const SYMBOLS: SymbolData = {
  elements: ['ogien', 'woda', 'ziemia', 'wiatr', 'grom'].map((id) => ({
    id,
    cost: 2,
    attackBonus: 0,
    healthBonus: 0,
  })),
  forms: ['wilk', 'kruk', 'sowa', 'waz', 'niedzwiedz', 'jelen'].map((id) => ({
    id,
    cost: 3,
    baseAttack: 1,
    baseHealth: 1,
    gender: 'm' as const,
  })),
  traits: ['gniew', 'smutek', 'spryt', 'odwaga', 'glod'].map((id) => ({
    id,
    cost: 1,
    attackMod: 0,
    healthMod: 0,
  })),
};

const enc = (c: CreatureCode): string => encodeCreatureCode(SYMBOLS, c);
const dec = (s: string): CreatureCode | null => decodeCreatureCode(SYMBOLS, s);
const code = (element: string, form: string, trait: string, variant: number): CreatureCode => ({
  element,
  form,
  trait,
  variant,
});

describe('encodeCreatureCode', () => {
  it('matches the known vectors', () => {
    expect(enc(code('ogien', 'wilk', 'gniew', 0))).toBe('00000N5');
    expect(enc(code('grom', 'wilk', 'gniew', 0))).toBe('4000EN5');
    expect(enc(code('woda', 'sowa', 'smutek', 137))).toBe('1464P0V');
    expect(enc(code('wiatr', 'jelen', 'glod', 255))).toBe('3AKZYRF');
  });

  it('writes 7 characters of the alphabet for every combination', () => {
    const seen = new Set<string>();
    for (const e of SYMBOLS.elements)
      for (const f of SYMBOLS.forms)
        for (const t of SYMBOLS.traits)
          for (const variant of [0, 1, 77, 128, 255]) {
            const s = enc(code(e.id, f.id, t.id, variant));
            expect(s).toMatch(/^[0-9A-HJKMNP-TV-Z]{7}$/);
            seen.add(s);
          }
    expect(seen.size).toBe(750);
  });

  it('rejects a variant that is not an integer 0-255', () => {
    for (const variant of [256, -1, 1.5, Number.NaN]) {
      expect(() => enc(code('grom', 'wilk', 'gniew', variant))).toThrow(RangeError);
    }
  });

  it('rejects an unknown symbol', () => {
    expect(() => enc(code('lod', 'wilk', 'gniew', 0))).toThrow(RangeError);
    expect(() => enc(code('grom', 'zubr', 'gniew', 0))).toThrow(RangeError);
    expect(() => enc(code('grom', 'wilk', 'lek', 0))).toThrow(RangeError);
  });

  it('rejects a symbol whose index does not fit into the code', () => {
    const wide: SymbolData = {
      ...SYMBOLS,
      elements: Array.from({ length: 9 }, (_, i) => ({
        id: `e${i}`,
        cost: 1,
        attackBonus: 0,
        healthBonus: 0,
      })),
    };
    expect(() => encodeCreatureCode(wide, code('e8', 'wilk', 'gniew', 0))).toThrow(RangeError);
    expect(encodeCreatureCode(wide, code('e7', 'wilk', 'gniew', 0))).toMatch(/^[0-9A-Z]{7}$/);
  });

  it('does not modify its arguments', () => {
    const input = Object.freeze(code('grom', 'wilk', 'gniew', 9));
    expect(() => enc(input)).not.toThrow();
    expect(input).toEqual(code('grom', 'wilk', 'gniew', 9));
  });
});

describe('decodeCreatureCode', () => {
  it('reads back every combination', () => {
    for (const e of SYMBOLS.elements)
      for (const f of SYMBOLS.forms)
        for (const t of SYMBOLS.traits)
          for (const variant of [0, 1, 77, 128, 255]) {
            const c = code(e.id, f.id, t.id, variant);
            expect(dec(enc(c))).toEqual(c);
          }
  });

  it('round-trips 20000 random creatures', () => {
    const rng = createRng(20261130);
    for (let i = 0; i < 20000; i++) {
      const c = code(
        rng.pick(SYMBOLS.elements).id,
        rng.pick(SYMBOLS.forms).id,
        rng.pick(SYMBOLS.traits).id,
        rng.int(0, 255),
      );
      expect(dec(enc(c))).toEqual(c);
    }
  });

  it('normalises case, hyphens, whitespace and look-alike characters', () => {
    const c = code('grom', 'wilk', 'gniew', 0);
    expect(dec('4000en5')).toEqual(c);
    expect(dec('4ooo-en5')).toEqual(c);
    expect(dec(' 400 0EN5 ')).toEqual(c);
    expect(dec('4000\tEN5\n')).toEqual(c);
    expect(dec('L464POV')).toEqual(dec('1464P0V'));
    expect(dec('i464p0v')).toEqual(code('woda', 'sowa', 'smutek', 137));
  });

  it('rejects the wrong length and characters outside the alphabet', () => {
    for (const bad of ['', '4000EN', '4000EN50', '4000ENU', '4000EN*', '4000ENÓ', '-------']) {
      expect(dec(bad)).toBeNull();
    }
  });

  it('catches every single-character typo and every adjacent swap', () => {
    for (const valid of ['4000EN5', '1464P0V', '3AKZYRF']) {
      for (let i = 0; i < 7; i++) {
        for (const ch of CODE_ALPHABET) {
          if (ch === valid[i]) continue;
          expect(dec(valid.slice(0, i) + ch + valid.slice(i + 1))).toBeNull();
        }
        if (i < 6 && valid[i] !== valid[i + 1]) {
          const swapped = valid.slice(0, i) + valid[i + 1] + valid[i] + valid.slice(i + 2);
          expect(dec(swapped)).toBeNull();
        }
      }
    }
  });

  it('rejects a well-formed code whose index points at no symbol', () => {
    const narrow: SymbolData = { ...SYMBOLS, elements: SYMBOLS.elements.slice(0, 2) };
    const fromGrom = enc(code('grom', 'wilk', 'gniew', 0));
    expect(decodeCreatureCode(narrow, fromGrom)).toBeNull();
    expect(decodeCreatureCode(narrow, enc(code('woda', 'wilk', 'gniew', 0)))).toEqual(
      code('woda', 'wilk', 'gniew', 0),
    );
  });

  it('rejects a code of another version', () => {
    // version 1 payload (P = 2^19), with a correct checksum for it
    const payload = 2 ** 19;
    const checksum = ((payload ^ Math.floor(payload / 128)) * 31 + 677) % 16384;
    let value = payload * 16384 + checksum;
    let text = '';
    for (let i = 0; i < 7; i++) {
      text = CODE_ALPHABET.charAt(value % 32) + text;
      value = Math.floor(value / 32);
    }
    expect(dec(text)).toBeNull();
  });
});
