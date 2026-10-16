import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { settleEnemyOrderReport } from '../../src/sim/directives/reports';
import type { DirectiveRecord, EnemyActionReport, SpokenNetworkPayload } from '../../src/sim/directives/types';
import type { EnemyDecision } from '../../src/sim/enemy/state';
import { step } from '../../src/sim/step';
import type { TownFixture, WorldState } from '../../src/sim/types';
import { buildTownMap, buildWorld } from '../../src/sim/world';

/**
 * R46 (Astra I7): HQ's watch ledger rows were keyed by district alone, so a later watch in the same
 * district appended its worked nights to the first watch's row and kept the first watch's subject,
 * lead and start day. A watch EPISODE is the district plus the schedule start day the order
 * carried, which is already how a tail drop names the posts it stands down.
 */

const RULES = STANDARD_RULES;
const IDS = ['boss', 'guard', 'alpha', 'beta'] as const;

const FIXTURE: TownFixture = {
  venues: [{ id: 'square', district: 'd0', access: 'public' }],
  npcs: IDS.map((id) => ({
    id, name: id, home: 'square', occupation: id === 'guard' ? 'guard' : 'grocer', faction: 'none',
    traits: ['literalist'], rivals: [], schedule: [],
    edges: IDS.filter((other) => other !== id).map((to) => ({ to, kind: 'friend' as const, trust: 0.8 })),
  })),
};

/** One district, one guard, the spymaster and two possible subjects, everybody always in the square. */
function watchWorld(seed: string): WorldState {
  const world = buildWorld(FIXTURE, seed, RULES);
  world.network.spymaster = 'boss';
  world.network.enemyAssets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.map = buildTownMap(FIXTURE);
  return world;
}

const decision = (day: number, extra: Partial<EnemyDecision>): EnemyDecision => ({
  day, features: [], inquiries: [], interrogations: [], watches: [], ...extra,
});

function issueWatch(world: WorldState, day: number, startDay: number, subject: string, lead: string): void {
  applyEnemyDecision(world, decision(day, { watches: [{
    district: 'd0', posts: [{ guard: 'guard', venue: 'square' }], startDay, subject,
    about: { subject }, leadFeatureId: lead,
  }] }));
}

function driveTo(world: WorldState, tick: number): void {
  while (world.tick < tick) step(world, RULES);
}

const ledger = (world: WorldState) => (world.enemy.actionLedger ?? []).map((row) => ({
  orderKey: row.orderKey, subject: row.subject, lead: row.leadFeatureId,
  scheduleStartDay: row.scheduleStartDay, posts: row.posts, workedDays: row.workedDays,
  directiveIds: row.directiveIds,
}));

describe('a later watch in the same district is its own episode (R46, Astra I7)', () => {
  it('a second watch after a stand-down keeps its own subject, lead and start day', () => {
    const world = watchWorld('watch-episodes');
    issueWatch(world, 0, 1, 'alpha', 'sf-alpha');
    driveTo(world, 2490);                             // day 1's watch window has been worked and reported
    expect(ledger(world)).toEqual([expect.objectContaining({
      orderKey: 'watch:d0', subject: 'alpha', lead: 'sf-alpha', scheduleStartDay: 1,
      posts: [{ guard: 'guard', venue: 'square' }], workedDays: [1],
    })]);

    applyEnemyDecision(world, decision(1, { tailDrops: [{
      leadFeatureId: 'sf-alpha', subject: 'alpha', district: 'd0', watchStartDay: 1, untilDay: 3,
    }] }));
    driveTo(world, 2565);
    expect(world.enemy.watchedDistricts).toEqual([]);
    expect(ledger(world)[0]!.posts).toEqual([]);

    driveTo(world, 2880);
    issueWatch(world, 2, 3, 'beta', 'sf-beta');
    driveTo(world, 5370);                             // day 3's window worked and reported
    const second = world.network.directiveState!.records.find((row) =>
      row.authored.brief.application?.kind === 'enemy-watch' && row.authored.brief.application.startDay === 3)!;
    expect((second.outcomes ?? []).some((outcome) => outcome.result.enemyAction?.subject === 'beta')).toBe(true);

    expect(ledger(world)).toEqual([
      expect.objectContaining({
        subject: 'alpha', lead: 'sf-alpha', scheduleStartDay: 1, posts: [], workedDays: [1],
        directiveIds: [ledger(world)[0]!.directiveIds[0]],
      }),
      expect.objectContaining({
        subject: 'beta', lead: 'sf-beta', scheduleStartDay: 3,
        posts: [{ guard: 'guard', venue: 'square' }], workedDays: [3], directiveIds: [second.id],
      }),
    ]);
    expect(ledger(world)[0]!.directiveIds).not.toContain(second.id);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);
  });
});

