// S06-04b: iOS Safari starts an audio context only inside a tap handler, so the first touch unlocks it.
import { describe, expect, it, vi } from 'vitest';
import { createAudio } from '../../src/platform/audio.ts';

function fakeContext() {
  const node = () => ({
    type: '',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(function (this: unknown, next: unknown) {
      return next;
    }),
    start: vi.fn(),
    stop: vi.fn(),
  });
  return {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(node),
    createGain: vi.fn(node),
  };
}

describe('createAudio', () => {
  it('makes and resumes the context on the first touch, once', () => {
    const target = new EventTarget();
    const context = fakeContext();
    const makeContext = vi.fn(() => context as unknown as AudioContext);
    createAudio({ makeContext, target });
    expect(makeContext).not.toHaveBeenCalled();
    target.dispatchEvent(new Event('pointerdown'));
    expect(makeContext).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('touchend'));
    expect(makeContext).toHaveBeenCalledTimes(1);
  });

  it('plays on the context made by the touch', () => {
    const target = new EventTarget();
    const context = fakeContext();
    const makeContext = vi.fn(() => context as unknown as AudioContext);
    const audio = createAudio({ makeContext, target });
    target.dispatchEvent(new Event('touchend'));
    audio.play('card');
    expect(makeContext).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalled();
  });

  it('stays silent and never throws without Web Audio', () => {
    const target = new EventTarget();
    const makeContext = vi.fn((): AudioContext => {
      throw new Error('no Web Audio');
    });
    const audio = createAudio({ makeContext, target });
    expect(() => target.dispatchEvent(new Event('pointerdown'))).not.toThrow();
    expect(() => audio.play('hit')).not.toThrow();
    expect(makeContext).toHaveBeenCalledTimes(1);
  });
});
