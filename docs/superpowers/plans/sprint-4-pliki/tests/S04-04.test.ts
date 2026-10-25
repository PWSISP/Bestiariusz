import { describe, expect, it } from 'vitest';
import {
  ELEMENT_ICONS,
  FALLBACK_ICON,
  iconFor,
  placeIcon,
  type ElementIcon,
} from '../src/view/element-icons.ts';

const ELEMENTS = ['ogien', 'woda', 'ziemia', 'wiatr', 'grom'] as const;
const N = 48;

type P = { readonly x: number; readonly y: number };
type Mask = boolean[][];

function inside(polygon: readonly P[], x: number, y: number): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i] as P;
    const b = polygon[j] as P;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

function raster(icon: ElementIcon): Mask {
  const mask: Mask = [];
  for (let r = 0; r < N; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < N; c++) {
      const x = (c + 0.5) / N;
      const y = (r + 0.5) / N;
      row.push(icon.some((polygon) => inside(polygon, x, y)));
    }
    mask.push(row);
  }
  return mask;
}

const count = (row: boolean[]): number => row.filter(Boolean).length;
const coverage = (mask: Mask): number => mask.reduce((sum, row) => sum + count(row), 0) / (N * N);
const rowWidth = (mask: Mask, y: number): number => count(mask[Math.floor(y * N)] as boolean[]) / N;
const filledRows = (mask: Mask): number[] => mask.map((row, r) => (row.some(Boolean) ? r : -1)).filter((r) => r >= 0);
const top = (mask: Mask): number => (filledRows(mask)[0] as number) / N;
const bottom = (mask: Mask): number => ((filledRows(mask).at(-1) as number) + 1) / N;

function overlap(a: Mask, b: Mask): number {
  let both = 0;
  let either = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = (a[r] as boolean[])[c] as boolean;
      const y = (b[r] as boolean[])[c] as boolean;
      if (x && y) both++;
      if (x || y) either++;
    }
  }
  return both / either;
}

const mirrored = (mask: Mask): Mask => mask.map((row) => [...row].reverse());

function centroidY(mask: Mask): number {
  let sum = 0;
  let n = 0;
  mask.forEach((row, r) => {
    for (const filled of row) {
      if (filled) {
        sum += (r + 0.5) / N;
        n++;
      }
    }
  });
  return sum / n;
}

function convexHullArea(points: readonly P[]): number {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: P, a: P, b: P): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (list: P[]): P[] => {
    const out: P[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2] as P, out[out.length - 1] as P, q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  const hull = [...build(sorted), ...build([...sorted].reverse())];
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i] as P;
    const b = hull[(i + 1) % hull.length] as P;
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function polygonArea(polygon: readonly P[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i] as P;
    const b = polygon[(i + 1) % polygon.length] as P;
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function orientation(a: P, b: P, c: P): number {
  const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  return Math.abs(v) < 1e-12 ? 0 : v > 0 ? 1 : 2;
}
function onSegment(a: P, b: P, c: P): boolean {
  return (
    b.x <= Math.max(a.x, c.x) + 1e-12 &&
    b.x >= Math.min(a.x, c.x) - 1e-12 &&
    b.y <= Math.max(a.y, c.y) + 1e-12 &&
    b.y >= Math.min(a.y, c.y) - 1e-12
  );
}
function segmentsTouch(p1: P, q1: P, p2: P, q2: P): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && onSegment(p1, p2, q1)) ||
    (o2 === 0 && onSegment(p1, q2, q1)) ||
    (o3 === 0 && onSegment(p2, p1, q2)) ||
    (o4 === 0 && onSegment(p2, q1, q2))
  );
}
function crossesItself(polygon: readonly P[]): boolean {
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const neighbours = j === i + 1 || (i === 0 && j === n - 1);
      if (neighbours) continue;
      if (segmentsTouch(polygon[i] as P, polygon[(i + 1) % n] as P, polygon[j] as P, polygon[(j + 1) % n] as P)) return true;
    }
  }
  return false;
}

type Element = (typeof ELEMENTS)[number];
const cache = new Map<Element, Mask>();
function maskOf(element: Element): Mask {
  let mask = cache.get(element);
  if (!mask) {
    mask = raster(ELEMENT_ICONS[element] ?? []);
    cache.set(element, mask);
  }
  return mask;
}

