// Development-only handle for e2e tests and the browser console (set in main.ts under DEV).
import type { Application } from 'pixi.js';
import type { GameHandle } from '../game/game.ts';
import type { ScreenManager } from './screen-manager.ts';

export interface DevHook {
  app: Application;
  manager: ScreenManager;
  /** Absent on the development art sheets. */
  game?: GameHandle;
}

declare global {
  interface Window {
    __bestiariusz?: DevHook;
  }
}
