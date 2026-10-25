import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/view/geometry.ts';
import { DRAG_THRESHOLD, IDLE, reduceHandInput } from '../src/view/hand-input.ts';
import type {
  HandCardInfo,
  HandInputContext,
  HandInputEvent,
  HandInputState,
} from '../src/view/hand-input.ts';

const creature: HandCardInfo = { kind: 'creature', playable: true, blocked: null };
const spell: HandCardInfo = { kind: 'spell', playable: true, blocked: null };
const poorCreature: HandCardInfo = {
  kind: 'creature',
  playable: false,
  blocked: 'not_enough_ember',
};
const poorSpell: HandCardInfo = { kind: 'spell', playable: false, blocked: 'not_enough_ember' };
const curse: HandCardInfo = { kind: 'curse', playable: false, blocked: 'unplayable' };

const circleRects: Rect[] = [
  { x: 20, y: 300, width: 100, height: 116 },
  { x: 130, y: 300, width: 100, height: 116 },
  { x: 240, y: 300, width: 100, height: 116 },
];
const CAST_LINE = 480;

// hand: 0 creature, 1 spell, 2 creature without Ember, 3 spell without Ember, 4 curse
const ctx: HandInputContext = {
  hand: [creature, spell, poorCreature, poorSpell, curse],
  freeCircles: [true, false, true],
  circleRects,
  castLineY: CAST_LINE,
};

const selected = (handIndex: number): HandInputState => ({ mode: 'selected', handIndex });

function run(events: HandInputEvent[], start: HandInputState = IDLE, c: HandInputContext = ctx) {
  let state = start;
  const intents = [];
  for (const event of events) {
    const result = reduceHandInput(state, event, c);
    state = result.state;
    intents.push(result.intent);
  }
  return { state, intents, last: intents[intents.length - 1] };
}

const down = (handIndex: number, x = 100, y = 600): HandInputEvent => ({
  type: 'pointerDown',
  handIndex,
  x,
  y,
});
const move = (x: number, y: number): HandInputEvent => ({ type: 'pointerMove', x, y });
const up = (x: number, y: number): HandInputEvent => ({ type: 'pointerUp', x, y });
const NONE = { type: 'none' };

describe('constant', () => {
  it('has the drag threshold of the specification', () => {
    expect(DRAG_THRESHOLD).toBe(8);
  });
});

describe('a tap selects', () => {
  it('goes from idle to pressing when the pointer goes down on a card', () => {
    const r = reduceHandInput(IDLE, down(0, 50, 620), ctx);
    expect(r.state).toEqual({
      mode: 'pressing',
      handIndex: 0,
      startX: 50,
      startY: 620,
      wasSelected: false,
    });
    expect(r.intent).toEqual(NONE);
  });

  it('selects the card when the pointer goes up without having moved', () => {
    const r = run([down(0), up(100, 600)]);
    expect(r.state).toEqual(selected(0));
    expect(r.last).toEqual(NONE);
  });

  it('still counts as a tap when the pointer moved less than the threshold', () => {
    const r = run([down(0, 100, 600), move(104, 604), up(104, 604)]);
    expect(r.state).toEqual(selected(0));
  });

  it('switches the selection to another card', () => {
    const r = run([down(1), up(100, 600)], selected(0));
    expect(r.state).toEqual(selected(1));
    expect(r.last).toEqual(NONE);
  });

  it('remembers that the card was already selected', () => {
    const r = reduceHandInput(selected(0), down(0), ctx);
    expect(r.state).toMatchObject({ mode: 'pressing', handIndex: 0, wasSelected: true });
    const other = reduceHandInput(selected(0), down(1), ctx);
    expect(other.state).toMatchObject({ mode: 'pressing', handIndex: 1, wasSelected: false });
  });

  it('can select any card to read it: a card without Ember and a curse too', () => {
    for (const index of [2, 3, 4]) {
      expect(run([down(index), up(100, 600)]).state).toEqual(selected(index));
    }
  });
});

describe('a second tap on the selected card', () => {
  it('cancels the selection of a creature card', () => {
    const r = run([down(0), up(100, 600)], selected(0));
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual(NONE);
  });

  it('plays a spell, without a circle', () => {
    const r = run([down(1), up(100, 600)], selected(1));
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual({ type: 'play', handIndex: 1 });
    expect('circle' in (r.last as object)).toBe(false);
  });

  it('refuses a spell that costs too much and keeps it selected', () => {
    const r = run([down(3), up(100, 600)], selected(3));
    expect(r.state).toEqual(selected(3));
    expect(r.last).toEqual({ type: 'refuse', handIndex: 3, reason: 'not_enough_ember' });
  });

  it('cancels the selection of a curse', () => {
    const r = run([down(4), up(100, 600)], selected(4));
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual(NONE);
  });

  it('cancels the selection of a creature card that costs too much', () => {
    const r = run([down(2), up(100, 600)], selected(2));
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual(NONE);
  });
});

