import { $$, type MotionModule } from './types';

/**
 * `[data-scan]` pictures (the Contact photo) draw themselves in, top to bottom, when they
 * scroll into view: the module marks them `pending` (hidden) and flips them to `done`
 * (the keyframes in Contact.astro) on entry. Intro only; never in reduced motion, and
 * without this script the picture simply shows.
 */
export const scan: MotionModule = (ctx) => {
  const els = $$('[data-scan]');
  if (ctx.mode === 'off' || !ctx.intro || !els.length || !('IntersectionObserver' in window)) return () => {};
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        (e.target as HTMLElement).dataset.scan = 'done';
      }),
    { threshold: 0.35 },
  );
  els.forEach((el) => {
    el.dataset.scan = 'pending';
    io.observe(el);
  });
  return () => {
    io.disconnect();
    els.forEach((el) => (el.dataset.scan = ''));
  };
};
