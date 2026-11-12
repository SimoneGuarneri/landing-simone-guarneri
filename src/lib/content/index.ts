import contactsJson from '../../content/contacts.json';
import figuresJson from '../../content/figures.json';
import imagesJson from '../../content/images.json';
import siteJson from '../../content/site.json';
import { parseContent } from './parse';
import {
  contactsSchema,
  figuresSchema,
  imagesSchema,
  siteSchema,
  type Contacts,
  type Figures,
  type Images,
  type SiteConfig,
} from './schemas';

export * from './schemas';
export { ContentError, parseContent } from './parse';

export interface Content {
  contacts: Contacts;
  site: SiteConfig;
  figures: Figures;
  images: Images;
}

/** Validate every editable content file. Throws ContentError (file + field path) on the first bad file. */
export function loadContent(): Content {
  return {
    contacts: parseContent('src/content/contacts.json', contactsSchema, contactsJson),
    site: parseContent('src/content/site.json', siteSchema, siteJson),
    figures: parseContent('src/content/figures.json', figuresSchema, figuresJson),
    images: parseContent('src/content/images.json', imagesSchema, imagesJson),
  };
}
export { brandFigures, type BrandFigures, type HeadlineId, type KpiId, type PublishedFigure } from './figures';
export { resolveImage, type Locale, type ResolvedImage } from './images';
