import { describe, expect, it } from 'vitest';
import { hlOpacity, marqueeStep, motionMode, pinOffset } from '../../src/lib/motion/math';

describe('motionMode', () => {
  it('is off whenever the visitor asks for reduced motion', () => {
    expect(motionMode({ reduce: true, small: false, fine: true })).toBe('off');
    expect(motionMode({ reduce: true, small: true, fine: false })).toBe('off');
  });
  it('is lite on small screens or coarse pointers', () => {
    expect(motionMode({ reduce: false, small: true, fine: true })).toBe('lite');
    expect(motionMode({ reduce: false, small: false, fine: false })).toBe('lite');
  });
  it('is full on a large screen with a fine pointer', () => {
    expect(motionMode({ reduce: false, small: false, fine: true })).toBe('full');
  });
});

describe('hlOpacity', () => {
  const vh = 800;
  it('is fully opaque for an item centred in the viewport', () => {
    expect(hlOpacity(400, vh)).toBe(1);
  });
  it('fades with distance from the centre (1.25 - d * 1.1)', () => {
    // centre at 600: d = 200 / 400 = 0.5 → 1.25 - 0.55 = 0.7
    expect(hlOpacity(600, vh)).toBeCloseTo(0.7, 5);
  });
  it('never drops below 0.18', () => {
    expect(hlOpacity(4000, vh)).toBe(0.18);
    expect(hlOpacity(-4000, vh)).toBe(0.18);
  });
});

describe('marqueeStep', () => {
  const half = 1000;
  it('drifts left at 0.6px per 60fps frame when idle', () => {
    expect(marqueeStep(0, 0, half, 1, true)).toBeCloseTo(-0.6, 5);
  });
  it('speeds up with scroll velocity, capped at 12px extra', () => {
    expect(marqueeStep(0, 10, half, 1, true)).toBeCloseTo(-6.6, 5);
    expect(marqueeStep(0, 500, half, 1, true)).toBeCloseTo(-12.6, 5);
  });
  it('reverses when scrolling up', () => {
    expect(marqueeStep(-100, -10, half, 1, true)).toBeCloseTo(-93.4, 5);
  });
  it('ignores velocity when not coupled', () => {
    expect(marqueeStep(0, 50, half, 1, false)).toBeCloseTo(-0.6, 5);
  });
  it('scales with frame time', () => {
    expect(marqueeStep(0, 0, half, 2, true)).toBeCloseTo(-1.2, 5);
  });
  it('wraps into (-half, 0] so the doubled list loops seamlessly', () => {
    expect(marqueeStep(-999.8, 0, half, 1, true)).toBeCloseTo(-0.4, 5);
    expect(marqueeStep(-1, -10, half, 1, true)).toBeCloseTo(-994.4, 5);
  });
});

describe('pinOffset', () => {
  // 300vh section (vh 800 → 2400px), track 2000px wide in a 1280px viewport: 720px to travel.
  const base = { height: 2400, vh: 800, trackWidth: 2000, vw: 1280 };
  it('is 0 before the section reaches the top', () => {
    expect(pinOffset({ ...base, top: 300 })).toBe(0);
  });
  it('travels linearly with progress through the section', () => {
    expect(pinOffset({ ...base, top: -800 })).toBe(-360);
  });
  it('stops at the end of the track', () => {
    expect(pinOffset({ ...base, top: -5000 })).toBe(-720);
  });
  it('never moves a track that already fits', () => {
    expect(pinOffset({ ...base, top: -800, trackWidth: 1000 })).toBe(0);
  });
});
