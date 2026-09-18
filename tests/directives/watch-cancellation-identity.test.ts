import { describe, expect, it } from 'vitest';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { positionOf } from '../../src/sim/agents';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import {
  attemptDirective, markDirectiveDue, settleDirectiveApplications,
} from '../../src/sim/directives/execution';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { DirectiveRecord, NetworkMessage } from '../../src/sim/directives/types';
import type { EnemyDecision } from '../../src/sim/enemy/state';
import { runUntil } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function worldWithOrdinaryVenue(venue: string = 'square'): WorldState {
  const town = miniTown();
  const keep = new Set(['ada', 'bez', 'cyn']);
  town.npcs = town.npcs.filter((npc) => keep.has(npc.id)).map((npc) => ({
    ...npc,
    traits: ['literalist'],
    schedule: [{ days: 'all' as const, from: 0, to: 1439,
      venue: npc.id === 'bez' ? venue : 'square' }],
    edges: npc.edges.filter((edge) => keep.has(edge.to)),
  }));
  const world = buildWorld(town, `watch-cancellation-identity-${venue}`, RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push({
    id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
  });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  world.enemy.map = {
    venues: Object.values(world.venues).map(({ id, district, access }) => ({ id, district, access })),
    directory: Object.values(world.npcs).map((npc) => ({
      id: npc.id, occupation: npc.occupation, district: 'd0',
    })),
  };
  return world;
}

const watchDecision = (day: number, startDay: number = 1): EnemyDecision => ({
  day, features: [], inquiries: [], interrogations: [],
  watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay }],
});

const cancellationDecision = (day: number): EnemyDecision => ({
  day, features: [], inquiries: [], interrogations: [], watches: [],
  tailDrops: [{
    leadFeatureId: 'r18-cancellation', subject: 'cyn', district: 'd0',
    watchStartDay: 1, untilDay: 9,
  }],
});

function orderRecords(world: WorldState, orderKey: string): DirectiveRecord[] {
  return world.network.directiveState!.records.filter((record) =>
    record.correlation?.kind === 'enemy-order' && record.correlation.orderKey === orderKey);
}

function reportMessages(world: WorldState, directiveId: string): NetworkMessage[] {
  return world.network.directiveState!.messages.filter((message) =>
    message.payload.kind === 'directive-report' && message.payload.directiveId === directiveId);
}

function deliveredChronicle(world: WorldState, directiveId: string) {
  const ids = new Set(reportMessages(world, directiveId).map((message) => message.id));
  return world.chronicle.filter((row) => row.kind === 'network-speech' && ids.has(row.messageId));
}

function startNormalWatch(world: WorldState): DirectiveRecord {
  applyEnemyDecision(world, watchDecision(0));
  const record = orderRecords(world, 'watch:d0')[0]!;
  runUntil(world, at(1, 18, 0), RULES);
  expect(record.received).not.toBeNull();
  expect(record.execution).toMatchObject({ state: 'attempted', workedDays: [1] });
  return record;
}

function cancelNormally(world: WorldState): DirectiveRecord {
  runUntil(world, at(2, 23, 59), RULES);
  expect(world.enemy.actionLedger?.[0]?.posts).toEqual([{ guard: 'bez', venue: 'square' }]);
  applyEnemyDecision(world, cancellationDecision(2));
  const record = orderRecords(world, 'cancel:watch:d0:bez')[0]!;
  runUntil(world, at(3, 1, 1), RULES);
  expect(record.received).not.toBeNull();
  expect(record.execution?.state).toBe('completed');
  expect(world.scheduleOverrides.bez).toBeUndefined();
  expect(world.enemy.watchedDistricts).toEqual([]);
  expect(world.enemy.actionLedger?.[0]?.posts).toEqual([]);
  return record;
}

