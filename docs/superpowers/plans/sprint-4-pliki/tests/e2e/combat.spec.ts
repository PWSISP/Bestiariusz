import { expect, test } from '@playwright/test';
import { boot, cards, centerOf, circles, endTurnButton, snapshot, touchDrag } from './support.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL in headless WebKit on Linux is unreliable',
);

// A phone: touch events, 360 x 800 dp. With seed 7 the first hand is
// Mgła, Okład, Jeleń Ziemi, Wilk Ognia, Płomień and the player has 3 Ember.
test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

const ORIGIN = 'http://localhost:5173';

test('boots into the combat screen without external requests', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await boot(page);
  await page.waitForLoadState('networkidle');
  for (const url of urls) {
    expect(url.startsWith(ORIGIN) || url.startsWith('data:') || url.startsWith('blob:'), url).toBe(true);
  }
  const first = await snapshot(page);
  expect(first.turn).toBe(1);
  expect(first.hand).toHaveLength(5);
  expect(first.ember).toBe(3);
});

test('every control is a touch target of at least 48 dp with an accessible name', async ({ page }) => {
  await boot(page);
  const buttons = page.locator('.combat-hit button');
  const count = await buttons.count();
  expect(count).toBe(5 + 3 + 1);
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const box = await button.boundingBox();
    expect(box, `button ${i}`).not.toBeNull();
    expect(box!.width, `width of button ${i}`).toBeGreaterThanOrEqual(48);
    expect(box!.height, `height of button ${i}`).toBeGreaterThanOrEqual(48);
    expect(((await button.getAttribute('aria-label')) ?? (await button.textContent()) ?? '').length).toBeGreaterThan(0);
  }
  await expect(page.getByRole('button', { name: 'Jeleń Ziemi, koszt 2, atak 3, zdrowie 9' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Krąg 2: pusty' })).toBeVisible();
});

test('the controls stay in reach of the thumb: the hand and the buttons are in the lower half', async ({ page }) => {
  await boot(page);
  for (const locator of [cards(page).first(), cards(page).last(), endTurnButton(page)]) {
    const box = await locator.boundingBox();
    expect(box!.y + box!.height / 2).toBeGreaterThan(400);
  }
});

test('a tap selects a card, a tap on a Krąg plays it', async ({ page }) => {
  await boot(page);
  const before = await snapshot(page);
  await cards(page).nth(2).tap();
  await expect(cards(page).nth(2)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__bestiariusz!.game!.combat()!.selected())).toBe(2);
  await circles(page).nth(1).tap();
  await expect.poll(async () => (await snapshot(page)).circles[1]).toBe('ziemia-jelen-spryt');
  const after = await snapshot(page);
  expect(after.hand).toHaveLength(before.hand.length - 1);
  expect(after.ember).toBe(before.ember - 2);
  expect(after.hand).not.toContain('ziemia-jelen-spryt');
  await expect(circles(page).nth(1)).toHaveAccessibleName(/Jeleń Ziemi, atak 3, zdrowie 9/);
});

test('a tap on a spell selects it and a second tap casts it', async ({ page }) => {
  await boot(page);
  const before = await snapshot(page);
  await cards(page).nth(4).tap();
  expect(await page.evaluate(() => window.__bestiariusz!.game!.combat()!.hint())).toBe('Dotknij ponownie, aby zagrać');
  await cards(page).nth(4).tap();
  await expect.poll(async () => (await snapshot(page)).enemyHp).toBeLessThan(before.enemyHp);
  const after = await snapshot(page);
  expect(after.enemyHp).toBeLessThan(before.enemyHp);
  expect(after.ember).toBe(before.ember - 2);
  expect(after.hand).not.toContain('plomien');
});

test('dragging a creature card onto a Krąg plays it there', async ({ page }) => {
  await boot(page);
  const from = await centerOf(cards(page).nth(3));
  const to = await centerOf(circles(page).nth(2));
  await touchDrag(page, from, { x: to.x, y: to.y - 20 });
  await expect.poll(async () => (await snapshot(page)).circles[2]).toBe('ogien-wilk-smutek');
  expect((await snapshot(page)).ember).toBe(1);
});

test('dragging a spell above the cast line casts it', async ({ page }) => {
  await boot(page);
  const before = await snapshot(page);
  const from = await centerOf(cards(page).nth(4));
  await touchDrag(page, from, { x: 180, y: 250 });
  await expect.poll(async () => (await snapshot(page)).hand.length).toBe(before.hand.length - 1);
  expect((await snapshot(page)).enemyHp).toBeLessThan(before.enemyHp);
});

test('releasing a dragged card in an empty place cancels the play', async ({ page }) => {
  await boot(page);
  const before = await snapshot(page);
  const from = await centerOf(cards(page).nth(2));
  await touchDrag(page, from, { x: 180, y: 180 });
  await page.waitForTimeout(150);
  expect(await snapshot(page)).toEqual(before);
});

test('a card that costs too much is refused with a hint', async ({ page }) => {
  await boot(page);
  await cards(page).nth(2).tap();
  await circles(page).nth(0).tap();
  await expect.poll(async () => (await snapshot(page)).ember).toBe(1);
  await cards(page).nth(2).tap(); // Wilk Ognia is now at index 2, and costs 2 of the 1 Ember left
  await circles(page).nth(1).tap();
  expect(await page.evaluate(() => window.__bestiariusz!.game!.combat()!.hint())).toBe('Za mało Żaru');
  const after = await snapshot(page);
  expect(after.circles[1]).toBeNull();
  expect(after.ember).toBe(1);
});

test('an occupied Krąg refuses a second creature', async ({ page }) => {
  await boot(page, 'seed=7&enemyHp=380');
  await cards(page).nth(2).tap();
  await circles(page).nth(0).tap();
  await expect.poll(async () => (await snapshot(page)).circles[0]).not.toBeNull();
  const board = await snapshot(page);
  expect(board.hand).toHaveLength(4);
});

test('the keyboard can play a card: Enter on the card, Enter on a Krąg', async ({ page }) => {
  await boot(page);
  await cards(page).nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(2)).toHaveAttribute('aria-pressed', 'true');
  await circles(page).nth(0).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).circles[0]).toBe('ziemia-jelen-spryt');
});

