import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { beginScryWindows, residueEvents } from '../../src/sim/magic';
import { captureEvidence } from '../../src/sim/counterintel';
import { captureIntel, playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { runUntil, step } from '../../src/sim/step';
import { stableStringify, cloneSerializable } from '../../src/sim/hash';
import { ingestObservedFieldReport, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { observationsFor, type TickEvents } from '../../src/sim/perception';
import { scryWorld } from './helpers/scry-world';

function paid() {
  const world = scryWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
  world.tick = 1440;
  return world;
}
const knowledge = (world: ReturnType<typeof paid>) => stableStringify({
  intel: world.intel, player: playerView(world), network: networkView(world), courier: courierRouteView(world),
});

describe('physical residue waits for lawful discovery and report', () => {
  it('empty speech tick holds remote discovery; only the later actual handler meeting changes evidence', () => {
    const world = paid();
    const before = stableStringify(enemyDigest(world.enemy, 1, R));
    const events = step(world, R);
    expect(events.utterances).toEqual([]);
    expect(events.askings).toEqual([]);
    expect(world.enemy.evidence.filter((row) => row.kind === 'arcane-residue')).toEqual([]);
    expect(stableStringify(enemyDigest(world.enemy, 1, R))).toBe(before);
    const held = world.network.directiveState!.heldObservations.filter((row) => row.principal === 'enemy');
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ observer: 'guard', observedAt: 1440, deliveredAt: null });
    runUntil(world, 1485, R);
    expect(world.enemy.evidence.filter((row) => row.kind === 'arcane-residue')).toEqual([]);
    step(world, R); // guard's real schedule reaches boss at minute 45
    const evidence = world.enemy.evidence.filter((row) => row.kind === 'arcane-residue');
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ observer: 'guard', speaker: null, addressedTo: null,
      venue: 'hall', residue: { id: 's0', witness: 'guard', observedAt: 1440 },
      receipt: { observer: 'boss', tick: 1485 } });
    expect(held[0]!.deliveredAt).toBe(1485);
    expect(world.magic!.traces).toHaveLength(1);
    const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({ subject: null, family: null, venue: 'hall', district: 'd0' });
    world.enemy.sketch.push(...features);
    expect(exposureStatus(world)).toMatchObject({ score: 0, identified: false });
    expect(enemyDigest(world.enemy, 2, R).features.filter((row) => row.kind === 'arcane-residue')).toEqual([]);
    expect(world.chronicle.filter((row) => row.kind === 'residue' && row.act === 'observed' && row.observer === 'guard')).toHaveLength(1);
  });
  it('spymaster own sighting is immediate without a made-up speaker or report envelope', () => {
    const world = paid();
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
    step(world, R);
    const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue')!;
    expect(entry).toMatchObject({ observer: 'boss', speaker: null, addressedTo: null, venue: 'hall' });
    expect(entry).not.toHaveProperty('receipt');
    expect(enemyDigest(world.enemy, 1, R).features.some((row) => row.kind === 'arcane-residue')).toBe(true);
  });
  it('omitted residue stays reportable; a later real encounter retries one held root', () => {
    const world = paid();
    world.network.enemyAssets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true });
    runUntil(world, 1486, R);
    const held = world.network.directiveState!.heldObservations.find((row) => row.principal === 'enemy')!;
    const first = world.network.directiveState!.messages.find((row) => row.id === held.queuedIn)!;
    expect(first.deliveredAt).toBe(1485);
    expect(held.deliveredAt).toBeNull();
    expect(world.enemy.evidence.some((row) => row.kind === 'arcane-residue')).toBe(false);
    expect(world.magic!.traces).toHaveLength(1);
    world.network.enemyAssets[0]!.turned = false; // channel-control twin; no fake receipt
    runUntil(world, 2881, R); // actual next-day visit to the still-present trace
    expect(held.queuedIn).not.toBe(first.id);
    expect(world.network.directiveState!.heldObservations.filter((row) => row.principal === 'enemy')).toHaveLength(1);
    runUntil(world, 2926, R);
    expect(held.deliveredAt).toBe(2925);
    expect(world.enemy.evidence.filter((row) => row.kind === 'arcane-residue')).toHaveLength(1);
    expect(world.magic!.traces).toHaveLength(1);
  });
  it('terminal failure retries only upon another local encounter; a live pending report does not duplicate', () => {
    const world = paid();
    const events = step(world, R);
    const held = world.network.directiveState!.heldObservations[0]!;
    const firstId = held.queuedIn;
    const first = world.network.directiveState!.messages.find((row) => row.id === firstId)!;
    const again = { ...events, tick: 1441 };
    captureEvidence(world, again, R);
    queueUnqueuedFieldReports(world);
    expect(held.queuedIn).toBe(firstId);
    first.failedAt = 1441; // terminal-transport control, not principal knowledge
    captureEvidence(world, { ...again, tick: 1442, positions: { boss: 'hq', guard: 'hq' } }, R);
    expect(held.queuedIn).toBe(firstId);
    captureEvidence(world, { ...again, tick: 1443 }, R);
    queueUnqueuedFieldReports(world);
    expect(held.queuedIn).not.toBe(firstId);
    expect(held.deliveredAt).toBeNull();
    expect(world.enemy.evidence.some((row) => row.kind === 'arcane-residue')).toBe(false);
  });
  it('receipt bookkeeping cannot change remote perception or a principal that heard nothing', () => {
    const world = paid();
    const events = step(world, R);
    const twin = cloneSerializable(world);
    const before = knowledge(twin);
    const physical = residueEvents(twin);
    twin.network.directiveState!.heldObservations[0]!.deliveredAt = 1455;
    expect(knowledge(twin)).toBe(before);
    expect(residueEvents(twin)).toEqual(physical);
    expect(observationsFor('citizen', { ...events, residues: residueEvents(twin) }))
      .toEqual(observationsFor('citizen', { ...events, residues: residueEvents(world) }));
  });
  it('the two principal copies stay independent and an empty spoken report conveys no residue', () => {
    const world = paid();
    beginScryWindows(world, 1440);
    world.intel.informants.push({ id: 'guard', assignedVenue: 'hall' });
    world.network.assets.push({ id: 'guard', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    const events: TickEvents = { tick: 1440, positions: { guard: 'hall', you: 'away', boss: 'hq' },
      utterances: [], askings: [], residues: residueEvents(world) };
    captureIntel(world, events, R);
    captureEvidence(world, events, R);
    queueUnqueuedFieldReports(world);
    const messages = world.network.directiveState!.messages;
    const playerMessage = messages.find((message) => message.principal === 'player')!;
    const enemyMessage = messages.find((message) => message.principal === 'enemy')!;
    const enemyBefore = stableStringify(world.enemy);
    const enemyPacketBefore = stableStringify(enemyMessage);
    const speech = realizeNetworkForward(world, playerMessage.id,
      { venue: 'away', members: ['guard', 'you'] }, 1455, R)!;
    ingestObservedFieldReport(world, 'player', speech);
    expect(world.intel.log.some((entry) => entry.kind === 'arcane-residue')).toBe(true);
    expect(stableStringify(world.enemy)).toBe(enemyBefore);
    expect(stableStringify(enemyMessage)).toBe(enemyPacketBefore);
    ingestObservedFieldReport(world, 'enemy', { ...speech, addressedTo: 'boss',
      spoken: { kind: 'field-report', items: [], onwardTo: null } });
    expect(stableStringify(world.enemy)).toBe(enemyBefore);
  });
  it('two paid traces at one venue retain two observations but produce one location feature', () => {
    const world = scryWorld();
    world.coin = 30;
    for (let i = 0; i < 2; i += 1) applyAction(world,
      { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 15 }, R);
    world.tick = 1440;
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
    step(world, R);
    expect(world.coin).toBe(0);
    expect(world.magic!.traces).toHaveLength(2);
    expect(world.enemy.evidence.filter((entry) => entry.kind === 'arcane-residue')).toHaveLength(2);
    expect(enemyDigest(world.enemy, 1, R).features.filter((entry) => entry.kind === 'arcane-residue')).toHaveLength(1);
  });
});
