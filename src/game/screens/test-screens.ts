// Temporary test screens for the app skeleton; they go away with the first real screens (S04).
import { Graphics, Text } from 'pixi.js';
import type { ScreenId } from '../../app/events.ts';
import type { Screen } from '../../app/screen-manager.ts';
import type { TranslationKey } from '../../i18n/index.ts';
import { t } from '../../i18n/index.ts';
import { createButton } from '../../ui/dom.ts';

const ROTATION_PER_MS = 0.0005;

export function createTestScreen(
  titleKey: TranslationKey,
  color: number,
  nextId: ScreenId,
): Screen {
  const background = new Graphics();
  const title = new Text({ text: t(titleKey), style: { fill: 0xffffff, fontSize: 32 } });
  title.anchor.set(0.5);

  const layout = (width: number, height: number) => {
    background.clear().rect(0, 0, width, height).fill(color);
    title.position.set(width / 2, height / 2);
  };

  return {
    mount(ctx) {
      ctx.layer.addChild(background, title);
      ctx.onTick((deltaMs) => {
        title.rotation += deltaMs * ROTATION_PER_MS;
      });
      ctx.bus.on('app:resize', ({ width, height }) => layout(width, height));
      ctx.overlay.append(createButton('screen.test.switch', () => ctx.navigate(nextId)));
    },
    resize({ width, height }) {
      layout(width, height);
    },
  };
}
