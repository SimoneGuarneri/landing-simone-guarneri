/** Pure motion maths, transcribed from the design's scroll loop. */

export type MotionMode = 'full' | 'lite' | 'off';

export interface Capabilities {
  /** prefers-reduced-motion: reduce */
  reduce: boolean;
  /** (max-width: 767px) */
  small: boolean;
  /** (pointer: fine) */
  fine: boolean;
}

/** full: every effect. lite: small or coarse-pointer screens. off: reduced motion. */
export function motionMode({ reduce, small, fine }: Capabilities): MotionMode {
  if (reduce) return 'off';
  if (small || !fine) return 'lite';
  return 'full';
}

/** How I work: opacity of an item whose centre sits at `centerY` in a `vh`-tall viewport. */
export function hlOpacity(centerY: number, vh: number): number {
  const d = Math.abs(centerY - vh * 0.5) / (vh * 0.5);
  return Math.max(0.18, Math.min(1, 1.25 - d * 1.1));
}

/**
 * Next marquee offset. `frames` is elapsed time in 60fps frames (the design's unit);
 * `half` is the width of one copy of the doubled list. With `coupled` false (lite) the
 * strip drifts at the constant idle speed.
 */
export function marqueeStep(mx: number, vel: number, half: number, frames: number, coupled: boolean): number {
  const v = coupled ? vel : 0;
  const dir = v < -0.3 ? -1 : 1;
  let next = mx - (0.6 + Math.min(12, Math.abs(v) * 0.6)) * dir * frames;
  if (half > 0) {
    while (next <= -half) next += half;
    while (next > 0) next -= half;
  }
  return next;
}
