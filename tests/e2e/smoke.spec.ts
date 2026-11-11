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
