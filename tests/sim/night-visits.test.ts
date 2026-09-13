import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { captureNightVisits } from '../../src/sim/night-visits';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { auditSketch } from './helpers/sketch-audit';
import { nightVisitWorld } from './helpers/seance-town';

const visits = (world: WorldState) => world.enemy.evidence.filter((row) => row.kind === 'night-visit');
const heldVisits = (world: WorldState) => (world.network.directiveState?.heldObservations ?? [])
  .filter((row) => row.content.kind === 'raw' && row.content.observation.kind === 'presence'
    && row.content.observation.witness !== undefined);
const features = (world: WorldState) => world.enemy.sketch.filter((row) => row.kind === 'night-visit');
const delivered = (): WorldState => {
  const world = nightVisitWorld(); runUntil(world, 46, R);
  expect(visits(world)).toHaveLength(1);
  return world;
};

describe('a night visit is seen locally and reported physically', () => {
  it('holds a silent local sighting; remote evidence changes only at the real later meeting', () => {
    const world = nightVisitWorld();
    const digest = stableStringify(enemyDigest(world.enemy, 0, R));
    const events = step(world, R);
    expect(events.utterances).toEqual([]); expect(events.askings).toEqual([]);
    expect(events.networkSpeeches ?? []).toEqual([]);
    expect(events.positions).toMatchObject({ you: 'chapel-d0', guard: 'chapel-d0', boss: 'hq' });
    expect(heldVisits(world)).toHaveLength(1);
    expect(heldVisits(world)[0]).toMatchObject({ observer: 'guard', observedAt: 0, deliveredAt: null,
      content: { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard' } } });
    expect(visits(world)).toEqual([]);
    expect(stableStringify(enemyDigest(world.enemy, 0, R))).toBe(digest);
    runUntil(world, 45, R);
    expect(visits(world)).toEqual([]); expect(heldVisits(world)[0]!.deliveredAt).toBeNull();
    const meeting = step(world, R);
    expect(meeting.positions).toMatchObject({ guard: 'hq', boss: 'hq', you: 'chapel-d0' });
    expect(visits(world)).toHaveLength(1);
    const entry = visits(world)[0]!;
    expect(entry).toMatchObject({ tick: 0, venue: 'chapel-d0', observer: 'guard',
      speaker: null, addressedTo: null, claimId: null, family: null,
      nightVisit: { actor: 'you', witness: 'guard', observedAt: 0 }, receipt: { tick: 45, observer: 'boss' } });
    const speech = meeting.networkSpeeches!.find((row) => row.messageId === entry.receipt!.messageId)!;
    expect(speech).toMatchObject({ speaker: 'guard', addressedTo: 'boss', venue: 'hq' });
    expect(speech.spoken.kind).toBe('field-report');
    if (speech.spoken.kind !== 'field-report') throw new Error('missing report');
    expect(speech.spoken.items.map((item) => item.observation)).toContainEqual({
      kind: 'presence', observedAt: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard',
    });
    expect(heldVisits(world)[0]!.deliveredAt).toBe(45);
    expect(world.enemy.evidence.some((row) => row.kind === 'network' && row.network.messageId === speech.messageId)).toBe(true);
  });
  it('the spymaster can see directly on a silent tick without a fictional report', () => {
    const world = nightVisitWorld(); world.enemy.observers = [];
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
    const events = step(world, R);
    expect(events.networkSpeeches ?? []).toEqual([]);
    expect(visits(world)).toHaveLength(1);
    expect(visits(world)[0]).toMatchObject({ observer: 'boss', nightVisit: { actor: 'you', witness: 'boss', observedAt: 0 } });
    expect(visits(world)[0]).not.toHaveProperty('receipt');
    expect(heldVisits(world)).toEqual([]);
  });
  it.each(['no-observer', 'elsewhere', 'daytime', 'not-chapel', 'no-avatar', 'no-principal'] as const)(
    'does not manufacture a sighting for %s', (fault) => {
      const world = nightVisitWorld();
      if (fault === 'no-observer') world.enemy.observers = [];
      if (fault === 'elsewhere') world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'square' }];
      if (fault === 'daytime') {
        world.tick = 240;
        world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
      }
      if (fault === 'not-chapel') world.playerVenue = 'square';
      if (fault === 'no-avatar') world.playerId = null;
      if (fault === 'no-principal') world.network.spymaster = null;
      step(world, R);
      expect(visits(world)).toEqual([]); expect(heldVisits(world)).toEqual([]);
      expect(world.chronicle.some((row) => row.kind === 'night-visit')).toBe(false);
    });
  it('capture requires event-local physical presence and does not read hidden spell state', () => {
    const world = nightVisitWorld();
    for (const key of ['departed', 'seanceUsed', 'magic'] as const) {
      Object.defineProperty(world, key, { configurable: true, get() { throw new Error('hidden magic read'); } });
    }
    captureNightVisits(world, { tick: 0, positions: { you: 'square', guard: 'chapel-d0', boss: 'hq' }, utterances: [], askings: [] });
    expect(heldVisits(world)).toEqual([]);
    captureNightVisits(world, { tick: 0, positions: { you: 'chapel-d0', guard: 'chapel-d0', boss: 'hq' }, utterances: [], askings: [] });
    expect(heldVisits(world)).toHaveLength(1);
  });
  it('an ordinary visit and a performed ritual create the same physical sighting/report evidence', () => {
    const ordinary = nightVisitWorld(); const ritual = nightVisitWorld();
    const frame = prepareTick(ritual, R);
    finishTick(ritual, R, frame, () => applyAction(ritual, { kind: 'seance', tick: 0 }, R, frame));
    runUntil(ritual, 46, R); runUntil(ordinary, 46, R);
    expect(visits(ritual)).toEqual(visits(ordinary));
    expect(heldVisits(ritual)).toEqual(heldVisits(ordinary));
    expect(ordinary).not.toHaveProperty('seanceUsed');
    expect(ritual.seanceUsed).toBeDefined();
  });
  it('a turned reporter can omit the atom; an empty spoken envelope is no physical evidence', () => {
    const world = nightVisitWorld();
    world.network.enemyAssets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0,
      strikes: 0, facts: [], turned: true });
    runUntil(world, 46, R);
    expect(heldVisits(world)).toHaveLength(1);
    const report = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === 45 && row.speaker === 'guard' && row.spoken.kind === 'field-report');
    expect(report).toBeDefined();
    if (report?.kind !== 'network-speech' || report.spoken.kind !== 'field-report') throw new Error('missing omission envelope');
    expect(report.spoken.items).toEqual([]);
    expect(visits(world)).toEqual([]);
    // Preserve ordinary presence closure, rather than silently extending Task3's residue retry law.
    expect(heldVisits(world)[0]!.deliveredAt).toBe(45);
  });
  it('the avatar overhearing the real report receives scene presence, never a false watch', () => {
    const world = nightVisitWorld(); world.venues.hq!.access = 'public';
    const log: Action[] = [{ kind: 'goTo', tick: 30, venue: 'hq' }];
    runLogOn(world, R, log, 46);
    expect(world.intel.log.some((row) => row.kind === 'scene-presence' && row.actor === 'you'
      && row.venue === 'chapel-d0' && row.via === 'guard')).toBe(true);
    expect(world.intel.log.some((row) => row.kind === 'presence' && row.actor === 'you')).toBe(false);
    expect(visits(world)).toHaveLength(1);
  });
});

