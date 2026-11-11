import type { MotionModule } from './types';

/** Cursor blob in the hero: follows the pointer with a 0.12 lerp (full mode only). */
export const blob: MotionModule = (ctx) => {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const el = document.querySelector<HTMLElement>('[data-blob]');
  if (ctx.mode !== 'full' || !hero || !el) return () => {};
  let bx = 0;
  let by = 0;
  let tx = 0;
  let ty = 0;
  const onMove = (e: PointerEvent) => {
    const r = hero.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    el.style.opacity = '.9';
  };
  const onLeave = () => {
    el.style.opacity = '0';
  };
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', onLeave, { passive: true });
  const off = ctx.onFrame(() => {
    if (Math.abs(tx - bx) < 0.1 && Math.abs(ty - by) < 0.1) return;
    bx += (tx - bx) * 0.12;
    by += (ty - by) * 0.12;
    el.style.transform = `translate3d(${bx}px,${by}px,0)`;
  });
  return () => {
    off();
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    el.style.opacity = '';
    el.style.transform = '';
  };
};
