import { describe, expect, it } from 'vitest';
import { loadContent, resolveImage, type Images } from '../../src/lib/content';

const images = (): Images => structuredClone(loadContent().images);
const assets = { 'og.png': 'ASSET:og', 'portrait.jpg': 'ASSET:portrait' };

describe('resolveImage', () => {
  it('a slot with file null resolves to the placeholder (src null) with the localized alt', () => {
    expect(resolveImage(images(), 'portrait', 'it', assets)).toEqual({
      src: null,
      alt: 'Ritratto di Simone Guarneri',
    });
    expect(resolveImage(images(), 'portrait', 'en', assets).alt).toBe('Portrait of Simone Guarneri');
  });

  it('a slot with a file resolves to that asset', () => {
    const imgs = images();
    imgs.portrait.file = 'portrait.jpg';
    expect(resolveImage(imgs, 'portrait', 'en', assets).src).toBe('ASSET:portrait');
    expect(resolveImage(images(), 'og', 'it', assets).src).toBe('ASSET:og');
  });

  it('a file that is not in src/assets/images fails with a clear message', () => {
    const imgs = images();
    imgs.dorotea.file = 'missing.jpg';
    expect(() => resolveImage(imgs, 'dorotea', 'it', assets)).toThrow(
      /images\.json[\s\S]*dorotea\.file[\s\S]*missing\.jpg[\s\S]*src\/assets\/images/,
    );
  });
});