describe('the scoped physical risk has a bounded, auditable consequence', () => {
  it.each([false, true])('nightly commits +1 exposure, no carrier identification; direct=%s', (direct) => {
    const world = nightVisitWorld();
    if (direct) {
      world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'square' }];
      world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'chapel-d0' }];
    }
    expect(exposureStatus(world)).toMatchObject({ score: 0, identified: false });
    runUntil(world, 1440, R);
    expect(visits(world)).toHaveLength(1);
    expect(features(world)).toHaveLength(1);
    expect(features(world)[0]).toMatchObject({ subject: 'you', family: null, district: 'd0', venue: 'chapel-d0' });
    expect(exposureStatus(world)).toMatchObject({ score: 1, identified: false });
    expect(world.enemy.sketch.filter((row) => row.kind === 'carrier-profile')).toEqual([]);
    auditSketch(world);
  });
  it('one report per daily encounter does not accumulate repeated-night feature pressure', () => {
    const world = nightVisitWorld(); runUntil(world, 15, R);
    expect(heldVisits(world)).toHaveLength(1);
    expect(world.chronicle.filter((row) => row.kind === 'night-visit')).toHaveLength(1);
    runUntil(world, 2880, R);
    expect(world.chronicle.filter((row) => row.kind === 'night-visit')).toHaveLength(2);
    expect(visits(world)).toHaveLength(2);
    expect(features(world)).toHaveLength(1);
    expect(exposureStatus(world)).toMatchObject({ score: 1, identified: false });
    expect(enemyDigest(world.enemy, 2, R).features.filter((row) => row.kind === 'night-visit')).toEqual([]);
    auditSketch(world);
  });
  it('pure digest sees only delivered evidence, and does not mutate its substrate', () => {
    const world = delivered();
    const before = stableStringify(world.enemy);
    const decision = enemyDigest(world.enemy, 0, R);
    expect(stableStringify(world.enemy)).toBe(before);
    expect(decision.features.filter((row) => row.kind === 'night-visit')).toHaveLength(1);
    const unseen = cloneSerializable(world); delete unseen.departed;
    unseen.npcs.ada!.edges = [];
    expect(enemyDigest(unseen.enemy, 0, R)).toEqual(decision);
  });
  it.each([false, true])('runaround ref equality respects physical identity; already priced same visit=%s', (same) => {
    // Pure digest vehicle, as in enemy-runaround.test.ts: a receipt-built lead plus staged spent orders.
    const world = delivered();
    const lead = enemyDigest(world.enemy, 0, R).features.find((row) => row.kind === 'night-visit')!;
    const old = cloneSerializable(lead);
    old.id = 'prior-runaround'; old.kind = 'runaround';
    if (!same) delete old.evidence[0]!.nightVisit; // legacy asking shares the two null ids
    world.enemy.sketch = [lead, old]; world.enemy.featureCounter = 2;
    world.enemy.actionLedger = [{
      orderKey: 'watch:d0', kind: 'watch', directiveIds: ['d-test'], leadFeatureId: lead.id,
      subject: 'you', about: { subject: 'you' }, district: 'd0', scheduleStartDay: 1,
      posts: [{ guard: 'guard', venue: 'square' }], workedDays: [1, 2], askedAt: null,
    }];
    const before = stableStringify(world.enemy);
    const runarounds = enemyDigest(world.enemy, 3, R).features.filter((row) => row.kind === 'runaround');
    expect(stableStringify(world.enemy)).toBe(before);
    expect(runarounds).toHaveLength(same ? 0 : 1);
    if (!same) {
      expect(runarounds[0]!.evidence).toEqual(lead.evidence);
      expect(runarounds[0]!.evidence[0]!.nightVisit).not.toBe(lead.evidence[0]!.nightVisit);
      runarounds[0]!.evidence[0]!.nightVisit!.actor = 'changed-output';
      expect(lead.evidence[0]!.nightVisit!.actor).toBe('you');
    }
  });
  it('real action/physical-report/nightly history and JSON survive replay exactly', () => {
    const live = nightVisitWorld();
    const action: Action = { kind: 'seance', tick: 0 };
    const frame = prepareTick(live, R);
    finishTick(live, R, frame, () => applyAction(live, action, R, frame));
    runUntil(live, 1440, R);
    const replay = runLogOn(nightVisitWorld(), R, cloneSerializable([action]), 1440);
    expect(features(live)).toHaveLength(1); expect(live.seanceUsed).toBeDefined();
    expect(stableStringify(replay)).toBe(stableStringify(live));
    expect(stableStringify(cloneSerializable(live))).toBe(stableStringify(live));
    auditSketch(live);
  });
  it.each(['no-evidence', 'no-sighting', 'bad-ref', 'missing-physical-ref', 'no-receipt', 'bad-message', 'not-heard', 'omitted-atom'] as const)(
    'the permanent auditor rejects %s after a nonempty successful physical chain', (fault) => {
      const good = delivered(); runUntil(good, 1440, R);
      expect(features(good)).toHaveLength(1); auditSketch(good);
      const bad = cloneSerializable(good);
      const entry = visits(bad)[0]!;
      const receipt = entry.receipt!;
      const speech = bad.chronicle.find((row) => row.kind === 'network-speech'
        && row.tick === receipt.tick && row.messageId === receipt.messageId);
      if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') throw new Error('missing positive report');
      if (fault === 'no-evidence') bad.enemy.evidence = bad.enemy.evidence.filter((row) => row.kind !== 'night-visit');
      if (fault === 'no-sighting') bad.chronicle = bad.chronicle.filter((row) => row.kind !== 'night-visit');
      if (fault === 'bad-ref') features(bad)[0]!.evidence[0]!.nightVisit!.actor = 'ada';
      if (fault === 'missing-physical-ref') {
        delete features(bad)[0]!.evidence[0]!.nightVisit;
        // A corrupt ref must not borrow this unrelated ordinary asking's matching null ids.
        bad.enemy.evidence.push({ kind: 'asking', tick: 0, venue: 'chapel-d0', observer: 'guard',
          speaker: 'ada', addressedTo: 'bez', overheard: true, mode: null, claimId: null,
          family: null, reported: null, about: { subject: 'ada' } });
        bad.chronicle.push({ kind: 'asking', tick: 0, venue: 'chapel-d0', speaker: 'ada',
          addressedTo: 'bez', about: { subject: 'ada' }, authority: false,
          heardBy: [{ id: 'guard', addressed: false }] });
      }
      if (fault === 'no-receipt') delete entry.receipt;
      if (fault === 'bad-message') entry.receipt!.messageId = 'missing';
      if (fault === 'not-heard') speech.heardBy = speech.heardBy.filter((row) => row.id !== 'boss');
      if (fault === 'omitted-atom') speech.spoken.items = [];
      expect(() => auditSketch(bad)).toThrow();
    });
