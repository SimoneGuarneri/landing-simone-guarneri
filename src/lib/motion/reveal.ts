import { queueReveal, revealTravel } from './math';
import { $$, EASE, type MotionModule } from './types';

/**
 * `[data-reveal]` blocks fade and rise in as they enter the viewport. Each section keeps
 * one queue (queueReveal), so its heading, intro, cards and chips appear one after another
 * in page order, whether they scroll in together or a moment apart.
 * The hidden start state is set here, right before observing; intro only, never in reduced
 * motion, and without this script everything is simply visible.
 */
export const reveal: MotionModule = (ctx) => {
  if (ctx.mode === 'off' || !ctx.intro || !('IntersectionObserver' in window)) return () => {};
  const els = $$('[data-reveal]');
  const travel = revealTravel(ctx.mode);
  /** Earliest start of the next block, per section. */
  const queues = new WeakMap<Element, number>();
  const timers = new Set<number>();
  const clear = (el: HTMLElement) => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.transition = '';
  };
  const show = (el: HTMLElement, delay: number) => {
    el.style.transitionDelay = `${delay}ms`;
    el.style.opacity = '1';
    el.style.transform = 'none';
    // Then hand back to the stylesheet (cards have their own hover transition).
    const t = window.setTimeout(() => {
      timers.delete(t);
      clear(el);
    }, delay + 1000);
    timers.add(t);
  };
  const io = new IntersectionObserver(
    (entries) => {
      const entering = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      const now = performance.now();
      entering.forEach((el) => {
        io.unobserve(el);
        const section = el.closest('section') ?? document.body;
        const { delay, next } = queueReveal(now, queues.get(section) ?? 0, ctx.mode);
        queues.set(section, next);
        show(el, delay);
      });
    },
    { threshold: 0.12 },
  );
  // Snap to the hidden state (no transition); once the shared layout has resolved it, arm
  // the transition, so blocks already on screen fade in rather than out.
  els.forEach((el) => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = `translateY(${travel}px) scale(.98)`;
  });
  ctx.mutate(() => {
    els.forEach((el) => (el.style.transition = `opacity .7s ease, transform .8s ${EASE}`));
    els.forEach((el) => io.observe(el));
  });
  return () => {
    io.disconnect();
    timers.forEach(clearTimeout);
    els.forEach(clear);
  };
};
