import { describe, expect, it, vi } from 'vitest';
import { circlesAt, positionOf } from '../../src/sim/agents';
import { applyAction, runLogOn, type ActionLog } from '../../src/sim/campaign';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { prepareTick, finishTick, scheduleSetup, type ScheduledSetup } from '../../src/sim/phases';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { runUntil } from '../../src/sim/step';
import { STANDARD_RULES } from '../../src/content/rules';
import { TESTFORD } from '../../src/content/fixtures/testford';
import type { WorldState } from '../../src/sim/types';
import { at } from '../../src/core/time';

const nightlyCalls = vi.hoisted((): string[] => []);
const wagesCoinAtCall = vi.hoisted((): number[] => []);

vi.mock('../../src/sim/network/roster', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/network/roster')>();
  return { ...actual, payWagesNightly(...args: Parameters<typeof actual.payWagesNightly>) {
    nightlyCalls.push('wages');
    wagesCoinAtCall.push(args[0].coin);
    return actual.payWagesNightly(...args);
  } };
});
vi.mock('../../src/sim/network/turncoats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/network/turncoats')>();
  return { ...actual, runTurncoatPass(...args: Parameters<typeof actual.runTurncoatPass>) {
    nightlyCalls.push('turncoats');
    return actual.runTurncoatPass(...args);
  } };
});
vi.mock('../../src/sim/counterintel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/counterintel')>();
  return { ...actual, runEnemyDay(...args: Parameters<typeof actual.runEnemyDay>) {
    nightlyCalls.push('enemy-work');
    return actual.runEnemyDay(...args);
  } };
});
vi.mock('../../src/sim/inquiry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/inquiry')>();
  return { ...actual, expireInquiries(...args: Parameters<typeof actual.expireInquiries>) {
    nightlyCalls.push('inquiry-expiry');
    return actual.expireInquiries(...args);
  } };
});
vi.mock('../../src/sim/vignettes/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/vignettes/engine')>();
  return { ...actual, runVignettes(...args: Parameters<typeof actual.runVignettes>) {
    nightlyCalls.push('vignettes');
    return actual.runVignettes(...args);
  } };
});
vi.mock('../../src/sim/scenario/referee', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/sim/scenario/referee')>();
  return { ...actual, scenarioNightly(...args: Parameters<typeof actual.scenarioNightly>) {
    nightlyCalls.push('scenario');
    return actual.scenarioNightly(...args);
  } };
});

const RULES = STANDARD_RULES;

function staged(seed = 'tick-phases'): WorldState {
  const world = buildWorld(TESTFORD, seed, RULES);
  world.venues.elsewhere = { id: 'elsewhere', district: 'd0', access: 'public' };
  const avatarVenue = positionOf(world, world.npcs.mara!, 15);
  enrollPlayer(world, { home: avatarVenue });
  return world;
}

// Fixture reality: Testford contains mara and rafe (not miniTown's ada/bez/cyn/dov).
// `elsewhere` is deliberately test-created by staged().

const moveMara = (venue: string, id = 'fuse-mara'): ScheduledSetup => ({
  id,
  due: 15,
  kind: 'schedule-override',
  actor: 'mara',
  ref: 'test-fuse',
  override: { fromDay: 0, toDay: 1, from: 0, to: 1440, venue, source: 'vignette' },
});

