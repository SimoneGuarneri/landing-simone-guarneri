import { $$, type MotionModule } from './types';

/**
 * Hero highlight: the marker swipes from 0% to its CSS final size, through the CSS
 * transition (1.1s, .9s delay). Intro only; never in reduced motion.
 */
export const swipe: MotionModule = (ctx) => {
  if (ctx.mode === 'off' || !ctx.intro) return () => {};
  const els = $$('[data-swipe]');
  // Snap to 0% (no transition); the shared layout resolves it before the transition returns.
  els.forEach((el) => {
    el.style.transition = 'none';
    el.style.backgroundSize = '0% 42%';
  });
  let raf = 0;
  ctx.mutate(() => {
    els.forEach((el) => (el.style.transition = ''));
    // Clearing the inline size hands back to the stylesheet's final state, animated.
    raf = requestAnimationFrame(() => els.forEach((el) => (el.style.backgroundSize = '')));
  });
  return () => {
    cancelAnimationFrame(raf);
    els.forEach((el) => {
      el.style.backgroundSize = '';
      el.style.transition = '';
    });
  };
};
