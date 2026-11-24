import type { MotionModule } from './types';

/**
 * `[data-steps]` lists: the `[data-step]` crossing a band across the middle of the screen
 * is lit (class is-on); the section gets is-held so the others dim. Not in reduced motion:
 * there every step stays in full ink.
 */
export const steps: MotionModule = (ctx) => {
  const root = document.querySelector<HTMLElement>('[data-steps]');
  if (ctx.mode === 'off' || !root || !('IntersectionObserver' in window)) return () => {};
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
  const show = (on: HTMLElement) => items.forEach((el) => el.classList.toggle('is-on', el === on));
  const io = new IntersectionObserver(
    (entries) => entries.filter((e) => e.isIntersecting).forEach((e) => show(e.target as HTMLElement)),
    { rootMargin: '-45% 0px -45% 0px' },
  );
  root.classList.add('is-held');
  show(items[0]);
  items.forEach((el) => io.observe(el));
  return () => {
    io.disconnect();
    root.classList.remove('is-held');
    items.forEach((el) => el.classList.remove('is-on'));
  };
};
