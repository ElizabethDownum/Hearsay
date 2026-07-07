import { buildWorld } from '../../src/sim/world';
import { step, runUntil } from '../../src/sim/step';
import { hashWorld } from '../../src/sim/hash';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { at, dayOfWeek, REST_DAY, TICKS_PER_DAY } from '../../src/core/time';
import type { WorldState } from '../../src/sim/types';

describe('coin: the treasury field', () => {
  it('initializes from Rules.economy.startingCoin when rules are supplied', () => {
    const world = buildWorld(TESTFORD, 'econ-init-1', STANDARD_RULES);
    expect(world.coin).toBe(STANDARD_ECONOMY.startingCoin);
    expect(world.coin).toBe(20);
  });

  it('falls back to 0 when no rules are supplied (legacy buildWorld callers)', () => {
    const world = buildWorld(TESTFORD, 'econ-init-2');
    expect(world.coin).toBe(0);
  });
});

describe('weekly stipend: lands exactly on rest-day nightlies (day 6, 13, ...)', () => {
  it('pays the stipend once, exactly when day 6\'s nightly beat runs — not a tick before', () => {
    const world = buildWorld(TESTFORD, 'econ-stipend-1', STANDARD_RULES);
    const start = STANDARD_ECONOMY.startingCoin;

    // Up to (but not including) day 6's nightly tick: no stipend yet.
    runUntil(world, at(6, 23, 59), STANDARD_RULES);
    expect(world.coin).toBe(start);

    // Crossing the day-6/day-7 boundary runs day 6's nightly beat (minuteOfDay 1439).
    runUntil(world, at(7, 0), STANDARD_RULES);
    expect(world.coin).toBe(start + STANDARD_ECONOMY.weeklyStipend);
  });

  it('pays again at day 13, and nowhere in between', () => {
    const world = buildWorld(TESTFORD, 'econ-stipend-2', STANDARD_RULES);
    const start = STANDARD_ECONOMY.startingCoin;

    runUntil(world, at(7, 0), STANDARD_RULES);
    expect(world.coin).toBe(start + STANDARD_ECONOMY.weeklyStipend);

    runUntil(world, at(13, 23, 59), STANDARD_RULES);
    expect(world.coin).toBe(start + STANDARD_ECONOMY.weeklyStipend); // still just the one payment

    runUntil(world, at(14, 0), STANDARD_RULES);
    expect(world.coin).toBe(start + 2 * STANDARD_ECONOMY.weeklyStipend);
  });

  it('sanity: day 6 and day 13 are in fact REST_DAY (dayOfWeek === REST_DAY)', () => {
    expect(dayOfWeek(at(6, 0))).toBe(REST_DAY);
    expect(dayOfWeek(at(13, 0))).toBe(REST_DAY);
  });
});

describe('no other tick mutates coin yet', () => {
  it('coin is unchanged across every tick of a non-rest day (day 2, dayOfWeek 2)', () => {
    const world = buildWorld(TESTFORD, 'econ-notick-1', STANDARD_RULES);
    runUntil(world, at(2, 0), STANDARD_RULES);
    const before = world.coin;
    for (let i = 0; i < TICKS_PER_DAY; i++) {
      step(world, STANDARD_RULES);
      expect(world.coin).toBe(before);
    }
  });

  it('across 15 days, coin only steps up on dayOfWeek === REST_DAY nightlies (days 6 and 13)', () => {
    const world = buildWorld(TESTFORD, 'econ-notick-2', STANDARD_RULES);
    let expected = STANDARD_ECONOMY.startingCoin;
    for (let day = 0; day < 15; day++) {
      runUntil(world, at(day + 1, 0), STANDARD_RULES);
      if (dayOfWeek(at(day, 0)) === REST_DAY) expected += STANDARD_ECONOMY.weeklyStipend;
      expect(world.coin).toBe(expected);
    }
  });
});

describe('serialization + hash coverage', () => {
  it('coin participates in the state hash — a lone coin difference must hash differently', () => {
    const a = buildWorld(TESTFORD, 'econ-hash-1', STANDARD_RULES);
    const b = buildWorld(TESTFORD, 'econ-hash-1', STANDARD_RULES);
    expect(hashWorld(a)).toBe(hashWorld(b));
    b.coin += 1;
    expect(hashWorld(a)).not.toBe(hashWorld(b));
  });

  it('JSON round-trip preserves coin and the state hash after a stipend has been paid', () => {
    const world = buildWorld(TESTFORD, 'econ-hash-2', STANDARD_RULES);
    runUntil(world, at(7, 0), STANDARD_RULES);
    const revived = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(revived.coin).toBe(world.coin);
    expect(hashWorld(revived)).toBe(hashWorld(world));
  });
});
