import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// URLs are relative to baseURL, which already includes the base path.

const images = JSON.parse(
  readFileSync(new URL('../../src/content/images.json', import.meta.url), 'utf8'),
) as Record<string, { alt: { it: string; en: string } }>;

type Project = 'mobile-375' | 'tablet-768' | 'desktop-1280';
/** Tests that set their own viewport would repeat identically in every project: run them once. */
const runOnceOn = (project: Project) =>
  test.skip(test.info().project.name !== project, `viewport is fixed here; runs on ${project} only`);

/** The motion script has run and set <html data-motion>. */
const motionReady = (page: Page) =>
  expect(page.locator('html')).toHaveAttribute('data-motion', /^(full|lite|off)$/);

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
    await motionReady(page);
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    // Let a few frames of scroll-driven effects run.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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
  runOnceOn('desktop-1280');
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  // The published value is already in the HTML, so record every text each figure shows
  // on the way: it must pass through other values before settling on the published one.
  await page.evaluate(() => {
    const w = window as Window & { __counts?: string[][] };
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-brand="dorotea"] [data-count]'));
    w.__counts = els.map(() => []);
    els.forEach((el, i) =>
      new MutationObserver(() => w.__counts![i]!.push(el.textContent?.trim() ?? '')).observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      }),
    );
  });
  const values = page.locator('[data-brand="dorotea"] [data-count]');
  // Centre the figures: each counts only once 60% visible, and the card is still rising in.
  await values.first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const targets = await values.evaluateAll((list) => list.map((el) => (el as HTMLElement).dataset.count!));
  expect(targets.length).toBeGreaterThan(0);
  // Each figure must have shown an intermediate value and then settled on its published one.
  await expect
    .poll(
      async () => {
        const seen = await page.evaluate(() => (window as Window & { __counts?: string[][] }).__counts!);
        return targets.every((target, i) => seen[i]!.some((text) => text !== target) && seen[i]!.at(-1) === target);
      },
      { timeout: 5000 },
    )
    .toBe(true);
});

test('phone width: scrolling the whole page never overflows sideways', async ({ page }) => {
  runOnceOn('mobile-375');
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
  runOnceOn('desktop-1280');
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
    runOnceOn('tablet-768');
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'lite');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all content is visible and nothing overflows', async ({ page }) => {
    runOnceOn('desktop-1280');
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
  runOnceOn('desktop-1280');
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
  runOnceOn('mobile-375');
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
    // Generous budget: under parallel load frames can be slow.
    while (seen.some((t) => t === null) && performance.now() - start < 15000) {
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

for (const { name, project, mode } of [
  { name: 'desktop (full)', project: 'desktop-1280', mode: 'full' },
  { name: 'tablet (full)', project: 'tablet-768', mode: 'full' },
  { name: 'phone (lite)', project: 'mobile-375', mode: 'lite' },
] as const) {
  test(`${name}: a section's blocks appear one after another as it scrolls in`, async ({ page }) => {
    runOnceOn(project);
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-motion', mode);
    const times = await revealTimes(page, '#what');
    expect(times.length).toBeGreaterThanOrEqual(4);
    expect(times.every((t) => t !== null)).toBe(true);
    // Ordering only: each block is first seen no earlier than the one before it, and the
    // last later than the first (they do not all pop in at once).
    const t = times as number[];
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]!);
    expect(t[t.length - 1]!).toBeGreaterThan(t[0]!);
  });
}

test.describe('contact photo in dots', () => {
  test('grows its dots in when it scrolls into view', async ({ page }) => {
    runOnceOn('desktop-1280');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    const photo = page.locator('[data-dots]');
    await expect(photo).toHaveAttribute('data-dots', 'pending');
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveAttribute('data-dots', 'done');
    await expect(photo.locator('img')).toHaveAttribute('alt', images.contact!.alt.it);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('shows the finished dots at once', async ({ page }) => {
      await page.goto('./en/');
      const photo = page.locator('[data-dots]');
      await expect(photo).not.toHaveAttribute('data-dots', 'pending');
      await expect(photo.locator('img')).toHaveAttribute('alt', images.contact!.alt.en);
      await photo.scrollIntoViewIfNeeded();
      await expect(photo.locator('img')).toBeVisible();
    });
  });
});
