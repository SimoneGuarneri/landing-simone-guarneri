import { describe, expect, it } from 'vitest';
import { brandFigures, loadContent, type Figures } from '../../src/lib/content';

const figures = (): Figures => structuredClone(loadContent().figures);

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
    expect(brandFigures(f, 'dorotea').kpis).toEqual([{ id: 'occupancy', value: '81%' }]);
  });

  it('an unpublished headline figure is withheld', () => {
    const f = figures();
    f.quattro.headline.network.publish = false;
    expect(brandFigures(f, 'quattro').headline).toEqual([{ id: 'managed', value: '3' }]);
  });
});
