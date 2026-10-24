import { expect, test } from '@playwright/test';

test('PCG32 gives the same sequences in this engine as in Node', async ({ page }) => {
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const specifier = '/src/core/rng.ts';
    const { createRng } = await import(/* @vite-ignore */ specifier);
    const a = createRng(20261102);
    const b = createRng(20261102);
    return {
      u32: Array.from({ length: 4 }, () => a.next() * 4294967296),
      ints: Array.from({ length: 10 }, () => b.int(1, 6)),
      shuffled: createRng(7).shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    };
  });
  expect(result.u32).toEqual([2382011530, 2784460958, 3497812807, 405242244]);
  expect(result.ints).toEqual([4, 4, 5, 1, 3, 6, 4, 3, 3, 3]);
  expect(result.shuffled).toEqual([7, 1, 9, 8, 2, 4, 5, 0, 3, 6]);
});
