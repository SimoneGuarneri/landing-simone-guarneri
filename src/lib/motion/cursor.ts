import type { MotionModule } from './types';

const INTERACTIVE = 'a, button, label, summary, [role="button"]';
const TEXT_ENTRY = 'input:not([type="radio"]):not([type="checkbox"]), textarea, select';

/**
 * Dot cursor (full mode only: fine pointer, ≥768px, motion allowed). Replaces the system
 * cursor with a dot: black over the hero (where the yellow blob sits behind it), yellow
 * everywhere else. It grows over links and buttons and steps aside over text fields so the
 * native text cursor shows. Styles: .sg-cursor / .has-dot-cursor in global.css.
 */
export const cursor: MotionModule = (ctx) => {
  if (ctx.mode !== 'full') return () => {};
  const root = document.documentElement;
  const dot = document.createElement('div');
  dot.className = 'sg-cursor';
  dot.setAttribute('aria-hidden', 'true');
  dot.dataset.cursor = '';
  document.body.append(dot);
  root.classList.add('has-dot-cursor');

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    dot.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    const target = e.target instanceof Element ? e.target : null;
    dot.dataset.zone = target?.closest('[data-hero]') ? 'hero' : 'page';
    dot.dataset.state = target?.closest(TEXT_ENTRY) ? 'text' : target?.closest(INTERACTIVE) ? 'link' : '';
    dot.dataset.visible = 'true';
  };
  const onLeave = () => {
    dot.dataset.visible = '';
  };
  document.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerleave', onLeave, { passive: true });

  return () => {
    document.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    root.classList.remove('has-dot-cursor');
    dot.remove();
  };
};
