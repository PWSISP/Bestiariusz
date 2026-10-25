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
export const DEFAULT_JUICE: JuiceSettings = { shake: true, flash: true, numbers: true, sound: true };

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
export function parseJuiceSettings(_text: string | null | undefined): JuiceSettings {
  throw new Error('Not implemented');
}

/** The text to save: compact JSON with the keys in the order shake, flash, numbers, sound. */
export function serializeJuiceSettings(_settings: JuiceSettings): string {
  throw new Error('Not implemented');
}

/** The effects of an animation cue (see the task file for the table). */
export function juiceForCue(_cue: Cue, _settings: JuiceSettings): JuiceCue {
  throw new Error('Not implemented');
}

/** Offset in pixels of the whole picture `progress` (0 to 1) into a shake; (0, 0) when it is over. */
export function shakeOffset(
  _strength: number,
  _progress: number,
  _maxPx: number,
): { x: number; y: number } {
  throw new Error('Not implemented');
}
