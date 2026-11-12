import { $$, type MotionModule } from './types';

/**
 * `[data-dots]` pictures (the Contact photo, seen through a screen of dots): the dots grow
 * in the first time the picture scrolls into view. The module marks it `pending` (dots at
 * zero) and flips it to `done` (the keyframes in Contact.astro) on entry. Intro only; never
 * in reduced motion, and without this script the finished dots simply show.
 */
export const dots: MotionModule = (ctx) => {
  const els = $$('[data-dots]');
  if (ctx.mode === 'off' || !ctx.intro || !els.length || !('IntersectionObserver' in window)) return () => {};
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        (e.target as HTMLElement).dataset.dots = 'done';
      }),
    { threshold: 0.35 },
  );
  els.forEach((el) => {
    el.dataset.dots = 'pending';
    io.observe(el);
  });
  return () => {
    io.disconnect();
    els.forEach((el) => (el.dataset.dots = ''));
  };
};
