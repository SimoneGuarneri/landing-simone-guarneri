import { describe, expect, it } from 'vitest';
import { withBase } from '../../src/lib/base-url';

describe('withBase', () => {
  it('joins base and path with a single slash', () => {
    expect(withBase('/landing-simone-guarneri/', '/en/')).toBe('/landing-simone-guarneri/en/');
    expect(withBase('/landing-simone-guarneri', 'en/')).toBe('/landing-simone-guarneri/en/');
  });

  it('returns the base when path is empty', () => {
    expect(withBase('/')).toBe('/');
  });
});
