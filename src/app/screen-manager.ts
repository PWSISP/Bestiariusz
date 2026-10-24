// Screen manager: one screen at a time, each with its own PixiJS layer, overlay div, scoped bus and
// tick handlers, all released on unmount. show() during a transition is queued and the last
// request wins. Only the Container type is imported, so PixiJS is not loaded at runtime here.
import type { Container } from 'pixi.js';
import type { EventBus } from '../core/event-bus.ts';
import { createScopedBus } from '../core/event-bus.ts';
import type { AppEvents, ScreenId, Size } from './events.ts';

export interface ScreenContext {
  /** PixiJS layer owned by the screen. */
  readonly layer: Container;
  /** Overlay div owned by the screen. */
  readonly overlay: HTMLElement;
  /** Scoped bus: its subscriptions are removed on unmount. */
  readonly bus: EventBus<AppEvents>;
  /** Removed on unmount. */
  onTick(handler: (deltaMs: number) => void): void;
  /** Same as manager.show(id). */
  navigate(id: ScreenId): void;
}

export interface Screen {
  mount(ctx: ScreenContext): void;
  unmount?(): void;
  resize?(size: Size): void;
}

export interface ScreenHost {
  readonly stage: Pick<Container, 'addChild' | 'removeChild' | 'children'>;
  readonly overlay: HTMLElement;
  readonly bus: EventBus<AppEvents>;
  createLayer(): Container;
}

export interface ManagerStats {
  stageChildren: number;
  overlayChildren: number;
  busListeners: number;
  tickHandlers: number;
  mountCount: number;
  unmountCount: number;
}

export interface ScreenManager {
  register(id: ScreenId, factory: () => Screen): void;
  show(id: ScreenId): void;
  tick(deltaMs: number): void;
  resize(size: Size): void;
  readonly current: ScreenId | null;
  stats(): ManagerStats;
  dispose(): void;
}

interface Mounted {
  id: ScreenId;
  screen: Screen;
  layer: Container;
  div: HTMLElement;
  bus: EventBus<AppEvents> & { dispose(): void };
  ticks: Set<(deltaMs: number) => void>;
  released: boolean;
}

export function createScreenManager(host: ScreenHost): ScreenManager {
  const factories = new Map<ScreenId, () => Screen>();
  let current: Mounted | null = null;
  let transitioning = false;
  let pendingId: ScreenId | null = null;
  let mountCount = 0;
  let unmountCount = 0;
  let lastSize: Size | null = null;

  function release(entry: Mounted): void {
    entry.released = true;
    entry.bus.dispose();
    entry.ticks.clear();
    host.stage.removeChild(entry.layer);
    entry.layer.destroy({ children: true });
    entry.div.remove();
  }

  function unmountCurrent(): void {
    const entry = current;
    if (!entry) return;
    current = null;
    try {
      entry.screen.unmount?.();
    } finally {
      release(entry);
      unmountCount += 1;
    }
  }

  function mount(id: ScreenId): void {
    const factory = factories.get(id);
    if (!factory) throw new Error(`Unknown screen "${id}"`);
    const from = current?.id ?? null;
    unmountCurrent();

    const layer = host.createLayer();
    host.stage.addChild(layer);
    const div = host.overlay.ownerDocument.createElement('div');
    div.className = 'ui-screen';
    host.overlay.append(div);
    const entry: Mounted = {
      id,
      screen: { mount() {} },
      layer,
      div,
      bus: createScopedBus(host.bus),
      ticks: new Set(),
      released: false,
    };
    const ctx: ScreenContext = {
      layer,
      overlay: div,
      bus: entry.bus,
      onTick(handler) {
        if (!entry.released) entry.ticks.add(handler);
      },
      navigate: (next) => manager.show(next),
    };

    current = entry;
    try {
      entry.screen = factory();
      entry.screen.mount(ctx);
      // A screen mounted after the last resize still needs to know the size.
      if (lastSize && current === entry) entry.screen.resize?.(lastSize);
    } catch (error) {
      current = null;
      release(entry);
      throw error;
    }
    mountCount += 1;
    host.bus.emit('screen:changed', { from, to: id });
  }

  const manager: ScreenManager = {
    register(id, factory) {
      factories.set(id, factory);
    },

    show(id) {
      if (!factories.has(id)) throw new Error(`Unknown screen "${id}"`);
      if (transitioning) {
        pendingId = id;
        return;
      }
      if (current?.id === id) return;
      transitioning = true;
      try {
        let target: ScreenId | null = id;
        while (target !== null) {
          mount(target);
          const next: ScreenId | null = pendingId;
          pendingId = null;
          target = next !== null && next !== current?.id ? next : null;
        }
      } finally {
        transitioning = false;
        pendingId = null;
      }
    },

    tick(deltaMs) {
      if (!current) return;
      for (const handler of [...current.ticks]) handler(deltaMs);
    },

    resize(size) {
      lastSize = size;
      current?.screen.resize?.(size);
      host.bus.emit('app:resize', size);
    },

    get current() {
      return current?.id ?? null;
    },

    stats() {
      return {
        stageChildren: host.stage.children.length,
        overlayChildren: host.overlay.children.length,
        busListeners: host.bus.listenerCount(),
        tickHandlers: current?.ticks.size ?? 0,
        mountCount,
        unmountCount,
      };
    },

    dispose() {
      pendingId = null;
      unmountCurrent();
    },
  };

  return manager;
}
