import { minuteOfDay, type Tick } from '../core/time';

export const isSacredVenue = (venue: string): boolean =>
  venue === 'cathedral' || venue === 'chapel' || /^chapel-.+/.test(venue);
export const isNightVisitTime = (tick: Tick): boolean =>
  Number.isFinite(tick) && Number.isInteger(tick) && tick >= 0 && minuteOfDay(tick) < 240;
