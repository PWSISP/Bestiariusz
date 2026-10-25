import { afterEach, describe, expect, it } from 'vitest';
import { loadJuice, saveJuice } from '../../src/platform/juice-store.ts';
import { DEFAULT_JUICE } from '../../src/view/juice.ts';

type Fake = { localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void } };
const g = globalThis as unknown as { window?: Fake };
const original = g.window;
afterEach(() => {
  g.window = original;
});

describe('the juice store', () => {
  it('gives the defaults when nothing was saved', () => {
    g.window = { localStorage: { getItem: () => null, setItem: () => undefined } };
    expect(loadJuice()).toEqual(DEFAULT_JUICE);
  });

  it('saves and loads the switches', () => {
    const memory = new Map<string, string>();
    g.window = {
      localStorage: {
        getItem: (k) => memory.get(k) ?? null,
        setItem: (k, v) => void memory.set(k, v),
      },
    };
    saveJuice({ shake: false, flash: true, numbers: false, sound: true });
    expect(loadJuice()).toEqual({ shake: false, flash: true, numbers: false, sound: true });
  });

  it('survives a storage that throws (private window, blocked data)', () => {
    const boom = (): never => {
      throw new Error('blocked');
    };
    g.window = { localStorage: { getItem: boom, setItem: boom } };
    expect(loadJuice()).toEqual(DEFAULT_JUICE);
    expect(() => saveJuice(DEFAULT_JUICE)).not.toThrow();
  });

  it('survives a window without storage', () => {
    g.window = {};
    expect(loadJuice()).toEqual(DEFAULT_JUICE);
    expect(() => saveJuice(DEFAULT_JUICE)).not.toThrow();
  });
});
