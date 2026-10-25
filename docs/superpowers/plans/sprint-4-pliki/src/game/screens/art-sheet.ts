// Development sheets (`?sheet=creatures`, `?sheet=icons`): every placeholder picture on one screen, so
// the art can be checked by eye and by the grey-scale test. Not part of the game.
import { Container, Graphics } from 'pixi.js';
import type { Screen } from '../../app/screen-manager.ts';
import type { SymbolData } from '../../core/types.ts';
import { elementColor } from '../../view/art-style.ts';
import { createCreatureArt } from '../art/placeholder-art.ts';
import { drawElementIcon } from '../art/glyphs.ts';

const CELL_W = 58;
const CELL_H = 80;

function grey(color: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return (y << 16) | (y << 8) | y;
}

export function createArtSheet(kind: 'creatures' | 'icons', symbols: SymbolData): Screen {
  const root = new Container();
  const background = new Graphics();
  root.addChild(background);

  const build = (width: number, height: number): void => {
    for (const child of root.removeChildren()) child.destroy({ children: true });
    root.addChild(new Graphics().rect(0, 0, width, height).fill(0x151b17));
    if (kind === 'creatures') {
      const columns = Math.max(1, Math.floor(width / CELL_W));
      let index = 0;
      for (const element of symbols.elements) {
        for (const form of symbols.forms) {
          for (const trait of symbols.traits) {
            const art = createCreatureArt(
              { element: element.id, form: form.id, trait: trait.id },
              { width: CELL_W - 4, height: CELL_H - 4 },
            );
            art.position.set((index % columns) * CELL_W + 2, Math.floor(index / columns) * CELL_H + 2);
            root.addChild(art);
            index++;
          }
        }
      }
    } else {
      symbols.elements.forEach((element, i) => {
        const size = Math.min(64, Math.floor(width / 6));
        const colored = new Graphics();
        drawElementIcon(colored, element.id, { x: 0, y: 0, width: size, height: size }, elementColor(element.id));
        colored.position.set(8 + i * (size + 8), 8);
        const plain = new Graphics();
        drawElementIcon(plain, element.id, { x: 0, y: 0, width: size, height: size }, grey(elementColor(element.id)));
        plain.position.set(8 + i * (size + 8), 24 + size);
        const tiny = new Graphics();
        drawElementIcon(tiny, element.id, { x: 0, y: 0, width: 20, height: 20 }, 0xffffff);
        tiny.position.set(8 + i * (size + 8), 40 + 2 * size);
        root.addChild(colored, plain, tiny);
      });
    }
  };

  return {
    mount(ctx) {
      ctx.layer.addChild(root);
      build(ctx.layer.parent ? 360 : 360, 800);
    },
    resize({ width, height }) {
      build(width, height);
    },
  };
}
