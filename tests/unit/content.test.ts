import { describe, expect, it } from 'vitest';
import figuresJson from '../../src/content/figures.json';
import {
  ContentError,
  contactsSchema,
  figuresSchema,
  loadContent,
  parseContent,
  siteSchema,
} from '../../src/lib/content';

describe('content files', () => {
  it('the committed content files parse into typed content', () => {
    const content = loadContent();
    expect(content.contacts.email).toBe('simoneguarneri@proton.me');
    expect(content.contacts.quattroUrl).toBe('https://www.quattro.house');
    expect(content.contacts.birthDate).toBe('2002-01-21');
    expect(content.site.domain).toBe('simoneguarneri.com');
    expect(content.site.basePath).toBe('/');
    expect(content.figures.dorotea.headline.homes).toEqual({ value: '9', publish: true });
    expect(content.images.og.file).toBe('og.png');
  });
});

describe('content validation errors', () => {
  const validContacts = {
    email: 'simoneguarneri@proton.me',
    whatsapp: '+39 000 000 0000',
    piva: '00000000000',
    doroteaUrl: 'https://doroteahousing.com',
    quattroUrl: null,
    birthDate: '2002-01-21',
  };

  it('a bad email fails with the file name and the field in the message', () => {
    expect(() =>
      parseContent('src/content/contacts.json', contactsSchema, { ...validContacts, email: 'not-an-email' }),
    ).toThrow(/src\/content\/contacts\.json[\s\S]*email:/);
  });

  it('a bad nested figure names the full field path', () => {
    const figures = structuredClone(figuresJson) as any;
    figures.quattro.kpis.growth.publish = 'yes';
    let error: unknown;
    try {
      parseContent('src/content/figures.json', figuresSchema, figures);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).file).toBe('src/content/figures.json');
    expect((error as ContentError).issues.map((i) => i.path)).toEqual(['quattro.kpis.growth.publish']);
    expect((error as Error).message).toContain('quattro.kpis.growth.publish');
  });

  it('a misspelled key is rejected instead of silently ignored', () => {
    expect(() =>
      parseContent('src/content/contacts.json', contactsSchema, { ...validContacts, emial: 'x' }),
    ).toThrow(/contacts\.json/);
  });

  it('an invalid basePath in site.json fails', () => {
    expect(() =>
      parseContent('src/content/site.json', siteSchema, {
        domain: null,
        basePath: 'landing',
        web3formsKey: null,
        goatcounterCode: null,
      }),
    ).toThrow(/site\.json[\s\S]*basePath/);
  });
});
