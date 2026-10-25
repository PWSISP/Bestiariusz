// Plays the synthesized sounds of the game with the Web Audio API (S06-04). iOS Safari lets an audio
// context start only inside a tap handler, so the first touch of the page makes and resumes it; sounds
// come later from animation cues. Without Web Audio it does nothing.
import { SOUND_RECIPES } from '../view/sound-recipes.ts';
import type { SoundId } from '../view/juice.ts';

export interface Audio {
  play(id: SoundId): void;
}

export interface AudioEnv {
  readonly makeContext: () => AudioContext;
  /** Where the first touch is heard; null where there is no page. */
  readonly target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | null;
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend'] as const;

function browserEnv(): AudioEnv {
  return {
    makeContext: () => new AudioContext(),
    target: typeof window === 'undefined' ? null : window,
  };
}

export function createAudio(env: AudioEnv = browserEnv()): Audio {
  let context: AudioContext | null = null;
  let broken = false;

  const ready = (): AudioContext | null => {
    if (broken) return null;
    try {
      context ??= env.makeContext();
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch {
      broken = true;
      return null;
    }
  };

  const unlock = (): void => {
    for (const name of UNLOCK_EVENTS) env.target?.removeEventListener(name, unlock);
    ready();
  };
  for (const name of UNLOCK_EVENTS) env.target?.addEventListener(name, unlock);

  return {
    play(id) {
      const ctx = ready();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        for (const tone of SOUND_RECIPES[id]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + tone.delay;
          osc.type = tone.wave;
          osc.frequency.setValueAtTime(tone.from, start);
          osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), start + tone.length);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.length);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + tone.length + 0.02);
        }
      } catch {
        broken = true;
      }
    },
  };
}
