import { describe, expect, it } from 'vitest';
import type { Cue, CueKind } from '../src/view/animation-plan.ts';
import {
  DEFAULT_JUICE,
  SOUND_IDS,
  juiceForCue,
  parseJuiceSettings,
  serializeJuiceSettings,
  shakeOffset,
} from '../src/view/juice.ts';
import type { JuiceSettings } from '../src/view/juice.ts';

const cue = (kind: CueKind, amount = 0, detail: string | null = null): Cue => ({
  kind,
  start: 0,
  duration: 100,
  circle: null,
  amount,
  blocked: 0,
  cardId: null,
  element: null,
  actionId: null,
  detail,
});
const OFF: JuiceSettings = { shake: false, flash: false, numbers: false, sound: false };
const only = (key: keyof JuiceSettings): JuiceSettings => ({ ...OFF, [key]: true });
const ALL_KINDS: CueKind[] = [
  'turn',
  'card',
  'summon',
  'attack',
  'hit',
  'effect',
  'death',
  'ritual',
  'enemy_act',
  'hurt',
  'rejected',
  'end',
];

describe('the settings', () => {
  it('start with everything on', () => {
    expect(DEFAULT_JUICE).toEqual({ shake: true, flash: true, numbers: true, sound: true });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty text', ''],
    ['text that is not JSON', 'shake=1'],
    ['broken JSON', '{"shake":'],
    ['a number', '5'],
    ['a string', '"no"'],
    ['null JSON', 'null'],
    ['an array', '[false,false,false,false]'],
  ])('parse %s as the default', (_name, text) => {
    expect(parseJuiceSettings(text)).toEqual(DEFAULT_JUICE);
  });

  it('parse the four flags and ignore other keys', () => {
    expect(
      parseJuiceSettings('{"shake":false,"flash":true,"numbers":false,"sound":false,"x":1}'),
    ).toEqual({ shake: false, flash: true, numbers: false, sound: false });
  });

  it('take true for a missing key or a value that is not a boolean', () => {
    expect(parseJuiceSettings('{"sound":false}')).toEqual({ ...DEFAULT_JUICE, sound: false });
    expect(parseJuiceSettings('{"shake":0,"flash":"no","numbers":null,"sound":false}')).toEqual({
      ...DEFAULT_JUICE,
      sound: false,
    });
  });

  it('serialize to compact JSON with the keys in a fixed order', () => {
    expect(serializeJuiceSettings({ shake: true, flash: false, numbers: true, sound: true })).toBe(
      '{"shake":true,"flash":false,"numbers":true,"sound":true}',
    );
    expect(serializeJuiceSettings(OFF)).toBe(
      '{"shake":false,"flash":false,"numbers":false,"sound":false}',
    );
  });

  it('survive a round trip for every combination', () => {
    for (let bits = 0; bits < 16; bits++) {
      const s: JuiceSettings = {
        shake: (bits & 1) !== 0,
        flash: (bits & 2) !== 0,
        numbers: (bits & 4) !== 0,
        sound: (bits & 8) !== 0,
      };
      expect(parseJuiceSettings(serializeJuiceSettings(s))).toEqual(s);
    }
  });
});

