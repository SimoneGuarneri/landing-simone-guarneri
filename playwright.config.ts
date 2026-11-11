import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const siteConfig = JSON.parse(
  readFileSync(new URL('./src/content/site.json', import.meta.url), 'utf8'),
) as { basePath: string };

const PORT = 4321;
const basePath = (siteConfig.basePath || '/').replace(/\/?$/, '/');
// baseURL ends with the base path; tests use relative URLs ('./', './en/').
const baseURL = `http://localhost:${PORT}${basePath}`;

const chromium = devices['Desktop Chrome'];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-375', use: { ...chromium, viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768', use: { ...chromium, viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1280', use: { ...chromium, viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
