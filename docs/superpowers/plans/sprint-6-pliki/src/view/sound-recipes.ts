// How every sound of the game is made (S06-04): a few short synthesized tones, so the game needs no
// sound files and no licences (docs/dzwieki.md). Pure data; src/platform/audio.ts plays it.
import type { SoundId } from './juice.ts';

export interface Tone {
  readonly wave: 'sine' | 'square' | 'triangle' | 'sawtooth';
  /** Frequency in Hz at the start and at the end of the tone. */
  readonly from: number;
  readonly to: number;
  /** Delay after the start of the sound, and the length of the tone, in seconds. */
  readonly delay: number;
  readonly length: number;
  /** Peak volume, 0 to 1. */
  readonly gain: number;
}

export const SOUND_RECIPES: Readonly<Record<SoundId, readonly Tone[]>> = {
  card: [{ wave: 'triangle', from: 520, to: 700, delay: 0, length: 0.08, gain: 0.18 }],
  summon: [
    { wave: 'sine', from: 260, to: 520, delay: 0, length: 0.18, gain: 0.22 },
    { wave: 'triangle', from: 390, to: 780, delay: 0.06, length: 0.16, gain: 0.14 },
  ],
  hit: [{ wave: 'square', from: 220, to: 90, delay: 0, length: 0.1, gain: 0.2 }],
  hit_big: [
    { wave: 'sawtooth', from: 180, to: 50, delay: 0, length: 0.2, gain: 0.26 },
    { wave: 'square', from: 120, to: 40, delay: 0.02, length: 0.22, gain: 0.2 },
  ],
  hurt: [{ wave: 'sawtooth', from: 150, to: 60, delay: 0, length: 0.22, gain: 0.24 }],
  death: [{ wave: 'triangle', from: 300, to: 70, delay: 0, length: 0.3, gain: 0.22 }],
  ritual: [
    { wave: 'sine', from: 220, to: 440, delay: 0, length: 0.5, gain: 0.22 },
    { wave: 'sine', from: 330, to: 660, delay: 0.1, length: 0.5, gain: 0.16 },
  ],
  effect: [{ wave: 'sine', from: 600, to: 900, delay: 0, length: 0.1, gain: 0.14 }],
  win: [
    { wave: 'triangle', from: 392, to: 392, delay: 0, length: 0.14, gain: 0.22 },
    { wave: 'triangle', from: 523, to: 523, delay: 0.14, length: 0.14, gain: 0.22 },
    { wave: 'triangle', from: 659, to: 659, delay: 0.28, length: 0.3, gain: 0.24 },
  ],
  lose: [
    { wave: 'triangle', from: 330, to: 330, delay: 0, length: 0.2, gain: 0.2 },
    { wave: 'triangle', from: 247, to: 247, delay: 0.2, length: 0.2, gain: 0.2 },
    { wave: 'triangle', from: 165, to: 140, delay: 0.4, length: 0.4, gain: 0.22 },
  ],
  reject: [{ wave: 'square', from: 140, to: 120, delay: 0, length: 0.09, gain: 0.12 }],
};
