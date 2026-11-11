import { expect, test } from '@playwright/test';

// URLs are relative to baseURL, which already includes the base path.
test('Italian home loads at /', async ({ page }) => {
  const res = await page.goto('./');
  expect(res?.ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
});

test('English home loads at /en/', async ({ page }) => {
  const res = await page.goto('./en/');
  expect(res?.ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('language toggle links to the counterpart page and marks the current one', async ({ page }) => {
  await page.goto('./');
  const toggle = page.getByRole('navigation', { name: 'Lingua' });
  await expect(toggle.getByRole('link', { name: 'Italiano' })).toHaveAttribute('aria-current', 'page');
  await toggle.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const enToggle = page.getByRole('navigation', { name: 'Language' });
  await expect(enToggle.getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'page');
  await enToggle.getByRole('link', { name: 'Italiano' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
});

test('head has hreflang alternates for it, en and x-default', async ({ page }) => {
  await page.goto('./en/');
  const href = (lang: string) =>
    page.locator(`link[rel="alternate"][hreflang="${lang}"]`).getAttribute('href');
  expect(await href('it')).toMatch(/^https?:\/\/[^/]+\/(.+\/)?$/);
  expect(await href('en')).toMatch(/\/en\/$/);
  expect(await href('x-default')).toBe(await href('it'));
});
