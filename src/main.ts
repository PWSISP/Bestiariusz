import './ui/ui.css';
import { createApp } from './app/app.ts';
import { parseLaunchOptions } from './app/launch-options.ts';
import { loadBundledCombatData } from './game/combat-data.ts';
import { startGame } from './game/game.ts';
import { initI18n } from './i18n/index.ts';

await initI18n('pl');

const root = document.getElementById('app');
if (!root) throw new Error('index.html is missing the #app element');

const options = parseLaunchOptions(window.location.search, {
  dev: import.meta.env.DEV,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
const data = loadBundledCombatData();
const { app, manager } = await createApp(root);

if (import.meta.env.DEV && options.sheet) {
  const { createArtSheet } = await import('./game/screens/art-sheet.ts');
  manager.register('sheet', () => createArtSheet(options.sheet ?? 'creatures', data.symbols));
  manager.show('sheet');
  window.__bestiariusz = { app, manager };
} else {
  const game = startGame({ manager, data, options });
  if (import.meta.env.DEV) window.__bestiariusz = { app, manager, game };
}