describe('ELEMENT_ICONS: data', () => {
  it('has exactly the five elements', () => {
    expect(Object.keys(ELEMENT_ICONS).sort()).toEqual([...ELEMENTS].sort());
  });

  it.each(ELEMENTS)('%s: 1-4 polygons of 3-24 points inside the unit square', (element) => {
    const icon = ELEMENT_ICONS[element] as ElementIcon;
    expect(icon.length).toBeGreaterThanOrEqual(1);
    expect(icon.length).toBeLessThanOrEqual(4);
    for (const polygon of icon) {
      expect(polygon.length).toBeGreaterThanOrEqual(3);
      expect(polygon.length).toBeLessThanOrEqual(24);
      for (const q of polygon) {
        expect(Number.isFinite(q.x) && Number.isFinite(q.y)).toBe(true);
        expect(q.x).toBeGreaterThanOrEqual(0);
        expect(q.x).toBeLessThanOrEqual(1);
        expect(q.y).toBeGreaterThanOrEqual(0);
        expect(q.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each(ELEMENTS)('%s: no polygon is tiny or crosses itself', (element) => {
    for (const polygon of ELEMENT_ICONS[element] as ElementIcon) {
      expect(polygonArea(polygon)).toBeGreaterThanOrEqual(0.01);
      expect(crossesItself(polygon)).toBe(false);
    }
  });

  it('detects a crossing polygon (self-check of the test)', () => {
    const bowtie = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    expect(crossesItself(bowtie)).toBe(true);
    expect(crossesItself(ELEMENT_ICONS.grom?.[0] ?? bowtie)).toBe(false);
  });

  it.each(ELEMENTS)('%s: fills between 15% and 60% of the square', (element) => {
    const c = coverage(maskOf(element));
    expect(c).toBeGreaterThanOrEqual(0.15);
    expect(c).toBeLessThanOrEqual(0.6);
  });

  it('makes every pair of icons look different (overlap over union below 0.7)', () => {
    for (let i = 0; i < ELEMENTS.length; i++) {
      for (let j = i + 1; j < ELEMENTS.length; j++) {
        const a = ELEMENTS[i] as Element;
        const b = ELEMENTS[j] as Element;
        expect(overlap(maskOf(a), maskOf(b)), `${a} / ${b}`).toBeLessThan(0.7);
      }
    }
  });
});

describe('ELEMENT_ICONS: shapes', () => {
  it('ogien is a flame: tall, wide at the bottom, not symmetric', () => {
    const m = maskOf('ogien');
    expect(top(m)).toBeLessThan(0.15);
    expect(bottom(m)).toBeGreaterThan(0.85);
    expect(rowWidth(m, 0.8)).toBeGreaterThanOrEqual(2 * rowWidth(m, 0.2));
    expect(overlap(m, mirrored(m))).toBeLessThan(0.9);
  });

  it('woda is a drop: sharp tip, round belly, symmetric', () => {
    const m = maskOf('woda');
    expect(top(m)).toBeLessThan(0.15);
    expect(bottom(m)).toBeGreaterThan(0.85);
    expect(overlap(m, mirrored(m))).toBeGreaterThanOrEqual(0.9);
    for (let r = 0; r < Math.floor(0.2 * N); r++) {
      expect(count(m[r] as boolean[]) / N).toBeLessThanOrEqual(0.2);
    }
    expect(centroidY(m)).toBeGreaterThan(0.5);
  });

  it('ziemia is a mountain: narrow peak, wide base', () => {
    const m = maskOf('ziemia');
    for (let r = 0; r < Math.floor(0.3 * N); r++) {
      expect(count(m[r] as boolean[]) / N).toBeLessThanOrEqual(0.25);
    }
    expect(rowWidth(m, 0.8)).toBeGreaterThanOrEqual(0.6);
    expect(bottom(m)).toBeGreaterThan(0.85);
    expect(top(m)).toBeLessThan(0.3);
    expect(centroidY(m)).toBeGreaterThan(0.5);
  });

  it('wiatr is wind: at least three separate gusts, wide', () => {
    const m = maskOf('wiatr');
    let groups = 0;
    let inGroup = false;
    for (const row of m) {
      const busy = count(row) >= 4;
      if (busy && !inGroup) groups++;
      inGroup = busy;
    }
    expect(groups).toBeGreaterThanOrEqual(3);
    const columns = Array.from({ length: N }, (_, c) => m.some((row) => row[c])).map((v, c) => (v ? c : -1)).filter((c) => c >= 0);
    expect(((columns.at(-1) as number) + 1 - (columns[0] as number)) / N).toBeGreaterThanOrEqual(0.7);
  });

  it('grom is a bolt: tall, not symmetric, far from convex', () => {
    const m = maskOf('grom');
    expect(bottom(m) - top(m)).toBeGreaterThanOrEqual(0.85);
    expect(overlap(m, mirrored(m))).toBeLessThan(0.7);
    const hull = convexHullArea((ELEMENT_ICONS.grom as ElementIcon).flat());
    expect(coverage(m) / hull).toBeLessThan(0.8);
  });
});

describe('FALLBACK_ICON and iconFor', () => {
  it('is a diamond of four points, in this order', () => {
    expect(FALLBACK_ICON).toEqual([
      [
        { x: 0.5, y: 0.1 },
        { x: 0.9, y: 0.5 },
        { x: 0.5, y: 0.9 },
        { x: 0.1, y: 0.5 },
      ],
    ]);
  });

  it.each(ELEMENTS)('returns the very icon of %s', (element) => {
    expect(iconFor(element)).toBe(ELEMENT_ICONS[element]);
  });

  it.each(['mroz', '', 'OGIEN', 'ogien ', 'toString', 'constructor', '__proto__', 'hasOwnProperty'])(
    'returns the fallback for %j',
    (element) => {
      expect(iconFor(element)).toBe(FALLBACK_ICON);
    },
  );
});

describe('placeIcon', () => {
  it('puts the unit square into the biggest square of the box, centred', () => {
    expect(placeIcon(FALLBACK_ICON, { x: 10, y: 20, width: 100, height: 40 })).toEqual([
      [
        { x: 60, y: 24 },
        { x: 76, y: 40 },
        { x: 60, y: 56 },
        { x: 44, y: 40 },
      ],
    ]);
  });

  it('centres in the other direction when the box is tall', () => {
    const placed = placeIcon(FALLBACK_ICON, { x: 0, y: 0, width: 20, height: 50 });
    expect(placed[0]?.[0]).toEqual({ x: 10, y: 15 + 2 });
    expect(placed[0]?.[1]).toEqual({ x: 18, y: 25 });
    expect(placed[0]?.[3]).toEqual({ x: 2, y: 25 });
  });

  it('keeps the number and the order of polygons and points', () => {
    const placed = placeIcon(ELEMENT_ICONS.wiatr as ElementIcon, { x: 0, y: 0, width: 10, height: 10 });
    const original = ELEMENT_ICONS.wiatr as ElementIcon;
    expect(placed).toHaveLength(original.length);
    placed.forEach((polygon, i) => {
      expect(polygon).toHaveLength((original[i] ?? []).length);
      polygon.forEach((q, k) => {
        expect(q.x).toBeCloseTo(((original[i] as ElementIcon[number])[k] as P).x * 10, 9);
        expect(q.y).toBeCloseTo(((original[i] as ElementIcon[number])[k] as P).y * 10, 9);
      });
    });
  });

  it('returns new arrays and new points and leaves the icon alone', () => {
    const before = JSON.stringify(ELEMENT_ICONS);
    const placed = placeIcon(ELEMENT_ICONS.ogien as ElementIcon, { x: 0, y: 0, width: 1, height: 1 });
    expect(placed[0]).not.toBe((ELEMENT_ICONS.ogien as ElementIcon)[0]);
    expect(placed[0]?.[0]).not.toBe((ELEMENT_ICONS.ogien as ElementIcon)[0]?.[0]);
    placed[0]?.push({ x: 9, y: 9 });
    expect(JSON.stringify(ELEMENT_ICONS)).toBe(before);
    expect(JSON.stringify(placeIcon(FALLBACK_ICON, { x: 0, y: 0, width: 1, height: 1 }))).toBe(
      JSON.stringify(FALLBACK_ICON),
    );
  });

  it('collapses to a point for an empty box instead of failing', () => {
    const placed = placeIcon(FALLBACK_ICON, { x: 5, y: 7, width: 0, height: 30 });
    for (const q of placed[0] ?? []) expect(q).toEqual({ x: 5, y: 22 });
  });
});
