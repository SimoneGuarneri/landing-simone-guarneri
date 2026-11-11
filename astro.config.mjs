// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** @type {{ domain: string | null; basePath: string }} */
const siteConfig = JSON.parse(
  readFileSync(new URL('./src/content/site.json', import.meta.url), 'utf8'),
);

// One switch: set `domain` in src/content/site.json (e.g. "simoneguarneri.com")
// and `basePath` to "/" once DNS is live.
const site = siteConfig.domain
  ? `https://${siteConfig.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  : 'https://simoneguarneri.github.io';

const base = siteConfig.basePath || '/';

export default defineConfig({
  output: 'static',
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
