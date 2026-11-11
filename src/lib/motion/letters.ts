import { $$, EASE, type MotionModule } from './types';

/** Hero name: letters rise into place on load (intro only; never in reduced motion). */
export const letters: MotionModule = (ctx) => {
  if (ctx.mode === 'off' || !ctx.intro) return () => {};
  const els = $$('[data-letter]');
  const clear = () =>
    els.forEach((el) => {
      el.style.transform = '';
      el.style.transition = '';
    });
  // Snap to the start state (no transition), resolve it, then arm the staggered rise.
  els.forEach((el) => {
    el.style.transition = 'none';
    el.style.transform = 'translateY(105%) rotate(8deg)';
  });
  void document.body.offsetWidth;
  els.forEach((el, i) => (el.style.transition = `transform .9s ${EASE} ${0.15 + i * 0.045}s`));
  let raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => els.forEach((el) => (el.style.transform = 'none')));
  });
  // Last letter: 0.15 + 15 × 0.045 + 0.9 ≈ 1.7s. Then hand back to the stylesheet.
  const settle = window.setTimeout(clear, 2200);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(settle);
    clear();
  };
};
