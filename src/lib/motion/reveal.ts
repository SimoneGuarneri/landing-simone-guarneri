import { queueReveal, revealTravel } from './math';
import { $$, type MotionModule } from './types';

/** Strong ease-outs for arrivals; in-out for the shutter that travels while visible. */
const EXPO = 'cubic-bezier(.16,1,.3,1)';
const OUT = 'cubic-bezier(.22,1,.36,1)';
const IN_OUT = 'cubic-bezier(.76,0,.24,1)';

type Kind = 'text' | 'mask' | 'picture' | 'bars';

interface Variant {
  /** Hidden start state, written inline. */
  hide(el: HTMLElement, travel: number): void;
  /** Transition armed once the start state has been laid out. */
  transition: string;
  /** How long until the element can be handed back to the stylesheet (ms). */
  settle: number;
}

/** Below a heading's line: the heading rises out of a window the size of its own box. */
const MASK_FROM = 'inset(-20% -4% 100% -4%)';
const MASK_TO = 'inset(-20% -4% -20% -4%)';

const VARIANTS: Record<Kind, Variant> = {
  // Running text and lists: a short rise with opacity, no scale.
  text: {
    hide: (el, travel) => {
      el.style.opacity = '0';
      el.style.transform = `translateY(${travel}px)`;
    },
    transition: `opacity .7s ${OUT}, transform .8s ${OUT}`,
    settle: 900,
  },
  // Headings: rise from behind their own baseline (translate and clip move together).
  mask: {
    hide: (el) => {
      el.style.transform = 'translateY(100%)';
      el.style.clipPath = MASK_FROM;
    },
    transition: `transform .9s ${EXPO}, clip-path .9s ${EXPO}`,
    settle: 1000,
  },
  // The one showcase panel: opens from the top like a shutter.
  picture: {
    hide: (el) => {
      el.style.clipPath = 'inset(0 0 100% 0 round 20px)';
    },
    transition: `clip-path 1.1s ${IN_OUT}`,
    settle: 1200,
  },
  // A bar chart: each bar grows from its baseline, a beat apart (the element itself stays put).
  bars: {
    hide: (el) => {
      el.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => (bar.style.transform = 'scaleY(0)'));
    },
    transition: '',
    settle: 1500,
  },
};

const kindOf = (el: HTMLElement): Kind => {
  const k = el.dataset.reveal;
  return k === 'mask' || k === 'picture' || k === 'bars' ? k : 'text';
};

/**
 * `[data-reveal]` blocks arrive as they enter the viewport, each in the manner of its
 * content (data-reveal="mask" | "picture" | "bars", plain = text). Each section keeps one
 * queue (queueReveal), so its heading, text and pictures arrive in reading order.
 * Start states are written here, right before observing; intro only, never in reduced
 * motion, and without this script everything is simply visible.
 */
export const reveal: MotionModule = (ctx) => {
  if (ctx.mode === 'off' || !ctx.intro || !('IntersectionObserver' in window)) return () => {};
  const els = $$('[data-reveal]');
  const travel = revealTravel(ctx.mode);
  /** Earliest start of the next block, per section. */
  const queues = new WeakMap<Element, number>();
  const timers = new Set<number>();
  const bars = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[data-bar]'));
  const clear = (el: HTMLElement) => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.clipPath = '';
    el.style.transition = '';
    el.style.transitionDelay = '';
    bars(el).forEach((bar) => {
      bar.style.transform = '';
      bar.style.transition = '';
    });
  };
  const show = (el: HTMLElement, delay: number) => {
    const kind = kindOf(el);
    if (kind === 'bars') {
      bars(el).forEach((bar, i) => {
        bar.style.transition = `transform .8s ${EXPO} ${delay + i * 45}ms`;
        // Back to the stylesheet's own transform (a bar may be scaled to its value).
        bar.style.transform = '';
      });
    } else {
      el.style.transitionDelay = `${delay}ms`;
      el.style.opacity = '';
      el.style.transform = '';
      el.style.clipPath = kind === 'mask' ? MASK_TO : kind === 'picture' ? 'inset(0 0 0 0 round 20px)' : '';
    }
    // Then hand back to the stylesheet.
    const t = window.setTimeout(() => {
      timers.delete(t);
      clear(el);
    }, delay + VARIANTS[kind].settle);
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
    // Fire when the top is about 88% of the way down the viewport, once.
    { threshold: 0, rootMargin: '0px 0px -12% 0px' },
  );
  // Snap to the hidden state (no transition); once the shared layout has resolved it, arm
  // the transition, so blocks already on screen arrive rather than leave.
  els.forEach((el) => {
    el.style.transition = 'none';
    VARIANTS[kindOf(el)].hide(el, travel);
  });
  ctx.mutate(() => {
    els.forEach((el) => (el.style.transition = VARIANTS[kindOf(el)].transition));
    els.forEach((el) => io.observe(el));
  });
  return () => {
    io.disconnect();
    timers.forEach(clearTimeout);
    els.forEach(clear);
  };
};
