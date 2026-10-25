import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { bootRun, endTurnButton, screenId, winFight } from './support.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable',
);

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

const run = (page: Page) => page.evaluate(() => window.__bestiariusz!.game!.run());
const waitFor = (page: Page, id: string) =>
  page.waitForFunction((x) => window.__bestiariusz!.manager.current === x, id);

test('the expedition starts on the route with four fights and the Leszy as the boss', async ({
  page,
}) => {
  await bootRun(page, 'seed=7&enemyHp=1');
  await expect(page.locator('.route-stage')).toHaveCount(4);
  await expect(page.locator('.route-stage.route-boss')).toHaveAttribute('data-enemy', 'leszy');
  await expect(page.locator('.route-stage.route-current')).toHaveAttribute('data-enemy', 'utopiec');
  expect(await run(page)).toMatchObject({ stage: 0, status: 'active' });
});

test('a won fight offers a reward; taking it puts the card in the deck and moves on', async ({
  page,
}) => {
  await bootRun(page, 'seed=7&enemyHp=1');
  await page.getByRole('button', { name: 'Do walki' }).tap();
  await waitFor(page, 'combat');
  await winFight(page);
  await waitFor(page, 'reward');
  const offered = await page.locator('.reward-card').count();
  expect(offered).toBe(3);
  const before = (await run(page))!.deck.length;
  const id = await page.locator('.reward-card').first().getAttribute('data-card');
  await page.locator('.reward-card').first().tap();
  await waitFor(page, 'route');
  const after = (await run(page))!;
  expect(after.stage).toBe(1);
  expect(after.deck).toHaveLength(before + 1);
  expect(after.deck.at(-1)).toBe(id);
  await expect(page.locator('.route-stage.route-current')).toHaveAttribute('data-enemy', 'strzyga');
});

test('skipping the reward keeps the deck', async ({ page }) => {
  await bootRun(page, 'seed=7&enemyHp=1');
  await page.getByRole('button', { name: 'Do walki' }).tap();
  await waitFor(page, 'combat');
  await winFight(page);
  await waitFor(page, 'reward');
  const before = (await run(page))!.deck.length;
  await page.getByRole('button', { name: 'Pomiń' }).tap();
  await waitFor(page, 'route');
  expect((await run(page))!.deck).toHaveLength(before);
});

test('the Workshop makes a creature for ink and adds it to the deck', async ({ page }) => {
  await bootRun(page, 'seed=7&enemyHp=1');
  // one won fight gives the ink for the cheapest creature
  await page.getByRole('button', { name: 'Do walki' }).tap();
  await waitFor(page, 'combat');
  await winFight(page);
  await waitFor(page, 'reward');
  await page.getByRole('button', { name: 'Pomiń' }).tap();
  await waitFor(page, 'route');
  await page.getByRole('button', { name: 'Warsztat' }).tap();
  await waitFor(page, 'workshop');
  const craft = page.getByRole('button', { name: 'Stwórz' });
  await expect(craft).toBeDisabled();
  await page.locator('[data-symbol="element:woda"]').tap();
  await page.locator('[data-symbol="form:kruk"]').tap();
  await page.locator('[data-symbol="trait:smutek"]').tap();
  await expect(page.locator('.workshop-preview')).toContainText('żar');
  await expect(craft).toBeEnabled();
  const before = (await run(page))!;
  await craft.tap();
  const after = (await run(page))!;
  expect(after.ink).toBeLessThan(before.ink);
  expect(after.deck).toHaveLength(before.deck.length + 1);
  expect(after.deck.at(-1)).toBe('woda-kruk-smutek');
  await page.getByRole('button', { name: 'Wróć' }).tap();
  await waitFor(page, 'route');
  await expect(page.locator('.run-stat').nth(2)).toContainText(String(after.deck.length));
});

test('losing a fight ends the expedition; New expedition starts a fresh one', async ({ page }) => {
  await bootRun(page, 'seed=7&playerHp=1');
  await page.getByRole('button', { name: 'Do walki' }).tap();
  await waitFor(page, 'combat');
  await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0);
  await endTurnButton(page).tap();
  await waitFor(page, 'result');
  expect(await run(page)).toMatchObject({ status: 'lost' });
  await page.getByRole('button', { name: 'Nowa wyprawa' }).tap();
  await waitFor(page, 'route');
  expect(await run(page)).toMatchObject({ stage: 0, status: 'active' });
  expect(await screenId(page)).toBe('route');
});

test('the effect switches are on by default, can be turned off and are remembered', async ({
  page,
}) => {
  await bootRun(page, 'seed=7');
  const sound = page.locator('[data-setting="sound"]');
  await expect(sound).toBeChecked();
  await sound.uncheck();
  expect(await page.evaluate(() => window.localStorage.getItem('bestiariusz.juice'))).toBe(
    '{"shake":true,"flash":true,"numbers":true,"sound":false}',
  );
  await page.reload();
  await page.waitForFunction(() => window.__bestiariusz?.manager.current === 'route');
  await expect(page.locator('[data-setting="sound"]')).not.toBeChecked();
  await expect(page.locator('[data-setting="shake"]')).toBeChecked();
});
