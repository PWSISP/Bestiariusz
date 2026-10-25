// The screen after a combat (S04-08): win or defeat, a line of flavour, three numbers and one button.
// What it says comes from buildResultView; this file only lays it out.
import { Container, Graphics } from 'pixi.js';
import type { Screen, ScreenContext } from '../../app/screen-manager.ts';
import type { CombatSummary } from '../../core/combat/summary.ts';
import { renderText } from '../../i18n/text.ts';
import type { TranslateFn } from '../../i18n/text.ts';
import { createButton } from '../../ui/dom.ts';
import { buildResultView } from '../../view/result-view.ts';
import type { Size } from '../../view/geometry.ts';
import { COLORS, drawGradient, label } from '../render/theme.ts';

export interface ResultScreenDeps {
  readonly summary: CombatSummary;
  readonly translate: TranslateFn;
  /** The player pressed the button. */
  readonly onContinue: () => void;
}

export function createResultScreen(deps: ResultScreenDeps): Screen {
  const view = buildResultView(deps.summary);
  const tr = (ref: Parameters<typeof renderText>[0]): string => renderText(ref, deps.translate);
  const won = view.outcome === 'won';
  const root = new Container();

  function build(size: Size): void {
    for (const child of root.removeChildren()) child.destroy({ children: true });
    const bg = new Graphics();
    drawGradient(
      bg,
      0,
      0,
      size.width,
      size.height,
      won ? 0x0f1d12 : 0x1d0f0f,
      won ? 0x24402c : 0x3a1a18,
    );
    root.addChild(bg);
    const width = Math.min(size.width - 32, 400);
    const x = (size.width - width) / 2;
    const top = Math.max(24, size.height * 0.14);
    const accent = won ? COLORS.gold : COLORS.red;
    const title = label(tr(view.title), 40, accent, {
      bold: true,
      anchor: [0.5, 0],
      align: 'center',
      stroke: 0x000000,
    });
    title.position.set(size.width / 2, top);
    const enemy = label(tr(view.enemyName), 18, COLORS.dim, { anchor: [0.5, 0], align: 'center' });
    enemy.position.set(size.width / 2, top + 58);
    const flavor = label(tr(view.flavor), 17, COLORS.text, {
      anchor: [0.5, 0],
      align: 'center',
      wrap: width - 24,
    });
    flavor.position.set(size.width / 2, top + 100);
    const panelTop = top + 100 + flavor.height + 28;
    const rows = view.stats.map((s) => label(tr(s.label), 18, COLORS.text, { anchor: [0, 0.5] }));
    const panelHeight = 24 + rows.length * 36;
    const panel = new Graphics();
    panel.roundRect(x, panelTop, width, panelHeight, 14).fill({ color: COLORS.panel, alpha: 0.9 });
    panel
      .roundRect(x, panelTop, width, panelHeight, 14)
      .stroke({ width: 2, color: accent, alpha: 0.7 });
    root.addChild(panel, title, enemy, flavor);
    rows.forEach((row, i) => {
      row.position.set(x + 20, panelTop + 12 + 18 + i * 36);
      root.addChild(row);
    });
  }

  return {
    mount(ctx: ScreenContext) {
      ctx.layer.addChild(root);
      build({ width: ctx.overlay.clientWidth || 360, height: ctx.overlay.clientHeight || 800 });
      const button = createButton('result.continue', deps.onContinue);
      button.classList.add('result-continue');
      ctx.overlay.append(button);
    },
    resize(size: Size) {
      build(size);
    },
  };
}
