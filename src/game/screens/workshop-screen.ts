// The Workshop (S06-02): pick an element, a form and a trait, see the creature and its price, make it.
import type { Screen } from '../../app/screen-manager.ts';
import type { CombatData } from '../../core/combat/model.ts';
import { craftCreature } from '../../core/workshop/workshop.ts';
import type { Unlocked } from '../../core/workshop/workshop.ts';
import { renderText } from '../../i18n/text.ts';
import type { TranslateFn } from '../../i18n/text.ts';
import { markTap } from '../../ui/tap-guard.ts';
import { creatureTitle } from '../../view/combat-view.ts';
import { buildWorkshopView, EMPTY_SELECTION, toggleSymbol } from '../../view/workshop-view.ts';
import type { Selection } from '../../view/workshop-view.ts';
import type { CraftedCard } from '../../core/run/run.ts';
import { button, createPanelScreen, el } from './panel.ts';

export interface WorkshopScreenDeps {
  readonly data: CombatData;
  readonly unlocked: Unlocked;
  readonly ink: number;
  readonly translate: TranslateFn;
  /** A creature was made: the card and the ink left. */
  readonly onCrafted: (card: CraftedCard, ink: number) => void;
  readonly onBack: () => void;
}

export function createWorkshopScreen(deps: WorkshopScreenDeps): Screen {
  const { translate: tr, data } = deps;
  const screen = createPanelScreen({ top: 0x161224, bottom: 0x2e2448 }, 'workshop-screen');
  const { panel } = screen;
  let ink = deps.ink;
  let selection: Selection = EMPTY_SELECTION;
  let message = '';

  function render(): void {
    const view = buildWorkshopView(data, deps.unlocked, ink, selection);
    panel.replaceChildren(
      el('h1', 'run-title', tr('workshop.title')),
      el('p', 'run-sub workshop-ink', tr('workshop.ink', { ink: view.ink })),
    );
    const columns = el('div', 'workshop-columns');
    for (const column of view.columns) {
      const col = el('div', 'workshop-column');
      col.append(el('h2', 'workshop-heading', tr(`workshop.column.${column.kind}`)));
      for (const choice of column.choices) {
        const pick = button(
          `${tr(`symbol.${column.kind}.${choice.id}.name`)} (${choice.cost})`,
          `workshop-symbol${choice.selected ? ' selected' : ''}`,
          () => {
            selection = toggleSymbol(selection, column.kind, choice.id);
            message = '';
            render();
          },
        );
        pick.dataset['symbol'] = `${column.kind}:${choice.id}`;
        pick.setAttribute('aria-pressed', String(choice.selected));
        pick.addEventListener('click', markTap);
        col.append(pick);
      }
      columns.append(col);
    }
    panel.append(columns, el('p', 'workshop-power', tr('workshop.power', view.power)));
    const info = el('p', 'workshop-preview');
    if (view.preview) {
      const spec = { element: selection.element, form: selection.form, trait: selection.trait };
      const title =
        spec.element && spec.form && spec.trait
          ? renderText(
              creatureTitle({ element: spec.element, form: spec.form, trait: spec.trait }),
              tr,
            )
          : '';
      const preview = tr('workshop.preview', {
        title,
        attack: view.preview.attack,
        health: view.preview.health,
        ember: view.preview.emberCost,
        ink: view.preview.inkCost,
      });
      info.textContent = view.blocked
        ? tr('workshop.preview.blocked', { preview, reason: tr(blockedKey(view.blocked)) })
        : preview;
    } else {
      info.textContent = view.blocked ? tr(blockedKey(view.blocked)) : '';
    }
    panel.append(info, el('p', 'workshop-message', message));
    const craft = button(tr('workshop.craft'), 'run-primary workshop-craft', () => {
      if (!view.canCraft || !selection.element || !selection.form || !selection.trait) return;
      const result = craftCreature(data, deps.unlocked, ink, {
        element: selection.element,
        form: selection.form,
        trait: selection.trait,
      });
      if (!result.ok) {
        message = tr(result.error);
        render();
        return;
      }
      ink = result.ink;
      deps.onCrafted(result.card, result.ink);
      message = tr('workshop.made', {
        title: renderText(creatureTitle(result.card.creature), tr),
      });
      selection = EMPTY_SELECTION;
      render();
    });
    craft.disabled = !view.canCraft;
    craft.addEventListener('click', markTap);
    const back = button(tr('workshop.back'), 'run-secondary workshop-back', deps.onBack);
    back.addEventListener('click', markTap);
    const actions = el('div', 'run-actions');
    actions.append(craft, back);
    panel.append(actions);
  }

  function blockedKey(blocked: string): string {
    return blocked === 'incomplete' ? 'workshop.incomplete' : blocked;
  }

  return {
    mount(ctx) {
      render();
      screen.mount(ctx);
    },
    resize: (size) => screen.paint(size),
  };
}
