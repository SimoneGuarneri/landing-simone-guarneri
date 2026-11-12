import { describe, expect, it } from 'vitest';
import { hlOpacity, marqueeStep, motionMode, queueReveal, revealTravel } from '../../src/lib/motion/math';

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

describe('queueReveal', () => {
  it('shows the first block of a section straight away', () => {
    expect(queueReveal(1000, 0, 'full')).toEqual({ delay: 0, next: 1080 });
  });
  it('queues blocks that arrive together 80ms apart in full mode, 60ms in lite', () => {
    const a = queueReveal(1000, 0, 'full');
    const b = queueReveal(1000, a.next, 'full');
    const c = queueReveal(1000, b.next, 'full');
    expect([a.delay, b.delay, c.delay]).toEqual([0, 80, 160]);
    expect(queueReveal(1000, 1060, 'lite').delay).toBe(60);
  });
  it('keeps the rhythm for a block arriving a moment later in the same section', () => {
    // previous block starts at 1080, so the next slot is 1160; arriving at 1100 waits 60ms.
    expect(queueReveal(1100, 1160, 'full')).toEqual({ delay: 60, next: 1240 });
  });
  it('starts afresh after a pause', () => {
    expect(queueReveal(5000, 1160, 'full')).toEqual({ delay: 0, next: 5080 });
  });
  it('never makes a block wait longer than the cap (640ms full, 400ms lite)', () => {
    expect(queueReveal(1000, 9000, 'full').delay).toBe(640);
    expect(queueReveal(1000, 9000, 'lite').delay).toBe(400);
  });
  it('is immediate when motion is off', () => {
    expect(queueReveal(1000, 1500, 'off')).toEqual({ delay: 0, next: 1000 });
  });
});

describe('revealTravel', () => {
  it('rises 28px in full mode, 16px in lite, none when off', () => {
    expect(revealTravel('full')).toBe(28);
    expect(revealTravel('lite')).toBe(16);
    expect(revealTravel('off')).toBe(0);
  });
});
