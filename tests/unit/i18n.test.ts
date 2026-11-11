import { describe, expect, it } from 'vitest';
import itCopy from '../../src/content/it.json';
import enCopy from '../../src/content/en.json';
import {
  alternatePath,
  assertCopyParity,
  compareKeys,
  interpolate,
  localizedPath,
  t,
} from '../../src/lib/i18n';

describe('copy parity between Italian and English', () => {
  it('it.json and en.json have exactly the same key structure', () => {
    expect(compareKeys(itCopy, enCopy)).toEqual({ missingInB: [], missingInA: [] });
  });

  it('reports a key present in one locale but missing in the other', () => {
    const a = { cta: 'x', form: { name: 'n', errors: { required: 'r' } } };
    const b = { cta: 'x', form: { name: 'n', errors: {} }, extra: 'e' };
    expect(compareKeys(a, b)).toEqual({
      missingInB: ['form.errors.required'],
      missingInA: ['extra'],
    });
  });

  it('compares array items by index and object shape', () => {
    const a = { what: [{ title: 't', body: 'b' }, { title: 't', body: 'b' }] };
    const b = { what: [{ title: 't', body: 'b' }, { title: 't' }] };
    expect(compareKeys(a, b)).toEqual({ missingInB: ['what.1.body'], missingInA: [] });
  });
});

describe('t(locale, key)', () => {
  it('returns the string for a top-level key in each locale', () => {
    expect(t('it', 'cta')).toBe('Contattami');
    expect(t('en', 'cta')).toBe('Get in touch');
  });

  it('resolves dot paths into nested objects', () => {
    expect(t('it', 'form.errors.required')).toBe('Questo campo è obbligatorio.');
    expect(t('en', 'form.status.retry')).toBe('Try again');
  });

  it('returns arrays and objects as-is', () => {
    expect(t('it', 'form.roles')).toEqual(['Proprietario', 'Partner o investitore', 'Altro']);
    expect(t('en', 'how')[0]).toEqual({
      title: 'Numbers first.',
      body: 'Every decision starts from data. Opinions come after.',
    });
  });

  it('throws on an unknown key instead of rendering nothing', () => {
    // @ts-expect-error: not a key of the copy files
    expect(() => t('it', 'nope.missing')).toThrow(/nope\.missing/);
  });
});

describe('assertCopyParity', () => {
  it('passes for the real copy files', () => {
    expect(() => assertCopyParity()).not.toThrow();
  });

  it('fails naming the file and key that are missing', () => {
    expect(() => assertCopyParity({ cta: 'a', send: 'b' }, { cta: 'a', retry: 'c' })).toThrow(
      /missing in en\.json: send[\s\S]*missing in it\.json: retry/,
    );
  });
});

describe('interpolate', () => {
  it('fills {placeholders} from the given values', () => {
    expect(interpolate('{age} anni.', { age: 24 })).toBe('24 anni.');
    expect(interpolate('{a} and {b}, {a}', { a: 'x', b: 'y' })).toBe('x and y, x');
  });

  it('works on the hero meta copy in both locales', () => {
    expect(interpolate(t('it', 'heroMeta'), { age: 25 })).toMatch(/^25 anni\. Ingegnere/);
    expect(interpolate(t('en', 'heroMeta'), { age: 25 })).toMatch(/^25\. Self-taught/);
  });

  it('throws when a placeholder has no value', () => {
    expect(() => interpolate('{age} anni.', {})).toThrow(/age/);
  });
});

describe('localizedPath', () => {
  const base = '/landing-simone-guarneri/';

  it('puts Italian at the root and English under /en/', () => {
    expect(localizedPath('it', '/', base)).toBe('/landing-simone-guarneri/');
    expect(localizedPath('en', '/', base)).toBe('/landing-simone-guarneri/en/');
  });

  it('adds a trailing slash and tolerates missing or extra slashes', () => {
    expect(localizedPath('it', 'privacy', base)).toBe('/landing-simone-guarneri/privacy/');
    expect(localizedPath('en', '/privacy/', base)).toBe('/landing-simone-guarneri/en/privacy/');
  });

  it('works with a root base path', () => {
    expect(localizedPath('it', '/privacy', '/')).toBe('/privacy/');
    expect(localizedPath('en', '/', '/')).toBe('/en/');
  });
});

describe('alternatePath', () => {
  const base = '/landing-simone-guarneri/';

  it('points to the same page in the other language', () => {
    expect(alternatePath('it', '/', base)).toBe('/landing-simone-guarneri/en/');
    expect(alternatePath('en', '/', base)).toBe('/landing-simone-guarneri/');
    expect(alternatePath('en', '/privacy/', base)).toBe('/landing-simone-guarneri/privacy/');
  });
});