describe('tapping a circle with a card selected', () => {
  it('summons the creature into a free circle', () => {
    const r = reduceHandInput(selected(0), { type: 'tapCircle', circle: 2 }, ctx);
    expect(r.state).toEqual(IDLE);
    expect(r.intent).toEqual({ type: 'play', handIndex: 0, circle: 2 });
  });

  it('refuses an occupied circle and keeps the card selected', () => {
    const r = reduceHandInput(selected(0), { type: 'tapCircle', circle: 1 }, ctx);
    expect(r.state).toEqual(selected(0));
    expect(r.intent).toEqual({ type: 'refuse', handIndex: 0, reason: 'circle_occupied' });
  });

  it('refuses a creature that costs too much, whatever the circle', () => {
    for (const circle of [0, 1, 2]) {
      const r = reduceHandInput(selected(2), { type: 'tapCircle', circle }, ctx);
      expect(r.state).toEqual(selected(2));
      expect(r.intent).toEqual({ type: 'refuse', handIndex: 2, reason: 'not_enough_ember' });
    }
  });

  it('does nothing for a spell or a curse', () => {
    for (const index of [1, 3, 4]) {
      const r = reduceHandInput(selected(index), { type: 'tapCircle', circle: 0 }, ctx);
      expect(r.state).toEqual(selected(index));
      expect(r.intent).toEqual(NONE);
    }
  });

  it.each([-1, 3, 1.5, Number.NaN])('ignores a circle number of %s', (circle) => {
    const r = reduceHandInput(selected(0), { type: 'tapCircle', circle }, ctx);
    expect(r.state).toEqual(selected(0));
    expect(r.intent).toEqual(NONE);
  });

  it('ignores a tap on a circle when nothing is selected or a gesture is running', () => {
    const pressing = reduceHandInput(IDLE, down(0), ctx).state;
    for (const state of [IDLE, pressing]) {
      const r = reduceHandInput(state, { type: 'tapCircle', circle: 0 }, ctx);
      expect(r.state).toEqual(state);
      expect(r.intent).toEqual(NONE);
    }
  });
});

describe('dragging starts after the threshold', () => {
  it('stays pressing below the threshold', () => {
    const start = reduceHandInput(IDLE, down(0, 100, 600), ctx).state;
    const r = reduceHandInput(start, move(107, 600), ctx);
    expect(r.state).toEqual(start);
  });

  it('starts at exactly the threshold', () => {
    const start = reduceHandInput(IDLE, down(0, 100, 600), ctx).state;
    const r = reduceHandInput(start, move(108, 600), ctx);
    expect(r.state).toEqual({
      mode: 'dragging',
      handIndex: 0,
      x: 108,
      y: 600,
      overCircle: null,
      overCast: false,
    });
  });

  it('measures the distance, not each axis', () => {
    const start = reduceHandInput(IDLE, down(0, 100, 600), ctx).state;
    expect(reduceHandInput(start, move(105, 605), ctx).state.mode).toBe('pressing');
    expect(reduceHandInput(start, move(106, 606), ctx).state.mode).toBe('dragging');
    expect(reduceHandInput(start, move(100, 592), ctx).state.mode).toBe('dragging');
  });

  it('does not drag a card that cannot be played, but still selects it on release', () => {
    for (const index of [2, 3, 4]) {
      const start = reduceHandInput(IDLE, down(index, 100, 600), ctx).state;
      const far = reduceHandInput(start, move(100, 300), ctx);
      expect(far.state).toEqual(start);
      expect(run([up(100, 300)], far.state).state).toEqual(selected(index));
    }
  });

  it('can drag the card that is already selected', () => {
    const r = run([down(0, 100, 600), move(100, 500), move(60, 340)], selected(0));
    expect(r.state).toMatchObject({ mode: 'dragging', handIndex: 0, x: 60, y: 340, overCircle: 0 });
  });
});

