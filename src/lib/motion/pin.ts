import { pinOffset } from './math';
import type { MotionModule } from './types';

/**
 * Selected work: translate the track by progress through the 300vh section. Full mode
 * only; Work.astro renders the pinned layout only under html[data-motion="full"] ≥768px,
 * and stacks the cards otherwise.
 */
export const pin: MotionModule = (ctx) => {
  const section = document.querySelector<HTMLElement>('[data-hpin]');
  const track = document.querySelector<HTMLElement>('[data-track]');
  if (ctx.mode !== 'full' || !section || !track) return () => {};
  let last = NaN;
  const off = ctx.onFrame(({ vh, vw }) => {
    const r = section.getBoundingClientRect();
    // Not laid out as a pin (mid-resize, before the mode switches): leave the track alone.
    if (r.height <= vh) return;
    const x = pinOffset({ top: r.top, height: r.height, vh, trackWidth: track.scrollWidth, vw });
    if (x === last) return;
    last = x;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
  return () => {
    off();
    track.style.transform = '';
  };
};
