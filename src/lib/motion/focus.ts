import { hlOpacity } from './math';
import { $$, type MotionModule } from './types';

/**
 * How I work: items fade by distance from the viewport centre (full and lite). In reduced
 * motion they keep the stylesheet's opacity 1.
 */
export const focus: MotionModule = (ctx) => {
  const els = $$('[data-hl]');
  if (ctx.mode === 'off' || !els.length) return () => {};
  const list = els[0].parentElement;
  const off = ctx.onFrame(({ vh }) => {
    if (list) {
      const lr = list.getBoundingClientRect();
      // Far off screen: the next visit will set every item before it shows.
      if (lr.bottom < -vh || lr.top > vh * 2) return;
    }
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.opacity = hlOpacity(r.top + r.height / 2, vh).toFixed(3);
    });
  });
  return () => {
    off();
    els.forEach((el) => (el.style.opacity = ''));
  };
};