describe('while dragging a creature', () => {
  const drag = (x: number, y: number) => run([down(0, 100, 600), move(100, 560), move(x, y)]).state;

  it('reports the free circle under the pointer', () => {
    expect(drag(60, 350)).toMatchObject({ mode: 'dragging', overCircle: 0, overCast: false });
    expect(drag(290, 400)).toMatchObject({ overCircle: 2 });
  });

  it('reports no circle over an occupied one, over empty board or on its edge', () => {
    expect(drag(180, 350)).toMatchObject({ overCircle: null });
    expect(drag(125, 350)).toMatchObject({ overCircle: null });
    expect(drag(180, 100)).toMatchObject({ overCircle: null, overCast: false });
    expect(drag(20, 416)).toMatchObject({ overCircle: null });
    expect(drag(20, 415.9)).toMatchObject({ overCircle: 0 });
  });

  it('never reports a cast zone for a creature', () => {
    expect(drag(60, 100)).toMatchObject({ overCast: false });
  });

  it('follows every move', () => {
    const r = run([down(0, 100, 600), move(100, 560), move(60, 350), move(290, 350)]);
    expect(r.state).toEqual({
      mode: 'dragging',
      handIndex: 0,
      x: 290,
      y: 350,
      overCircle: 2,
      overCast: false,
    });
  });
});

describe('while dragging a spell', () => {
  const drag = (x: number, y: number) => run([down(1, 100, 600), move(100, 560), move(x, y)]).state;

  it('reports the cast zone above the cast line only', () => {
    expect(drag(100, 479)).toMatchObject({ mode: 'dragging', overCast: true, overCircle: null });
    expect(drag(100, 480)).toMatchObject({ overCast: false });
    expect(drag(100, 560)).toMatchObject({ overCast: false });
  });

  it('never reports a circle, even over one', () => {
    expect(drag(60, 350)).toMatchObject({ overCircle: null, overCast: true });
  });
});

