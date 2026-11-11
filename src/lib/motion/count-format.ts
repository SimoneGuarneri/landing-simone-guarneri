/** Count-up maths for `[data-count]` brand figures (design: 1100ms, easeOutCubic). */

export interface CountFigure {
  prefix: string;
  n: number;
  suffix: string;
}

export const COUNT_DURATION_MS = 1100;

/** `€410k` → { prefix: '€', n: 410, suffix: 'k' }; null when there is no integer to count. */
export function parseCount(raw: string): CountFigure | null {
  const m = /^([^\d]*)(\d+)(.*)$/.exec(raw.trim());
  if (!m) return null;
  // `4.8` or `1,2M`: counting the integer part alone would show nonsense frames.
  if (/^[.,]\d/.test(m[3])) return null;
  return { prefix: m[1], n: parseInt(m[2], 10), suffix: m[3] };
}

export const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/** Text of the figure `elapsed` ms into the count-up. */
export function countFrame(figure: CountFigure, elapsed: number): string {
  const p = Math.min(1, Math.max(0, elapsed / COUNT_DURATION_MS));
  return figure.prefix + Math.round(figure.n * easeOutCubic(p)) + figure.suffix;
}
