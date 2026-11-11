/**
 * Join the configured Astro base path with a site-relative path.
 * `withBase('/landing/', 'en/')` → `/landing/en/`.
 */
export function withBase(base: string, path = ''): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = path.replace(/^\/+/, '');
  return `${b}${p}`;
}
