import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable',
);

const ORIGIN = 'http://localhost:5173';

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

async function boot(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__bestiariusz?.manager.current === 'test-a');
}

const switchButton = (page: Page) => page.getByRole('button', { name: 'Przełącz ekran' });

test('boots into test-a without external requests', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await boot(page);
  await page.waitForLoadState('networkidle');
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    expect(url.startsWith(ORIGIN) || url.startsWith('data:') || url.startsWith('blob:'), url).toBe(
      true,
    );
  }
  expect((await stats(page)).current).toBe('test-a');
});

test('switch button is a 48px target with an accessible name', async ({ page }) => {
  await boot(page);
  const box = await switchButton(page).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(48);
  expect(box!.height).toBeGreaterThanOrEqual(48);
});

test('100 switches leave no objects behind', async ({ page }) => {
  await boot(page);
  const baseline = await stats(page);
  for (let i = 0; i < 100; i++) await switchButton(page).click();
  const after = await stats(page);
  expect(after.current).toBe('test-a');
  for (const key of [
    'stageChildren',
    'overlayChildren',
    'busListeners',
    'tickHandlers',
    'pixiStageChildren',
    'tickerListeners',
  ] as const) {
    expect(after[key], key).toBe(baseline[key]);
  }
  expect(after.mountCount - after.unmountCount).toBe(1);
});

test('double tap mounts exactly one screen', async ({ page }) => {
  await boot(page);
  await switchButton(page).dblclick();
  const after = await stats(page);
  expect(after.mountCount - after.unmountCount).toBe(1);
  expect(after.pixiStageChildren).toBe(1);
});

test('survives rotation and resize while a screen is mounted', async ({ page }) => {
  await boot(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const canvas = document.querySelector('canvas')!;
          return [canvas.clientWidth, canvas.clientHeight];
        }),
      )
      .toEqual([size.width, size.height]);
    const overlay = await page.locator('.ui-root').boundingBox();
    expect(Math.abs(overlay!.width - size.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(overlay!.height - size.height)).toBeLessThanOrEqual(1);
    const before = (await stats(page)).current;
    await switchButton(page).click();
    expect((await stats(page)).current).not.toBe(before);
  }
});
