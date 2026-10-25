// Differential test for the Sprint 4 Qwen tasks S04-02a, S04-02b, S04-03, S04-04 and S04-08: the shipped
// implementation must agree with the reference implementation (tests/reference/) on thousands of random
// inputs, including inputs the hand-written tests never name. Added after those tasks passed.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng.ts';
import type { Rng } from '../../src/core/rng.ts';
import * as fan from '../../src/view/hand-fan.ts';
import * as input from '../../src/view/hand-input.ts';
import * as layers from '../../src/view/creature-layers.ts';
import * as icons from '../../src/view/element-icons.ts';
import * as result from '../../src/view/result-view.ts';
import * as refFan from '../reference/hand-fan.ts';
import * as refInput from '../reference/hand-input.ts';
import * as refLayers from '../reference/creature-layers.ts';
import * as refIcons from '../reference/element-icons.ts';
import * as refResult from '../reference/result-view.ts';

const ROUNDS = 3000;

function outcome<A extends unknown[], R>(fn: (...args: A) => R, args: A): unknown {
  try {
    return { value: fn(...(structuredClone(args) as A)) };
  } catch (error) {
    return { error: error instanceof Error ? error.constructor.name : String(error) };
  }
}

function same<A extends unknown[], R>(real: (...args: A) => R, ref: (...args: A) => R, args: A): void {
  expect(outcome(real, args)).toEqual(outcome(ref, args));
}

const symbols: unknown = JSON.parse(readFileSync(new URL('../../src/data/symbols.json', import.meta.url), 'utf8'));
const ids = (list: readonly { id: string }[]): string[] => list.map((x) => x.id);
const ELEMENTS = ids((symbols as { elements: { id: string }[] }).elements);
const FORMS = ids((symbols as { forms: { id: string }[] }).forms);
const TRAITS = ids((symbols as { traits: { id: string }[] }).traits);

const money = (r: Rng, lo: number, hi: number): number => lo + (r.next() * (hi - lo));

describe('S04-02a hand-fan agrees with the reference', () => {
  it('on random hands, areas and selections', () => {
    const r = createRng(404);
    for (let i = 0; i < ROUNDS; i++) {
      const count = r.int(0, 12);
      const area = { x: money(r, -50, 100), y: money(r, 0, 500), width: money(r, 20, 500), height: money(r, 20, 250) };
      const selected = r.int(0, 3) === 0 ? null : r.int(-1, 13);
      same(fan.fanLayout, refFan.fanLayout, [count, area, selected]);
    }
  });
  it('on degenerate input', () => {
    for (const args of [
      [-1, { x: 0, y: 0, width: 100, height: 100 }, null],
      [3.5, { x: 0, y: 0, width: 100, height: 100 }, null],
      [3, { x: 0, y: 0, width: 0, height: 0 }, 1],
      [3, { x: 0, y: 0, width: -5, height: 100 }, 1],
      [1, { x: 0, y: 0, width: 100, height: 100 }, 0],
    ] as const) same(fan.fanLayout, refFan.fanLayout, [...args] as Parameters<typeof fan.fanLayout>);
  });
});

function randomContext(r: Rng): input.HandInputContext {
  const n = r.int(1, 7);
  const kinds = ['creature', 'spell', 'curse'] as const;
  return {
    hand: Array.from({ length: n }, () => {
      const kind = kinds[r.int(0, 2)] as 'creature' | 'spell' | 'curse';
      const playable = kind !== 'curse' && r.int(0, 3) > 0;
      return { kind, playable, blocked: playable ? null : kind === 'curse' ? 'unplayable' : 'not_enough_ember' };
    }),
    freeCircles: [r.int(0, 1) === 1, r.int(0, 1) === 1, r.int(0, 1) === 1],
    circleRects: [0, 1, 2].map((c) => ({ x: 20 + c * 110, y: 300, width: 108, height: 124 })),
    castLineY: 480,
  };
}

function randomEvent(r: Rng, n: number): input.HandInputEvent {
  const x = r.int(0, 360);
  const y = r.int(200, 780);
  switch (r.int(0, 9)) {
    case 0:
    case 1:
    case 2:
      return { type: 'pointerDown', handIndex: r.int(0, n), x, y };
    case 3:
    case 4:
      return { type: 'pointerMove', x, y };
    case 5:
    case 6:
      return { type: 'pointerUp', x, y };
    case 7:
      return { type: r.int(0, 1) ? 'pointerCancel' : 'reset' };
    case 8:
      return { type: 'tapCircle', circle: r.int(0, 3) };
    default:
      return { type: 'tapOutside' };
  }
}

