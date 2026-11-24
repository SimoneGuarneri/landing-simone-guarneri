import { season } from '../casadata';
import type { MotionModule } from './types';

const COLOURS = ['#7A3CF0', '#FFD43B', '#B595FF', '#FFE88A'];

/** Dot pitch in CSS pixels; the grid the halftone sits on. */
const PITCH = 14;

/**
 * Height of band i at horizontal position k (0..1, January at the left, December at the
 * right), in canvas pixels: Salerno's revenue season from Casadata's demo report lifts every
 * band into a summer hump, each band a little lower, flatter and offset; a slow ripple and
 * breath keep it alive.
 */
const surface = (i: number, k: number, h: number, time: number) =>
  h * (0.52 + i * 0.1) -
  season(k + i * 0.015) * h * 0.24 * (1 - i * 0.18) * (1 + 0.05 * Math.sin(time * 0.6 + i)) +
  Math.sin(k * 6 * Math.PI - time * (0.45 + i * 0.1) + i * 1.7) * h * 0.018;

/**
 * Four bands drawn as a halftone: a grid of crisp dots, each taking the colour of the lowest
 * band it sits in and growing with its depth below that band's surface.
 */
function draw(c: CanvasRenderingContext2D, w: number, h: number, time: number, scale: number) {
  c.clearRect(0, 0, w, h);
  const step = PITCH * scale;
  const maxR = step * 0.3;
  const fade = h * 0.12;
  const surf = [0, 0, 0, 0];
  for (let x = step / 2; x < w; x += step) {
    const k = x / w;
    for (let i = 0; i < 4; i++) surf[i] = surface(i, k, h, time);
    for (let y = step / 2; y < h; y += step) {
      let band = -1;
      for (let i = 3; i >= 0; i--) {
        if (y > surf[i]) {
          band = i;
          break;
        }
      }
      if (band < 0) continue;
      const r = maxR * Math.min(1, 0.2 + (y - surf[band]) / fade);
      // The field fades to nothing over the hero's bottom third, so it ends without an edge.
      c.globalAlpha = Math.min(1, (h - y) / (h * 0.33));
      c.fillStyle = COLOURS[band];
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
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
  // Full device resolution: the dots are drawn crisp, not blurred.
  let w = 0;
  let h = 0;
  let scale = 1;
  const read = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    scale = Math.min(window.devicePixelRatio || 1, 2);
  };
  const apply = () => {
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    draw(c, canvas.width, canvas.height, time, scale);
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
      draw(c, canvas.width, canvas.height, time, scale);
    });
  }

  return () => {
    off();
    io?.disconnect();
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
  };
};
