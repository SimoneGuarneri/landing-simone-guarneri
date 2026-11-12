import { ContentError } from './parse';
import type { Locale } from '../i18n';
import type { ImageSlotName, Images } from './schemas';

export type { Locale };

export interface ResolvedImage<Asset> {
  /** The image asset, or null → render the slot's placeholder. */
  src: Asset | null;
  alt: string;
}

/**
 * Resolve an image slot to its asset (looked up by file name in `assets`) and localized alt text.
 * Throws a ContentError when images.json names a file that is not in src/assets/images/.
 */
export function resolveImage<Asset>(
  images: Images,
  slot: ImageSlotName,
  lang: Locale,
  assets: Readonly<Record<string, Asset>>,
): ResolvedImage<Asset> {
  const { file, alt } = images[slot];
  if (file === null) return { src: null, alt: alt[lang] };
  const asset = assets[file];
  if (asset === undefined) {
    throw new ContentError('src/content/images.json', [
      {
        path: `${slot}.file`,
        message: `"${file}" was not found in src/assets/images/ (available: ${Object.keys(assets).join(', ') || 'none'})`,
      },
    ]);
  }
  return { src: asset, alt: alt[lang] };
}
