import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * 404 page (src/pages/404.astro). GitHub Pages serves dist/404.html for every unknown URL,
 * so the same file shows Italian at the root and English under /en/ (chosen by the URL).
 */

const SOLVED = ['4', '0', '4', '.'];

const tiles = (page: Page) => page.locator('[data-tile]');
const order = (page: Page) =>
  tiles(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.char ?? ''));

/** Swap tiles into place with the keyboard only: Enter picks a tile, Tab moves on, Enter swaps. */
async function solveByKeyboard(page: Page) {
  for (let i = 0; i < SOLVED.length; i++) {
    const current = await order(page);
    if (current.join('') === SOLVED.join('')) return;
    if (current[i] === SOLVED[i]) continue;
    const j = current.findIndex((c, k) => k > i && c === SOLVED[i]);
    await tiles(page).nth(i).focus();
    await page.keyboard.press('Enter');
    await expect(tiles(page).nth(i)).toHaveAttribute('aria-pressed', 'true');
    for (let k = i; k < j; k++) await page.keyboard.press('Tab');
    await expect(tiles(page).nth(j)).toBeFocused();
    await page.keyboard.press('Enter');
  }
}

test.describe('404 page', () => {
  test('Italian: heading, links home, noindex', async ({ page }) => {
    await page.goto('./404.html');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    const main = page.locator('main#main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/Questa pagina non c’è/);
    await expect(main.getByRole('link', { name: /Torna alla home/ })).toHaveAttribute('href', /\/$/);
    await expect(main.getByRole('link', { name: 'Home in English' })).toHaveAttribute('href', /\/en\/$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  });

  test('English under /en/: copy, title and home link follow the URL', async ({ page }) => {
    const res = await page.goto('./en/this-page-does-not-exist/');
    expect(res?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/Page not found/);
    const main = page.locator('main#main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(/This page isn’t here/);
    await expect(main.getByRole('link', { name: /Back to the home page/ })).toHaveAttribute('href', /\/en\/$/);
    await expect(main.getByRole('link', { name: 'Home in italiano' })).toHaveAttribute('href', /\/$/);
    await expect(page.getByRole('heading', { name: 'While you’re here' })).toBeVisible();
  });

  test('easter egg: shuffled on load, solvable with the keyboard', async ({ page }) => {
    await page.goto('./404.html');
    await expect(tiles(page)).toHaveCount(4);
    await expect(tiles(page).first()).toBeEnabled();
    expect((await order(page)).join('')).not.toBe(SOLVED.join(''));

    await solveByKeyboard(page);

    expect(await order(page)).toEqual(SOLVED);
    await expect(page.locator('[data-game]')).toHaveAttribute('data-solved', 'true');
    await expect(page.locator('[data-status]')).toHaveText(/404 è a posto/);
    const again = page.getByRole('button', { name: 'Mescola di nuovo' });
    await expect(again).toBeFocused();

    // Shuffle again: playable once more, focus back on the first tile.
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-game]')).not.toHaveAttribute('data-solved', 'true');
    await expect(tiles(page).first()).toBeFocused();
    expect((await order(page)).join('')).not.toBe(SOLVED.join(''));
  });

  test('easter egg: arrow keys carry the focused tile', async ({ page }) => {
    await page.goto('./404.html');
    const before = await order(page);
    await tiles(page).first().focus();
    await page.keyboard.press('ArrowRight');
    const after = await order(page);
    expect([after[0], after[1]]).toEqual([before[1], before[0]]);
    if (after.join('') !== SOLVED.join('')) await expect(tiles(page).nth(1)).toBeFocused();
  });

  test.describe('320px screen', () => {
    test.use({ viewport: { width: 320, height: 640 } });
    test.beforeEach(({}, info) => test.skip(info.project.name !== 'mobile-375', 'runs once'));

    test('no horizontal overflow', async ({ page }) => {
      await page.goto('./404.html');
      await page.evaluate(() => document.fonts.ready);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      const last = await tiles(page).last().boundingBox();
      expect(last!.x + last!.width).toBeLessThanOrEqual(320);
    });
  });

  test.describe('axe (reduced motion)', () => {
    test.use({ reducedMotion: 'reduce' });

    for (const theme of ['light', 'dark'] as const) {
      for (const url of ['./404.html', './en/missing/']) {
        test(`${url}, ${theme} theme: no serious or critical violations`, async ({ page }) => {
          await page.addInitScript((t) => {
            try {
              localStorage.setItem('sg-theme', t);
            } catch {}
          }, theme);
          await page.goto(url);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await page.evaluate(() => document.fonts.ready);
          // Initial (shuffled) state, then again once solved (purple tiles, status text, button).
          const { violations } = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
            .analyze();
          expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual(
            [],
          );
          await solveByKeyboard(page);
          const solved = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
            .analyze();
          expect(
            solved.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
          ).toEqual([]);
        });
      }
    }
  });
});
