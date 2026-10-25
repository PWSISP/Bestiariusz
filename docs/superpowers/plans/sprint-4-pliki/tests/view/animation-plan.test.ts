import { describe, expect, it } from 'vitest';
import type { CombatEvent } from '../../src/core/combat/model.ts';
import {
  EMPTY_PLAN,
  MAX_PLAN_MS,
  SLOW_FRAME_MS,
  TIMING,
  clamp01,
  createFrameMeter,
  createTimeline,
  easeInOutQuad,
  easeOutBack,
  easeOutCubic,
  planAnimation,
  pulse,
} from '../../src/view/animation-plan.ts';
import { playWithBot } from './support.ts';

const kinds = (events: CombatEvent[]): string[] => planAnimation(events).cues.map((c) => c.kind);

describe('planAnimation: cues of events', () => {
  it('has no cues for no events and for disabled animations', () => {
    expect(planAnimation([])).toEqual(EMPTY_PLAN);
    expect(planAnimation([{ type: 'card_played', cardId: 'x' }], { enabled: false })).toEqual(EMPTY_PLAN);
  });

  it('turns a spell into a card flight and a hit', () => {
    const plan = planAnimation([
      { type: 'card_played', cardId: 'uderzenie' },
      { type: 'enemy_damaged', source: 'spell', dealt: 7, blocked: 2 },
    ]);
    expect(plan.cues.map((c) => c.kind)).toEqual(['card', 'hit']);
    expect(plan.cues[0]).toMatchObject({ cardId: 'uderzenie', start: 0, duration: TIMING.card.duration });
    expect(plan.cues[1]).toMatchObject({ amount: 7, blocked: 2, detail: 'spell', circle: null, start: TIMING.card.advance });
  });

  it('puts a lunge of the creature before its hit', () => {
    const plan = planAnimation([{ type: 'enemy_damaged', source: 'creature', circle: 1, dealt: 4, blocked: 0 }]);
    expect(plan.cues.map((c) => c.kind)).toEqual(['attack', 'hit']);
    expect(plan.cues[0]?.circle).toBe(1);
    expect(plan.cues[1]).toMatchObject({ circle: 1, amount: 4, detail: 'creature' });
    expect(plan.cues[1]?.start).toBe(TIMING.attack.advance);
  });

  it('shows a ritual hit without a lunge', () => {
    expect(
      kinds([
        { type: 'ritual', element: 'ogien' },
        { type: 'enemy_damaged', source: 'ritual', dealt: 12, blocked: 0 },
      ]),
    ).toEqual(['ritual', 'hit']);
  });

  it('maps every kind of event', () => {
    const events: CombatEvent[] = [
      { type: 'turn_started', turn: 3, intentId: 'cios' },
      { type: 'creature_summoned', circle: 2, cardId: 'wilk' },
      { type: 'effect', circle: 0, trigger: 'summon', op: 'mend', amount: 3 },
      { type: 'enemy_acted', actionId: 'cios', log: [] },
      { type: 'creature_died', circle: 0 },
      { type: 'player_damaged', amount: 9 },
      { type: 'combat_lost' },
      { type: 'rejected', reason: 'not_enough_ember' },
    ];
    const plan = planAnimation(events);
    expect(plan.cues.map((c) => c.kind)).toEqual(['turn', 'summon', 'effect', 'enemy_act', 'death', 'hurt', 'end', 'rejected']);
    expect(plan.cues[0]).toMatchObject({ amount: 3, actionId: 'cios' });
    expect(plan.cues[2]).toMatchObject({ circle: 0, amount: 3, detail: 'mend' });
    expect(plan.cues[3]?.actionId).toBe('cios');
    expect(plan.cues[5]?.amount).toBe(9);
    expect(plan.cues[6]?.detail).toBe('lost');
    expect(plan.cues[7]?.detail).toBe('not_enough_ember');
    expect(kinds([{ type: 'combat_won' }])).toEqual(['end']);
  });

  it('starts cues in order, overlapping them by the timing table', () => {
    const plan = planAnimation([
      { type: 'card_played', cardId: 'a' },
      { type: 'creature_summoned', circle: 0, cardId: 'a' },
      { type: 'enemy_damaged', source: 'creature', circle: 0, dealt: 1, blocked: 0 },
    ]);
    expect(plan.cues.map((c) => c.start)).toEqual([0, 200, 360, 500]);
    expect(plan.duration).toBe(500 + TIMING.hit.duration);
  });

  it('does not change the events', () => {
    const events: CombatEvent[] = [{ type: 'card_played', cardId: 'a' }];
    const before = JSON.stringify(events);
    planAnimation(events);
    expect(JSON.stringify(events)).toBe(before);
  });
});

