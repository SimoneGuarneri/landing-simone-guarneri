import { marqueeStep } from './math';
import type { MotionModule } from './types';

/** Marquee strip: scroll-velocity coupled in full mode, constant slow drift in lite, static off. */
export const marquee: MotionModule = (ctx) => {
  const el = document.querySelector<HTMLElement>('[data-marquee]');
  if (ctx.mode === 'off' || !el) return () => {};
  let mx = 0;
  let half = 0;
  const measure = () => {
    half = el.scrollWidth / 2;
  };
  window.addEventListener('resize', measure, { passive: true });
  // Start-up reads join the shared layout (Chromium lays out to answer fonts.ready too);
  // the first frame comes later.
  ctx.measure(() => {
    measure();
    // Web fonts change the strip's width after first layout.
    document.fonts?.ready.then(measure, () => {});
  });
  const off = ctx.onFrame(({ vel, frames }) => {
    mx = marqueeStep(mx, vel, half, frames, ctx.mode === 'full');
    el.style.transform = `translate3d(${mx}px,0,0)`;
  });
  return () => {
    off();
    window.removeEventListener('resize', measure);
    el.style.transform = '';
  };
};
