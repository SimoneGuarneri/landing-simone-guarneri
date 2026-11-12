import type { MotionModule } from './types';

const COLOURS = ['#7A3CF0', '#FFD43B', '#B595FF', '#FFE88A'];

function draw(c: CanvasRenderingContext2D, w: number, h: number, time: number) {
  c.clearRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w + 6; x += 6) {
      const k = x / w;
      c.lineTo(
        x,
        h * (0.48 + i * 0.12) +
          Math.sin(k * (2 + i * 0.6) * Math.PI + time * (0.35 + i * 0.12) + i * 1.7) * h * 0.09 +
          Math.sin(k * 5 * Math.PI - time * 0.5 + i) * h * 0.025,
      );
    }
    c.lineTo(w, h);
    c.closePath();
    c.globalAlpha = 0.6 - i * 0.08;
    c.fillStyle = COLOURS[i];
    c.fill();
  }
  c.globalAlpha = 1;
}

/**
 * Hero waves. Full mode: animated, but only while the hero is on screen. Lite and off:
 * one static frame (redrawn after a resize).
 */
export const waves: MotionModule = (ctx) => {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-waves]');
  const c = canvas?.getContext('2d');
  if (!canvas || !c) return () => {};
  const hero = document.querySelector('[data-hero]');

  let time = 0;
  let inView = true;
  // Half resolution, as in the design (the canvas is blurred 30px anyway).
  let w = 0;
  let h = 0;
  const read = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
  };
  const apply = () => {
    canvas.width = Math.round(w * 0.5);
    canvas.height = Math.round(h * 0.5);
    draw(c, canvas.width, canvas.height, time);
  };
  const size = () => {
    read();
    apply();
  };
  // At start-up the read joins the shared layout; resizes size directly.
  ctx.measure(read);
  ctx.mutate(apply);

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(size, 150);
  };
  window.addEventListener('resize', onResize, { passive: true });

  let off = () => {};
  let io: IntersectionObserver | undefined;
  if (ctx.mode === 'full') {
    if (hero && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1].isIntersecting;
      });
      io.observe(hero);
    }
    off = ctx.onFrame((f) => {
      if (!inView) return;
      time = f.now / 1000;
      draw(c, canvas.width, canvas.height, time);
    });
  }

  return () => {
    off();
    io?.disconnect();
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
  };
};
