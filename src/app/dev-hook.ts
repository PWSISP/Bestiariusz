// Development-only handle for e2e tests and the browser console (set in main.ts under DEV).
import type { Application } from 'pixi.js';
import type { ScreenManager } from './screen-manager.ts';

export interface DevHook {
  app: Application;
  manager: ScreenManager;
}

declare global {
  interface Window {
    __bestiariusz?: DevHook;
  }
}
