import { describe, expect, it } from 'vitest';
import { CITIES, season, yearly } from '../../src/lib/casadata';

describe('Casadata demo figures', () => {
  it('each city adds up to its report headline', () => {
    expect(yearly(CITIES[0])).toBe(25500);
    expect(yearly(CITIES[1])).toBe(50600);
  });

  it('each peak holds the share the report names', () => {
    const share = (c: (typeof CITIES)[number]) => c.peak.reduce((s, m) => s + c.months[m], 0) / yearly(c);
    expect(Math.round(share(CITIES[0]) * 100)).toBe(35);
    expect(Math.round(share(CITIES[1]) * 100)).toBe(31);
  });
});

describe('season', () => {
  it('stays within 0..1 and peaks in summer for Salerno', () => {
    const samples = Array.from({ length: 100 }, (_, i) => season(i / 100));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(season(6.5 / 12)).toBeGreaterThan(0.9); // mid July
    expect(season(1.5 / 12)).toBeLessThan(0.05); // mid February
  });

  it('wraps around the year', () => {
    expect(season(0)).toBeCloseTo(season(1), 6);
  });
});
