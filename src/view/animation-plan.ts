// Animation plan of the combat screen (S04-05): turns the events of one action into timed cues, plus
// the timeline that plays them and the frame meter behind `?fps=1`. Pure: no Pixi, no clock; the screen
// feeds it frame times and draws what the active cues say. The game state is always already final when
// a plan starts, so animations can only decorate it, never change what is true.
import type { CombatEvent } from '../core/combat/model.ts';
import type { ElementId } from '../core/types.ts';

export type CueKind =
  | 'turn'
  | 'card'
  | 'summon'
  | 'attack'
  | 'hit'
  | 'effect'
  | 'death'
  | 'ritual'
  | 'enemy_act'
  | 'hurt'
  | 'rejected'
  | 'end';

export interface Cue {
  readonly kind: CueKind;
  /** Milliseconds from the start of the plan. */
  readonly start: number;
  readonly duration: number;
  /** Circle (0-2) the cue happens at; null = not tied to a circle. */
  readonly circle: number | null;
  /** Amount shown by the cue (damage, effect amount, turn number); 0 when none. */
  readonly amount: number;
  /** Damage absorbed by block ('hit' only). */
  readonly blocked: number;
  readonly cardId: string | null;
  readonly element: ElementId | null;
  readonly actionId: string | null;
  /** Source of a 'hit', operation of an 'effect', outcome of an 'end', reason of a 'rejected'. */
  readonly detail: string | null;
}

export interface AnimationPlan {
  readonly cues: readonly Cue[];
  /** End of the last cue. */
  readonly duration: number;
}

/** No action takes longer than this to animate (plans longer than this are sped up). */
export const MAX_PLAN_MS = 2400;

/** How long a cue lasts and how long until the next cue may start. */
export const TIMING: Readonly<
  Record<CueKind, { readonly duration: number; readonly advance: number }>
> = {
  turn: { duration: 360, advance: 260 },
  card: { duration: 280, advance: 200 },
  summon: { duration: 240, advance: 160 },
  attack: { duration: 240, advance: 140 },
  hit: { duration: 340, advance: 220 },
  effect: { duration: 300, advance: 200 },
  death: { duration: 300, advance: 180 },
  ritual: { duration: 600, advance: 450 },
  enemy_act: { duration: 420, advance: 300 },
  hurt: { duration: 340, advance: 200 },
  rejected: { duration: 220, advance: 220 },
  end: { duration: 600, advance: 400 },
};

export const EMPTY_PLAN: AnimationPlan = { cues: [], duration: 0 };

type CueFields = Partial<Omit<Cue, 'kind' | 'start' | 'duration'>>;

function cueOf(kind: CueKind, start: number, fields: CueFields): Cue {
  return {
    kind,
    start,
    duration: TIMING[kind].duration,
    circle: fields.circle ?? null,
    amount: fields.amount ?? 0,
    blocked: fields.blocked ?? 0,
    cardId: fields.cardId ?? null,
    element: fields.element ?? null,
    actionId: fields.actionId ?? null,
    detail: fields.detail ?? null,
  };
}

/** The cues of the events of one action, in the order of the events; a disabled plan is empty. */
export function planAnimation(
  events: readonly CombatEvent[],
  options: { readonly enabled?: boolean } = {},
): AnimationPlan {
  if (options.enabled === false) return EMPTY_PLAN;
  const cues: Cue[] = [];
  let cursor = 0;
  const add = (kind: CueKind, fields: CueFields = {}): void => {
    cues.push(cueOf(kind, cursor, fields));
    cursor += TIMING[kind].advance;
  };
  for (const event of events) {
    switch (event.type) {
      case 'turn_started':
        add('turn', { amount: event.turn, actionId: event.intentId });
        break;
      case 'card_played':
        add('card', { cardId: event.cardId });
        break;
      case 'creature_summoned':
        add('summon', { circle: event.circle, cardId: event.cardId });
        break;
      case 'enemy_damaged':
        if (event.source === 'creature' && event.circle !== undefined)
          add('attack', { circle: event.circle });
        add('hit', {
          amount: event.dealt,
          blocked: event.blocked,
          circle: event.circle ?? null,
          detail: event.source,
        });
        break;
      case 'ritual':
        add('ritual', { element: event.element });
        break;
      case 'enemy_acted':
        add('enemy_act', { actionId: event.actionId });
        break;
      case 'effect':
        add('effect', { circle: event.circle, amount: event.amount, detail: event.op });
        break;
      case 'creature_died':
        add('death', { circle: event.circle });
        break;
      case 'player_damaged':
        add('hurt', { amount: event.amount });
        break;
      case 'combat_won':
        add('end', { detail: 'won' });
        break;
      case 'combat_lost':
        add('end', { detail: 'lost' });
        break;
      case 'rejected':
        add('rejected', { detail: event.reason });
        break;
    }
  }
  return finish(cues);
}

