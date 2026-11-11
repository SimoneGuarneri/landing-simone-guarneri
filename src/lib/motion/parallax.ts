import type { MotionModule } from './types';

/** Hero name drifts down at 0.18× scroll while near the top of the page (full mode only). */
export const parallax: MotionModule = (ctx) => {
  const el = document.querySelector<HTMLElement>('[data-parallax]');
  if (ctx.mode !== 'full' || !el) return () => {};
  const off = ctx.onFrame(({ y, vh }) => {
    if (y < vh * 1.5) el.style.transform = `translate3d(0,${y * 0.18}px,0)`;
  });
  return () => {
    off();
    el.style.transform = '';
  };
};
