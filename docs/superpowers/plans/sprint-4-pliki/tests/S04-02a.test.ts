import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/view/geometry.ts';
import {
  ARC_DROP,
  BOTTOM_GAP,
  CARD_HEIGHT,
  CARD_WIDTH,
  fanLayout,
  LIFT,
  MAX_ROTATION,
  MAX_STEP,
  SELECTED_SCALE,
  SIDE_MARGIN,
} from '../src/view/hand-fan.ts';

const AREA: Rect = { x: 0, y: 488, width: 360, height: 240 };
const CENTRE_X = 180;
const REST_Y = 488 + 240 - BOTTOM_GAP - CARD_HEIGHT / 2; // 652

describe('constants', () => {
  it('have the values of the specification', () => {
    expect([CARD_WIDTH, CARD_HEIGHT, MAX_STEP, SIDE_MARGIN, BOTTOM_GAP]).toEqual([92, 128, 69, 8, 12]);
    expect([ARC_DROP, LIFT, SELECTED_SCALE, MAX_ROTATION]).toEqual([4, 56, 1.1, 0.2]);
  });
});

describe('fanLayout: count', () => {
  it('returns no slots for no cards', () => {
    expect(fanLayout(0, AREA, null)).toEqual([]);
  });

  it('puts a single card in the middle of the area, upright, at the resting height', () => {
    expect(fanLayout(1, AREA, null)).toEqual([{ x: CENTRE_X, y: REST_Y, rotation: 0, scale: 1, z: 0 }]);
  });

  it('spaces two cards by MAX_STEP when there is room', () => {
    const [a, b] = fanLayout(2, AREA, null);
    expect(a?.x).toBeCloseTo(CENTRE_X - 34.5, 9);
    expect(b?.x).toBeCloseTo(CENTRE_X + 34.5, 9);
    expect(a?.rotation).toBeCloseTo(-0.025, 9);
    expect(b?.rotation).toBeCloseTo(0.025, 9);
  });

  it('squeezes five cards into an area 360 wide with a step of 63', () => {
    const xs = fanLayout(5, AREA, null).map((s) => s.x - CENTRE_X);
    expect(xs.map((x) => Math.round(x * 1e6) / 1e6)).toEqual([-126, -63, 0, 63, 126]);
  });

  it('keeps the outer cards inside the area, even when it is narrow', () => {
    for (const width of [250, 300, 360, 480]) {
      const area = { x: 20, y: 0, width, height: 240 };
      const slots = fanLayout(5, area, null);
      const left = (slots[0]?.x ?? 0) - CARD_WIDTH / 2;
      const right = (slots[4]?.x ?? 0) + CARD_WIDTH / 2;
      expect(left).toBeGreaterThanOrEqual(area.x + SIDE_MARGIN - 1e-9);
      expect(right).toBeLessThanOrEqual(area.x + width - SIDE_MARGIN + 1e-9);
    }
  });

  it('stacks all cards in the middle when the area is narrower than one card plus the margins', () => {
    const slots = fanLayout(3, { x: 0, y: 0, width: 100, height: 240 }, null);
    expect(slots.map((s) => s.x)).toEqual([50, 50, 50]);
  });
});

