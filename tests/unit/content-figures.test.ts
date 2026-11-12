import { describe, expect, it } from 'vitest';
import { brandFigures, type Figures } from '../../src/lib/content';

/** A fixed set of figures, independent of src/content/figures.json (which the owner edits). */
const figures = (): Figures => ({
  dorotea: {
    headline: {
      homes: { value: '9', publish: true },
      locations: { value: '3', publish: true },
    },
    kpis: {
      revenue: { value: '€100k', publish: false },
      growth: { value: '+10%', publish: false },
      occupancy: { value: '50%', publish: false },
    },
  },
  quattro: {
    headline: {
      network: { value: '50+', publish: true },
      managed: { value: '3', publish: true },
    },
    kpis: {
      revenue: { value: '€20k', publish: false },
      growth: { value: '+5%', publish: false },
      occupancy: { value: '60%', publish: false },
    },
  },
});

describe('brandFigures', () => {
  it('returns the published headline figures in order', () => {
    expect(brandFigures(figures(), 'dorotea').headline).toEqual([
      { id: 'homes', value: '9' },
      { id: 'locations', value: '3' },
    ]);
    expect(brandFigures(figures(), 'quattro').headline).toEqual([
      { id: 'network', value: '50+' },
      { id: 'managed', value: '3' },
    ]);
  });

  it('the KPI row is empty when no KPI is published', () => {
    expect(brandFigures(figures(), 'dorotea').kpis).toEqual([]);
    expect(brandFigures(figures(), 'quattro').kpis).toEqual([]);
  });

  it('publishing one KPI shows only that KPI', () => {
    const f = figures();
    f.dorotea.kpis.occupancy.publish = true;
    expect(brandFigures(f, 'dorotea').kpis).toEqual([{ id: 'occupancy', value: '50%' }]);
  });

  it('published KPIs keep their file order', () => {
    const f = figures();
    f.dorotea.kpis.revenue.publish = true;
    f.dorotea.kpis.growth.publish = true;
    expect(brandFigures(f, 'dorotea').kpis.map((k) => k.id)).toEqual(['revenue', 'growth']);
  });

  it('an unpublished headline figure is withheld', () => {
    const f = figures();
    f.quattro.headline.network.publish = false;
    expect(brandFigures(f, 'quattro').headline).toEqual([{ id: 'managed', value: '3' }]);
  });
});
