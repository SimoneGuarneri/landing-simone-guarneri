import type { Brand, Figure, Figures } from './schemas';

export type HeadlineId<B extends Brand> = keyof Figures[B]['headline'] & string;
export type KpiId = keyof Figures[Brand]['kpis'] & string;

export interface PublishedFigure<Id extends string = string> {
  /** Stable id (e.g. "homes", "revenue"); the page maps it to a localized label. */
  id: Id;
  /** Display value, e.g. "9", "50+", "€410k". */
  value: string;
}

export interface BrandFigures<B extends Brand> {
  headline: PublishedFigure<HeadlineId<B>>[];
  /** Empty when no KPI is published: the page then renders neither the row nor its caption. */
  kpis: PublishedFigure<KpiId>[];
}

function published<Id extends string>(group: Record<Id, Figure>): PublishedFigure<Id>[] {
  return (Object.entries(group) as [Id, Figure][])
    .filter(([, f]) => f.publish)
    .map(([id, f]) => ({ id, value: f.value }));
}

/** The figures of one brand that may appear on the page, in file order. Withheld figures are dropped. */
export function brandFigures<B extends Brand>(figures: Figures, brand: B): BrandFigures<B> {
  const { headline, kpis } = figures[brand];
  return {
    headline: published(headline as Record<HeadlineId<B>, Figure>),
    kpis: published(kpis as Record<KpiId, Figure>),
  };
}