describe('releasing a dragged card', () => {
  const dragTo = (index: number, x: number, y: number) =>
    run([down(index, 100, 600), move(100, 560), move(x, y)]).state;

  it('summons a creature into the free circle under the pointer', () => {
    const r = reduceHandInput(dragTo(0, 60, 350), up(60, 350), ctx);
    expect(r.state).toEqual(IDLE);
    expect(r.intent).toEqual({ type: 'play', handIndex: 0, circle: 0 });
  });

  it('uses the position of the release, not of the last move', () => {
    const r = reduceHandInput(dragTo(0, 60, 350), up(290, 350), ctx);
    expect(r.intent).toEqual({ type: 'play', handIndex: 0, circle: 2 });
    const away = reduceHandInput(dragTo(0, 60, 350), up(180, 100), ctx);
    expect(away.intent).toEqual(NONE);
  });

  it('refuses an occupied circle', () => {
    const r = reduceHandInput(dragTo(0, 180, 350), up(180, 350), ctx);
    expect(r.state).toEqual(IDLE);
    expect(r.intent).toEqual({ type: 'refuse', handIndex: 0, reason: 'circle_occupied' });
  });

  it('cancels a creature released outside the circles, and forgets the selection', () => {
    const r = reduceHandInput(dragTo(0, 60, 350), up(180, 560), ctx);
    expect(r.state).toEqual(IDLE);
    expect(r.intent).toEqual(NONE);
  });

  it('casts a spell released above the cast line', () => {
    const r = reduceHandInput(dragTo(1, 100, 300), up(100, 300), ctx);
    expect(r.state).toEqual(IDLE);
    expect(r.intent).toEqual({ type: 'play', handIndex: 1 });
  });

  it('cancels a spell released below the cast line', () => {
    const r = reduceHandInput(dragTo(1, 100, 300), up(100, 500), ctx);
    expect(r.state).toEqual(IDLE);
    expect(r.intent).toEqual(NONE);
    expect(reduceHandInput(dragTo(1, 100, 300), up(100, 480), ctx).intent).toEqual(NONE);
  });

  it('is cancelled by the system', () => {
    expect(reduceHandInput(dragTo(0, 60, 350), { type: 'pointerCancel' }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
  });
});

describe('cancel, tap outside and reset', () => {
  it('pointerCancel ends a press, and leaves idle and selected alone', () => {
    const pressing = reduceHandInput(IDLE, down(0), ctx).state;
    expect(reduceHandInput(pressing, { type: 'pointerCancel' }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
    expect(reduceHandInput(IDLE, { type: 'pointerCancel' }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
    expect(reduceHandInput(selected(1), { type: 'pointerCancel' }, ctx)).toEqual({
      state: selected(1),
      intent: NONE,
    });
  });

  it('a tap outside deselects, and does nothing else', () => {
    expect(reduceHandInput(selected(1), { type: 'tapOutside' }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
    expect(reduceHandInput(IDLE, { type: 'tapOutside' }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
    const pressing = reduceHandInput(IDLE, down(0), ctx).state;
    expect(reduceHandInput(pressing, { type: 'tapOutside' }, ctx)).toEqual({
      state: pressing,
      intent: NONE,
    });
  });

  it('reset forgets everything, from every state', () => {
    const pressing = reduceHandInput(IDLE, down(0), ctx).state;
    const dragging = reduceHandInput(pressing, move(100, 500), ctx).state;
    for (const state of [IDLE, selected(0), pressing, dragging]) {
      expect(reduceHandInput(state, { type: 'reset' }, ctx)).toEqual({ state: IDLE, intent: NONE });
    }
  });
});

describe('events that do not fit the state are ignored', () => {
  it('pointer moves and releases without a press', () => {
    for (const state of [IDLE, selected(0)]) {
      expect(reduceHandInput(state, move(10, 10), ctx)).toEqual({ state, intent: NONE });
      expect(reduceHandInput(state, up(10, 10), ctx)).toEqual({ state, intent: NONE });
    }
  });

  it('a second pointer going down during a gesture', () => {
    const pressing = reduceHandInput(IDLE, down(0), ctx).state;
    const dragging = reduceHandInput(pressing, move(100, 500), ctx).state;
    for (const state of [pressing, dragging]) {
      expect(reduceHandInput(state, down(1), ctx)).toEqual({ state, intent: NONE });
    }
  });

  it.each([-1, 5, 1.5, Number.NaN])('a press on card %s, which is not in the hand', (handIndex) => {
    expect(reduceHandInput(IDLE, down(handIndex), ctx)).toEqual({ state: IDLE, intent: NONE });
    expect(reduceHandInput(selected(0), down(handIndex), ctx)).toEqual({
      state: selected(0),
      intent: NONE,
    });
  });

  it('a state that points at a card that is no longer in the hand counts as idle', () => {
    expect(reduceHandInput(selected(7), { type: 'tapOutside' }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
    expect(reduceHandInput(selected(7), { type: 'tapCircle', circle: 0 }, ctx)).toEqual({
      state: IDLE,
      intent: NONE,
    });
    const stalePress: HandInputState = {
      mode: 'pressing',
      handIndex: 9,
      startX: 0,
      startY: 0,
      wasSelected: true,
    };
    expect(reduceHandInput(stalePress, move(500, 500), ctx)).toEqual({ state: IDLE, intent: NONE });
    expect(reduceHandInput(selected(7), down(0), ctx).state).toMatchObject({
      mode: 'pressing',
      handIndex: 0,
      wasSelected: false,
    });
  });

  it('an empty hand: every press is ignored', () => {
    const empty: HandInputContext = { ...ctx, hand: [] };
    expect(reduceHandInput(IDLE, down(0), empty)).toEqual({ state: IDLE, intent: NONE });
  });
});

describe('whole gestures', () => {
  it('tap a creature, tap a free circle', () => {
    const r = run([down(0), up(100, 600), { type: 'tapCircle', circle: 0 }]);
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual({ type: 'play', handIndex: 0, circle: 0 });
    expect(r.intents.slice(0, 2)).toEqual([NONE, NONE]);
  });

  it('tap a creature, change your mind, tap a spell twice', () => {
    const r = run([down(0), up(100, 600), down(1), up(100, 600), down(1), up(100, 600)]);
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual({ type: 'play', handIndex: 1 });
  });

  it('drag a creature to a circle in one go', () => {
    const r = run([down(0, 100, 600), move(98, 580), move(80, 400), move(60, 350), up(60, 350)]);
    expect(r.state).toEqual(IDLE);
    expect(r.last).toEqual({ type: 'play', handIndex: 0, circle: 0 });
  });

  it('after a play the screen sends reset and the next press starts clean', () => {
    const r = run([
      down(0),
      up(100, 600),
      { type: 'tapCircle', circle: 0 },
      { type: 'reset' },
      down(1),
      up(100, 600),
    ]);
    expect(r.state).toEqual(selected(1));
  });
});

describe('purity', () => {
  it('does not modify the state, the event or the context', () => {
    const state = Object.freeze({ mode: 'selected', handIndex: 0 } as const);
    const frozenCtx: HandInputContext = Object.freeze({
      hand: Object.freeze([...ctx.hand]),
      freeCircles: Object.freeze([...ctx.freeCircles]),
      circleRects: Object.freeze([...ctx.circleRects]),
      castLineY: ctx.castLineY,
    });
    const event = Object.freeze({ type: 'tapCircle', circle: 0 } as const);
    const a = reduceHandInput(state, event, frozenCtx);
    const b = reduceHandInput(state, event, frozenCtx);
    expect(a).toEqual(b);
    expect(state).toEqual({ mode: 'selected', handIndex: 0 });
    expect(event).toEqual({ type: 'tapCircle', circle: 0 });
  });
});
