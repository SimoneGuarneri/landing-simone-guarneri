import { describe, expect, it } from 'vitest';
import { countFrame, parseCount } from '../../src/lib/motion/count-format';

describe('parseCount', () => {
  it('splits a brand figure into prefix, number and suffix', () => {
    expect(parseCount('€410k')).toEqual({ prefix: '€', n: 410, suffix: 'k' });
    expect(parseCount('+38%')).toEqual({ prefix: '+', n: 38, suffix: '%' });
    expect(parseCount('50+')).toEqual({ prefix: '', n: 50, suffix: '+' });
    expect(parseCount('9')).toEqual({ prefix: '', n: 9, suffix: '' });
  });

  it('returns null when there is nothing to count', () => {
    expect(parseCount('abc')).toBeNull();
    expect(parseCount('')).toBeNull();
  });

  it('returns null for decimals, which would count up wrong', () => {
    expect(parseCount('4.8')).toBeNull();
    expect(parseCount('€1,2M')).toBeNull();
  });
});

describe('countFrame', () => {
  const figure = { prefix: '€', n: 410, suffix: 'k' };

  it('starts at zero and ends on the published value', () => {
    expect(countFrame(figure, 0)).toBe('€0k');
    expect(countFrame(figure, 1100)).toBe('€410k');
    expect(countFrame(figure, 5000)).toBe('€410k');
  });

  it('eases out cubic over 1100ms', () => {
    // p = 0.5 → 1 - 0.5³ = 0.875 → 358.75 → 359
    expect(countFrame(figure, 550)).toBe('€359k');
    expect(countFrame({ prefix: '', n: 50, suffix: '+' }, 275)).toBe('29+'); // 1-.75³=.578125 → 28.9
  });
});
