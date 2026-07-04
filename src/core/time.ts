/** Absolute sim-minute since campaign start. 1 tick = 1 sim-minute. */
export type Tick = number;

export const TICKS_PER_DAY = 1440;
export const DAYS_PER_WEEK = 7;
/** Day-of-week index of the weekly rest day (mass, no work shifts). */
export const REST_DAY = 6;

export function dayOf(t: Tick): number {
  return Math.floor(t / TICKS_PER_DAY);
}

export function minuteOfDay(t: Tick): number {
  return t % TICKS_PER_DAY;
}

export function dayOfWeek(t: Tick): number {
  return dayOf(t) % DAYS_PER_WEEK;
}

/** Build an absolute tick from (day, hour, minute). */
export function at(day: number, hour: number, minute = 0): Tick {
  return day * TICKS_PER_DAY + hour * 60 + minute;
}
