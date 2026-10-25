// Helpers of the combat e2e tests: booting the game with fixed options, reading the state through the
// development hook, and touch gestures sent through the Chrome DevTools protocol (a real finger: touch
// start, a few moves, touch end).
import type { Locator, Page } from '@playwright/test';

export interface Snapshot {
  turn: number;
  phase: string;
  ember: number;
  hand: string[];
  circles: (string | null)[];
  enemyHp: number;
  playerHp: number;
  drawPile: number;
  discardPile: number;
  runs: number;
}

/**
 * Opens the game with fixed options and waits for the combat screen: the single duel with the Leszy
 * (`duel=1`), as the combat tests need it. `anim=0` unless told otherwise.
 */
export async function boot(page: Page, query = 'seed=7'): Promise<void> {
  const withDuel = /(^|&)duel=/.test(query) ? query : `${query}&duel=1`;
  const q = /(^|&)anim=/.test(withDuel) ? withDuel : `${withDuel}&anim=0`;
  await page.goto(`/?${q}`);
  await page.waitForFunction(() => window.__bestiariusz?.manager.current === 'combat');
  await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0);
}

export function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const game = window.__bestiariusz!.game!;
    const state = game.session()!.state;
    return {
      turn: state.turn,
      phase: state.phase,
      ember: state.ember,
      hand: [...state.deck.hand],
      circles: state.player.circles.map((c) => (c ? c.cardId : null)),
      enemyHp: state.enemy.hp,
      playerHp: state.player.hp,
      drawPile: state.deck.draw.length,
      discardPile: state.deck.discard.length,
      runs: game.runs(),
    };
  });
}

export const cards = (page: Page): Locator => page.locator('.hit-card');
export const circles = (page: Page): Locator => page.locator('.hit-circle');
export const endTurnButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Koniec tury' });

export async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A finger drag from one point to another: touch start, several moves, touch end. */
export async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8,
): Promise<void> {
  const client = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: point(from.x, from.y),
  });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x, y) });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

/**
 * Two taps of one finger at the same point, `gapMs` apart by the finger's clock. The times are given
 * explicitly because CDP awaits the handling of each touch: on a slow machine the redraw after the
 * first tap would otherwise push the second one far beyond the gap. `cpuSlowdown` emulates a slow phone.
 */
export async function doubleTap(
  page: Page,
  at: { x: number; y: number },
  gapMs = 80,
  cpuSlowdown = 20,
): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
  const start = Date.now() / 1000;
  const touch = (type: 'touchStart' | 'touchEnd', ms: number) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints:
        type === 'touchStart'
          ? [{ x: at.x, y: at.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
          : [],
      timestamp: start + ms / 1000,
    });
  await touch('touchStart', 0);
  await touch('touchEnd', 30);
  await touch('touchStart', gapMs);
  await touch('touchEnd', gapMs + 30);
  await page.waitForTimeout(1000);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await client.detach();
}

/** The id of a card in the hand of the running combat (read from the game, not from the screen). */
export function kindOf(page: Page, cardId: string): Promise<string> {
  return page.evaluate((id) => window.__bestiariusz!.game!.session()!.data.cards[id]!.kind, cardId);
}

/** Opens the game on the route of a new expedition (no `duel`). `anim=0` unless told otherwise. */
export async function bootRun(page: Page, query = 'seed=7'): Promise<void> {
  const q = /(^|&)anim=/.test(query) ? query : `${query}&anim=0`;
  await page.goto(`/?${q}`);
  await page.waitForFunction(() => window.__bestiariusz?.manager.current === 'route');
}

export const screenId = (page: Page): Promise<string | null> =>
  page.evaluate(() => window.__bestiariusz!.manager.current);

/** Plays a damage spell from the hand (select, then play) until the combat is over. */
export async function winFight(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0);
  for (let guard = 0; guard < 12; guard++) {
    if ((await screenId(page)) !== 'combat') return;
    const hand = await page.evaluate(() => [...window.__bestiariusz!.game!.session()!.state.deck.hand]);
    const slot = hand.findIndex((id) => id === 'uderzenie' || id === 'plomien');
    if (slot < 0) throw new Error(`no damage spell in the hand: ${hand.join(',')}`);
    await cards(page).nth(slot).tap();
    await cards(page).nth(slot).tap();
    await page.waitForTimeout(50);
  }
}
