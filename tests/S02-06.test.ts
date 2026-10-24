import { describe, expect, it } from 'vitest';
import { resolveEnemyTurn } from '../src/core/combat/enemy-turn.ts';
import type { BossState, CircleCreature, PlayerState } from '../src/core/combat/enemy-turn.ts';

const cr = (attack: number, health: number): CircleCreature => ({
  element: 'grom',
  form: 'wilk',
  trait: 'gniew',
  attack,
  health,
});

const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  hp: 30,
  maxHp: 30,
  block: 0,
  circles: [null, null, null],
  hand: [],
  discard: [],
  curses: 0,
  ...over,
});

const boss = (over: Partial<BossState> = {}): BossState => ({
  hp: 80,
  maxHp: 80,
  block: 0,
  stolen: [],
  ...over,
});

const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('resolveEnemyTurn: attacks on creatures', () => {
  it('an attack hits the creature with the highest attack', () => {
    const r = resolveEnemyTurn(player({ circles: [cr(2, 5), cr(4, 6), cr(4, 9)] }), boss(), [
      { type: 'atak', amount: 3 },
    ]);
    expect(r.log).toEqual(['trafienie krag1 3']);
    expect(r.player.circles).toEqual([cr(2, 5), cr(4, 3), cr(4, 9)]);
    expect(r.player.hp).toBe(30);
  });

  it('on equal attack the lowest circle index is hit', () => {
    const r = resolveEnemyTurn(player({ circles: [cr(3, 5), null, cr(3, 5)] }), boss(), [
      { type: 'atak', amount: 3 },
    ]);
    expect(r.log).toEqual(['trafienie krag0 3']);
    expect(r.player.circles).toEqual([cr(3, 2), null, cr(3, 5)]);
  });

  it('a destroyed creature empties its circle and excess damage is lost', () => {
    const r = resolveEnemyTurn(player({ circles: [cr(1, 2), null, null] }), boss(), [
      { type: 'atak', amount: 10 },
    ]);
    expect(r.log).toEqual(['trafienie krag0 2', 'zniszczono krag0']);
    expect(r.player.circles).toEqual([null, null, null]);
    expect(r.player.hp).toBe(30);
  });

  it('player block does not protect creatures', () => {
    const r = resolveEnemyTurn(player({ block: 9, circles: [cr(1, 5), null, null] }), boss(), [
      { type: 'atak', amount: 4 },
    ]);
    expect(r.player.circles[0]).toEqual(cr(1, 1));
    expect(r.player.block).toBe(9);
  });

  it('a multi-attack retargets before every hit', () => {
    const r = resolveEnemyTurn(player({ circles: [cr(3, 2), null, cr(1, 4)] }), boss(), [
      { type: 'wielokrotny', amount: 3, times: 4 },
    ]);
    expect(r.log).toEqual([
      'trafienie krag0 2',
      'zniszczono krag0',
      'trafienie krag2 3',
      'trafienie krag2 1',
      'zniszczono krag2',
      'trafienie gracz 3',
    ]);
    expect(r.player.circles).toEqual([null, null, null]);
    expect(r.player.hp).toBe(27);
  });
});

