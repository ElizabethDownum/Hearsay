import { describe, expect, it } from 'vitest';
import { makeClock, TICKS_PER_SECOND } from '../../app/src/loop/clock';

// The clock is app-side step batching over the untouched deterministic sim (pillar: playback is
// never sim state). It takes REAL elapsed-ms (injected — never reads a wall clock itself) and
// returns whole ticks to step, carrying the sub-tick remainder across frames.

describe('TICKS_PER_SECOND — the Ellie-ratified multiplier table (verbatim)', () => {
  it('maps each speed to its ticks/second (1x anchor = 4 ticks/s)', () => {
    expect(TICKS_PER_SECOND).toEqual({ 0.25: 1, 0.5: 2, 1: 4, 2: 8, 4: 16 });
  });
});

describe('makeClock — accumulator with fractional carry', () => {
  it('defaults to a live speed (a real multiplier, not paused)', () => {
    const clock = makeClock();
    expect(clock.speed).not.toBe(0);
    expect(TICKS_PER_SECOND).toHaveProperty(String(clock.speed));
  });

  it('speed 0 (paused) yields 0 ticks no matter the elapsed time', () => {
    const clock = makeClock();
    clock.speed = 0;
    expect(clock.onFrame(16)).toBe(0);
    expect(clock.onFrame(1000)).toBe(0);
    expect(clock.onFrame(10_000_000)).toBe(0);
  });

  it('1x anchor: 4 ticks accrue over exactly one real second of frames', () => {
    const clock = makeClock();
    clock.speed = 1;
    // 8 frames of 125ms = 1000ms; 125ms * 4 ticks/s = 0.5 ticks/frame (exact in binary float).
    const frames = [125, 125, 125, 125, 125, 125, 125, 125];
    const ticks = frames.map((ms) => clock.onFrame(ms));
    expect(ticks).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
    expect(ticks.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('sub-1-tick-per-frame regime at 0.25x: fraction carries until a whole tick lands', () => {
    const clock = makeClock();
    clock.speed = 0.25; // 1 tick/s -> 250ms frames = 0.25 ticks/frame
    expect([250, 250, 250, 250].map((ms) => clock.onFrame(ms))).toEqual([0, 0, 0, 1]);
  });

  it('fractional carry is retained across uneven frame times (never rounds a partial tick away)', () => {
    const clock = makeClock();
    clock.speed = 1; // 4 ticks/s -> 4 ticks over 1000ms whatever the frame cadence
    const frames = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]; // 10 x 100ms = 1000ms
    const total = frames.reduce((sum, ms) => sum + clock.onFrame(ms), 0);
    expect(total).toBe(4);
  });

  it('caps a burst at 64 ticks/frame (a long stall never fast-forwards the sim)', () => {
    const clock = makeClock();
    clock.speed = 4; // 16 ticks/s; 100_000ms would be 1600 ticks uncapped
    expect(clock.onFrame(100_000)).toBe(64);
  });

  it('a capped burst sheds its backlog — the next normal frame is not fast-forwarded', () => {
    const clock = makeClock();
    clock.speed = 4;
    expect(clock.onFrame(100_000)).toBe(64); // capped
    expect(clock.onFrame(60)).toBe(0);        // 60ms * 16/1000 = 0.96 ticks -> 0, no leftover backlog
  });

  it('is robust to being called detached from the object (no reliance on `this`)', () => {
    const clock = makeClock();
    clock.speed = 0.25;
    const step = clock.onFrame;
    expect([250, 250, 250, 250].map((ms) => step(ms))).toEqual([0, 0, 0, 1]);
  });
});
