import { describe, expect, it } from 'vitest';
import { detectRitual } from '../src/core/combat/ritual.ts';
import type { CircleContent } from '../src/core/combat/ritual.ts';

const c = (element: string): CircleContent => ({ element });

describe('detectRitual', () => {
  it('three creatures of one element trigger that element', () => {
    expect(detectRitual([c('grom'), c('grom'), c('grom')], [])).toBe('grom');
    expect(detectRitual([c('woda'), c('woda'), c('woda')], ['grom'])).toBe('woda');
  });

  it('an empty circle blocks the ritual', () => {
    expect(detectRitual([c('grom'), null, c('grom')], [])).toBeNull();
    expect(detectRitual([null, null, null], [])).toBeNull();
  });

  it('mixed elements give no ritual', () => {
    expect(detectRitual([c('grom'), c('woda'), c('grom')], [])).toBeNull();
    expect(detectRitual([c('ogien'), c('woda'), c('ziemia')], [])).toBeNull();
  });

  it('wind is a wildcard', () => {
    expect(detectRitual([c('wiatr'), c('ogien'), c('ogien')], [])).toBe('ogien');
    expect(detectRitual([c('wiatr'), c('wiatr'), c('ziemia')], [])).toBe('ziemia');
    expect(detectRitual([c('wiatr'), c('wiatr'), c('wiatr')], [])).toBe('wiatr');
    expect(detectRitual([c('wiatr'), c('ogien'), c('woda')], [])).toBeNull();
  });

  it('an element already used in this combat returns null', () => {
    expect(detectRitual([c('grom'), c('grom'), c('grom')], ['grom'])).toBeNull();
    expect(detectRitual([c('wiatr'), c('ogien'), c('ogien')], ['ogien'])).toBeNull();
    expect(detectRitual([c('wiatr'), c('wiatr'), c('wiatr')], ['wiatr'])).toBeNull();
    expect(detectRitual([c('wiatr'), c('wiatr'), c('ogien')], ['wiatr'])).toBe('ogien');
  });

  it('a wrong number of circles throws RangeError', () => {
    expect(() => detectRitual([c('grom'), c('grom')], [])).toThrow(RangeError);
    expect(() => detectRitual([c('grom'), c('grom'), c('grom'), c('grom')], [])).toThrow(
      RangeError,
    );
    expect(() => detectRitual([], [])).toThrow(RangeError);
  });

  it('does not modify its arguments', () => {
    const circles = Object.freeze([c('wiatr'), c('grom'), c('grom')]);
    const used = Object.freeze(['woda']) as readonly string[];
    expect(detectRitual(circles, used)).toBe('grom');
  });
});
