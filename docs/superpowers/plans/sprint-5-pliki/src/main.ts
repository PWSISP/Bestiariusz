import './ui/ui.css';
import { createApp } from './app/app.ts';
import { parseLaunchOptions } from './app/launch-options.ts';
import { loadBundledCombatData } from './game/combat-data.ts';
import { startGame } from './game/game.ts';
import { createTelemetry } from './game/telemetry.ts';
import { initI18n } from './i18n/index.ts';
import { newSeed } from './platform/seed.ts';
import { createLocalStore } from './platform/telemetry-store.ts';

await initI18n('pl');

const root = document.getElementById('app');
if (!root) throw new Error('index.html is missing the #app element');

const options = parseLaunchOptions(window.location.search, {
  dev: import.meta.env.DEV,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  testerBuild: import.meta.env.VITE_TESTER === '1',
});
const data = loadBundledCombatData();
const { app, manager } = await createApp(root);

if (import.meta.env.DEV && options.sheet) {
  const { createArtSheet } = await import('./game/screens/art-sheet.ts');
  manager.register('sheet', () => createArtSheet(options.sheet ?? 'creatures', data.symbols));
  manager.show('sheet');
  window.__bestiariusz = { app, manager };
} else {
  const telemetry = options.tester
    ? createTelemetry({
        store: createLocalStore(),
        clock: () => performance.now(),
        wallClock: () => new Date().toISOString(),
        newId: newSeed,
        build: String(import.meta.env.VITE_BUILD ?? 'dev'),
      })
    : undefined;
  const game = startGame({ manager, data, options, telemetry });
  if (import.meta.env.DEV) window.__bestiariusz = { app, manager, game };
}