test('End turn lets the enemy act and starts the next turn', async ({ page }) => {
  await boot(page);
  const before = await snapshot(page);
  await endTurnButton(page).tap();
  await expect.poll(async () => (await snapshot(page)).turn).toBe(2);
  const after = await snapshot(page);
  expect(after.ember).toBe(3);
  expect(after.playerHp).toBeLessThan(before.playerHp);
  expect(after.hand).toHaveLength(5);
});

test('with animations on, an action locks the controls and a tap skips it', async ({ page }) => {
  await boot(page, 'seed=7&anim=1');
  await page.waitForFunction(() => !window.__bestiariusz!.game!.combat()!.busy());
  await endTurnButton(page).tap();
  expect(await page.evaluate(() => window.__bestiariusz!.game!.combat()!.busy())).toBe(true);
  await expect(endTurnButton(page)).toBeDisabled();
  await page.touchscreen.tap(180, 120); // anywhere: skips the animation and does nothing else
  await page.waitForFunction(() => !window.__bestiariusz!.game!.combat()!.busy(), undefined, { timeout: 1000 });
  await expect(endTurnButton(page)).toBeEnabled();
  expect((await snapshot(page)).turn).toBe(2);
});

test('an animated action finishes by itself within the time budget', async ({ page }) => {
  await boot(page, 'seed=7&anim=1');
  await page.waitForFunction(() => !window.__bestiariusz!.game!.combat()!.busy());
  const started = Date.now();
  await endTurnButton(page).tap();
  await page.waitForFunction(() => !window.__bestiariusz!.game!.combat()!.busy(), undefined, { timeout: 4000 });
  expect(Date.now() - started).toBeLessThan(3500);
});

test('a whole combat can be played to the end by touch', async ({ page }) => {
  test.setTimeout(180_000);
  await boot(page, 'seed=11');
  let guard = 0;
  while (guard++ < 600) {
    if ((await page.evaluate(() => window.__bestiariusz!.manager.current)) === 'result') break;
    const move = await page.evaluate(() => {
      const session = window.__bestiariusz!.game!.session()!;
      const { state, data } = session;
      if (state.phase !== 'player') return null;
      for (let i = 0; i < state.deck.hand.length; i++) {
        const def = data.cards[state.deck.hand[i] as string]!;
        if (def.kind === 'curse' || def.cost > state.ember) continue;
        if (def.kind === 'spell') return { index: i, circle: null };
        const free = state.player.circles.findIndex((c) => c === null);
        if (free >= 0) return { index: i, circle: free };
      }
      return { index: -1, circle: null };
    });
    if (move === null) {
      await page.waitForTimeout(50);
      continue;
    }
    if (move.index < 0) {
      await endTurnButton(page).tap();
    } else if (move.circle === null) {
      await cards(page).nth(move.index).tap({ force: true });
      await cards(page).nth(move.index).tap({ force: true });
    } else {
      await cards(page).nth(move.index).tap();
      await circles(page).nth(move.circle).tap();
    }
    await page.waitForFunction(() => !window.__bestiariusz!.game!.combat()?.busy());
  }
  await page.waitForFunction(() => window.__bestiariusz!.manager.current === 'result', undefined, { timeout: 10_000 });
  const summary = await page.evaluate(() => window.__bestiariusz!.game!.lastSummary());
  expect(['won', 'lost']).toContain(summary!.outcome);
  expect(summary!.turns).toBeGreaterThan(2);
});

test('rotating the phone keeps the state of the combat', async ({ page }) => {
  await boot(page);
  await cards(page).nth(2).tap();
  await circles(page).nth(1).tap();
  await expect.poll(async () => (await snapshot(page)).circles[1]).not.toBeNull();
  const before = await snapshot(page);
  for (const size of [
    { width: 800, height: 360 },
    { width: 768, height: 1024 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(() => page.evaluate(() => [document.querySelector('canvas')!.clientWidth, document.querySelector('canvas')!.clientHeight]))
      .toEqual([size.width, size.height]);
    expect(await snapshot(page)).toEqual(before);
    await expect(endTurnButton(page)).toBeVisible();
  }
});
