import type { MotionMode } from './math';

/** Per-frame snapshot computed once by the coordinator's rAF loop. */
export interface Frame {
  /** performance.now() */
  now: number;
  /** Elapsed time since the previous tick, in 60fps frames (the design's unit), clamped. */
  frames: number;
  /** window.scrollY */
  y: number;
  /** Smoothed scroll velocity in px per frame (design: vel * 0.9 + dy * 0.1). */
  vel: number;
  vh: number;
  vw: number;
}

export interface MotionContext {
  mode: MotionMode;
  /** True only on the page's first init: one-shot intro effects play then, never again. */
  intro: boolean;
  /** Subscribe to the shared loop; returns the unsubscribe. */
  onFrame(cb: (frame: Frame) => void): () => void;
}

export type Cleanup = () => void;
export type MotionModule = (ctx: MotionContext) => Cleanup;

export const EASE = 'cubic-bezier(.2,.8,.2,1)';

export const $$ = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector));
