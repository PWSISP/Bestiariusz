// Reference implementation of S06-04a (written by Claude, not by Qwen). It checks that the test is
// satisfiable and is what Claude takes over with after five failed Qwen attempts. Not part of the app.
import type { Cue } from '../../src/view/animation-plan.ts';

export interface JuiceSettings {
  readonly shake: boolean;
  readonly flash: boolean;
  readonly numbers: boolean;
  readonly sound: boolean;
}

export const DEFAULT_JUICE: JuiceSettings = {
  shake: true,
  flash: true,
  numbers: true,
  sound: true,
};

export type SoundId =
  | 'card'
  | 'summon'
  | 'hit'
  | 'hit_big'
  | 'hurt'
  | 'death'
  | 'ritual'
  | 'effect'
  | 'win'
  | 'lose'
  | 'reject';

export const SOUND_IDS: readonly SoundId[] = [
  'card',
  'summon',
  'hit',
  'hit_big',
  'hurt',
  'death',
  'ritual',
  'effect',
  'win',
  'lose',
  'reject',
];

export interface ShakeCue {
  readonly strength: number;
  readonly durationMs: number;
}

export interface JuiceCue {
  readonly shake: ShakeCue | null;
  readonly sound: SoundId | null;
  readonly flash: boolean;
  readonly number: boolean;
}

export function parseJuiceSettings(text: string | null | undefined): JuiceSettings {
  if (typeof text !== 'string' || text === '') return DEFAULT_JUICE;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return DEFAULT_JUICE;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT_JUICE;
  const record = value as Record<string, unknown>;
  const flag = (key: keyof JuiceSettings): boolean =>
    typeof record[key] === 'boolean' ? record[key] : DEFAULT_JUICE[key];
  return {
    shake: flag('shake'),
    flash: flag('flash'),
    numbers: flag('numbers'),
    sound: flag('sound'),
  };
}

export function serializeJuiceSettings(settings: JuiceSettings): string {
  return JSON.stringify({
    shake: settings.shake,
    flash: settings.flash,
    numbers: settings.numbers,
    sound: settings.sound,
  });
}

const shakeOf = (strength: number): ShakeCue => ({
  strength,
  durationMs: Math.round(150 + 250 * strength),
});

export function juiceForCue(cue: Cue, settings: JuiceSettings): JuiceCue {
  let shake: ShakeCue | null = null;
  let sound: SoundId | null = null;
  let flash = false;
  let number = false;
  switch (cue.kind) {
    case 'hit':
      if (cue.amount >= 8) shake = shakeOf(Math.min(1, cue.amount / 30));
      sound = cue.amount >= 10 ? 'hit_big' : 'hit';
      flash = true;
      number = true;
      break;
    case 'hurt':
      if (cue.amount > 0) shake = shakeOf(Math.min(1, cue.amount / 15));
      sound = 'hurt';
      flash = true;
      number = true;
      break;
    case 'ritual':
      shake = { strength: 0.5, durationMs: 400 };
      sound = 'ritual';
      flash = true;
      break;
    case 'death':
      shake = { strength: 0.3, durationMs: 250 };
      sound = 'death';
      break;
    case 'end':
      if (cue.detail === 'won') sound = 'win';
      else if (cue.detail === 'lost') sound = 'lose';
      break;
    case 'card':
      sound = 'card';
      break;
    case 'summon':
      sound = 'summon';
      break;
    case 'effect':
      sound = 'effect';
      number = true;
      break;
    case 'rejected':
      sound = 'reject';
      break;
    case 'turn':
    case 'attack':
    case 'enemy_act':
      break;
  }
  return {
    shake: settings.shake ? shake : null,
    sound: settings.sound ? sound : null,
    flash: settings.flash && flash,
    number: settings.numbers && number,
  };
}

export function shakeOffset(
  strength: number,
  progress: number,
  maxPx: number,
): { x: number; y: number } {
  const p = Number.isNaN(progress) ? 1 : Math.max(0, progress);
  if (!(strength > 0) || !(maxPx > 0) || p >= 1) return { x: 0, y: 0 };
  const amplitude = Math.min(1, strength) * maxPx * (1 - p) ** 2;
  return { x: amplitude * Math.sin(p * 40) + 0, y: amplitude * 0.5 * Math.cos(p * 31) + 0 };
}
