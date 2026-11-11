import { expect, test, type Page } from '@playwright/test';

// URLs are relative to baseURL, which already includes the base path.

const trackTransform = (page: Page) =>
  page.locator('[data-track]').evaluate((el) => getComputedStyle(el).transform);

const trackX = (page: Page) =>
  page.locator('[data-track]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);

/**
 * Scrolls the whole page in 0.6-viewport steps inside the page (one round trip, robust
 * under parallel load) and returns the track's computed transform after every step.
 */
const scrollThrough = (page: Page) =>
  page.evaluate(async () => {
    const track = document.querySelector('[data-track]')!;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const transforms: string[] = [];
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await frame();
      transforms.push(getComputedStyle(track).transform);
    }
    return transforms;
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
      .locator('[data-letter], [data-marquee], [data-parallax], [data-track]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    expect(transforms.every((t) => t === 'none')).toBe(true);
  });
});

test('desktop, fine pointer: scrolling into Selected work moves the track', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  const top = await page.locator('#work').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo(0, y + window.innerHeight), top);
  await expect.poll(() => trackX(page)).toBeLessThan(-10);
});

test('figures count up to the published value', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  const values = page.locator('[data-brand="quattro"] [data-count]');
  await page.evaluate(() => window.scrollTo(0, document.querySelector<HTMLElement>('#work')!.offsetTop + innerHeight * 1.9));
  for (const el of await values.all()) {
    await expect(el).toHaveText((await el.getAttribute('data-count'))!, { timeout: 3000 });
  }
});

test('phone width: the track never translates and nothing overflows sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  const transforms = await scrollThrough(page);
  expect(transforms.length).toBeGreaterThan(5);
  expect(transforms.every((t) => t === 'none')).toBe(true);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('resizing across 768px switches between pinned and stacked work', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  expect(await trackTransform(page)).toBe('none');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
});

test.describe('touch tablet (coarse pointer)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });

  test('runs lite motion and stacks Selected work without a pin', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
    const section = await page.locator('#work').boundingBox();
    expect(section!.height).toBeLessThan(768 * 3);
    const dorotea = await page.locator('[data-brand="dorotea"]').boundingBox();
    const quattro = await page.locator('[data-brand="quattro"]').boundingBox();
    expect(quattro!.y).toBeGreaterThan(dorotea!.y + dorotea!.height - 1);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all content is visible and Selected work is stacked', async ({ page }) => {
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
