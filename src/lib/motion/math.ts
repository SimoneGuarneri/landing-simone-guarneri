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

/** Per-mode numbers for block entrances: stagger step and cap (ms), rise distance (px). */
const REVEAL = {
  full: { step: 80, cap: 640, travel: 28 },
  lite: { step: 60, cap: 400, travel: 16 },
} as const;

/**
 * Next entrance slot in one section's queue. `now` is when a block scrolls into view and
 * `next` the earliest start the section's queue allows (from the previous call; 0 at
 * first). Blocks start one step apart, never wait longer than the cap, and a block that
 * arrives after a pause starts at once. Returns the block's delay (ms) and the queue's
 * new `next`.
 */
export function queueReveal(now: number, next: number, mode: MotionMode): { delay: number; next: number } {
  if (mode === 'off') return { delay: 0, next: now };
  const { step, cap } = REVEAL[mode];
  const delay = Math.min(Math.max(0, next - now), cap);
  return { delay, next: now + delay + step };
}

/** How far (px) a block rises as it reveals: shorter on phones and touch screens. */
export function revealTravel(mode: MotionMode): number {
  return mode === 'off' ? 0 : REVEAL[mode].travel;
}