it('a copied night-visit runaround cannot borrow an ordinary asking after its marker is stripped', () => {
  const world = delivered();
  const lead = enemyDigest(world.enemy, 0, R).features.find((row) => row.kind === 'night-visit');
  if (lead === undefined) throw new Error('test needs a night-visit lead');

  world.enemy.sketch = [lead];
  world.enemy.featureCounter = 1;
  world.enemy.actionLedger = [{
    orderKey: 'watch:d0', kind: 'watch', directiveIds: ['d-test'], leadFeatureId: lead.id,
    subject: 'you', about: { subject: 'you' }, district: 'd0', scheduleStartDay: 1,
    posts: [{ guard: 'guard', venue: 'square' }], workedDays: [1, 2], askedAt: null,
  }];

  const runaround = enemyDigest(world.enemy, 3, R).features.find((row) => row.kind === 'runaround');
  if (runaround === undefined) throw new Error('test needs the real runaround consumer');
  const ref = runaround.evidence[0]!;
  expect(ref).toMatchObject({ tick: 0, observer: 'guard', claimId: null, messageId: null });
  expect(ref.nightVisit).toBeDefined();

  // A lawful ordinary asking shares the copied physical ref's legacy lookup key.
  world.enemy.evidence.push({
    kind: 'asking', tick: ref.tick, venue: 'chapel-d0', observer: ref.observer,
    speaker: 'ada', addressedTo: 'bez', overheard: true, mode: null, claimId: null,
    family: null, reported: null, about: { subject: 'ada' },
  });
  world.chronicle.push({
    kind: 'asking', tick: ref.tick, venue: 'chapel-d0', speaker: 'ada', addressedTo: 'bez',
    about: { subject: 'ada' }, authority: false,
    heardBy: [{ id: ref.observer, addressed: false }],
  });
  world.enemy.sketch.push(runaround, {
    id: 'legacy-asking-twin', kind: 'entry-point', day: 0, family: null,
    subject: null, district: 'd0', detail: 'lawful asking beside copied physical evidence',
    evidence: [{ tick: ref.tick, observer: ref.observer, claimId: null, messageId: null }],
  });

  auditSketch(world); // intact physical runaround and ordinary legacy asking both pass
  const bad = cloneSerializable(world);
  const corrupted = bad.enemy.sketch.find((row) => row.id === runaround.id)!;
  delete corrupted.evidence[0]!.nightVisit;
  expect(() => auditSketch(bad)).toThrow(/runaround .* null-id ref lacks its physical marker/);
});

it('the residue-feature marker precondition runs before the night-visit value branch', () => {
  const world = nightVisitWorld();
  runUntil(world, 1440, R);
  const feature = features(world)[0]!;
  expect(feature.evidence[0]!.nightVisit).toBeDefined();
  feature.kind = 'arcane-residue';
  expect(() => auditSketch(world)).toThrow(/lacks its residue discriminant/);
});
});
