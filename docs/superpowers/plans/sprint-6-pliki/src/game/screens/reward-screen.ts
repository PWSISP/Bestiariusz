// The reward after a won fight (S06-03): a few cards to choose from, or none.
import type { Screen } from '../../app/screen-manager.ts';
import type { CombatData } from '../../core/combat/model.ts';
import { renderText } from '../../i18n/text.ts';
import type { TranslateFn } from '../../i18n/text.ts';
import { markTap } from '../../ui/tap-guard.ts';
import { describeCard } from '../../view/card-info.ts';
import { button, createPanelScreen, el } from './panel.ts';

export interface RewardScreenDeps {
  readonly data: CombatData;
  readonly offered: readonly string[];
  readonly translate: TranslateFn;
  /** The chosen card, or null when the player takes nothing. */
  readonly onPick: (cardId: string | null) => void;
}

export function createRewardScreen(deps: RewardScreenDeps): Screen {
  const { translate: tr } = deps;
  const screen = createPanelScreen({ top: 0x1a1a10, bottom: 0x40381a }, 'reward-screen');
  const { panel } = screen;
  panel.append(el('h1', 'run-title', tr('reward.title')), el('p', 'run-sub', tr('reward.hint')));
  const list = el('div', 'reward-cards');
  for (const id of deps.offered) {
    const info = describeCard(deps.data, id);
    const pick = button('', 'reward-card', () => deps.onPick(id));
    pick.addEventListener('click', markTap);
    pick.dataset['card'] = id;
    pick.append(el('span', 'reward-name', renderText(info.title, tr)));
    const meta = [tr('reward.cost', { cost: info.cost ?? 0 })];
    if (info.stats) meta.push(tr('reward.stats', { attack: info.stats.attack, health: info.stats.health }));
    pick.append(el('span', 'reward-meta', meta.join(' · ')));
    for (const line of info.lines) pick.append(el('span', 'reward-line', renderText(line, tr)));
    list.append(pick);
  }
  panel.append(list);
  const skip = button(tr('reward.skip'), 'run-secondary reward-skip', () => deps.onPick(null));
  skip.addEventListener('click', markTap);
  const actions = el('div', 'run-actions');
  actions.append(skip);
  panel.append(actions);
  return { mount: (ctx) => screen.mount(ctx), resize: (size) => screen.paint(size) };
}
