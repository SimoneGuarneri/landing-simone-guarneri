/**
 * Astro-side entry: validated content + image slots resolved to Astro image assets.
 * Importing this module validates every content file, so a bad file fails `astro build`.
 */
import type { ImageMetadata } from 'astro';
import { brandFigures, type BrandFigures } from './figures';
import { resolveImage, type Locale, type ResolvedImage } from './images';
import { loadContent } from './index';
import type { Brand, ImageSlotName } from './schemas';

export { default as Monogram } from '../../assets/images/monogram.svg';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../../assets/images/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG,WEBP,AVIF}',
  { eager: true },
);

/** Every raster image in src/assets/images/, keyed by file name. */
const imageAssets: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.slice(path.lastIndexOf('/') + 1), mod.default]),
);

export const { contacts, site, figures, images } = loadContent();

/** Image for a slot in a language; `src` is null → render the slot's placeholder. */
export function imageFor(slot: ImageSlotName, lang: Locale): ResolvedImage<ImageMetadata> {
  return resolveImage(images, slot, lang, imageAssets);
}

/** Published figures of a brand; `kpis` is empty when the KPI row must not render. */
export function figuresFor<B extends Brand>(brand: B): BrandFigures<B> {
  return brandFigures(figures, brand);
}
