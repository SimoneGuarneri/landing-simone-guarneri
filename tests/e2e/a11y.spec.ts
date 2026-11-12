import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Accessibility gate: axe-core on every page, at every project viewport, in both
 * themes. Zero serious/critical violations allowed.
 *
 * The main pass runs with reduced motion so the page is in its final, settled state
 * (every [data-reveal] visible, no transforms) — deterministic for contrast checks.
 * One extra pass at 1280 runs with full motion after scrolling through the page so
 * the intro and reveals have played.
 */

const pages = [
  { name: 'IT home', url: './' },
  { name: 'EN home', url: './en/' },
  { name: 'IT privacy', url: './privacy/' },
  { name: 'EN privacy', url: './en/privacy/' },
] as const;

const themes = ['light', 'dark'] as const;

async function setTheme(page: Page, theme: (typeof themes)[number]) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('sg-theme', t);
    } catch {}
  }, theme);
}

async function seriousViolations(page: Page, { midScroll = false } = {}) {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
  /*
   * "How I work" items fade by distance from the viewport centre (design: opacity floor .18);
   * each one reaches opacity 1 when scrolled to the centre. That dimming depends only on the
   * scroll position, so mid-scroll it is excluded from the contrast rule; the reduced-motion
   * pass checks the same items at their final, full-opacity colours.
   */
  if (midScroll) builder = builder.exclude('[data-hl]');
  const { violations } = await builder.analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')} — ${n.failureSummary ?? ''}`),
    }));
}

/** Scroll top to bottom in viewport steps so in-view effects play, then back to the top. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await frame();
    }
  });
}

test.describe('axe (reduced motion)', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const theme of themes) {
    for (const p of pages) {
      test(`${p.name}, ${theme} theme: no serious or critical violations`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(p.url);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await page.evaluate(() => document.fonts.ready);
        expect(await seriousViolations(page)).toEqual([]);
      });
    }
  }
});

test.describe('axe (full motion, after the intro settles)', () => {
  test.skip(({ viewport }) => viewport?.width !== 1280, 'full-motion pass runs at 1280 only');

  for (const theme of themes) {
    for (const p of pages) {
      test(`${p.name}, ${theme} theme: no serious or critical violations`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(p.url);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await page.evaluate(() => document.fonts.ready);
        await scrollThrough(page);
        // Every reveal has played and handed back to the stylesheet (inline styles cleared).
        await expect
          .poll(
            () =>
              page
                .locator('[data-reveal]')
                .evaluateAll((els) =>
                  els.every((el) => (el as HTMLElement).style.opacity === '' && getComputedStyle(el).opacity === '1'),
                ),
            { timeout: 10_000 },
          )
          .toBe(true);
        expect(await seriousViolations(page, { midScroll: true })).toEqual([]);
      });
    }
  }
});
