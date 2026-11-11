import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const contacts = JSON.parse(
  readFileSync(new URL('../../src/content/contacts.json', import.meta.url), 'utf8'),
) as { email: string; piva: string };

// Head tags don't depend on the viewport: run once, at 375 (also used for the overflow check).
test.skip(({ viewport }) => viewport?.width !== 375, 'SEO checks run at one viewport');

const pages = [
  { name: 'IT home', url: './', lang: 'it', ogLocale: 'it_IT', path: '' },
  { name: 'EN home', url: './en/', lang: 'en', ogLocale: 'en_US', path: 'en/' },
  { name: 'IT privacy', url: './privacy/', lang: 'it', ogLocale: 'it_IT', path: 'privacy/' },
  { name: 'EN privacy', url: './en/privacy/', lang: 'en', ogLocale: 'en_US', path: 'en/privacy/' },
] as const;

const attr = (page: Page, selector: string, name = 'content') =>
  page.locator(selector).first().getAttribute(name);

for (const p of pages) {
  test(`${p.name}: canonical, Open Graph, Twitter and hreflang`, async ({ page, request, baseURL }) => {
    const res = await page.goto(p.url);
    expect(res?.ok()).toBe(true);

    const canonical = await attr(page, 'link[rel="canonical"]', 'href');
    expect(canonical).toMatch(/^https:\/\/[^/]+\//);
    const basePath = new URL(baseURL!).pathname;
    expect(new URL(canonical!).pathname).toBe(`${basePath}${p.path}`);

    expect(await page.title()).not.toBe('');
    expect(await attr(page, 'meta[name="description"]')).toBeTruthy();
    expect(await attr(page, 'meta[property="og:type"]')).toBe('website');
    expect(await attr(page, 'meta[property="og:url"]')).toBe(canonical);
    expect(await attr(page, 'meta[property="og:title"]')).toBeTruthy();
    expect(await attr(page, 'meta[property="og:description"]')).toBeTruthy();
    expect(await attr(page, 'meta[property="og:locale"]')).toBe(p.ogLocale);
    expect(await attr(page, 'meta[property="og:locale:alternate"]')).toBe(
      p.ogLocale === 'it_IT' ? 'en_US' : 'it_IT',
    );
    expect(await attr(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(await attr(page, 'meta[property="og:image:width"]')).toBe('1200');
    expect(await attr(page, 'meta[property="og:image:height"]')).toBe('630');
    expect(await attr(page, 'meta[property="og:image:alt"]')).toBeTruthy();
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);

    // og:image is absolute and the file it names is served (fetched from the local server).
    const ogImage = await attr(page, 'meta[property="og:image"]');
    expect(ogImage).toMatch(/^https:\/\/[^/]+\/.+\.(png|jpe?g)$/);
    const img = await request.get(new URL(new URL(ogImage!).pathname, baseURL).href);
    expect(img.ok()).toBe(true);
    expect(img.headers()['content-type']).toMatch(/^image\//);

    // hreflang: it, en and x-default, pointing at this page in each language.
    const neutral = p.path.replace(/^en\//, '');
    const href = (l: string) => attr(page, `link[rel="alternate"][hreflang="${l}"]`, 'href');
    expect(new URL((await href('it'))!).pathname).toBe(`${basePath}${neutral}`);
    expect(new URL((await href('en'))!).pathname).toBe(`${basePath}en/${neutral}`);
    expect(await href('x-default')).toBe(await href('it'));
  });
}

for (const p of pages.slice(0, 2)) {
  test(`${p.name}: JSON-LD Person`, async ({ page }) => {
    await page.goto(p.url);
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(raw!);
    expect(data['@type']).toBe('Person');
    expect(data.name).toBe('Simone Guarneri');
    expect(data.email).toBe(contacts.email);
    expect(data.worksFor).toMatchObject({ '@type': 'Organization', name: 'Dorotea Housing' });
    expect(data.knowsLanguage).toEqual(['it', 'en']);
    expect(data.url).toMatch(/^https:\/\//);
    expect(data.jobTitle).toBeTruthy();
  });
}

test('privacy pages carry no JSON-LD', async ({ page }) => {
  await page.goto('./privacy/');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});

test('robots.txt allows all and points to an absolute sitemap that is served', async ({ request, baseURL }) => {
  const robots = await request.get('robots.txt');
  expect(robots.ok()).toBe(true);
  const body = await robots.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Allow: /');
  const sitemapUrl = body.match(/^Sitemap: (\S+)$/m)?.[1];
  expect(sitemapUrl).toMatch(/^https:\/\/.+\/sitemap-index\.xml$/);

  const index = await request.get(new URL(new URL(sitemapUrl!).pathname, baseURL).href);
  expect(index.ok()).toBe(true);
  const chunk = (await index.text()).match(/<loc>([^<]+)<\/loc>/)?.[1];
  expect(chunk).toBeTruthy();

  const sitemap = await (await request.get(new URL(new URL(chunk!).pathname, baseURL).href)).text();
  const basePath = new URL(baseURL!).pathname;
  for (const path of ['', 'en/', 'privacy/', 'en/privacy/']) {
    expect(sitemap).toContain(`${basePath}${path}</loc>`);
  }
  expect(sitemap).toMatch(/hreflang="en-US" href="[^"]+\/en\/privacy\/"/);
  expect(sitemap).toMatch(/hreflang="it-IT" href="[^"]+\/privacy\/"/);
});

for (const p of pages.slice(2)) {
  test(`${p.name}: renders controller details from contacts.json, fits 375px`, async ({ page }) => {
    await page.goto(p.url);
    await expect(page.locator('html')).toHaveAttribute('lang', p.lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    const main = page.locator('main#main');
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(main).toContainText(contacts.piva);
    await expect(main.getByRole('link', { name: contacts.email }).first()).toHaveAttribute(
      'href',
      `mailto:${contacts.email}`,
    );
    await expect(page.locator('footer')).toContainText(contacts.piva);
    await expect(page.locator('footer')).toContainText('©');
    await expect(main).toContainText('Garante per la protezione dei dati personali');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
