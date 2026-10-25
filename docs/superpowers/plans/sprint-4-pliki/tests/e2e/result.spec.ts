import { expect, test } from '@playwright/test';
import { boot, cards, endTurnButton } from './support.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable',
);

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

const summary = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__bestiariusz!.game!.lastSummary());

test('winning the combat shows the result screen with a victory summary', async ({ page }) => {
  await boot(page, 'seed=7&enemyHp=1');
  await cards(page).nth(4).tap();
  await cards(page).nth(4).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
  const s = await summary(page);
  expect(s).toMatchObject({ outcome: 'won', enemyId: 'leszy', turns: 1 });
  await expect(page.getByRole('button', { name: 'Dalej' })).toBeVisible();
});

test('losing the combat shows the result screen with a defeat summary', async ({ page }) => {
  await boot(page, 'seed=7&playerHp=1');
  await endTurnButton(page).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
  const s = await summary(page);
  expect(s).toMatchObject({ outcome: 'lost', hpLeft: 0, hpMax: 1 });
});

test('Continue starts a fresh combat with a new seed', async ({ page }) => {
  await boot(page, 'seed=7&enemyHp=1');
  await cards(page).nth(4).tap();
  await cards(page).nth(4).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
  const hand = await page.evaluate(() => [...window.__bestiariusz!.game!.session()!.state.deck.hand]);
  await page.getByRole('button', { name: 'Dalej' }).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'combat');
  const next = await page.evaluate(() => ({
    runs: window.__bestiariusz!.game!.runs(),
    turn: window.__bestiariusz!.game!.session()!.state.turn,
    hand: [...window.__bestiariusz!.game!.session()!.state.deck.hand],
  }));
  expect(next.runs).toBe(2);
  expect(next.turn).toBe(1);
  expect(next.hand).toHaveLength(5);
  expect(next.hand).not.toEqual(hand);
});

test('the result screen without animation appears at once, with animation after a short hold', async ({ page }) => {
  await boot(page, 'seed=7&enemyHp=1&anim=1');
  await page.waitForFunction(() => !window.__bestiariusz!.game!.combat()!.busy());
  await cards(page).nth(4).tap();
  await cards(page).nth(4).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result', undefined, { timeout: 5000 });
});
