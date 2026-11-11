import { $$, EASE, type MotionModule } from './types';

/**
 * `[data-reveal]` blocks fade and rise in as they enter the viewport. The hidden start
 * state is set here, right before observing; intro only, never in reduced motion.
 */
export const reveal: MotionModule = (ctx) => {
  if (ctx.mode === 'off' || !ctx.intro || !('IntersectionObserver' in window)) return () => {};
  const els = $$('[data-reveal]');
  const timers = new Set<number>();
  const clear = (el: HTMLElement) => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.transition = '';
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        io.unobserve(el);
        el.style.opacity = '1';
        el.style.transform = 'none';
        // Then hand back to the stylesheet (cards have their own hover transition).
        const t = window.setTimeout(() => {
          timers.delete(t);
          clear(el);
        }, 1000);
        timers.add(t);
      }),
    { threshold: 0.12 },
  );
  // Snap to the hidden state (no transition), resolve it, then arm the transition, so
  // blocks already on screen fade in rather than out.
  els.forEach((el) => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px) scale(.98)';
  });
  void document.body.offsetWidth;
  els.forEach((el) => (el.style.transition = `opacity .8s ease, transform .9s ${EASE}`));
  els.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    timers.forEach(clearTimeout);
    els.forEach(clear);
  };
};
