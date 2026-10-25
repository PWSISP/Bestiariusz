// Touch and keyboard controls of the combat screen (S04-02, S04-07): transparent DOM buttons laid over
// the cards, the Kręgi and the end-turn button. The picture is Pixi's; the buttons give it real
// touch targets, focus, accessible names and pointer capture for dragging. They only translate DOM
// events into HandInputEvents (src/view/hand-input.ts) and button presses; the screen decides.
import type { CombatView } from '../../view/combat-view.ts';
import type { HandInputEvent } from '../../view/hand-input.ts';
import { CARD_HEIGHT, CARD_WIDTH } from '../../view/hand-fan.ts';
import type { FanSlot } from '../../view/hand-fan.ts';
import type { CombatLayout } from '../../view/layout.ts';
import { text } from '../../view/text.ts';
import type { TextRef } from '../../view/text.ts';

export interface ControlsFrame {
  readonly view: CombatView;
  readonly layout: CombatLayout;
  /** Fan slots in stage coordinates. */
  readonly slots: readonly FanSlot[];
  /** Input is ignored (animation running, combat over); the end-turn button is disabled. */
  readonly locked: boolean;
}

export interface ControlsHandlers {
  input(event: HandInputEvent): void;
  endTurn(): void;
  /** Called on every pointer press before anything else; true = the press skipped an animation and is consumed. */
  skip(): boolean;
}

export interface Controls {
  sync(frame: ControlsFrame): void;
  /** Replaces the text announced to screen readers. */
  announce(lines: readonly string[]): void;
  destroy(): void;
}

function place(el: HTMLElement, x: number, y: number, w: number, h: number): void {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
}

function makeButton(className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `hit ${className}`;
  return b;
}

export function createControls(
  parent: HTMLElement,
  tr: (ref: TextRef) => string,
  handlers: ControlsHandlers,
): Controls {
  const host = document.createElement('div');
  host.className = 'combat-hit';
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  const summary = document.createElement('p');
  summary.className = 'sr-only';
  const backdrop = document.createElement('div');
  backdrop.className = 'hit-backdrop';
  const endTurn = makeButton('hit-end');
  const cards: HTMLButtonElement[] = [];
  const circles: HTMLButtonElement[] = [0, 1, 2].map(() => makeButton('hit-circle'));
  host.append(backdrop, ...circles, endTurn, live, summary);
  parent.append(host);

  let current: ControlsFrame | null = null;

  const local = (e: PointerEvent): { x: number; y: number } => {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // A press that skips an animation is swallowed before it reaches a button.
  const onPressCapture = (e: PointerEvent): void => {
    if (handlers.skip()) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  host.addEventListener('pointerdown', onPressCapture, true);
  // Lifting a tapped card moves its button from under the finger, so the click that ends the tap can land
  // on the backdrop; a click right after a card gesture is part of that gesture, not a tap outside.
  let cardGestureEnd = Number.NEGATIVE_INFINITY;
  host.addEventListener(
    'pointerup',
    (e) => {
      if ((e.target as Element).classList.contains('hit-card')) cardGestureEnd = performance.now();
    },
    true,
  );
  backdrop.addEventListener('click', () => {
    if (performance.now() - cardGestureEnd < 500) return;
    handlers.input({ type: 'tapOutside' });
  });
  endTurn.addEventListener('click', () => handlers.endTurn());
  circles.forEach((button, circle) => {
    button.addEventListener('click', () => handlers.input({ type: 'tapCircle', circle }));
  });

  function cardButton(handIndex: number): HTMLButtonElement {
    const existing = cards[handIndex];
    if (existing) return existing;
    const button = makeButton('hit-card');
    button.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      button.setPointerCapture(e.pointerId);
      const p = local(e);
      handlers.input({ type: 'pointerDown', handIndex, x: p.x, y: p.y });
    });
    button.addEventListener('pointermove', (e) => {
      if (!button.hasPointerCapture(e.pointerId)) return;
      const p = local(e);
      handlers.input({ type: 'pointerMove', x: p.x, y: p.y });
    });
    button.addEventListener('pointerup', (e) => {
      if (!button.hasPointerCapture(e.pointerId)) return;
      button.releasePointerCapture(e.pointerId);
      const p = local(e);
      handlers.input({ type: 'pointerUp', x: p.x, y: p.y });
    });
    button.addEventListener('pointercancel', () => handlers.input({ type: 'pointerCancel' }));
    // Keyboard and screen readers click without a pointer (detail 0): treat it as a tap on the card.
    button.addEventListener('click', (e) => {
      if (e.detail !== 0 || !current) return;
      const slot = current.slots[handIndex];
      const l = current.layout;
      const x = l.stage.x + (slot?.x ?? 0) * l.scale;
      const y = l.stage.y + (slot?.y ?? 0) * l.scale;
      handlers.input({ type: 'pointerDown', handIndex, x, y });
      handlers.input({ type: 'pointerUp', x, y });
    });
    cards[handIndex] = button;
    host.append(button);
    return button;
  }

  return {
    sync(frame) {
      current = frame;
      const { view, layout, slots } = frame;
      const s = layout.scale;
      view.hand.forEach((card, i) => {
        const slot = slots[i];
        const button = cardButton(i);
        if (!slot) return;
        const w = CARD_WIDTH * s * slot.scale;
        const h = CARD_HEIGHT * s * slot.scale;
        place(button, layout.stage.x + slot.x * s, layout.stage.y + slot.y * s, w, h);
        button.style.transform = `translate(-50%, -50%) rotate(${slot.rotation}rad)`;
        button.style.zIndex = String(slot.z + 1);
        button.setAttribute('aria-label', tr(card.label));
        button.setAttribute('aria-pressed', String(card.selected));
        button.disabled = false;
      });
      while (cards.length > view.hand.length) {
        cards.pop()?.remove();
      }
      circles.forEach((button, i) => {
        const r = layout.circles[i];
        const circle = view.circles[i];
        if (!r || !circle) return;
        place(button, r.x, r.y, r.width, r.height);
        button.setAttribute('aria-label', tr(circle.label));
      });
      const r = layout.endTurn;
      place(endTurn, r.x, r.y, r.width, r.height);
      endTurn.textContent = tr(text('combat.endTurn'));
      endTurn.disabled = frame.locked || view.phase !== 'player';
      place(backdrop, layout.stage.x, layout.stage.y, layout.stage.width, layout.stage.height);
      summary.textContent = [
        text('status.hp', { hp: view.player.hp, max: view.player.maxHp }),
        text('status.ember', { current: view.ember.current, max: view.ember.perTurn }),
        text('status.draw', { count: view.piles.draw }),
        text('status.discard', { count: view.piles.discard }),
        text('status.enemyHp', { hp: view.enemy.hp, max: view.enemy.maxHp }),
        view.intent.name,
      ]
        .map(tr)
        .join('. ');
    },
    announce(lines) {
      live.textContent = lines.join('. ');
    },
    destroy() {
      host.removeEventListener('pointerdown', onPressCapture, true);
      host.remove();
    },
  };
}
