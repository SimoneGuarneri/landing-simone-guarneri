import type { APIRoute } from 'astro';
import { withBase } from '../lib/base-url';

/** robots.txt: allow everything and point to the sitemap (absolute, base-aware). */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(withBase(import.meta.env.BASE_URL, 'sitemap-index.xml'), site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
