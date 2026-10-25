// "Juice" of the combat screen (S06-04a): which extra effects an animation cue triggers (screen shake,
// flash, damage numbers, a sound) and which of them the player has switched off. Pure: the screen
// draws the shake and the flash, the platform layer plays the sounds.
import type { Cue } from './animation-plan.ts';

/** Every effect can be switched off on its own. */
export interface JuiceSettings {
  readonly shake: boolean;
  readonly flash: boolean;
  readonly numbers: boolean;
  readonly sound: boolean;
}

/** Everything on. */
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
  /** 0 (nothing) to 1 (strongest). */
  readonly strength: number;
  readonly durationMs: number;
}

/** The extra effects of one cue, after the settings were applied. */
export interface JuiceCue {
  readonly shake: ShakeCue | null;
  readonly sound: SoundId | null;
  /** The flash of the cue may be drawn. */
  readonly flash: boolean;
  /** The floating number of the cue may be drawn. */
  readonly number: boolean;
}

/** Reads the saved text. Anything that is not a JSON object gives `DEFAULT_JUICE`; see the task file. */
export function parseJuiceSettings(text: string | null | undefined): JuiceSettings {
  if (text === null || text === undefined || text === '') return DEFAULT_JUICE;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return DEFAULT_JUICE;
  }

  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_JUICE;

  return {
    shake: typeof parsed.shake === 'boolean' ? parsed.shake : true,
    flash: typeof parsed.flash === 'boolean' ? parsed.flash : true,
    numbers: typeof parsed.numbers === 'boolean' ? parsed.numbers : true,
    sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
  };
}

/** The text to save: compact JSON with the keys in the order shake, flash, numbers, sound. */
export function serializeJuiceSettings(settings: JuiceSettings): string {
  return JSON.stringify({
    shake: settings.shake,
    flash: settings.flash,
    numbers: settings.numbers,
    sound: settings.sound,
  });
}

/** The effects of an animation cue (see the task file for the table). */
export function juiceForCue(cue: Cue, settings: JuiceSettings): JuiceCue {
  let shake: ShakeCue | null = null;
  let sound: SoundId | null = null;
  let flash = false;
  let number = false;

  // Compute effects based on cue kind with all settings on
  switch (cue.kind) {
    case 'hit':
      if (cue.amount >= 8) {
        const strength = Math.min(1, cue.amount / 30);
        const durationMs = Math.round(150 + 250 * strength);
        shake = { strength, durationMs };
      }
      sound = cue.amount >= 10 ? 'hit_big' : 'hit';
      flash = true;
      number = true;
      break;

    case 'hurt':
      if (cue.amount > 0) {
        const strength = Math.min(1, cue.amount / 15);
        const durationMs = Math.round(150 + 250 * strength);
        shake = { strength, durationMs };
      }
      sound = 'hurt';
      flash = true;
      number = true;
      break;

    case 'ritual':
      shake = { strength: 0.5, durationMs: 400 };
      sound = 'ritual';
      flash = true;
      number = false;
      break;

    case 'death':
      shake = { strength: 0.3, durationMs: 250 };
      sound = 'death';
      flash = false;
      number = false;
      break;

    case 'end':
      if (cue.detail === 'won') {
        sound = 'win';
      } else if (cue.detail === 'lost') {
        sound = 'lose';
      } else {
        sound = null;
      }
      // No shake, flash or number
      break;

    case 'card':
      sound = 'card';
      // No shake, flash or number
      break;

    case 'summon':
      sound = 'summon';
      // No shake, flash or number
      break;

    case 'rejected':
      sound = 'reject';
      // No shake, flash or number
      break;

    case 'effect':
      sound = 'effect';
      number = true;
      // No shake or flash
      break;

    case 'turn':
    case 'attack':
    case 'enemy_act':
      // Nothing for these kinds
      break;
  }

  // Apply settings
  if (settings.shake === false) {
    shake = null;
  }
  if (settings.sound === false) {
    sound = null;
  }
  if (settings.flash === false) {
    flash = false;
  }
  if (settings.numbers === false) {
    number = false;
  }

  return { shake, sound, flash, number };
}

/** Offset in pixels of the whole picture `progress` (0 to 1) into a shake; (0, 0) when it is over. */
export function shakeOffset(
  strength: number,
  progress: number,
  maxPx: number,
): { x: number; y: number } {
  if (!(strength > 0) || !(maxPx > 0) || Number.isNaN(progress) || progress >= 1) {
    return { x: 0, y: 0 };
  }

  const p = Math.max(0, progress);
  const amplitude = Math.min(1, strength) * maxPx * (1 - p) ** 2;
  const x = amplitude * Math.sin(p * 40);
  const y = amplitude * 0.5 * Math.cos(p * 31);

  // Add +0 to convert -0 to 0
  return { x: x + 0, y: y + 0 };
}
