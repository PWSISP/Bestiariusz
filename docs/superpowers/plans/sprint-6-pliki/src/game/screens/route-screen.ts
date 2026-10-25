// The route (S06-01): the row of fights of the expedition, health, ink and the two things to do next.
import type { Screen } from '../../app/screen-manager.ts';
import type { CombatData } from '../../core/combat/model.ts';
import type { RunState } from '../../core/run/run.ts';
import { renderText } from '../../i18n/text.ts';
import type { TranslateFn } from '../../i18n/text.ts';
import { markTap } from '../../ui/tap-guard.ts';
import type { JuiceSettings } from '../../view/juice.ts';
import { buildRouteView } from '../../view/route-view.ts';
import { button, createPanelScreen, el } from './panel.ts';

export interface RouteScreenDeps {
  readonly data: CombatData;
  readonly run: RunState;
  readonly translate: TranslateFn;
  readonly onFight: () => void;
  readonly onWorkshop: () => void;
  /** The switches of the effects (shake, flash, numbers, sound). */
  readonly juice?: {
    readonly get: () => JuiceSettings;
    readonly set: (settings: JuiceSettings) => void;
  };
}

export function createRouteScreen(deps: RouteScreenDeps): Screen {
  const { translate: tr } = deps;
  const view = buildRouteView(deps.data, deps.run);
  const screen = createPanelScreen({ top: 0x101a14, bottom: 0x24402c }, 'route-screen');
  const { panel } = screen;
  panel.append(
    el('h1', 'run-title', tr('route.title')),
    el('p', 'run-sub', tr('route.step', { current: view.step.current, total: view.step.total })),
  );
  const list = el('ol', 'route-stages');
  for (const stage of view.stages) {
    const item = el('li', `route-stage route-${stage.state}${stage.boss ? ' route-boss' : ''}`);
    item.dataset['enemy'] = stage.enemyId;
    item.append(el('span', 'route-name', renderText(stage.name, tr)));
    if (stage.boss) item.append(el('span', 'route-tag', tr('route.boss')));
    if (stage.state === 'done') item.append(el('span', 'route-tag', tr('route.done')));
    list.append(item);
  }
  panel.append(list);
  const stats = el('p', 'run-stats');
  stats.append(
    el('span', 'run-stat', tr('route.hp', { hp: view.hp, max: view.hpMax })),
    el('span', 'run-stat', tr('route.ink', { ink: view.ink })),
    el('span', 'run-stat', tr('route.deck', { count: view.deckSize })),
  );
  panel.append(stats);
  const fight = button(tr('route.fight'), 'run-primary route-fight', deps.onFight);
  fight.addEventListener('click', markTap);
  const actions = el('div', 'run-actions');
  actions.append(fight);
  if (view.workshop) {
    const workshop = button(tr('route.workshop'), 'run-secondary route-workshop', deps.onWorkshop);
    workshop.addEventListener('click', markTap);
    actions.append(workshop);
  }
  panel.append(actions);
  const juice = deps.juice;
  if (juice) {
    const box = el('fieldset', 'route-settings');
    box.append(el('legend', 'route-settings-title', tr('settings.effects')));
    for (const key of ['shake', 'flash', 'numbers', 'sound'] as const) {
      const row = el('label', 'route-setting');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = juice.get()[key];
      input.dataset['setting'] = key;
      input.addEventListener('change', () => juice.set({ ...juice.get(), [key]: input.checked }));
      row.append(input, el('span', 'route-setting-name', tr(`settings.${key}`)));
      box.append(row);
    }
    panel.append(box);
  }
  return {
    mount: (ctx) => screen.mount(ctx),
    resize: (size) => screen.paint(size),
  };
}
