import { expect, test, type Page } from '@playwright/test';

// URLs are relative to baseURL, which already includes the base path.
const pages = [
  { lang: 'it', url: './' },
  { lang: 'en', url: './en/' },
] as const;

const sectionIds = ['top', 'what', 'work', 'building', 'how', 'contact'];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
}

for (const { lang, url } of pages) {
  test.describe(`home (${lang})`, () => {
    test('renders every section, landmark and one h1', async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('header.site-header')).toBeVisible();
      for (const id of sectionIds) await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.locator('main#main')).toHaveCount(1);
      await expect(page.locator('[data-marquee]')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('[data-contact-form]')).toHaveCount(1);
    });

    test('shows the published figures and no KPI row', async ({ page }) => {
      await page.goto(url);
      const values = (brand: string) =>
        page.locator(`[data-brand="${brand}"] [data-figures] dd`).allTextContents();
      expect((await values('dorotea')).map((v) => v.trim())).toEqual(['9', '3']);
      expect((await values('quattro')).map((v) => v.trim())).toEqual(['50+', '3']);
      await page.locator('#work').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-brand="dorotea"] [data-figures]')).toBeVisible();
      await expect(page.locator('[data-kpis]')).toHaveCount(0);
    });

    test('renders the age and year from the content files', async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('[data-age]')).toHaveText(/^\d{2}$/);
      await expect(page.locator('[data-year]')).toHaveText(String(new Date().getFullYear()));
    });
  });
}

test('selected work: stacked below 768px, pinned horizontal track from 768px', async ({ page }) => {
  await page.goto('./');
  const width = page.viewportSize()!.width;
  const dorotea = await page.locator('[data-brand="dorotea"]').boundingBox();
  const quattro = await page.locator('[data-brand="quattro"]').boundingBox();
  const section = await page.locator('#work').boundingBox();
  const viewportHeight = page.viewportSize()!.height;
  expect(dorotea && quattro && section).toBeTruthy();
  if (width < 768) {
    expect(quattro!.y).toBeGreaterThan(dorotea!.y + dorotea!.height - 1);
    expect(Math.abs(quattro!.x - dorotea!.x)).toBeLessThan(1);
    expect(section!.height).toBeLessThan(viewportHeight * 3);
  } else {
    expect(Math.abs(quattro!.y - dorotea!.y)).toBeLessThan(1);
    expect(quattro!.x).toBeGreaterThan(dorotea!.x + dorotea!.width - 1);
    expect(section!.height).toBeCloseTo(viewportHeight * 3, 0);
  }
});

// Every page, at every project viewport.
const allPages = [...pages.map((p) => p.url), './privacy/', './en/privacy/'];

for (const url of allPages) {
  test(`${url}: no horizontal overflow`, async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    const { scrollWidth, clientWidth } = await horizontalOverflow(page);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test.describe('320px screen', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  // Viewport is fixed here, so one project is enough.
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'mobile-375', 'runs once'));

  for (const url of allPages) {
    test(`${url}: no horizontal overflow, header fits`, async ({ page }) => {
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      const { scrollWidth, clientWidth } = await horizontalOverflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      const header = await page.locator('header').first().boundingBox();
      expect(header!.x + header!.width).toBeLessThanOrEqual(320);
      const cta = page.locator('header .cta');
      if (await cta.count()) {
        const box = await cta.boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(320);
      }
    });
  }
});

for (const scheme of ['light', 'dark'] as const) {
  test(`first visit with empty storage follows prefers-color-scheme: ${scheme}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, colorScheme: scheme });
    const page = await context.newPage();
    for (const url of ['./', './en/privacy/']) {
      await page.goto(url);
      expect(await page.evaluate(() => localStorage.getItem('sg-theme'))).toBeNull();
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    }
    await context.close();
  });
}

test('theme toggle flips data-theme and persists after reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  const toggle = page.locator('[data-theme-toggle]');
  await expect(toggle).toHaveAttribute('aria-label', 'Tema scuro');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-label', 'Tema chiaro');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.locator('[data-theme-toggle]').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});
