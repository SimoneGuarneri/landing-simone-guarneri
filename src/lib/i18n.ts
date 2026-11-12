import itCopy from '../content/it.json';
import enCopy from '../content/en.json';
import { withBase } from './base-url';

export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

/** Shape of the copy files. Italian is canonical; English must match it. */
export type Messages = typeof itCopy;

// Compile-time parity: each file must be assignable to the other's type, so a key
// added to or removed from only one file fails `astro check`. Array lengths are
// not visible to the type system; the runtime check below covers those.
const it: Messages = itCopy;
const en: Messages = enCopy;
const _itMatchesEn: typeof enCopy = itCopy;
void _itMatchesEn;

const messages: Record<Locale, Messages> = { it, en };

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Dot paths into nested objects (arrays are returned whole, not indexed). */
export type MessageKey<T = Messages> = {
  [K in keyof T & string]: T[K] extends readonly unknown[]
    ? K
    : T[K] extends object
      ? K | `${K}.${MessageKey<T[K]>}`
      : K;
}[keyof T & string];

/** Type of the value found at a dot path. */
export type MessageValue<P extends string, T = Messages> = P extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? MessageValue<R, T[H]>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/** Every path in a copy tree, leaves and branches, as dot paths (`form.errors.required`, `what.0.title`). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [];
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, Json>);
  return entries.flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return [path, ...keyPaths(v, path)];
  });
}

/** Deep key comparison of two copy trees: which paths each side lacks. */
export function compareKeys(a: unknown, b: unknown): { missingInB: string[]; missingInA: string[] } {
  const pa = new Set(keyPaths(a));
  const pb = new Set(keyPaths(b));
  // Report only the topmost missing path, not every descendant of it.
  const topmost = (paths: string[]) =>
    paths.filter((p) => !paths.some((q) => q !== p && p.startsWith(`${q}.`)));
  return {
    missingInB: topmost([...pa].filter((p) => !pb.has(p))),
    missingInA: topmost([...pb].filter((p) => !pa.has(p))),
  };
}

/** Throws with a readable message when the two copy files differ in structure. */
export function assertCopyParity(itTree: unknown = it, enTree: unknown = en): void {
  const { missingInB, missingInA } = compareKeys(itTree, enTree);
  if (missingInB.length === 0 && missingInA.length === 0) return;
  const lines = [
    ...missingInB.map((k) => `  missing in en.json: ${k}`),
    ...missingInA.map((k) => `  missing in it.json: ${k}`),
  ];
  throw new Error(`Copy files are out of sync (src/content/it.json vs en.json):\n${lines.join('\n')}`);
}

// Runtime parity: any page importing this module fails the build on a mismatch.
assertCopyParity();

/** Look up copy by dot path. Throws on an unknown key so a typo never ships as blank text. */
export function t<K extends MessageKey>(locale: Locale, key: K): MessageValue<K> {
  let node: unknown = messages[locale];
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) {
      throw new Error(`Unknown copy key "${key}" for locale "${locale}"`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node as MessageValue<K>;
}

/** Fill `{name}` placeholders. Throws when a placeholder has no value. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in values)) throw new Error(`No value for placeholder {${name}} in "${template}"`);
    return String(values[name]);
  });
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'it' ? 'en' : 'it';
}

/**
 * Base-prefixed URL of a page in a locale, always with a trailing slash.
 * `path` is locale-neutral: `/` or `/privacy/`. Italian lives at the root, English under `/en/`.
 */
export function localizedPath(
  locale: Locale,
  path = '/',
  base: string = import.meta.env.BASE_URL,
): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const prefix = locale === defaultLocale ? '' : `${locale}/`;
  const rel = `${prefix}${clean}`;
  return withBase(base, rel === '' || rel.endsWith('/') ? rel : `${rel}/`);
}
