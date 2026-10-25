// The tester build's telemetry (S05-05b): one record per combat, the export on the result screen, no
// network. The tester mode is switched on by `?tester=1` here; the real build switches it on with
// `VITE_TESTER=1`.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { boot, cards } from './support.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable',
);

test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

const WIN = 'seed=7&enemyHp=1&tester=1';

async function winCombat(page: Page): Promise<void> {
  await cards(page).nth(4).tap();
  await cards(page).nth(4).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
}

const log = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(window.__bestiariusz!.game!.telemetry()!.text()) as {
        logId: number;
        records: { seed: number; outcome: string; turns: number; durationMs: number }[];
      },
  );

test('a finished combat adds one record to the log', async ({ page }) => {
  await boot(page, WIN);
  await winCombat(page);
  const data = await log(page);
  expect(data.records).toHaveLength(1);
  expect(data.records[0]).toMatchObject({ seed: 7, outcome: 'won', turns: 1 });
  expect(data.records[0]?.durationMs).toBeGreaterThanOrEqual(0);
});

test('the log survives a reload and keeps growing', async ({ page }) => {
  await boot(page, WIN);
  await winCombat(page);
  const first = await log(page);
  await boot(page, WIN);
  expect((await log(page)).records).toHaveLength(1);
  await winCombat(page);
  const second = await log(page);
  expect(second.records).toHaveLength(2);
  expect(second.logId).toBe(first.logId);
});

test('the export button copies the log and saves it as a file', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await boot(page, WIN);
  await winCombat(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Zapisz dane testu' }).tap();
  expect((await download).suggestedFilename()).toMatch(/^bestiariusz-sesja-.+-\d+\.json$/);
  await expect(page.getByRole('status')).toContainText('Dane skopiowane');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const expected = await page.evaluate(() => window.__bestiariusz!.game!.telemetry()!.text());
  expect(copied).toBe(expected);
  await expect(page.getByRole('button', { name: 'Dalej' })).toBeVisible();
});

test('when copying fails the text is shown for copying by hand', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
  });
  await boot(page, WIN);
  await winCombat(page);
  await page.getByRole('button', { name: 'Zapisz dane testu' }).tap();
  const box = page.locator('textarea.result-manual');
  await expect(box).toBeVisible();
  expect(JSON.parse(await box.inputValue())).toMatchObject({ schema: 1 });
  await expect(page.getByRole('status')).toContainText('Nie udało się skopiować');
});

test('a normal build has no telemetry and no export button', async ({ page }) => {
  await boot(page, 'seed=7&enemyHp=1');
  await winCombat(page);
  expect(await page.evaluate(() => window.__bestiariusz!.game!.telemetry())).toBeNull();
  await expect(page.getByRole('button', { name: 'Zapisz dane testu' })).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('playing and exporting makes no request outside the page itself', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const outside: string[] = [];
  const origin = new URL(test.info().project.use.baseURL ?? 'http://localhost:5173').origin;
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'))
      outside.push(url);
    if (r.method() !== 'GET' && r.method() !== 'HEAD') outside.push(`${r.method()} ${url}`);
  });
  await boot(page, WIN);
  await winCombat(page);
  await page.getByRole('button', { name: 'Zapisz dane testu' }).tap();
  await expect(page.getByRole('status')).toContainText('Dane skopiowane');
  await page.getByRole('button', { name: 'Dalej' }).tap();
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'combat');
  expect(outside).toEqual([]);
});
