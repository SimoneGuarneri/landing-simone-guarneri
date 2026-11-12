import { expect, test, type Page } from '@playwright/test';

// URLs are relative to baseURL, which already includes the base path.

/**
 * Scrolls the whole page in 0.6-viewport steps inside the page (one round trip, robust
 * under parallel load) and returns how many steps it took.
 */
const scrollThrough = (page: Page) =>
  page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const step = Math.round(window.innerHeight * 0.6);
    let steps = 0;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await frame();
      steps++;
    }
    return steps;
  });

test('no console errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  for (const url of ['./', './en/']) {
    await page.goto(url);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(200);
  }
  expect(errors).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows every block and the final figures, with nothing moved', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await scrollThrough(page);
    const opacities = await page
      .locator('[data-reveal], [data-hl]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(5);
    expect(opacities.every((o) => o === '1')).toBe(true);
    const counts = await page
      .locator('[data-count]')
      .evaluateAll((els) => els.map((el) => [el.textContent?.trim(), (el as HTMLElement).dataset.count]));
    for (const [text, value] of counts) expect(text).toBe(value);
    const transforms = await page
      .locator('[data-letter], [data-marquee], [data-parallax]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    expect(transforms.every((t) => t === 'none')).toBe(true);
  });
});

test('figures count up to the published value', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  const values = page.locator('[data-brand="quattro"] [data-count]');
  await page.evaluate(() => window.scrollTo(0, document.querySelector<HTMLElement>('#work')!.offsetTop));
  for (const el of await values.all()) {
    await expect(el).toHaveText((await el.getAttribute('data-count'))!, { timeout: 3000 });
  }
});

test('phone width: scrolling the whole page never overflows sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  expect(await scrollThrough(page)).toBeGreaterThan(5);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('resizing across 768px switches between full and lite motion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
});

test.describe('touch tablet (coarse pointer)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });

  test('runs lite motion', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all content is visible and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.*/);
    const opacities = await page
      .locator('[data-reveal]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.every((o) => o === '1')).toBe(true);
    const quattro = await page.locator('[data-brand="quattro"]').boundingBox();
    expect(quattro!.x + quattro!.width).toBeLessThanOrEqual(1280);
  });
});

test('desktop, fine pointer: a dot replaces the cursor, black on the hero, yellow below', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await expect(page.locator('html')).toHaveClass(/has-dot-cursor/);
  const dot = page.locator('[data-cursor]');
  await page.mouse.move(640, 500);
  await expect(dot).toHaveAttribute('data-zone', 'hero');
  await expect(dot).toHaveAttribute('data-visible', 'true');
  await page.evaluate(() => window.scrollTo(0, document.querySelector<HTMLElement>('#what')!.offsetTop));
  await page.mouse.move(640, 520);
  await expect(dot).toHaveAttribute('data-zone', 'page');
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).cursor)).toBe('none');
});

test('phone width: no dot cursor', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  await expect(page.locator('[data-cursor]')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/has-dot-cursor/);
});

/**
 * Scrolls `selector` into view and records, frame by frame, when each of its reveal items
 * first passes half opacity. Returns those times (ms from the scroll) in DOM order.
 */
const revealTimes = (page: Page, selector: string) =>
  page.evaluate(async (sel) => {
    const section = document.querySelector<HTMLElement>(sel)!;
    const items = Array.from(section.querySelectorAll<HTMLElement>('[data-reveal]'));
    const seen: (number | null)[] = items.map(() => null);
    // Scroll the way a reader would: a quarter screen every 150ms, from just above the section.
    const top = section.getBoundingClientRect().top + window.scrollY;
    const end = top + section.offsetHeight;
    let y = top - window.innerHeight * 0.6;
    let lastStep = -Infinity;
    const start = performance.now();
    while (seen.some((t) => t === null) && performance.now() - start < 6000) {
      if (performance.now() - lastStep > 150 && y < end) {
        y += window.innerHeight / 4;
        window.scrollTo(0, y);
        lastStep = performance.now();
      }
      await new Promise((r) => requestAnimationFrame(r));
      items.forEach((el, i) => {
        if (seen[i] === null && Number(getComputedStyle(el).opacity) > 0.5) seen[i] = performance.now() - start;
      });
    }
    return seen;
  }, selector);

for (const { name, size } of [
  { name: 'desktop (full)', size: { width: 1280, height: 800 } },
  { name: 'tablet (full)', size: { width: 768, height: 1024 } },
  { name: 'phone (lite)', size: { width: 375, height: 812 } },
]) {
  test(`${name}: a section's blocks appear one after another as it scrolls in`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await page.waitForTimeout(300);
    const times = await revealTimes(page, '#what');
    expect(times.length).toBeGreaterThanOrEqual(4);
    expect(times.every((t) => t !== null)).toBe(true);
    const t = times as number[];
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
    expect(t[t.length - 1] - t[0]).toBeGreaterThanOrEqual(100);
  });
}
