// @vitest-environment jsdom
import type { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import type { AppEvents, Size } from '../../src/app/events.ts';
import type { Screen, ScreenContext, ScreenHost } from '../../src/app/screen-manager.ts';
import { createScreenManager } from '../../src/app/screen-manager.ts';
import { createEventBus } from '../../src/core/event-bus.ts';

interface FakeLayer {
  children: unknown[];
  destroy: ReturnType<typeof vi.fn>;
}

function fakeHost() {
  const children: unknown[] = [];
  const layers: FakeLayer[] = [];
  const stage = {
    children,
    addChild(child: unknown) {
      children.push(child);
      return child;
    },
    removeChild(child: unknown) {
      const i = children.indexOf(child);
      if (i >= 0) children.splice(i, 1);
      return child;
    },
  } as unknown as ScreenHost['stage'];
  const overlay = document.createElement('div');
  document.body.append(overlay);
  const host: ScreenHost = {
    stage,
    overlay,
    bus: createEventBus<AppEvents>(),
    createLayer() {
      const layer: FakeLayer = { children: [], destroy: vi.fn() };
      layers.push(layer);
      return layer as unknown as Container;
    },
  };
  return { host, layers };
}

interface Recorder {
  log: string[];
  resizes: Size[];
  ticks: number[];
  contexts: ScreenContext[];
}

function recordingScreen(
  name: string,
  rec: Recorder,
  onMount?: (ctx: ScreenContext) => void,
): () => Screen {
  return () => ({
    mount(ctx) {
      rec.log.push(`mount ${name}`);
      rec.contexts.push(ctx);
      ctx.bus.on('app:resize', (size) => rec.resizes.push(size));
      ctx.onTick((dt) => rec.ticks.push(dt));
      ctx.overlay.append(document.createElement('button'));
      onMount?.(ctx);
    },
    unmount() {
      rec.log.push(`unmount ${name}`);
    },
    resize(size) {
      rec.log.push(`resize ${name} ${size.width}x${size.height}`);
    },
  });
}

const newRecorder = (): Recorder => ({ log: [], resizes: [], ticks: [], contexts: [] });

describe('screen manager', () => {
  it('mounts a screen with its own layer and overlay div', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.show('a');
    expect(manager.current).toBe('a');
    expect(rec.log).toEqual(['mount a']);
    const stats = manager.stats();
    expect(stats.stageChildren).toBe(1);
    expect(stats.overlayChildren).toBe(1);
    expect(stats.tickHandlers).toBe(1);
    expect(stats.busListeners).toBe(1);
    expect(host.overlay.firstElementChild?.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('survives 100 switches without leaking', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.register('b', recordingScreen('b', rec));
    manager.show('a');
    const baseline = manager.stats();
    for (let i = 0; i < 100; i++) manager.show(i % 2 === 0 ? 'b' : 'a');
    const after = manager.stats();
    expect(manager.current).toBe('a');
    expect(after.stageChildren).toBe(baseline.stageChildren);
    expect(after.overlayChildren).toBe(baseline.overlayChildren);
    expect(after.busListeners).toBe(baseline.busListeners);
    expect(after.tickHandlers).toBe(baseline.tickHandlers);
    expect(after.mountCount - after.unmountCount).toBe(1);
    expect(after.mountCount).toBe(101);
  });

  it('cleans everything on unmount', () => {
    const { host, layers } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.register('b', () => ({ mount() {} }));
    manager.show('a');
    const overlayDiv = host.overlay.firstElementChild;
    manager.show('b');
    host.bus.emit('app:resize', { width: 1, height: 2 });
    manager.tick(16);
    expect(rec.resizes).toEqual([]);
    expect(rec.ticks).toEqual([]);
    expect(layers[0]?.destroy).toHaveBeenCalledWith({ children: true });
    expect(overlayDiv?.isConnected).toBe(false);
    expect(host.bus.listenerCount()).toBe(0);
  });

  it('rejects an unknown screen without changing state', () => {
    const { host } = fakeHost();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', newRecorder()));
    manager.show('a');
    expect(() => manager.show('x')).toThrow('Unknown screen "x"');
    expect(manager.current).toBe('a');
    expect(manager.stats().stageChildren).toBe(1);
  });

  it('ignores show() of the current screen', () => {
    const { host } = fakeHost();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', newRecorder()));
    manager.show('a');
    manager.show('a');
    expect(manager.stats().mountCount).toBe(1);
  });

  it('handles navigate() called from inside mount()', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register(
      'a',
      recordingScreen('a', rec, (ctx) => ctx.navigate('b')),
    );
    manager.register('b', recordingScreen('b', rec));
    manager.show('a');
    expect(manager.current).toBe('b');
    expect(rec.log).toEqual(['mount a', 'unmount a', 'mount b']);
    const stats = manager.stats();
    expect(stats.stageChildren).toBe(1);
    expect(stats.overlayChildren).toBe(1);
  });

  it('queues requests during a transition and the last one wins', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register(
      'a',
      recordingScreen('a', rec, () => {
        manager.show('b');
        manager.show('c');
      }),
    );
    manager.register('b', recordingScreen('b', rec));
    manager.register('c', recordingScreen('c', rec));
    manager.show('a');
    expect(manager.current).toBe('c');
    expect(rec.log).toEqual(['mount a', 'unmount a', 'mount c']);
  });

  it('cleans up and rethrows when mount throws', () => {
    const { host, layers } = fakeHost();
    const manager = createScreenManager(host);
    const boom = new Error('boom');
    manager.register('bad', () => ({
      mount(ctx) {
        ctx.bus.on('app:resize', () => {});
        ctx.onTick(() => {});
        throw boom;
      },
    }));
    manager.register('a', recordingScreen('a', newRecorder()));
    expect(() => manager.show('bad')).toThrow(boom);
    expect(manager.current).toBeNull();
    const stats = manager.stats();
    expect(stats.stageChildren).toBe(0);
    expect(stats.overlayChildren).toBe(0);
    expect(stats.busListeners).toBe(0);
    expect(stats.tickHandlers).toBe(0);
    expect(layers[0]?.destroy).toHaveBeenCalledWith({ children: true });
    manager.show('a');
    expect(manager.current).toBe('a');
  });

  it('forwards resize and emits app:resize', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.show('a');
    manager.resize({ width: 390, height: 844 });
    expect(rec.log).toContain('resize a 390x844');
    expect(rec.resizes).toEqual([{ width: 390, height: 844 }]);
  });

  it('gives a newly mounted screen the last known size', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.register('b', recordingScreen('b', rec));
    manager.show('a');
    manager.resize({ width: 390, height: 844 });
    manager.show('b');
    expect(rec.log).toEqual([
      'mount a',
      'resize a 390x844',
      'unmount a',
      'mount b',
      'resize b 390x844',
    ]);
  });

  it('forwards ticks to the current screen', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.show('a');
    manager.tick(16);
    manager.tick(17);
    expect(rec.ticks).toEqual([16, 17]);
  });

  it('emits screen:changed with from and to', () => {
    const { host } = fakeHost();
    const manager = createScreenManager(host);
    const changes: AppEvents['screen:changed'][] = [];
    host.bus.on('screen:changed', (e) => changes.push(e));
    manager.register('a', () => ({ mount() {} }));
    manager.register('b', () => ({ mount() {} }));
    manager.show('a');
    manager.show('b');
    expect(changes).toEqual([
      { from: null, to: 'a' },
      { from: 'a', to: 'b' },
    ]);
  });

  it('dispose unmounts the current screen', () => {
    const { host } = fakeHost();
    const rec = newRecorder();
    const manager = createScreenManager(host);
    manager.register('a', recordingScreen('a', rec));
    manager.show('a');
    manager.dispose();
    expect(rec.log).toEqual(['mount a', 'unmount a']);
    expect(manager.current).toBeNull();
    expect(manager.stats().stageChildren).toBe(0);
    expect(manager.stats().overlayChildren).toBe(0);
  });
});