describe('juiceForCue: hits on the enemy', () => {
  it('gives a small hit a sound, a flash and a number but no shake', () => {
    for (const amount of [0, 5, 7]) {
      expect(juiceForCue(cue('hit', amount), DEFAULT_JUICE)).toEqual({
        shake: null,
        sound: 'hit',
        flash: true,
        number: true,
      });
    }
  });

  it('shakes from 8 damage and scales the shake with the damage', () => {
    const eight = juiceForCue(cue('hit', 8), DEFAULT_JUICE);
    expect(eight.sound).toBe('hit');
    expect(eight.shake?.strength).toBeCloseTo(8 / 30, 10);
    expect(eight.shake?.durationMs).toBe(217);
    const ten = juiceForCue(cue('hit', 10), DEFAULT_JUICE);
    expect(ten.sound).toBe('hit_big');
    expect(ten.shake?.strength).toBeCloseTo(1 / 3, 10);
    expect(ten.shake?.durationMs).toBe(233);
    expect(juiceForCue(cue('hit', 15), DEFAULT_JUICE).shake).toEqual({
      strength: 0.5,
      durationMs: 275,
    });
  });

  it('caps the shake at the full strength', () => {
    for (const amount of [30, 31, 100]) {
      expect(juiceForCue(cue('hit', amount), DEFAULT_JUICE).shake).toEqual({
        strength: 1,
        durationMs: 400,
      });
    }
  });

  it('uses the big sound from 10 damage only', () => {
    expect(juiceForCue(cue('hit', 9), DEFAULT_JUICE).sound).toBe('hit');
    expect(juiceForCue(cue('hit', 10), DEFAULT_JUICE).sound).toBe('hit_big');
  });
});

describe('juiceForCue: the other cues', () => {
  it('hurts the player with a shake that scales with the damage', () => {
    expect(juiceForCue(cue('hurt', 3), DEFAULT_JUICE)).toEqual({
      shake: { strength: 0.2, durationMs: 200 },
      sound: 'hurt',
      flash: true,
      number: true,
    });
    expect(juiceForCue(cue('hurt', 15), DEFAULT_JUICE).shake).toEqual({
      strength: 1,
      durationMs: 400,
    });
    expect(juiceForCue(cue('hurt', 40), DEFAULT_JUICE).shake).toEqual({
      strength: 1,
      durationMs: 400,
    });
    expect(juiceForCue(cue('hurt', 0), DEFAULT_JUICE).shake).toBeNull();
  });

  it('shakes at a ritual and at a death', () => {
    expect(juiceForCue(cue('ritual'), DEFAULT_JUICE)).toEqual({
      shake: { strength: 0.5, durationMs: 400 },
      sound: 'ritual',
      flash: true,
      number: false,
    });
    expect(juiceForCue(cue('death'), DEFAULT_JUICE)).toEqual({
      shake: { strength: 0.3, durationMs: 250 },
      sound: 'death',
      flash: false,
      number: false,
    });
  });

  it('plays the fanfare of the end of a combat by its outcome', () => {
    expect(juiceForCue(cue('end', 0, 'won'), DEFAULT_JUICE)).toEqual({
      shake: null,
      sound: 'win',
      flash: false,
      number: false,
    });
    expect(juiceForCue(cue('end', 0, 'lost'), DEFAULT_JUICE).sound).toBe('lose');
    expect(juiceForCue(cue('end', 0, null), DEFAULT_JUICE).sound).toBeNull();
  });

  it('gives sounds to cards, summons, effects and refusals', () => {
    expect(juiceForCue(cue('card'), DEFAULT_JUICE)).toEqual({
      shake: null,
      sound: 'card',
      flash: false,
      number: false,
    });
    expect(juiceForCue(cue('summon'), DEFAULT_JUICE).sound).toBe('summon');
    expect(juiceForCue(cue('rejected', 0, 'not_enough_ember'), DEFAULT_JUICE).sound).toBe('reject');
    expect(juiceForCue(cue('effect', 2, 'mend'), DEFAULT_JUICE)).toEqual({
      shake: null,
      sound: 'effect',
      flash: false,
      number: true,
    });
  });

  it('does nothing for a new turn, an attack lunge or an enemy action', () => {
    for (const kind of ['turn', 'attack', 'enemy_act'] as const) {
      expect(juiceForCue(cue(kind, 4), DEFAULT_JUICE)).toEqual({
        shake: null,
        sound: null,
        flash: false,
        number: false,
      });
    }
  });

  it('only ever names a known sound', () => {
    for (const kind of ALL_KINDS) {
      for (const amount of [0, 8, 12, 40]) {
        for (const detail of [null, 'won', 'lost']) {
          const { sound } = juiceForCue(cue(kind, amount, detail), DEFAULT_JUICE);
          if (sound !== null) expect(SOUND_IDS).toContain(sound);
        }
      }
    }
  });
});

