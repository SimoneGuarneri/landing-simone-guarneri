import { countFrame, COUNT_DURATION_MS, parseCount } from './count-format';
import { $$, type MotionModule } from './types';

/**
 * `[data-count]` figures count up from 0 the first time they are 60% visible. Until then
 * (and without JS, or in reduced motion) they show the published value.
 */
export const count: MotionModule = (ctx) => {
  if (ctx.mode === 'off' || !ctx.intro || !('IntersectionObserver' in window)) return () => {};
  const els = $$('[data-count]');
  const rafs = new Set<number>();
  const play = (el: HTMLElement) => {
    const figure = parseCount(el.dataset.count ?? '');
    if (!figure) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const elapsed = now - t0;
      el.textContent = countFrame(figure, elapsed);
      if (elapsed >= COUNT_DURATION_MS) return;
      const id = requestAnimationFrame((next) => {
        rafs.delete(id);
        step(next);
      });
      rafs.add(id);
    };
    step(t0);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        play(e.target as HTMLElement);
      }),
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    rafs.forEach(cancelAnimationFrame);
    // Always end on the published value.
    els.forEach((el) => {
      if (el.dataset.count) el.textContent = el.dataset.count;
    });
  };
};
