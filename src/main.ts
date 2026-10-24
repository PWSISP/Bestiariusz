import './ui/ui.css';
import { createApp } from './app/app.ts';
import { createTestScreen } from './game/screens/test-screens.ts';
import { initI18n } from './i18n/index.ts';

await initI18n('pl');

const root = document.getElementById('app');
if (!root) throw new Error('index.html is missing the #app element');

const { app, manager } = await createApp(root);
manager.register('test-a', () => createTestScreen('screen.test.a.title', 0x2d4a3e, 'test-b'));
manager.register('test-b', () => createTestScreen('screen.test.b.title', 0x4a2d3e, 'test-a'));
manager.show('test-a');

if (import.meta.env.DEV) window.__bestiariusz = { app, manager };
