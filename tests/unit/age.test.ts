import { describe, expect, it } from 'vitest';
import { ageOn } from '../../src/lib/age';

const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('ageOn', () => {
  it('is one year less the day before the birthday', () => {
    expect(ageOn('2002-01-21', on(2026, 1, 20))).toBe(23);
  });

  it('goes up on the birthday itself', () => {
    expect(ageOn('2002-01-21', on(2026, 1, 21))).toBe(24);
  });

  it('counts the whole year after the birthday month', () => {
    expect(ageOn('2002-01-21', on(2026, 11, 11))).toBe(24);
    expect(ageOn('2002-01-21', on(2027, 1, 1))).toBe(24);
  });

  it('handles a 29 February birth date', () => {
    expect(ageOn('2004-02-29', on(2025, 2, 28))).toBe(20);
    expect(ageOn('2004-02-29', on(2025, 3, 1))).toBe(21);
  });

  it('rejects a malformed date', () => {
    expect(() => ageOn('21/01/2002', on(2026, 1, 1))).toThrow(/birth date/);
  });
});