function finish(cues: readonly Cue[]): AnimationPlan {
  const duration = cues.reduce((end, cue) => Math.max(end, cue.start + cue.duration), 0);
  if (duration <= MAX_PLAN_MS) return { cues, duration };
  const factor = MAX_PLAN_MS / duration;
  return {
    cues: cues.map((cue) => ({
      ...cue,
      start: cue.start * factor,
      duration: cue.duration * factor,
    })),
    duration: MAX_PLAN_MS,
  };
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
export const easeInOutQuad = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};
/** Overshoots a little before settling at 1. */
export const easeOutBack = (t: number): number => {
  const x = clamp01(t);
  return 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
};
/** 0 → 1 → 0 over the unit interval (a lunge there and back). */
export const pulse = (t: number): number => Math.sin(Math.PI * clamp01(t));

export interface ActiveCue {
  readonly cue: Cue;
  /** 0 at the start of the cue, 1 at its end. */
  readonly progress: number;
}

export interface Timeline {
  /** Starts a plan; a plan that is still running is finished first. */
  play(plan: AnimationPlan): void;
  advance(deltaMs: number): void;
  /** Jumps to the end of the running plan. */
  skip(): void;
  readonly busy: boolean;
  readonly elapsed: number;
  readonly plan: AnimationPlan;
  /** Cues that have started and not ended, in the order of the plan. */
  active(): ActiveCue[];
  /** Cues that have not started yet. */
  pending(): Cue[];
}

export function createTimeline(): Timeline {
  let plan: AnimationPlan = EMPTY_PLAN;
  let elapsed = 0;
  return {
    play(next) {
      plan = next;
      elapsed = 0;
    },
    advance(deltaMs) {
      if (plan.duration === 0) return;
      elapsed = Math.min(plan.duration, elapsed + Math.max(0, deltaMs));
    },
    skip() {
      elapsed = plan.duration;
    },
    get busy() {
      return elapsed < plan.duration;
    },
    get elapsed() {
      return elapsed;
    },
    get plan() {
      return plan;
    },
    active() {
      return plan.cues
        .filter((cue) => elapsed >= cue.start && elapsed < cue.start + cue.duration)
        .map((cue) => ({ cue, progress: clamp01((elapsed - cue.start) / cue.duration) }));
    },
    pending() {
      return plan.cues.filter((cue) => elapsed < cue.start);
    },
  };
}

export interface FrameStats {
  readonly frames: number;
  readonly fps: number;
  readonly averageMs: number;
  readonly worstMs: number;
  /** 95% of the frames in the window took this long or less. */
  readonly p95Ms: number;
  /** Frames in the window that took longer than 25 ms (a missed 60 Hz frame and a half). */
  readonly slowFrames: number;
}

export const SLOW_FRAME_MS = 25;

export interface FrameMeter {
  push(deltaMs: number): void;
  stats(): FrameStats;
  reset(): void;
}

/** Statistics of the last `windowSize` frames. */
export function createFrameMeter(windowSize = 120): FrameMeter {
  if (!Number.isInteger(windowSize) || windowSize < 1)
    throw new RangeError(`Invalid window: ${windowSize}`);
  const times: number[] = [];
  return {
    push(deltaMs) {
      if (!(deltaMs > 0) || !Number.isFinite(deltaMs)) return;
      times.push(deltaMs);
      if (times.length > windowSize) times.shift();
    },
    stats() {
      if (times.length === 0)
        return { frames: 0, fps: 0, averageMs: 0, worstMs: 0, p95Ms: 0, slowFrames: 0 };
      const total = times.reduce((sum, ms) => sum + ms, 0);
      const averageMs = total / times.length;
      const sorted = [...times].sort((a, b) => a - b);
      return {
        frames: times.length,
        fps: 1000 / averageMs,
        averageMs,
        worstMs: Math.max(...times),
        p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1] as number,
        slowFrames: times.filter((ms) => ms > SLOW_FRAME_MS).length,
      };
    },
    reset() {
      times.length = 0;
    },
  };
}
