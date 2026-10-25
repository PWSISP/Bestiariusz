// S04-06: screenshots of the combat in three sizes and of the result screen, compared with baselines.
// A difference above 1 % of the pixels fails. Baselines are Linux Chromium images produced by CI (see the
// plan, S04-06); other platforms render text differently and have their own baselines or none.
import { expect, test } from '@playwright/test';
import { boot, cards } from './support.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable; the visual tests run on Chromium only',
);

test.skip(
  process.platform !== 'linux' && !process.env['VISUAL'],
  'Baselines are Linux images; set VISUAL=1 to compare on another platform against your own baselines',
);

const SIZES = [
  { name: 'phone', width: 360, height: 800 },
  { name: 'tall-phone', width: 412, height: 915 },
  { name: 'tablet', width: 768, height: 1024 },
];

const SHOT = { maxDiffPixelRatio: 0.01, animations: 'disabled' as const };

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: true, isMobile: true });

    test(`combat at the start, ${size.width}x${size.height}`, async ({ page }) => {
      await boot(page, 'seed=7');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`combat-start-${size.name}.png`, SHOT);
    });

    test(`combat with a card selected, ${size.width}x${size.height}`, async ({ page }) => {
      await boot(page, 'seed=7');
      await cards(page).nth(2).tap();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`combat-selected-${size.name}.png`, SHOT);
    });

    test(`result screen after a win, ${size.width}x${size.height}`, async ({ page }) => {
      await boot(page, 'seed=7&enemyHp=1');
      await cards(page).nth(4).tap();
      await cards(page).nth(4).tap();
      await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result');
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`result-won-${size.name}.png`, SHOT);
    });
  });
}
