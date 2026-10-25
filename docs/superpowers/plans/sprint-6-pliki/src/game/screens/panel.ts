// Shared parts of the DOM screens of the expedition (route, reward, Workshop): the dark background and a
// scrolling panel in the overlay. The screens put plain HTML in it, so text is selectable and scalable.
import { Container, Graphics } from 'pixi.js';
import type { ScreenContext } from '../../app/screen-manager.ts';
import type { Size } from '../../view/geometry.ts';
import { drawGradient } from '../render/theme.ts';

export interface PanelScreen {
  readonly root: Container;
  readonly panel: HTMLElement;
  /** Draws the background for a size. */
  paint(size: Size): void;
  mount(ctx: ScreenContext): void;
}

export function createPanelScreen(colors: { top: number; bottom: number }, className: string): PanelScreen {
  const root = new Container();
  const panel = document.createElement('div');
  panel.className = `run-panel ${className}`;
  function paint(size: Size): void {
    for (const child of root.removeChildren()) child.destroy({ children: true });
    const bg = new Graphics();
    drawGradient(bg, 0, 0, size.width, size.height, colors.top, colors.bottom);
    root.addChild(bg);
  }
  return {
    root,
    panel,
    paint,
    mount(ctx) {
      ctx.layer.addChild(root);
      paint({ width: ctx.overlay.clientWidth || 360, height: ctx.overlay.clientHeight || 800 });
      ctx.overlay.append(panel);
    },
  };
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  content?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

export function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', `ui-button ${className}`, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
