// Plays the synthesized sounds of the game with the Web Audio API (S06-04). The audio context is made on
// the first sound, which happens after a tap, so browsers allow it. Without Web Audio it does nothing.
import { SOUND_RECIPES } from '../view/sound-recipes.ts';
import type { SoundId } from '../view/juice.ts';

export interface Audio {
  play(id: SoundId): void;
}

export function createAudio(): Audio {
  let context: AudioContext | null = null;
  let broken = false;
  return {
    play(id) {
      if (broken) return;
      try {
        context ??= new AudioContext();
        if (context.state === 'suspended') void context.resume();
        const now = context.currentTime;
        for (const tone of SOUND_RECIPES[id]) {
          const osc = context.createOscillator();
          const gain = context.createGain();
          const start = now + tone.delay;
          osc.type = tone.wave;
          osc.frequency.setValueAtTime(tone.from, start);
          osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), start + tone.length);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.length);
          osc.connect(gain).connect(context.destination);
          osc.start(start);
          osc.stop(start + tone.length + 0.02);
        }
      } catch {
        broken = true;
      }
    },
  };
}