describe('late receipts find their own episode (R46)', () => {
  /**
   * Two watch orders in one district, start days 1 and 3. HQ reserves one order per key, so the
   * second can only be issued once the first's reservation has cleared: either its first report
   * came home (`firstReported`), or the reservation lapsed without a word (none of its nights has
   * yet been heard of).
   */
  function twoEpisodes(firstReported: boolean): { world: WorldState; first: DirectiveRecord; second: DirectiveRecord } {
    const world = watchWorld('watch-episodes-late');
    issueWatch(world, 0, 1, 'alpha', 'sf-alpha');
    const first = world.network.directiveState!.records[0]!;
    if (firstReported) settleEnemyOrderReport(world, first, spoken(worked(first, 'alpha', 1, 1)));
    else delete world.enemy.pendingOrders;
    issueWatch(world, 2, 3, 'beta', 'sf-beta');
    const second = world.network.directiveState!.records[1]!;
    expect(second.id).not.toBe(first.id);
    return { world, first, second };
  }

  function worked(record: DirectiveRecord, subject: string, startDay: number, day: number): SpokenNetworkPayload {
    const action: EnemyActionReport = {
      kind: 'watch-worked', subject, about: { subject }, district: 'd0', scheduleStartDay: startDay,
      guard: 'guard', venue: 'square', workedDay: day, occurredAt: day * 1440 + 1140,
    };
    return { kind: 'directive-report', directiveId: record.id, factRefs: [], enemyAction: action, onwardTo: null,
      report: { outcome: 'watch worked', reason: 'stood', evidence: [], source: 'guard', uncertainty: 'low' } };
  }

  function cancelled(record: DirectiveRecord, startDay: number, tick: number): SpokenNetworkPayload {
    const action: EnemyActionReport = {
      kind: 'watch-cancelled', subject: null, about: null, district: 'd0', scheduleStartDay: startDay,
      guard: 'guard', venue: 'square', workedDay: null, occurredAt: tick,
    };
    return { kind: 'directive-report', directiveId: record.id, factRefs: [], enemyAction: action, onwardTo: null,
      report: { outcome: 'watch cancelled', reason: 'stood down', evidence: [], source: 'guard', uncertainty: 'low' } };
  }

  const spoken = (payload: SpokenNetworkPayload) => payload as Extract<SpokenNetworkPayload, { kind: 'directive-report' }>;

  it('a first-episode night that arrives after the second episode reported lands on the first row', () => {
    const { world, first, second } = twoEpisodes(true);
    settleEnemyOrderReport(world, second, spoken(worked(second, 'beta', 3, 3)));
    settleEnemyOrderReport(world, first, spoken(worked(first, 'alpha', 1, 2)));   // late: day 2's night, episode 1
    expect(ledger(world)).toEqual([
      expect.objectContaining({ subject: 'alpha', scheduleStartDay: 1, workedDays: [1, 2], directiveIds: [first.id] }),
      expect.objectContaining({ subject: 'beta', scheduleStartDay: 3, workedDays: [3], directiveIds: [second.id] }),
    ]);
  });

  it('a first-episode night whose row does not exist yet opens its own row, after the second\'s', () => {
    const { world, first, second } = twoEpisodes(false);
    settleEnemyOrderReport(world, second, spoken(worked(second, 'beta', 3, 3)));
    settleEnemyOrderReport(world, first, spoken(worked(first, 'alpha', 1, 1)));
    expect(ledger(world)).toEqual([
      expect.objectContaining({ subject: 'beta', lead: 'sf-beta', scheduleStartDay: 3, workedDays: [3], directiveIds: [second.id] }),
      expect.objectContaining({ subject: 'alpha', lead: 'sf-alpha', scheduleStartDay: 1, workedDays: [1], directiveIds: [first.id] }),
    ]);
  });

  /**
   * R46-1 (R46 review M1): in production a stand-down is reported through the CANCEL order's own
   * record (`cancel:watch:<district>:<guard>`), never through the watch record, so the row is found
   * by the spoken action's district and start day. The cases below issue the real tail-drop order.
   */
  function twoEpisodesBothPosted(): { world: WorldState; first: DirectiveRecord; second: DirectiveRecord } {
    const staged = twoEpisodes(true);
    settleEnemyOrderReport(staged.world, staged.second, spoken(worked(staged.second, 'beta', 3, 3)));
    return staged;
  }

  function cancelOrder(world: WorldState, lead: string, subject: string, startDay: number): DirectiveRecord {
    const n = world.network.directiveState!.records.length;
    applyEnemyDecision(world, decision(4, { tailDrops: [{
      leadFeatureId: lead, subject, district: 'd0', watchStartDay: startDay, untilDay: 6,
    }] }));
    const cancel = world.network.directiveState!.records[n]!;
    expect(cancel.authored.brief.application?.kind).toBe('cancel-watch');
    return cancel;
  }

  it('a first-episode stand-down, reported through its cancel order, removes only the first episode\'s post', () => {
    const { world } = twoEpisodesBothPosted();
    const cancel = cancelOrder(world, 'sf-alpha', 'alpha', 1);
    settleEnemyOrderReport(world, cancel, spoken(cancelled(cancel, 1, 6000)));
    expect(ledger(world).map((row) => [row.scheduleStartDay, row.posts.length])).toEqual([[1, 0], [3, 1]]);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);   // the second episode still stands the district
  });

  it('a second-episode stand-down, reported through its cancel order, removes only the second episode\'s post', () => {
    const { world } = twoEpisodesBothPosted();
    const cancel = cancelOrder(world, 'sf-beta', 'beta', 3);
    settleEnemyOrderReport(world, cancel, spoken(cancelled(cancel, 3, 6000)));
    expect(ledger(world).map((row) => [row.scheduleStartDay, row.posts.length])).toEqual([[1, 1], [3, 0]]);
    expect(world.enemy.watchedDistricts).toEqual(['d0']);   // the first episode still stands the district
  });

  // A stand-down that happens to be correlated to the WATCH record (the key matches both episodes)
  // still names its episode by start day; the by-key lookup must not pick the first row in array order.
  it('a stand-down correlated to the watch key itself still lands on the episode it names', () => {
    const { world, second } = twoEpisodesBothPosted();
    settleEnemyOrderReport(world, second, spoken(cancelled(second, 3, 6000)));
    expect(ledger(world).map((row) => [row.scheduleStartDay, row.posts.length])).toEqual([[1, 1], [3, 0]]);
  });
});

