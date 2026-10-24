// Boots PixiJS (forced to WebGL, decision D8), the HTML overlay and the screen manager.
import { Application, Container } from 'pixi.js';
import type { EventBus } from '../core/event-bus.ts';
import { createEventBus } from '../core/event-bus.ts';
import type { AppEvents } from './events.ts';
import type { ScreenManager } from './screen-manager.ts';
import { createScreenManager } from './screen-manager.ts';

export interface AppHandle {
  app: Application;
  manager: ScreenManager;
  bus: EventBus<AppEvents>;
  destroy(): void;
}

export async function createApp(root: HTMLElement): Promise<AppHandle> {
  const app = new Application();
  await app.init({
    resizeTo: root,
    background: '#1b1b22',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: 'webgl',
  });
  root.append(app.canvas);

  const uiRoot = document.createElement('div');
  uiRoot.className = 'ui-root';
  root.append(uiRoot);

  const bus = createEventBus<AppEvents>();
  const manager = createScreenManager({
    stage: app.stage,
    overlay: uiRoot,
    bus,
    createLayer: () => new Container(),
  });
  const onTick = (ticker: { deltaMS: number }) => manager.tick(ticker.deltaMS);
  app.ticker.add(onTick);

  const observer = new ResizeObserver(() => {
    app.resize();
    manager.resize({ width: root.clientWidth, height: root.clientHeight });
  });
  observer.observe(root);

  return {
    app,
    manager,
    bus,
    destroy() {
      observer.disconnect();
      app.ticker.remove(onTick);
      manager.dispose();
      uiRoot.remove();
      app.destroy(true, { children: true });
    },
  };
}
