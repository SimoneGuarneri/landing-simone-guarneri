// @ts-check
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** @type {{ domain: string | null; basePath: string }} */
const siteConfig = JSON.parse(
  readFileSync(new URL('./src/content/site.json', import.meta.url), 'utf8'),
);

// One switch: set `domain` in src/content/site.json (e.g. "simoneguarneri.com")
// and `basePath` to "/" once DNS is live.
const domain = siteConfig.domain
  ? siteConfig.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  : null;
const site = domain ? `https://${domain}` : 'https://simoneguarneri.github.io';

const base = siteConfig.basePath || '/';

/**
 * GitHub Pages custom domain: write `CNAME` into the build output only when a
 * domain is set and the site is served from the root. Otherwise no CNAME, so the
 * github.io project URL keeps working.
 * @returns {import('astro').AstroIntegration}
 */
function cname() {
  return {
    name: 'sg-cname',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        if (!domain || base !== '/') return;
        writeFileSync(fileURLToPath(new URL('CNAME', dir)), `${domain}\n`);
        logger.info(`CNAME written for ${domain}`);
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // Italian at the root, English under /en/ (ADR-0002): emits xhtml:link hreflang alternates.
      i18n: { defaultLocale: 'it', locales: { it: 'it-IT', en: 'en-US' } },
      filter: (page) => !page.endsWith('/robots.txt') && !page.endsWith('/robots.txt/'),
    }),
    cname(),
  ],
});