describe('an episode is the district AND the start day (R46-1, R46 review M2)', () => {
  const IDS2 = ['boss', 'g0', 'g1', 'alpha', 'beta'] as const;
  const FIXTURE2: TownFixture = {
    venues: [{ id: 'square', district: 'd0', access: 'public' }, { id: 'market', district: 'd1', access: 'public' }],
    npcs: IDS2.map((id) => ({
      id, name: id, home: id === 'g1' ? 'market' : 'square', occupation: id.startsWith('g') ? 'guard' : 'grocer',
      faction: 'none', traits: ['literalist'], rivals: [], schedule: [],
      edges: IDS2.filter((other) => other !== id).map((to) => ({ to, kind: 'friend' as const, trust: 0.8 })),
    })),
  };

  // Two districts watched on the same night share a start day (the digest issues both for day + 1),
  // so a row keyed by start day alone would merge d1's receipt into d0's row.
  it('same-night watches in two districts keep separate rows', () => {
    const world = buildWorld(FIXTURE2, 'two-districts', RULES);
    world.network.spymaster = 'boss';
    world.enemy.map = buildTownMap(FIXTURE2);
    applyEnemyDecision(world, decision(0, { watches: [
      { district: 'd0', posts: [{ guard: 'g0', venue: 'square' }], startDay: 1, subject: 'alpha', about: { subject: 'alpha' }, leadFeatureId: 'sf-a' },
      { district: 'd1', posts: [{ guard: 'g1', venue: 'market' }], startDay: 1, subject: 'beta', about: { subject: 'beta' }, leadFeatureId: 'sf-b' },
    ] }));
    const records = world.network.directiveState!.records;
    const recordFor = (district: string) => records.find((row) =>
      row.authored.brief.application?.kind === 'enemy-watch' && row.authored.brief.application.district === district)!;
    const workedIn = (record: DirectiveRecord, district: string, guard: string, venue: string, subject: string) => {
      const action: EnemyActionReport = {
        kind: 'watch-worked', subject, about: { subject }, district, scheduleStartDay: 1,
        guard, venue, workedDay: 1, occurredAt: 2580,
      };
      return { kind: 'directive-report', directiveId: record.id, factRefs: [], enemyAction: action, onwardTo: null,
        report: { outcome: 'watch worked', reason: 'stood', evidence: [], source: guard, uncertainty: 'low' } } as
        Extract<SpokenNetworkPayload, { kind: 'directive-report' }>;
    };
    settleEnemyOrderReport(world, recordFor('d0'), workedIn(recordFor('d0'), 'd0', 'g0', 'square', 'alpha'));
    settleEnemyOrderReport(world, recordFor('d1'), workedIn(recordFor('d1'), 'd1', 'g1', 'market', 'beta'));
    expect(ledger(world).map((row) => [row.orderKey, row.subject, row.scheduleStartDay, row.posts.length])).toEqual([
      ['watch:d0', 'alpha', 1, 1], ['watch:d1', 'beta', 1, 1],
    ]);
    expect(world.enemy.watchedDistricts).toEqual(['d0', 'd1']);
  });
});