describe('five-phase tick transaction', () => {
  it('previews due setup purely, then installs it before the player phase', () => {
    const world = staged();
    scheduleSetup(world, moveMara('elsewhere'));
    runUntil(world, 15, RULES);

    const before = hashWorld(world);
    const frame = prepareTick(world, RULES);
    expect(hashWorld(world)).toBe(before);
    expect(JSON.parse(JSON.stringify(frame))).toEqual(frame);
    expect(frame.prior.map((x) => x.id)).toEqual(['fuse-mara']);
    const offeredCircle = frame.circles.find((circle) => circle.members.includes(world.playerId!));
    expect(offeredCircle!.members).not.toContain('mara');

    let sawPlayerPhase = false;
    finishTick(world, RULES, frame, () => {
      sawPlayerPhase = true;
      expect(positionOf(world, world.npcs.mara!, world.tick)).toBe('elsewhere');
    });
    expect(sawPlayerPhase).toBe(true);
    expect(world.scheduledSetup).toBeUndefined();
  });

  it('a due setup can replace mara with rafe in the offered Testford circle', () => {
    const world = staged('tick-phases-replacement');
    const avatarVenue = world.playerVenue!;
    scheduleSetup(world, moveMara('elsewhere'));
    scheduleSetup(world, { ...moveMara(avatarVenue, 'fuse-rafe'), actor: 'rafe' });
    runUntil(world, 15, RULES);
    const frame = prepareTick(world, RULES);
    const offered = frame.circles.find((circle) => circle.members.includes(world.playerId!))!;
    expect(offered.members).not.toContain('mara');
    expect(offered.members).toContain('rafe');
  });

  it('stores a deep copy and rejects duplicate ids and due-now/past setup', () => {
    const world = staged();
    const setup = moveMara('elsewhere');
    scheduleSetup(world, setup);
    setup.override!.venue = 'market';
    expect(world.scheduledSetup![0]!.override!.venue).toBe('elsewhere');
    expect(() => scheduleSetup(world, moveMara('elsewhere'))).toThrow(/duplicate.*fuse-mara/i);
    expect(() => scheduleSetup(world, { ...moveMara('elsewhere', 'now'), due: world.tick })).toThrow(/future/i);
    expect(() => scheduleSetup(world, { ...moveMara('elsewhere', 'past'), due: world.tick - 1 })).toThrow(/future/i);
  });

  it('rejects stale frame ticks and offer tokens without mutating the world', () => {
    const world = staged();
    const frame = prepareTick(world, RULES);
    expect(frame.circles).toEqual(circlesAt(world, world.tick).map((circle) => ({
      ...circle, members: [...circle.members].sort(),
    })));

    const beforeToken = hashWorld(world);
    expect(() => finishTick(world, RULES, { ...frame, offerToken: 'offer-stale' })).toThrow(/offer token/i);
    expect(hashWorld(world)).toBe(beforeToken);

    world.playerVenue = 'elsewhere';
    const beforeDriftRejection = hashWorld(world);
    expect(() => finishTick(world, RULES, frame)).toThrow(/offer token/i);
    expect(hashWorld(world)).toBe(beforeDriftRejection);

    const stale = cloneSerializable(frame);
    world.tick += 1;
    const beforeTick = hashWorld(world);
    expect(() => finishTick(world, RULES, stale)).toThrow(/frame tick/i);
    expect(hashWorld(world)).toBe(beforeTick);
  });

  it('names uninstalled setup handlers without partially applying them', () => {
    const world = staged();
    scheduleSetup(world, { ...moveMara('elsewhere', 'future-directive'), kind: 'directive-due', override: null });
    runUntil(world, 15, RULES);
    const before = hashWorld(world);
    expect(() => prepareTick(world, RULES)).toThrow(/directive-due.*handler not installed/i);
    expect(hashWorld(world)).toBe(before);
  });

  it('a due setup makes a same-tick tell succeed identically live and replay', () => {
    const build = (): WorldState => {
      const world = staged('tick-phases-replay');
      scheduleSetup(world, moveMara(world.playerVenue!));
      return world;
    };
    const log: ActionLog = [{
      tick: 15,
      kind: 'tell',
      to: 'mara',
      spec: { subject: 'mara', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: 'someone' },
    }];

    const live = build();
    runUntil(live, 15, RULES);
    const frame = prepareTick(live, RULES);
    finishTick(live, RULES, frame, () => applyAction(live, log[0]!, RULES));

    const replay = runLogOn(build(), RULES, log, 16);
    expect(live.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);
    expect(hashWorld(replay)).toBe(hashWorld(live));
  });

  it('scenario-free replay still reaches untilTick', () => {
    const world = runLogOn(buildWorld(TESTFORD, 'null-scenario', RULES), RULES, [], 3);
    expect(world.scenario).toBeNull();
    expect(world.tick).toBe(3);
  });

  it('preserves the exact pinned nightly dependency order', () => {
    nightlyCalls.length = 0;
    wagesCoinAtCall.length = 0;
    const world = buildWorld(TESTFORD, 'nightly-order', RULES);
    world.tick = at(6, 23, 59);
    const coinBeforeNightly = world.coin;
    finishTick(world, RULES, prepareTick(world, RULES));
    expect(wagesCoinAtCall).toEqual([coinBeforeNightly + RULES.economy.weeklyStipend]);
    expect(nightlyCalls).toEqual([
      'wages', 'turncoats', 'enemy-work', 'inquiry-expiry', 'vignettes', 'scenario',
    ]);
  });
});
