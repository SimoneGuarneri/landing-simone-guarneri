import type { Cleanup, MotionContext, MotionModule } from './types';

/**
 * Runs every module's init in three phases so start-up forces at most one layout:
 * 1. each module writes its start state synchronously (no layout reads);
 * 2. every queued `measure` runs, the first read paying for the one layout;
 * 3. if any `mutate` is queued, `flushLayout` resolves the start state (free by now, the
 *    layout is already clean) and every `mutate` runs: arming transitions, sizing canvases.
 * Each read after a write would force a fresh layout, hence the split.
 * DOM-free (flushLayout is injected) so the ordering is unit-testable.
 */
export function initInPhases(
  modules: MotionModule[],
  base: Omit<MotionContext, 'measure' | 'mutate'>,
  flushLayout: () => void,
): Cleanup[] {
  const measures: (() => void)[] = [];
  const mutates: (() => void)[] = [];
  const ctx: MotionContext = {
    ...base,
    measure: (cb) => void measures.push(cb),
    mutate: (cb) => void mutates.push(cb),
  };
  const cleanups = modules.map((init) => init(ctx));
  measures.forEach((cb) => cb());
  if (mutates.length) {
    flushLayout();
    mutates.forEach((cb) => cb());
  }
  return cleanups;
}