describe('fanLayout: shape of the fan', () => {
  for (const count of [2, 3, 4, 5]) {
    it(`is symmetric for ${count} cards`, () => {
      const slots = fanLayout(count, AREA, null);
      slots.forEach((slot, i) => {
        const mirror = slots[count - 1 - i];
        expect(slot.x + (mirror?.x ?? 0)).toBeCloseTo(2 * CENTRE_X, 9);
        expect(slot.y).toBeCloseTo(mirror?.y ?? 0, 9);
        expect(slot.rotation).toBeCloseTo(-(mirror?.rotation ?? 0), 9);
      });
    });
  }

  it('sinks the outer cards along an arc of ARC_DROP per squared slot', () => {
    const slots = fanLayout(5, AREA, null);
    expect(slots[2]?.y).toBeCloseTo(REST_Y, 9);
    expect(slots[1]?.y).toBeCloseTo(REST_Y + ARC_DROP, 9);
    expect(slots[0]?.y).toBeCloseTo(REST_Y + 4 * ARC_DROP, 9);
  });

  it('rotates by ROTATION_PER_SLOT per slot, clockwise towards the right', () => {
    const slots = fanLayout(5, AREA, null);
    expect(slots.map((s) => Math.round(s.rotation * 1e6) / 1e6)).toEqual([-0.1, -0.05, 0, 0.05, 0.1]);
  });

  it('limits the rotation to ±MAX_ROTATION', () => {
    const slots = fanLayout(11, { x: 0, y: 0, width: 2000, height: 240 }, null);
    expect(slots[0]?.rotation).toBeCloseTo(-MAX_ROTATION, 9);
    expect(slots[10]?.rotation).toBeCloseTo(MAX_ROTATION, 9);
    expect(slots[1]?.rotation).toBeCloseTo(-0.2, 9);
    expect(slots[2]?.rotation).toBeCloseTo(-0.15, 9);
    for (const s of slots) expect(Math.abs(s.rotation)).toBeLessThanOrEqual(MAX_ROTATION + 1e-12);
  });

  it('draws the cards left to right, each over the previous one', () => {
    const slots = fanLayout(5, AREA, null);
    expect(slots.map((s) => s.z)).toEqual([0, 1, 2, 3, 4]);
    expect(slots.every((s) => s.scale === 1)).toBe(true);
  });

  it('follows the area: moving it moves the fan by the same amount', () => {
    const a = fanLayout(4, AREA, null);
    const b = fanLayout(4, { ...AREA, x: AREA.x + 30, y: AREA.y - 70 }, null);
    a.forEach((slot, i) => {
      expect(b[i]?.x).toBeCloseTo(slot.x + 30, 9);
      expect(b[i]?.y).toBeCloseTo(slot.y - 70, 9);
      expect(b[i]?.rotation).toBeCloseTo(slot.rotation, 9);
    });
  });
});

describe('fanLayout: selection', () => {
  it('lifts the selected card straight above its resting height, without the arc', () => {
    const slots = fanLayout(5, AREA, 0);
    expect(slots[0]).toEqual({ x: CENTRE_X - 126, y: REST_Y - LIFT, rotation: 0, scale: SELECTED_SCALE, z: 5 });
    const middle = fanLayout(5, AREA, 2);
    expect(middle[2]).toEqual({ x: CENTRE_X, y: REST_Y - LIFT, rotation: 0, scale: SELECTED_SCALE, z: 5 });
  });

  it('leaves the other cards exactly where they were', () => {
    const plain = fanLayout(5, AREA, null);
    const selected = fanLayout(5, AREA, 3);
    plain.forEach((slot, i) => {
      if (i !== 3) expect(selected[i]).toEqual(slot);
    });
    expect(selected[3]?.x).toBe(plain[3]?.x);
  });

  it('draws the selected card above all the others', () => {
    for (const index of [0, 1, 2, 3, 4]) {
      const slots = fanLayout(5, AREA, index);
      const top = Math.max(...slots.map((s) => s.z));
      expect(slots[index]?.z).toBe(top);
      expect(slots.filter((s) => s.z === top)).toHaveLength(1);
    }
  });

  it.each([null, -1, 5, 7, 1.5, Number.NaN])('treats a selection of %s as no selection', (selected) => {
    expect(fanLayout(5, AREA, selected)).toEqual(fanLayout(5, AREA, null));
  });

  it('can select the only card', () => {
    expect(fanLayout(1, AREA, 0)).toEqual([{ x: CENTRE_X, y: REST_Y - LIFT, rotation: 0, scale: SELECTED_SCALE, z: 1 }]);
  });
});

describe('fanLayout: invalid input and purity', () => {
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('throws a RangeError for a count of %s', (count) => {
    expect(() => fanLayout(count, AREA, null)).toThrow(RangeError);
  });

  it('does not modify the area and returns new objects each time', () => {
    const area = Object.freeze({ ...AREA });
    const a = fanLayout(3, area, 1);
    const b = fanLayout(3, area, 1);
    expect(a).toEqual(b);
    expect(a[0]).not.toBe(b[0]);
    expect(area).toEqual(AREA);
  });
});