describe('planAnimation: time budget', () => {
  it('speeds up a long plan to fit MAX_PLAN_MS', () => {
    const events: CombatEvent[] = [];
    for (let i = 0; i < 12; i++) events.push({ type: 'enemy_damaged', source: 'creature', circle: i % 3, dealt: 2, blocked: 0 });
    const plan = planAnimation(events);
    expect(plan.duration).toBe(MAX_PLAN_MS);
    const last = plan.cues.at(-1);
    expect((last?.start ?? 0) + (last?.duration ?? 0)).toBeCloseTo(MAX_PLAN_MS, 6);
    expect(plan.cues[1]?.start).toBeLessThan(TIMING.attack.advance);
  });

  it('keeps every real action of a whole bot combat within the budget', () => {
    let worst = 0;
    let actions = 0;
    for (const seed of [1, 2, 3]) {
      playWithBot(seed, (_before, events) => {
        const plan = planAnimation(events);
        worst = Math.max(worst, plan.duration);
        actions++;
        for (const cue of plan.cues) {
          expect(cue.start).toBeGreaterThanOrEqual(0);
          expect(cue.duration).toBeGreaterThan(0);
          expect(cue.start + cue.duration).toBeLessThanOrEqual(plan.duration + 1e-9);
        }
      });
    }
    expect(actions).toBeGreaterThan(50);
    expect(worst).toBeLessThanOrEqual(MAX_PLAN_MS);
    expect(worst).toBeGreaterThan(0);
  });
});

describe('easing', () => {
  it('starts at 0 and ends at 1', () => {
    for (const f of [easeOutCubic, easeInOutQuad, easeOutBack]) {
      expect(f(0)).toBeCloseTo(0, 9);
      expect(f(1)).toBeCloseTo(1, 9);
    }
  });
  it('clamps its input', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(7)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeInOutQuad(-1)).toBe(0);
  });
  it('overshoots before settling (back) and rises fast first (cubic)', () => {
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8);
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 9);
  });
  it('pulse goes there and back', () => {
    expect(pulse(0)).toBeCloseTo(0, 9);
    expect(pulse(0.5)).toBeCloseTo(1, 9);
    expect(pulse(1)).toBeCloseTo(0, 9);
  });
});

describe('createTimeline', () => {
  const plan = planAnimation([
    { type: 'card_played', cardId: 'a' },
    { type: 'enemy_damaged', source: 'spell', dealt: 5, blocked: 0 },
  ]);

  it('is idle without a plan', () => {
    const t = createTimeline();
    expect(t.busy).toBe(false);
    t.advance(1000);
    expect(t.elapsed).toBe(0);
    expect(t.active()).toEqual([]);
  });

  it('plays cues and reports their progress', () => {
    const t = createTimeline();
    t.play(plan);
    expect(t.busy).toBe(true);
    expect(t.active().map((a) => a.cue.kind)).toEqual(['card']);
    t.advance(140);
    expect(t.active()[0]?.progress).toBeCloseTo(0.5, 9);
    expect(t.pending().map((c) => c.kind)).toEqual(['hit']);
    t.advance(100);
    expect(t.active().map((a) => a.cue.kind)).toEqual(['card', 'hit']);
    t.advance(10_000);
    expect(t.busy).toBe(false);
    expect(t.elapsed).toBe(plan.duration);
    expect(t.active()).toEqual([]);
  });

  it('skips to the end and starts a new plan from zero', () => {
    const t = createTimeline();
    t.play(plan);
    t.skip();
    expect(t.busy).toBe(false);
    t.play(plan);
    expect(t.elapsed).toBe(0);
    expect(t.busy).toBe(true);
  });

  it('ignores negative frame times', () => {
    const t = createTimeline();
    t.play(plan);
    t.advance(-50);
    expect(t.elapsed).toBe(0);
  });

  it('is never busy with an empty plan', () => {
    const t = createTimeline();
    t.play(EMPTY_PLAN);
    expect(t.busy).toBe(false);
  });
});

describe('createFrameMeter', () => {
  it('reports zeros before any frame', () => {
    expect(createFrameMeter().stats()).toEqual({ frames: 0, fps: 0, averageMs: 0, worstMs: 0, p95Ms: 0, slowFrames: 0 });
  });

  it('measures fps, worst frame and slow frames', () => {
    const m = createFrameMeter();
    for (let i = 0; i < 9; i++) m.push(16);
    m.push(40);
    const s = m.stats();
    expect(s.frames).toBe(10);
    expect(s.averageMs).toBeCloseTo(18.4, 9);
    expect(s.fps).toBeCloseTo(1000 / 18.4, 9);
    expect(s.worstMs).toBe(40);
    expect(s.p95Ms).toBe(40);
    expect(s.slowFrames).toBe(1);
    expect(SLOW_FRAME_MS).toBe(25);
  });

  it('takes p95 from the sorted window', () => {
    const m = createFrameMeter(100);
    for (let i = 1; i <= 100; i++) m.push(i);
    expect(m.stats().p95Ms).toBe(95);
  });

  it('keeps only the last window and ignores nonsense', () => {
    const m = createFrameMeter(3);
    [100, 10, 10, 10].forEach((ms) => m.push(ms));
    m.push(0);
    m.push(-4);
    m.push(Number.NaN);
    expect(m.stats().frames).toBe(3);
    expect(m.stats().worstMs).toBe(10);
    m.reset();
    expect(m.stats().frames).toBe(0);
  });

  it('rejects an invalid window', () => {
    expect(() => createFrameMeter(0)).toThrow(RangeError);
    expect(() => createFrameMeter(2.5)).toThrow(RangeError);
  });
});
