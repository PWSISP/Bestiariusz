import { describe, expect, it } from 'vitest';
import { applyDamage } from '../src/core/combat/damage.ts';
import type { Combatant } from '../src/core/combat/damage.ts';

const base = (over: Partial<Combatant> = {}): Combatant => ({
  hp: 20,
  maxHp: 20,
  block: 0,
  resist: [],
  weak: [],
  ...over,
});

describe('applyDamage', () => {
  it('plain hit', () => {
    expect(applyDamage(base(), { amount: 6, element: null })).toEqual({
      target: base({ hp: 14 }),
      blocked: 0,
      dealt: 6,
      overkill: 0,
      killed: false,
    });
  });

  it('block absorbs first', () => {
    expect(applyDamage(base({ block: 4 }), { amount: 6, element: null })).toEqual({
      target: base({ hp: 18, block: 0 }),
      blocked: 4,
      dealt: 2,
      overkill: 0,
      killed: false,
    });
    expect(applyDamage(base({ block: 10 }), { amount: 6, element: null })).toEqual({
      target: base({ hp: 20, block: 4 }),
      blocked: 6,
      dealt: 0,
      overkill: 0,
      killed: false,
    });
  });

  it('pierce ignores block', () => {
    expect(applyDamage(base({ block: 10 }), { amount: 6, element: null, pierce: true })).toEqual({
      target: base({ hp: 14, block: 10 }),
      blocked: 0,
      dealt: 6,
      overkill: 0,
      killed: false,
    });
  });

  it('resistance halves the hit (rounded down)', () => {
    const r = applyDamage(base({ resist: ['grom'] }), { amount: 7, element: 'grom' });
    expect(r.dealt).toBe(3);
    expect(r.target.hp).toBe(17);
  });

  it('weakness multiplies the hit by 1.5 (rounded down)', () => {
    const r = applyDamage(base({ weak: ['ogien'] }), { amount: 5, element: 'ogien' });
    expect(r.dealt).toBe(7);
    expect(r.target.hp).toBe(13);
  });

  it('resistance and weakness together cancel out; the element applies before block', () => {
    const both = applyDamage(base({ resist: ['woda'], weak: ['woda'] }), {
      amount: 5,
      element: 'woda',
    });
    expect(both.dealt).toBe(5);
    expect(
      applyDamage(base({ weak: ['ogien'], block: 3 }), { amount: 4, element: 'ogien' }),
    ).toEqual({
      target: base({ weak: ['ogien'], block: 0, hp: 17 }),
      blocked: 3,
      dealt: 3,
      overkill: 0,
      killed: false,
    });
  });

  it('a hit without an element ignores resistances and weaknesses', () => {
    const r = applyDamage(base({ resist: ['grom'], weak: ['ogien'] }), {
      amount: 6,
      element: null,
    });
    expect(r.dealt).toBe(6);
  });

  it('overkill and killed', () => {
    expect(applyDamage(base({ hp: 5, block: 2 }), { amount: 10, element: null })).toEqual({
      target: base({ hp: 0, block: 0 }),
      blocked: 2,
      dealt: 5,
      overkill: 3,
      killed: true,
    });
    const dead = applyDamage(base({ hp: 0 }), { amount: 4, element: null });
    expect(dead.killed).toBe(false);
    expect(dead.overkill).toBe(4);
    expect(dead.dealt).toBe(0);
  });

  it('zero or negative amount does nothing', () => {
    for (const amount of [0, -3]) {
      expect(applyDamage(base({ block: 2 }), { amount, element: 'grom' })).toEqual({
        target: base({ block: 2 }),
        blocked: 0,
        dealt: 0,
        overkill: 0,
        killed: false,
      });
    }
  });

  it('does not modify the input', () => {
    const target = Object.freeze(base({ block: 3, resist: Object.freeze(['grom']) as string[] }));
    const hit = Object.freeze({ amount: 9, element: 'grom' });
    const r = applyDamage(target, hit);
    expect(r.target).not.toBe(target);
    expect(target.hp).toBe(20);
    expect(target.block).toBe(3);
    expect(r.target.hp).toBe(19);
  });
});
