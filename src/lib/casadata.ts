/**
 * Figures from Casadata's two public demo reports (14 Nov 2026), casadata-two.vercel.app:
 * revenue at the median per month, in euros, for a 2-bedroom flat. Each city's months add
 * up to its yearly figure. Read by the report fragment (both cities) and the hero's dot field
 * (Salerno's season).
 * shortcut: a static snapshot; refresh if the demo reports change.
 */
export interface City {
  id: 'salerno' | 'milano';
  /** Demo report path on casadata-two.vercel.app. */
  path: string;
  months: readonly number[];
  /** Month indexes (0 = January) of the three-month stretch the report's finding names. */
  peak: readonly number[];
}

export const CITIES: readonly City[] = [
  {
    id: 'salerno',
    path: '/demo/salerno',
    months: [1200, 1100, 1500, 2100, 2600, 3000, 3000, 2900, 2900, 2500, 1400, 1300],
    peak: [5, 6, 7],
  },
  {
    id: 'milano',
    path: '/demo',
    months: [3000, 3000, 3900, 5800, 5200, 4800, 4000, 3400, 4700, 5500, 3600, 3700],
    peak: [3, 4, 5],
  },
];

export const yearly = (c: City) => c.months.reduce((a, b) => a + b, 0);

/** Salerno's season as 0..1 at any point of the year (k: 0 = 1 January, 1 = 31 December), smoothed. */
export function season(k: number, months: readonly number[] = CITIES[0].months): number {
  const min = Math.min(...months);
  const span = Math.max(...months) - min;
  const t = (((k % 1) + 1) % 1) * 12 - 0.5;
  const i = Math.floor(t);
  const a = months[(i + 12) % 12];
  const b = months[(i + 13) % 12];
  const f = (1 - Math.cos(Math.PI * (t - i))) / 2;
  return (a + (b - a) * f - min) / span;
}