describe('an enemy watch accrues work only for its own installed post', () => {
  it('normal cancellation cannot re-latch work, outcomes, reports, or HQ state from ordinary post presence', () => {
    const world = worldWithOrdinaryVenue();
    const original = startNormalWatch(world);
    cancelNormally(world);
    const worked = structuredClone(original.execution!.workedDays);
    const outcomes = structuredClone(original.outcomes);
    const reports = structuredClone(reportMessages(world, original.id));
    const chronicle = structuredClone(deliveredChronicle(world, original.id));

    runUntil(world, at(3, 18, 1), RULES);

    expect(positionOf(world, world.npcs.bez!, at(3, 18, 0))).toBe('square');
    expect(original.execution?.workedDays).toEqual(worked);
    expect(original.outcomes).toEqual(outcomes);
    expect(reportMessages(world, original.id)).toEqual(reports);
    expect(deliveredChronicle(world, original.id)).toEqual(chronicle);
    expect(world.enemy.actionLedger?.[0]?.posts).toEqual([]);
    expect(world.enemy.watchedDistricts).toEqual([]);
  });

  it('a surviving active watch still works on later days and reports them to HQ', () => {
    const world = worldWithOrdinaryVenue();
    const record = startNormalWatch(world);
    runUntil(world, at(3, 18, 1), RULES);
    expect(record.execution?.workedDays).toEqual([1, 2, 3]);
    expect(record.outcomes?.filter((row) => row.result.enemyAction?.kind === 'watch-worked')
      .map((row) => row.result.enemyAction!.workedDay)).toEqual([1, 2, 3]);
    expect(reportMessages(world, record.id)).toHaveLength(3);
    expect(world.enemy.actionLedger?.[0]).toMatchObject({
      posts: [{ guard: 'bez', venue: 'square' }], workedDays: [1, 2, 3],
    });
    expect(world.enemy.watchedDistricts).toEqual(['d0']);
  });

  it('a later same-guard/district watch supersedes the original by authored end-day identity', () => {
    const world = worldWithOrdinaryVenue();
    const original = startNormalWatch(world);
    const originalWorked = structuredClone(original.execution!.workedDays);

    // Bounded helper-level identity probe: delivery is real, while due/attempt/settle are invoked
    // explicitly so the original cannot take the first day-3 phase-5 latch before supersession.
    applyEnemyDecision(world, watchDecision(1, 3));
    const later = orderRecords(world, 'watch:d0')[1]!;
    const message = world.network.directiveState!.messages.find((row) =>
      row.payload.kind === 'directive' && row.payload.version.directiveId === later.id)!;
    expect(realizeNetworkForward(world, message.id,
      { venue: 'square', members: ['ada', 'bez', 'cyn'] }, world.tick, RULES)).not.toBeNull();
    const due = later.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, later.id, due);
    attemptDirective(world, later.id, { venue: 'square', members: ['ada', 'bez', 'cyn'] }, due, RULES);
    expect(world.scheduleOverrides.bez).toEqual([
      expect.objectContaining({ sourceRef: 'order:watch:d0:bez', fromDay: 3, toDay: 11 }),
    ]);

    world.tick = due + 15;
    settleDirectiveApplications(world, world.tick, RULES);
    expect(original.execution?.workedDays).toEqual(originalWorked);
    expect(later.execution?.workedDays).toEqual([3]);
  });

  it('an installed identity still needs physical presence at its effective post', () => {
    const world = worldWithOrdinaryVenue();
    const record = startNormalWatch(world);
    world.scheduleOverrides.bez!.unshift({
      fromDay: 2, toDay: 3, from: 960, to: 1140, venue: 'home-0',
      source: 'player', sourceRef: 'posting:bez',
    });
    const tick = 2 * TICKS_PER_DAY + 960;
    expect(positionOf(world, world.npcs.bez!, tick)).toBe('home-0');
    world.tick = tick;
    settleDirectiveApplications(world, tick, RULES);
    expect(record.execution?.workedDays).toEqual([1]);
  });
});
