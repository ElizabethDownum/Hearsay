/**
 * Playback is app-side step BATCHING over the untouched deterministic sim — never sim state. The
 * clock converts real elapsed-ms (injected by the caller; this module never reads a wall clock) into
 * a whole number of ticks to step, carrying the sub-tick remainder across frames so nothing drifts.
 */

/**
 * The Ellie-ratified multiplier set (2026-07-05): 0.25/0.5/1/2/4. The 1x anchor — 4 ticks/s, ~6 real
 * minutes per sim-day — remains the PROVISIONAL pacing pin she retunes by feel.
 */
export const TICKS_PER_SECOND = { 0.25: 1, 0.5: 2, 1: 4, 2: 8, 4: 16 } as const;

/** A long stall (backgrounded tab, GC pause) must never fast-forward the sim by minutes at once. */
const BURST_CAP = 64;

export interface Clock {
  speed: 0 | 0.25 | 0.5 | 1 | 2 | 4;
  /** Given real ms since the last frame, how many whole ticks to step now. */
  onFrame(elapsedMs: number): number;
}

export function makeClock(): Clock {
  let carry = 0; // sub-tick remainder accumulated toward the next whole tick
  const clock: Clock = {
    speed: 1, // the 1x anchor; the UI flips this via the speed UIActions (0 = paused)
    onFrame(elapsedMs: number): number {
      const speed = clock.speed;
      if (speed === 0 || elapsedMs <= 0) return 0;
      carry += (elapsedMs / 1000) * TICKS_PER_SECOND[speed];
      const whole = Math.floor(carry);
      if (whole > BURST_CAP) {
        carry = 0; // shed the backlog rather than spiral to catch up
        return BURST_CAP;
      }
      carry -= whole; // keep the fraction for next frame
      return whole;
    },
  };
  return clock;
}
