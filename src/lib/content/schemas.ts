import { z } from 'zod';

/** A figure value as shown on the page: `9`, `50+`, `€410k`, `+38%`. Numbers are accepted and stringified. */
const figureValue = z
  .union([z.string().trim().min(1), z.number()])
  .transform((v) => String(v));

const figureSchema = z.strictObject({
  value: figureValue,
  publish: z.boolean(),
});

const kpisSchema = z.strictObject({
  revenue: figureSchema,
  growth: figureSchema,
  occupancy: figureSchema,
});

export const figuresSchema = z.strictObject({
  dorotea: z.strictObject({
    headline: z.strictObject({ homes: figureSchema, locations: figureSchema }),
    kpis: kpisSchema,
  }),
  quattro: z.strictObject({
    headline: z.strictObject({ network: figureSchema, managed: figureSchema }),
    kpis: kpisSchema,
  }),
});

const httpUrl = z.url({ protocol: /^https?$/ });

export const contactsSchema = z.strictObject({
  email: z.email(),
  /** Human-readable number, e.g. "+39 333 123 4567". */
  whatsapp: z.string().regex(/^\+?[\d\s().-]{6,}$/, 'Expected a phone number like "+39 333 123 4567"'),
  /** Italian VAT number: 11 digits. */
  piva: z.string().regex(/^\d{11}$/, 'Expected 11 digits'),
  doroteaUrl: httpUrl,
  /** Optional: the Quattro "Visit" button renders only when set. */
  quattroUrl: httpUrl.nullable(),
  birthDate: z.iso.date(),
});

export const siteSchema = z.strictObject({
  /** Bare domain, e.g. "simoneguarneri.com"; null → github.io. */
  domain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Expected a bare domain like "simoneguarneri.com"')
    .nullable(),
  basePath: z.string().regex(/^\/([^/\s]+\/)*$/, 'Expected a path starting and ending with "/", e.g. "/" or "/landing-simone-guarneri/"'),
  web3formsKey: z.string().trim().min(1).nullable(),
  goatcounterCode: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Expected the GoatCounter code only, e.g. "simoneguarneri"')
    .nullable(),
});

const imageSlotSchema = z.strictObject({
  /** File name inside src/assets/images/, or null for the placeholder. */
  file: z
    .string()
    .regex(/^[^/\\]+\.(png|jpe?g|webp|avif)$/i, 'Expected a file name like "portrait.jpg" (png, jpg, webp, avif)')
    .nullable(),
  alt: z.strictObject({ it: z.string().trim().min(1), en: z.string().trim().min(1) }),
});

export const imagesSchema = z.strictObject({
  portrait: imageSlotSchema,
  dorotea: imageSlotSchema,
  quattro: imageSlotSchema,
  /** Photo at the end of the page, under the Contact buttons, shown through a screen of dots. */
  contact: imageSlotSchema,
  og: imageSlotSchema,
});

export type Figure = z.output<typeof figureSchema>;
export type Figures = z.output<typeof figuresSchema>;
export type Contacts = z.output<typeof contactsSchema>;
export type SiteConfig = z.output<typeof siteSchema>;
export type Images = z.output<typeof imagesSchema>;
export type ImageSlotName = keyof Images;
export type Brand = keyof Figures;
