// Warms the Vite dev server before the first test (S05-06): the first request to a cold server compiles
// every module and made the first `page.goto` of a run time out (retro S04). Opens the game once in
// Chromium and waits for the canvas; a failure here is not fatal, the tests then run as before.
import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:5173';
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${baseURL}/?seed=1&anim=0`, { timeout: 90_000 });
    await page.waitForSelector('canvas', { timeout: 90_000 });
  } catch (error) {
    console.warn(`Warm-up of the dev server failed (${String(error)}); continuing.`);
  } finally {
    await browser.close();
  }
}
