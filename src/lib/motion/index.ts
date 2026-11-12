/**
 * Motion coordinator for the home page (design: componentDidMount + loop in
 * design/Simone Guarneri v2.dc.html). Detects capabilities once, mirrors the resulting
 * mode on <html data-motion="full|lite|off">, runs every effect off one rAF loop, and
 * re-inits when a capability media query changes (rotation, resize across 768px, a
 * reduced-motion toggle). Content is fully visible without this script.
 */
import { motionMode, type MotionMode } from './math';
import { initInPhases } from './phases';
import type { Cleanup, Frame, MotionContext, MotionModule } from './types';
import { blob } from './blob';
import { count } from './count';
import { cursor } from './cursor';
import { focus } from './focus';
import { letters } from './letters';
import { marquee } from './marquee';
import { parallax } from './parallax';
import { progress } from './progress';
import { dots } from './dots';
import { reveal } from './reveal';
import { swipe } from './swipe';
import { waves } from './waves';

const MODULES: MotionModule[] = [waves, letters, swipe, reveal, count, blob, parallax, marquee, focus, progress, cursor, dots];

const queries = {
  reduce: window.matchMedia('(prefers-reduced-motion: reduce)'),
  small: window.matchMedia('(max-width: 767px)'),
  fine: window.matchMedia('(pointer: fine)'),
};

const currentMode = (): MotionMode =>
  motionMode({ reduce: queries.reduce.matches, small: queries.small.matches, fine: queries.fine.matches });

// ---- The single loop ------------------------------------------------------------------

const subscribers = new Set<(frame: Frame) => void>();
let raf = 0;
/** Full and lite animate every frame; off only ticks on scroll/resize (progress bar). */
let continuous = false;
let lastT = 0;
let lastY = 0;
let vel = 0;

function tick(now: number) {
  raf = 0;
  const y = window.scrollY;
  const frames = lastT ? Math.min(4, Math.max(0, (now - lastT) / (1000 / 60))) : 1;
  lastT = now;
  vel = vel * 0.9 + (y - lastY) * 0.1;
  lastY = y;
  const frame: Frame = { now, frames, y, vel, vh: window.innerHeight, vw: window.innerWidth };
  subscribers.forEach((cb) => cb(frame));
  if (continuous) kick();
}

function kick() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
}

function halt() {
  cancelAnimationFrame(raf);
  raf = 0;
  lastT = 0;
}

const onVisibility = () => (document.hidden ? halt() : kick());

/** The loop's scroll baseline. scrollY is a layout read, so it waits for the shared layout. */
const scrollStart: MotionModule = (ctx) => {
  ctx.measure(() => (lastY = window.scrollY));
  return () => {};
};

// ---- Lifecycle ------------------------------------------------------------------------

/** Set by start(), which reads the capabilities afresh (also after a back/forward-cache restore). */
let mode: MotionMode;
let cleanups: Cleanup[] = [];
let started = false;
let introPlayed = false;

function initModules() {
  document.documentElement.dataset.motion = mode;
  continuous = mode !== 'off';
  vel = 0;
  const ctx: Omit<MotionContext, 'measure' | 'mutate'> = {
    mode,
    intro: !introPlayed,
    onFrame(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };
  introPlayed = true;
  // One shared layout for the whole start-up, not one per module.
  cleanups = initInPhases([scrollStart, ...MODULES], ctx, () => void document.body.offsetWidth);
  kick();
}

function teardownModules() {
  halt();
  cleanups.forEach((fn) => fn());
  cleanups = [];
  subscribers.clear();
}

const onCapabilityChange = () => {
  const next = currentMode();
  if (next === mode) return;
  teardownModules();
  mode = next;
  initModules();
};

function start() {
  if (started) return;
  started = true;
  mode = currentMode();
  initModules();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  Object.values(queries).forEach((q) => q.addEventListener('change', onCapabilityChange));
}

function stop() {
  if (!started) return;
  started = false;
  teardownModules();
  window.removeEventListener('scroll', kick);
  window.removeEventListener('resize', kick);
  document.removeEventListener('visibilitychange', onVisibility);
  Object.values(queries).forEach((q) => q.removeEventListener('change', onCapabilityChange));
}

window.addEventListener('pagehide', stop);
// Restored from the back/forward cache: resume without replaying the intro.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) start();
});

start();
