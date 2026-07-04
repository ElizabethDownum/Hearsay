import { TICKS_PER_DAY, REST_DAY, dayOf, minuteOfDay, dayOfWeek, at } from '../../src/core/time';

describe('core/time', () => {
  it('1440 ticks per day; helpers agree', () => {
    expect(TICKS_PER_DAY).toBe(1440);
    const t = at(3, 8, 30); // day 3, 08:30
    expect(t).toBe(3 * 1440 + 8 * 60 + 30);
    expect(dayOf(t)).toBe(3);
    expect(minuteOfDay(t)).toBe(510);
    expect(dayOfWeek(t)).toBe(3);
  });

  it('rest day is day 6 of each week', () => {
    expect(dayOfWeek(at(6, 12))).toBe(REST_DAY);
    expect(dayOfWeek(at(13, 12))).toBe(REST_DAY);
    expect(dayOfWeek(at(7, 0))).toBe(0);
  });
});
