import { describe, expect, it } from 'vitest';
import { initInPhases } from '../../src/lib/motion/phases';
import type { MotionModule } from '../../src/lib/motion/types';

const base = { mode: 'full' as const, intro: true, onFrame: () => () => {} };

/** A fake module that logs its start-state write, then queues a read and an arming write. */
const fake =
  (name: string, log: string[], { measure = true, mutate = true } = {}): MotionModule =>
  (ctx) => {
    log.push(`write:${name}`);
    if (measure) ctx.measure(() => log.push(`measure:${name}`));
    if (mutate) ctx.mutate(() => log.push(`mutate:${name}`));
    return () => log.push(`cleanup:${name}`);
  };

describe('initInPhases', () => {
  it('runs every start-state write, then every read, then one flush, then every arming write', () => {
    const log: string[] = [];
    initInPhases([fake('a', log), fake('b', log, { measure: false }), fake('c', log)], base, () => log.push('flush'));
    expect(log).toEqual(['write:a', 'write:b', 'write:c', 'measure:a', 'measure:c', 'flush', 'mutate:a', 'mutate:b', 'mutate:c']);
  });

  it('never runs a read after a write once the reads have started', () => {
    const log: string[] = [];
    initInPhases([fake('a', log), fake('b', log), fake('c', log)], base, () => log.push('flush'));
    const firstRead = log.findIndex((e) => e.startsWith('measure:'));
    const lastRead = log.findLastIndex((e) => e.startsWith('measure:'));
    expect(log.slice(firstRead, lastRead + 1).every((e) => e.startsWith('measure:'))).toBe(true);
    expect(log.slice(0, firstRead).every((e) => e.startsWith('write:'))).toBe(true);
    expect(log.filter((e) => e === 'flush')).toHaveLength(1);
  });

  it('skips the flush when nothing needs arming', () => {
    const log: string[] = [];
    initInPhases([fake('a', log, { mutate: false })], base, () => log.push('flush'));
    expect(log).toEqual(['write:a', 'measure:a']);
  });

  it('runs a write queued from a read after every read (waves: read size, then apply it)', () => {
    const log: string[] = [];
    const nested: MotionModule = (ctx) => {
      ctx.measure(() => {
        log.push('measure:n');
        ctx.mutate(() => log.push('mutate:n'));
      });
      return () => {};
    };
    initInPhases([nested, fake('a', log, { mutate: false })], base, () => log.push('flush'));
    expect(log).toEqual(['write:a', 'measure:n', 'measure:a', 'flush', 'mutate:n']);
  });

  it('returns the cleanups in module order, and shares the base context', () => {
    const log: string[] = [];
    let seen: unknown;
    const spy: MotionModule = (ctx) => {
      seen = { mode: ctx.mode, intro: ctx.intro };
      return () => log.push('cleanup:spy');
    };
    const cleanups = initInPhases([fake('a', log), spy], base, () => {});
    log.length = 0;
    cleanups.forEach((fn) => fn());
    expect(log).toEqual(['cleanup:a', 'cleanup:spy']);
    expect(seen).toEqual({ mode: 'full', intro: true });
  });
});
