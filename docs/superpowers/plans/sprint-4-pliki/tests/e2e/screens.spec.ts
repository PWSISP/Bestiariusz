// The screen manager under the real game: combat <-> result switches must leave nothing behind.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { boot, cards, circles, endTurnButton } from './support.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable',
);

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

function stats(page: Page) {
  return page.evaluate(() => {
    const hook = window.__bestiariusz!;
    return {
      ...hook.manager.stats(),
      current: hook.manager.current,
      pixiStageChildren: hook.app.stage.children.length,
      tickerListeners: hook.app.ticker.count,
    };
  });
}

const continueButton = (page: Page) => page.getByRole('button', { name: 'Dalej' });

/** Wins at once: one hit point left on the enemy, then any damaging spell. */
async function reachResult(page: Page): Promise<void> {
  await boot(page, 'seed=7&enemyHp=1');
  await cards(page).nth(4).tap();
  await cards(page).nth(4).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
}

test('the screen manager cycles combat -> result -> combat without leaks', async ({ page }) => {
  await boot(page, 'seed=7&playerHp=1');
  const baseline = await stats(page);
  expect(baseline.current).toBe('combat');
  for (let i = 0; i < 5; i++) {
    await endTurnButton(page).tap(); // one hit point: the enemy ends the combat at once
    await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
    await continueButton(page).tap();
    await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'combat');
    await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0);
  }
  const after = await stats(page);
  for (const key of ['stageChildren', 'overlayChildren', 'busListeners', 'tickHandlers', 'pixiStageChildren', 'tickerListeners'] as const) {
    expect(after[key], key).toBe(baseline[key]);
  }
  expect(after.mountCount - after.unmountCount).toBe(1);
});

test('double tap on Continue mounts exactly one combat', async ({ page }) => {
  await reachResult(page);
  await continueButton(page).dblclick();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'combat');
  const after = await stats(page);
  expect(after.mountCount - after.unmountCount).toBe(1);
  expect(after.pixiStageChildren).toBe(1);
});

test('survives rotation and resize on the combat and on the result screen', async ({ page }) => {
  await reachResult(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(() => page.evaluate(() => [document.querySelector('canvas')!.clientWidth, document.querySelector('canvas')!.clientHeight]))
      .toEqual([size.width, size.height]);
    await expect(continueButton(page)).toBeVisible();
    const box = await continueButton(page).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
  }
  await continueButton(page).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'combat');
  await expect(endTurnButton(page)).toBeVisible();
  await expect(circles(page)).toHaveCount(3);
});