describe('resolveEnemyTurn: attacks on the player', () => {
  it('with empty circles an attack uses block first', () => {
    const r = resolveEnemyTurn(player({ block: 4 }), boss(), [
      { type: 'atak', amount: 7 },
      { type: 'atak', amount: 2 },
    ]);
    expect(r.log).toEqual(['trafienie gracz 3', 'trafienie gracz 2']);
    expect(r.player.block).toBe(0);
    expect(r.player.hp).toBe(25);
    const blocked = resolveEnemyTurn(player({ block: 10 }), boss(), [{ type: 'atak', amount: 6 }]);
    expect(blocked.log).toEqual(['trafienie gracz 0']);
    expect(blocked.player.block).toBe(4);
  });

  it('a direct attack ignores the circles and hits the player through block', () => {
    const r = resolveEnemyTurn(player({ block: 5, circles: [cr(3, 7), null, null] }), boss(), [
      { type: 'atak', amount: 12, direct: true },
    ]);
    expect(r.log).toEqual(['trafienie gracz 7']);
    expect(r.player.hp).toBe(23);
    expect(r.player.block).toBe(0);
    expect(r.player.circles).toEqual([cr(3, 7), null, null]);
  });

  it('direct: false behaves like the default', () => {
    const withFlag = resolveEnemyTurn(player({ circles: [cr(3, 7), null, null] }), boss(), [
      { type: 'atak', amount: 4, direct: false },
    ]);
    const without = resolveEnemyTurn(player({ circles: [cr(3, 7), null, null] }), boss(), [
      { type: 'atak', amount: 4 },
    ]);
    expect(withFlag).toEqual(without);
    expect(withFlag.log).toEqual(['trafienie krag0 4']);
  });

  it('a direct multi-attack hits the player every time, even with creatures present', () => {
    const r = resolveEnemyTurn(player({ circles: [cr(2, 2), null, null] }), boss(), [
      { type: 'wielokrotny', amount: 3, times: 2, direct: true },
    ]);
    expect(r.log).toEqual(['trafienie gracz 3', 'trafienie gracz 3']);
    expect(r.player.hp).toBe(24);
    expect(r.player.circles).toEqual([cr(2, 2), null, null]);
  });

  it('defeat stops the turn', () => {
    const r = resolveEnemyTurn(player({ hp: 5, block: 1, hand: ['a'] }), boss(), [
      { type: 'wielokrotny', amount: 4, times: 3 },
      { type: 'kradziez' },
    ]);
    expect(r.log).toEqual(['trafienie gracz 3', 'trafienie gracz 2', 'porazka']);
    expect(r.player.hp).toBe(0);
    expect(r.player.hand).toEqual(['a']);
    expect(r.boss.stolen).toEqual([]);
  });

  it('a direct attack that kills the player logs the defeat', () => {
    const r = resolveEnemyTurn(player({ hp: 4, circles: [cr(1, 9), null, null] }), boss(), [
      { type: 'atak', amount: 12, direct: true },
    ]);
    expect(r.log).toEqual(['trafienie gracz 4', 'porazka']);
    expect(r.player.hp).toBe(0);
  });
});

describe('resolveEnemyTurn: shield, curse and theft', () => {
  it('shield, curse and theft', () => {
    const r = resolveEnemyTurn(
      player({ circles: [cr(2, 2), cr(1, 1), null], hand: ['a', 'b'], discard: ['x'] }),
      boss({ block: 2 }),
      [
        { type: 'tarcza', amount: 8 },
        { type: 'klatwa', circle: 0 },
        { type: 'klatwa', circle: 2 },
        { type: 'kradziez' },
        { type: 'kradziez' },
        { type: 'kradziez' },
      ],
    );
    expect(r.log).toEqual([
      'tarcza 8',
      'zniszczono krag0',
      'klatwa krag0',
      'klatwa krag2',
      'kradziez b',
      'kradziez a',
      'kradziez brak',
    ]);
    expect(r.boss.block).toBe(10);
    expect(r.boss.stolen).toEqual(['b', 'a']);
    expect(r.player.circles).toEqual([null, cr(1, 1), null]);
    expect(r.player.hand).toEqual([]);
    expect(r.player.discard).toEqual(['x', 'klatwa', 'klatwa']);
    expect(r.player.curses).toBe(2);
  });

  it('an empty action list changes nothing', () => {
    const p = player({ hand: ['a'], circles: [cr(1, 1), null, null] });
    const r = resolveEnemyTurn(p, boss(), []);
    expect(r.log).toEqual([]);
    expect(r.player).toEqual(p);
    expect(r.boss).toEqual(boss());
  });
});

describe('resolveEnemyTurn: purity', () => {
  it('does not modify the inputs', () => {
    const p = player({
      circles: [cr(3, 3), cr(1, 1), null],
      hand: ['a'],
      discard: ['d'],
      block: 2,
    });
    const b = boss();
    const pBefore = copy(p);
    const bBefore = copy(b);
    resolveEnemyTurn(p, b, [
      { type: 'atak', amount: 2 },
      { type: 'atak', amount: 5, direct: true },
      { type: 'klatwa', circle: 1 },
      { type: 'kradziez' },
      { type: 'tarcza', amount: 3 },
    ]);
    expect(p).toEqual(pBefore);
    expect(b).toEqual(bBefore);
  });

  it('the result does not depend on the property order of the inputs', () => {
    const reverseKeys = <T extends object>(o: T): T =>
      Object.fromEntries(Object.entries(o).reverse()) as T;
    const p = player({ circles: [cr(3, 3), cr(2, 4), null], hand: ['a', 'b'], block: 1 });
    const actions = [
      { type: 'wielokrotny' as const, amount: 3, times: 3 },
      { type: 'klatwa' as const, circle: 1 },
      { type: 'kradziez' as const },
    ];
    const plain = resolveEnemyTurn(p, boss(), actions);
    const reordered = resolveEnemyTurn(
      reverseKeys({ ...p, circles: p.circles.map((c) => (c ? reverseKeys(c) : null)) }),
      reverseKeys(boss()),
      actions.map((a) => reverseKeys(a)),
    );
    expect(reordered).toEqual(plain);
  });
});
