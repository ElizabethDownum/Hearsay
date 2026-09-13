import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { campaignMetrics } from '../../src/harness/metrics';
import { clustersOf, routeOf } from '../../src/intel/board';
import { corroborations } from '../../src/intel/codex';
import { informantLedger } from '../../src/intel/ledger';
import { isMagic, sourceKey } from '../../src/intel/provenance';
import { webView } from '../../src/intel/web';
import { applyGoTo } from '../../src/sim/actions';
import { applyAction } from '../../src/sim/campaign';
import { threadOf } from '../../src/sim/chronicle';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { applySeance } from '../../src/sim/seance';
import { runUntil } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { seanceWorld } from './helpers/seance-town';

const cast = (world: WorldState): void => applyAction(world, { kind: 'seance', tick: world.tick }, R);
const atomicRefusal = (world: WorldState, action: () => void, match: RegExp): void => {
  const before = stableStringify(world);
  expect(action).toThrow(match);
  expect(stableStringify(world)).toBe(before);
};

describe('séance is retained testimony, priced once', () => {
  it('debits 20, emits two explicit magic rows and one record without allocating a claim or belief', () => {
    const world = seanceWorld();
    const before = cloneSerializable(world);
    const metricsBefore = campaignMetrics(world, world.departed!.secretId);
    cast(world);
    const departed = world.departed!;
    expect(world.coin).toBe(before.coin - 20);
    expect(world.seanceUsed).toEqual({ operation: 'seance:' + departed.id, tick: 0 });
    expect(world.claims).toEqual(before.claims);
    expect(world.beliefs).toEqual(before.beliefs);
    expect(world.claimCounter).toBe(before.claimCounter);
    expect(campaignMetrics(world, departed.secretId)).toEqual(metricsBefore);
    expect(threadOf(world, departed.secretId).filter((row) => row.kind === 'seance')).toHaveLength(1);
    expect(world).not.toHaveProperty('magic');
    expect(world.intel.log).toHaveLength(2);
    expect(world.intel.log[0]).toMatchObject({ kind: 'utterance', family: departed.secretId,
      claimId: departed.claimId, reported: departed.reported, speaker: null, addressedTo: null });
    expect(world.intel.log[1]).toMatchObject({ kind: 'edge-read', edgeFrom: departed.edge.from,
      edgeTo: departed.edge.to, edgeKind: departed.edge.kind });
    for (const row of world.intel.log) {
      expect(row.provenance).toEqual({ kind: 'magic', spell: 'seance', operation: 'seance:' + departed.id });
      expect(row.via).toBe('seance');
      expect(row).not.toHaveProperty('document');
    }
    expect(world.chronicle.slice(before.chronicle.length)).toEqual([{
      kind: 'seance', tick: 0, operation: 'seance:' + departed.id, venue: 'chapel-d0',
      departedId: departed.id, claimId: departed.claimId, edge: departed.edge,
    }]);
  });
  it('uses the retained clue after live relationships change, with detached output data', () => {
    const world = seanceWorld();
    world.npcs.ada!.edges = [];
    cast(world);
    expect(world.intel.log[1]).toMatchObject({ edgeFrom: 'ada', edgeTo: 'bez', edgeKind: 'friend' });
    world.intel.log[0]!.reported!.severity = 1;
    expect(world.departed!.reported.severity).toBe(4);
    expect(world.claims[world.departed!.claimId]!.severity).toBe(4);
    const row = world.chronicle.find((entry) => entry.kind === 'seance')!;
    if (row.kind !== 'seance') throw new Error('missing ritual');
    row.edge.to = 'guard';
    expect(world.departed!.edge.to).toBe('bez');
  });
  it('clusters without fictional routes, carriers, receive/emit pairs or a second informant', () => {
    const world = seanceWorld();
    cast(world);
    const family = world.departed!.secretId;
    expect(clustersOf(world.intel.log)).toHaveLength(1);
    expect(routeOf(world.intel.log, family)).toEqual([]);
    expect(webView(world.intel.log, { kind: 'npc', id: 'ada' }).spokes).toEqual([]);
    for (const trait of Object.keys(R.traits)) {
      expect(corroborations(world.intel.log, 'ada', trait, R)).toEqual([]);
    }
    const ordinary = { ...cloneSerializable(world.intel.log[0]!), via: 'seance',
      speaker: 'ada', addressedTo: 'bez' };
    delete ordinary.provenance;
    expect(isMagic(ordinary)).toBe(false);
    expect(sourceKey(ordinary)).not.toBe(sourceKey(world.intel.log[0]!));
    world.intel.log.push(ordinary);
    expect(informantLedger(world.intel.log, 'seance').rows).toHaveLength(1);
    expect(informantLedger(world.intel.log, 'seance').corroboratedElsewhere).toEqual([]);
    expect(webView(world.intel.log, { kind: 'npc', id: 'ada' }).spokes.map((spoke) => spoke.carrier))
      .toEqual(['seance']);
  });
  it.each([0, 15, 225, 1440, 1665])('accepts legal beat %i including midnight and last legal beat', (tick) => {
    const world = seanceWorld(); world.tick = tick;
    cast(world);
    expect(world.seanceUsed!.tick).toBe(tick);
  });
  it.each([240, 1425, 1680])('refuses daytime %i atomically', (tick) => {
    const world = seanceWorld(); world.tick = tick;
    atomicRefusal(world, () => cast(world), /before 04:00/);
  });
  it.each([NaN, Infinity, -Infinity, -15, 0.5, 1])('refuses invalid beat %s before mutation', (tick) => {
    const world = seanceWorld(); world.tick = tick;
    atomicRefusal(world, () => applySeance(world, tick, R), /finite conversation beat/);
  });
  it.each(['player', 'nowhere', 'venue', 'departed', 'claim', 'testimony', 'coin'] as const)(
    'refuses invalid %s before debit or lazy allocation', (fault) => {
      const world = seanceWorld();
      if (fault === 'player') world.playerId = null;
      if (fault === 'nowhere') world.playerVenue = null;
      if (fault === 'venue') world.playerVenue = 'square';
      if (fault === 'departed') delete world.departed;
      if (fault === 'claim') delete world.claims[world.departed!.claimId];
      if (fault === 'testimony') world.departed!.reported.severity = 1;
      if (fault === 'coin') world.coin = 19;
      atomicRefusal(world, () => cast(world), /seance:/);
      expect(world).not.toHaveProperty('seanceUsed');
    });
  it.each([NaN, Infinity, -1, 0, 1.5])('rejects malformed price %s atomically', (price) => {
    const world = seanceWorld();
    atomicRefusal(world, () => applySeance(world, 0, { ...R, economy: { ...R.economy, seance: price } }), /price/);
  });
  it('requires rules, the current tick, and an avatar in an explicit offered frame', () => {
    const world = seanceWorld();
    atomicRefusal(world, () => applyAction(world, { kind: 'seance', tick: 0 }), /requires rules/);
    atomicRefusal(world, () => applyAction(world, { kind: 'seance', tick: 15 }, R), /action tick/);
    atomicRefusal(world, () => applySeance(world, 0, R, []), /avatar absent/);
  });
  it('accepts a real cathedral and rejects a chapel-shaped id absent from the world', () => {
    const world = seanceWorld(); world.playerVenue = 'chapel-missing';
    atomicRefusal(world, () => cast(world), /chapel or cathedral/);
    world.playerVenue = 'cathedral'; cast(world);
    expect(world.intel.log[0]!.venue).toBe('cathedral');
  });
  it('uses the actual frozen offered venue in both same-tick movement directions', () => {
    const legal = seanceWorld();
    const frame = prepareTick(legal, R);
    finishTick(legal, R, frame, () => {
      applyGoTo(legal, 'square');
      applyAction(legal, { kind: 'seance', tick: 0 }, R, frame);
    });
    expect(legal.playerVenue).toBe('square');
    expect(legal.intel.log.find(isMagic)!.venue).toBe('chapel-d0');
    const illegal = seanceWorld(); illegal.playerVenue = 'square';
    const inverse = prepareTick(illegal, R);
    finishTick(illegal, R, inverse, () => {
      applyGoTo(illegal, 'chapel-d0');
      atomicRefusal(illegal, () => applyAction(illegal, { kind: 'seance', tick: 0 }, R, inverse), /chapel/);
    });
    expect(illegal).not.toHaveProperty('seanceUsed');
  });
  it('keeps the campaign latch over a day boundary and JSON round trip', () => {
    const world = seanceWorld(); cast(world);
    const restored = cloneSerializable(world);
    restored.tick = 1440; restored.coin = 100;
    atomicRefusal(restored, () => cast(restored), /already spoken/);
  });
  it('leaves no-encounter no-magic worlds byte equal apart from retained metadata', () => {
    const a = seanceWorld(); a.playerVenue = 'square';
    const b = cloneSerializable(a); delete b.departed;
    runUntil(a, 60, R); runUntil(b, 60, R);
    expect(a).not.toHaveProperty('seanceUsed'); expect(a).not.toHaveProperty('magic');
    const comparable = cloneSerializable(a); delete comparable.departed;
    expect(stableStringify(comparable)).toBe(stableStringify(b));
  });
});
