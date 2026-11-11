import type { MotionModule } from './types';

/** Reading progress bar. It reports state rather than moving content, so it runs in every mode. */
export const progress: MotionModule = (ctx) => {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return () => {};
  let last = -1;
  const off = ctx.onFrame(({ y, vh }) => {
    const p = Math.min(1, Math.max(0, y / Math.max(1, document.documentElement.scrollHeight - vh)));
    if (p === last) return;
    last = p;
    bar.style.transform = `scaleX(${p})`;
  });
  return () => {
    off();
    bar.style.transform = '';
  };
};