describe('juiceForCue: the settings switch effects off one by one', () => {
  const big = cue('hit', 20);

  it('keeps nothing when everything is off', () => {
    for (const kind of ALL_KINDS) {
      expect(juiceForCue(cue(kind, 20, 'won'), OFF)).toEqual({
        shake: null,
        sound: null,
        flash: false,
        number: false,
      });
    }
  });

  it('keeps only the shake, only the flash, only the numbers or only the sound', () => {
    expect(juiceForCue(big, only('shake'))).toEqual({
      shake: { strength: 2 / 3, durationMs: 317 },
      sound: null,
      flash: false,
      number: false,
    });
    expect(juiceForCue(big, only('flash'))).toEqual({
      shake: null,
      sound: null,
      flash: true,
      number: false,
    });
    expect(juiceForCue(big, only('numbers'))).toEqual({
      shake: null,
      sound: null,
      flash: false,
      number: true,
    });
    expect(juiceForCue(big, only('sound'))).toEqual({
      shake: null,
      sound: 'hit_big',
      flash: false,
      number: false,
    });
  });

  it('does not change the cue or the settings', () => {
    const c = Object.freeze(cue('hit', 12));
    const s = Object.freeze({ ...DEFAULT_JUICE });
    expect(juiceForCue(c, s)).toEqual(juiceForCue(c, s));
  });
});

describe('shakeOffset', () => {
  it('starts at the top of the amplitude and is over at progress 1', () => {
    expect(shakeOffset(1, 0, 10)).toEqual({ x: 0, y: 5 });
    for (const progress of [1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(shakeOffset(1, progress, 10)).toEqual({ x: 0, y: 0 });
    }
  });

  it.each([
    [1, 0.1, 10, -6.130100211994219, -4.046497358606783],
    [0.5, 0.25, 8, -1.224047499501082, 0.11676865187165959],
    [1, 0.5, 20, 4.564726253638138, -2.4461336570472105],
    [1, 0.99, 10, 0.0009460125826269098, 0.00037394234098979607],
  ])('shakeOffset(%f, %f, %f) is (%f, %f)', (strength, progress, maxPx, x, y) => {
    const offset = shakeOffset(strength, progress, maxPx);
    expect(offset.x).toBeCloseTo(x, 9);
    expect(offset.y).toBeCloseTo(y, 9);
  });

  it('treats a strength above 1 like 1 and a negative progress like 0', () => {
    expect(shakeOffset(2, 0.1, 10)).toEqual(shakeOffset(1, 0.1, 10));
    expect(shakeOffset(1, -3, 10)).toEqual(shakeOffset(1, 0, 10));
  });

  it('gives no shake for a strength or a size that is not positive', () => {
    for (const [strength, maxPx] of [
      [0, 10],
      [-1, 10],
      [Number.NaN, 10],
      [1, 0],
      [1, -5],
      [1, Number.NaN],
    ] as const) {
      expect(shakeOffset(strength, 0.2, maxPx)).toEqual({ x: 0, y: 0 });
    }
  });

  it('never returns a negative zero and fades out', () => {
    const first = shakeOffset(1, 0, 10);
    expect(Object.is(first.x, 0)).toBe(true);
    const end = shakeOffset(1, 1, 10);
    expect(Object.is(end.x, 0) && Object.is(end.y, 0)).toBe(true);
    for (let p = 0.1; p < 1; p += 0.1) {
      const { x, y } = shakeOffset(1, p, 10);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(10 * (1 - p) ** 2 * 1.12);
    }
    const late = shakeOffset(1, 0.9, 10);
    expect(Math.hypot(late.x, late.y)).toBeLessThan(0.2);
  });
});