describe('S04-02b hand-input agrees with the reference', () => {
  it('on random event sequences, step by step', () => {
    const r = createRng(405);
    for (let round = 0; round < 600; round++) {
      const ctx = randomContext(r);
      let real: input.HandInputState = input.IDLE;
      let ref: refInput.HandInputState = refInput.IDLE;
      for (let step = 0; step < 14; step++) {
        const event = randomEvent(r, ctx.hand.length);
        const a = outcome(input.reduceHandInput, [real, event, ctx]) as { value?: input.HandInputResult };
        const b = outcome(refInput.reduceHandInput, [ref, event, ctx]) as { value?: refInput.HandInputResult };
        expect(a).toEqual(b);
        if (!a.value || !b.value) break;
        real = a.value.state;
        ref = b.value.state;
      }
    }
  });
});

describe('S04-03 creature-layers agrees with the reference', () => {
  it('on random creatures and boxes', () => {
    const r = createRng(406);
    for (let i = 0; i < ROUNDS; i++) {
      const spec = { element: r.pick(ELEMENTS), form: r.pick(FORMS), trait: r.pick(TRAITS) };
      const box = { width: money(r, 10, 400), height: money(r, 10, 400) };
      same(layers.planCreatureLayers, refLayers.planCreatureLayers, [spec as never, box]);
    }
  });
  it('on unknown ids and degenerate boxes', () => {
    for (const [spec, box] of [
      [{ element: 'nope', form: 'sowa', trait: 'smutek' }, { width: 100, height: 140 }],
      [{ element: 'ogien', form: 'nope', trait: 'smutek' }, { width: 100, height: 140 }],
      [{ element: 'ogien', form: 'sowa', trait: 'nope' }, { width: 100, height: 140 }],
      [{ element: 'ogien', form: 'sowa', trait: 'smutek' }, { width: 0, height: 0 }],
      [{ element: 'ogien', form: 'sowa', trait: 'smutek' }, { width: -1, height: 10 }],
    ] as const) same(layers.planCreatureLayers, refLayers.planCreatureLayers, [spec as never, box]);
  });
});

describe('S04-04 element-icons agrees with the reference', () => {
  it('on the polygons, the fallback and unusual names', () => {
    expect(icons.ELEMENT_ICONS).toEqual(refIcons.ELEMENT_ICONS);
    expect(icons.FALLBACK_ICON).toEqual(refIcons.FALLBACK_ICON);
    for (const name of [...ELEMENTS, 'nope', '', 'constructor', 'toString', '__proto__', 'hasOwnProperty', 'OGIEN']) {
      same(icons.iconFor, refIcons.iconFor, [name]);
    }
  });
  it('on random boxes', () => {
    const r = createRng(407);
    for (let i = 0; i < ROUNDS; i++) {
      const name = r.pick([...ELEMENTS, 'nope']);
      const box = { x: money(r, -100, 300), y: money(r, -100, 300), width: money(r, 0, 200), height: money(r, 0, 200) };
      same(icons.placeIcon, refIcons.placeIcon, [icons.iconFor(name), box]);
    }
  });
});

describe('S04-08 result-view agrees with the reference', () => {
  it('on random summaries, including invalid ones', () => {
    const r = createRng(408);
    for (let i = 0; i < ROUNDS; i++) {
      const hpMax = r.int(-1, 60);
      const summary = {
        outcome: r.int(0, 1) ? 'won' : 'lost',
        enemyId: r.pick(['leszy', 'nope', '']),
        turns: r.int(-1, 40),
        hpLeft: r.int(-1, 60),
        hpMax,
        ritualUsed: r.int(0, 1) === 1,
      } as const;
      same(result.buildResultView, refResult.buildResultView, [summary]);
    }
  });
  it('on the band edges', () => {
    for (const hpLeft of [0, 1, 13, 14, 15, 27, 28, 29, 30, 40]) {
      for (const turns of [1, 19, 20, 21]) {
        same(result.buildResultView, refResult.buildResultView, [{ outcome: 'won', enemyId: 'leszy', turns, hpLeft, hpMax: 40, ritualUsed: false }]);
      }
    }
  });
});
