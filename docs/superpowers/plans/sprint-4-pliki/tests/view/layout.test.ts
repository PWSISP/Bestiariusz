import { describe, expect, it } from 'vitest';
import type { Insets, Rect, Size } from '../../src/view/geometry.ts';
import { intersects } from '../../src/view/geometry.ts';
import { layoutCombat, MIN_TOUCH, REFERENCE_SIZE } from '../../src/view/layout.ts';
import type { CombatLayout } from '../../src/view/layout.ts';

const PHONES: Size[] = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 440, height: 956 },
  { width: 600, height: 1024 },
];
const WIDE: Size[] = [
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
];

function regions(l: CombatLayout): [string, Rect][] {
  return [
    ['enemyHud', l.enemyHud],
    ['enemyArt', l.enemyArt],
    ['circle0', l.circles[0]],
    ['circle1', l.circles[1]],
    ['circle2', l.circles[2]],
    ['status', l.status],
    ['hand', l.hand],
    ['drawPile', l.drawPile],
    ['discardPile', l.discardPile],
    ['endTurn', l.endTurn],
  ];
}

function inside(inner: Rect, outer: Rect): boolean {
  const eps = 0.001;
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    inner.x + inner.width <= outer.x + outer.width + eps &&
    inner.y + inner.height <= outer.y + outer.height + eps
  );
}

describe('touch targets (S04-01: at least 48 dp)', () => {
  it.each(PHONES)('circles and buttons are at least 48x48 on $width x $height', (size) => {
    const l = layoutCombat(size);
    const targets: Rect[] = [...l.circles, l.drawPile, l.discardPile, l.endTurn];
    for (const r of targets) {
      expect(r.width).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(r.height).toBeGreaterThanOrEqual(MIN_TOUCH);
    }
  });
});

describe('regions', () => {
  it.each([...PHONES, ...WIDE])('stay inside the stage and do not overlap on $width x $height', (size) => {
    const l = layoutCombat(size);
    const all = regions(l);
    for (const [name, r] of all) expect(inside(r, l.stage), name).toBe(true);
    expect(inside(l.intent, l.enemyArt)).toBe(true);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(intersects(all[i]![1], all[j]![1]), `${all[i]![0]} x ${all[j]![0]}`).toBe(false);
      }
    }
  });

  it.each([...PHONES, ...WIDE])('keep the enemy picture big enough on $width x $height', (size) => {
    const l = layoutCombat(size);
    expect(l.enemyArt.height * 1).toBeGreaterThanOrEqual(60 * l.scale);
  });

  it('stacks top to bottom: enemy, circles, status, hand, buttons', () => {
    const l = layoutCombat({ width: 360, height: 800 });
    expect(l.enemyHud.y).toBeLessThan(l.enemyArt.y);
    expect(l.enemyArt.y + l.enemyArt.height).toBeLessThanOrEqual(l.circles[0].y);
    expect(l.circles[0].y + l.circles[0].height).toBeLessThanOrEqual(l.status.y);
    expect(l.status.y + l.status.height).toBeLessThanOrEqual(l.hand.y);
    expect(l.hand.y + l.hand.height).toBeLessThanOrEqual(l.endTurn.y);
  });

  it('puts the three circles left to right with equal size, centred', () => {
    const l = layoutCombat({ width: 360, height: 800 });
    const [a, b, c] = l.circles;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    expect(b.width).toBe(a.width);
    expect(c.width).toBe(a.width);
    const leftGap = a.x - l.stage.x;
    const rightGap = l.stage.x + l.stage.width - (c.x + c.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
  });

  it('lets the cast line sit between the circles and the hand', () => {
    for (const size of PHONES) {
      const l = layoutCombat(size);
      expect(l.castLineY).toBeGreaterThan(l.circles[0].y + l.circles[0].height);
      expect(l.castLineY).toBeLessThan(l.hand.y);
    }
  });
});

describe('thumb zone (portrait)', () => {
  it.each(PHONES)('End turn is in the bottom quarter and the hand in the bottom half on $width x $height', (size) => {
    const l = layoutCombat(size);
    const endTurnCentre = l.endTurn.y + l.endTurn.height / 2;
    expect(endTurnCentre).toBeGreaterThanOrEqual(l.stage.y + l.stage.height * 0.75);
    expect(l.hand.y).toBeGreaterThanOrEqual(l.stage.y + l.stage.height * 0.5);
    expect(l.endTurn.x + l.endTurn.width).toBeGreaterThan(l.stage.x + l.stage.width * 0.5);
  });
});

describe('safe area', () => {
  const notch: Insets = { top: 44, right: 0, bottom: 34, left: 0 };
  const sides: Insets = { top: 0, right: 48, bottom: 21, left: 48 };
  it.each([notch, sides])('keeps every region out of the insets %o', (insets) => {
    const size = { width: 390, height: 844 };
    const l = layoutCombat(size, insets);
    const safe: Rect = {
      x: insets.left,
      y: insets.top,
      width: size.width - insets.left - insets.right,
      height: size.height - insets.top - insets.bottom,
    };
    for (const [name, r] of regions(l)) expect(inside(r, safe), name).toBe(true);
  });
});

describe('wide screens use the scaled reference stage', () => {
  it.each(WIDE)('fits and centres the 360x800 stage on $width x $height', (size) => {
    const l = layoutCombat(size);
    expect(l.scale).toBeCloseTo(Math.min(size.width / REFERENCE_SIZE.width, size.height / REFERENCE_SIZE.height), 6);
    expect(l.stage.width).toBeCloseTo(REFERENCE_SIZE.width * l.scale, 6);
    expect(l.stage.height).toBeCloseTo(REFERENCE_SIZE.height * l.scale, 6);
    expect(l.stage.x + l.stage.width / 2).toBeCloseTo(size.width / 2, 6);
    expect(l.stage.y + l.stage.height / 2).toBeCloseTo(size.height / 2, 6);
  });
  it('uses scale 1 and a column of at most 480 on a portrait tablet', () => {
    const l = layoutCombat({ width: 600, height: 1024 });
    expect(l.scale).toBe(1);
    expect(l.stage.width).toBe(480);
    expect(l.stage.x).toBe(60);
  });
});

describe('purity', () => {
  it('returns equal layouts for equal input and does not mutate the insets', () => {
    const insets = Object.freeze({ top: 20, right: 0, bottom: 10, left: 0 });
    const size = Object.freeze({ width: 390, height: 844 });
    expect(layoutCombat(size, insets)).toEqual(layoutCombat(size, insets));
  });
});
