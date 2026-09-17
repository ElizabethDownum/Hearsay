import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { captureEvidence } from '../../src/sim/counterintel';
import type { NetworkSpeech } from '../../src/sim/directives/types';
import { allocateNetworkMessage } from '../../src/sim/directives/state';
import { evidenceArrivals } from '../../src/sim/debrief/evidence';
import { featureLinks, counterFeatureLinks } from '../../src/sim/debrief/feature-links';
import { enemyDigest } from '../../src/sim/enemy/digest';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { nightVisitWorld } from '../sim/helpers/seance-town';
import { scryWorld } from '../sim/helpers/scry-world';

type Channel = 'arcane-residue' | 'night-visit';
function chain(kind: Channel, direct = false) {
  const world = kind === 'night-visit' ? nightVisitWorld() : scryWorld();
  if (kind === 'arcane-residue') {
    applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440;
  }
  if (direct) world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440,
    venue: kind === 'night-visit' ? 'chapel-d0' : 'hall' }];
  const observedAt = world.tick;
  step(world, R);
  if (!direct) {
    expect(world.enemy.evidence.some((entry) => entry.kind === kind)).toBe(false);
    expect(world.network.directiveState!.heldObservations.some((entry) => entry.observer === 'guard')).toBe(true);
    runUntil(world, observedAt + 46, R);
  }
  const index = world.enemy.evidence.findIndex((entry) => entry.kind === kind);
  const entry = world.enemy.evidence[index]!;
  if (entry.kind !== 'arcane-residue' && entry.kind !== 'night-visit') throw new Error('missing real physical evidence');
  const feature = enemyDigest(world.enemy, Math.floor(world.tick / 1440), R).features.find((row) => row.kind === kind)!;
  expect(feature).toBeDefined();
  retain(world, feature);
  const receiptIndex = world.chronicle.findIndex((row) => row.kind === 'network-speech'
    && row.tick === entry.receipt?.tick && row.messageId === entry.receipt.messageId);
  const sightingIndex = world.chronicle.findIndex((row) => kind === 'arcane-residue'
    ? row.kind === 'residue' && row.act === 'observed' && row.observer === entry.observer && row.tick === observedAt
    : row.kind === 'night-visit' && row.observer === entry.observer && row.tick === observedAt);
  return { world, index, entry, feature, receiptIndex, sightingIndex, observedAt };
}
function retain(world: WorldState, feature: SketchFeature, day = Math.floor(world.tick / 1440)) {
  world.enemy.decisions = [{ day, features: [cloneSerializable(feature)], watches: [], inquiries: [], interrogations: [] }];
  world.enemy.sketch = [cloneSerializable(feature)];
}
const link = (world: WorldState) => featureLinks(world)[0]!.references[0]!;

describe.each<Channel>(['arcane-residue', 'night-visit'])('physical %s causal debrief', (kind) => {
  it('a real next-day receipt stays late for the observation-day digest', () => {
    const world = kind === 'night-visit' ? nightVisitWorld() : scryWorld();
    if (kind === 'arcane-residue') {
      applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R); world.tick = 1440;
    }
    const observedAt = world.tick;
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: kind === 'night-visit' ? 'cathedral' : 'away' }];
    runUntil(world, observedAt + 1441, R);
    expect(world.enemy.evidence.some((entry) => entry.kind === kind)).toBe(false);
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }];
    runUntil(world, observedAt + 1486, R);
    const entry = world.enemy.evidence.find((row) => row.kind === kind)!;
    if (entry.kind !== 'night-visit' && entry.kind !== 'arcane-residue') throw new Error('no physical arrival');
    expect(entry).toMatchObject({ tick: observedAt, receipt: { tick: observedAt + 1485 } });
    const feature = enemyDigest(world.enemy, Math.floor(world.tick / 1440), R).features.find((row) => row.kind === kind)!;
    expect(feature).toBeDefined();
    retain(world, feature, Math.floor(observedAt / 1440)); expect(link(world).resolution).toBe('late');
    retain(world, feature); expect(link(world).resolution).toBe('resolved');
    expect(evidenceArrivals(world)[world.enemy.evidence.indexOf(entry)]).toMatchObject({ observedAt, learnedAt: observedAt + 1485 });
  });
  it('dates a real direct principal sighting without speech or attention', () => {
    const { world, index, observedAt, entry } = chain(kind, true);
    expect(entry.receipt).toBeUndefined();
    expect(evidenceArrivals(world)[index]).toMatchObject({ timing: 'direct', learnedAt: observedAt, reportMessageId: null });
    expect(link(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], attentionResolution: 'none', attentionIds: [] });
  });
  it('dates actual remote acquisition while retaining its original witness and observation', () => {
    const { world, index, observedAt, entry } = chain(kind);
    expect(entry.observer).toBe('guard');
    expect(entry.receipt).toMatchObject({ tick: observedAt + 45, observer: 'boss' });
    expect(evidenceArrivals(world)[index]).toMatchObject({ timing: 'report', observedAt, learnedAt: observedAt + 45,
      reportMessageId: entry.receipt!.messageId });
    expect(link(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'none', attentionIds: [] });
    expect(featureLinks(world)[0]!.feature.subject).toBe(kind === 'arcane-residue' ? null : 'you');
  });
  it('a later real retelling preserves the original physical identity and first acquired date', () => {
    const { world, entry, index, receiptIndex } = chain(kind);
    const original = cloneSerializable(entry); const arrival = cloneSerializable(evidenceArrivals(world)[index]);
    const receipt = world.chronicle[receiptIndex]!;
    if (receipt.kind !== 'network-speech' || receipt.spoken.kind !== 'field-report') throw new Error('missing speech');
    const id = allocateNetworkMessage(world, 'enemy', 'guard', ['boss'], { kind: 'field-report', origin: 'guard',
      sourceDirectiveId: null, sourceObservationIds: [], renderedItems: receipt.spoken.items.map((item, itemIndex) => ({
        ...cloneSerializable(item), rootFingerprint: receipt.reportRoots![itemIndex]!,
      })) }, world.tick, null, null);
    expect(world.network.directiveState!.messages.find((message) => message.id === id)!.deliveredAt).toBeNull();
    expect(evidenceArrivals(world)[index]).toEqual(arrival);
    world.npcs.guard!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }];
    runUntil(world, Math.ceil(world.tick / 15) * 15, R); step(world, R);
    const retelling = world.chronicle.find((row) => row.kind === 'network-speech' && row.messageId === id);
    expect(retelling).toMatchObject({ kind: 'network-speech', heardBy: [{ id: 'boss', addressed: true }] });
    expect(world.enemy.evidence[index]).toEqual(original);
    expect(evidenceArrivals(world)[index]).toEqual(arrival);
  });
  it('does not invent a direct receipt when the remote receipt field is missing', () => {
    const { world, index, entry } = chain(kind); delete entry.receipt;
    expect(evidenceArrivals(world)[index]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
    expect(link(world).resolution).toBe('unrecorded');
  });
  it('requires actual receipt history and restores only the actual date', () => {
    const { world, index, receiptIndex } = chain(kind);
    const before = cloneSerializable(evidenceArrivals(world)[index]);
    const receipt = world.chronicle.splice(receiptIndex, 1)[0]!;
    expect(evidenceArrivals(world)[index]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
    world.chronicle.splice(receiptIndex, 0, receipt);
    expect(evidenceArrivals(world)[index]).toEqual(before);
  });
  it('requires the original witness rather than a matching observer name elsewhere', () => {
    const { world, sightingIndex } = chain(kind);
    const sighting = world.chronicle[sightingIndex]!;
    if (sighting.kind !== 'residue' && sighting.kind !== 'night-visit') throw new Error('missing sighting');
    sighting.observer = 'boss';
    expect(link(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'missing', attentionIds: [] });
  });
  it('an empty actual spoken atom set stays unknown despite held content and an envelope', () => {
    const { world, index, receiptIndex } = chain(kind);
    const receipt = world.chronicle[receiptIndex]!;
    if (receipt.kind !== 'network-speech' || receipt.spoken.kind !== 'field-report') throw new Error('missing speech');
    expect(world.network.directiveState!.heldObservations.length).toBeGreaterThan(0);
    receipt.spoken.items = [];
    expect(evidenceArrivals(world)[index]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
  });
  it('an unheard actual report does not convey physical knowledge', () => {
    const { world, receiptIndex } = chain(kind); const row = world.chronicle[receiptIndex]!;
    if (row.kind !== 'network-speech') throw new Error('missing speech'); row.heardBy = [];
    expect(link(world).resolution).toBe('unrecorded');
  });
  it('duplicate receipt records remain ambiguous instead of choosing the first', () => {
    const { world, receiptIndex } = chain(kind);
    world.chronicle.push(cloneSerializable(world.chronicle[receiptIndex]!));
    expect(link(world)).toMatchObject({ resolution: 'ambiguous', attentionIds: [] });
  });
  it('a conflicting explicit principal receipt cannot borrow a real earlier envelope', () => {
    const { world, entry } = chain(kind); entry.receipt!.observer = 'ada';
    expect(link(world)).toMatchObject({ resolution: 'unrecorded', attentionIds: [] });
  });
  it('a duplicated actual physical atom leaves receipt identity ambiguous', () => {
    const { world, receiptIndex } = chain(kind); const receipt = world.chronicle[receiptIndex]!;
    if (receipt.kind !== 'network-speech' || receipt.spoken.kind !== 'field-report') throw new Error('missing speech');
    receipt.spoken.items.push(cloneSerializable(receipt.spoken.items[0]!));
    expect(link(world).resolution).toBe('ambiguous');
  });
  it('duplicate original sightings cannot become invented causal attention', () => {
    const { world, sightingIndex } = chain(kind);
    world.chronicle.push(cloneSerializable(world.chronicle[sightingIndex]!));
    expect(link(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('duplicate physical evidence identities cannot be selected silently', () => {
    const { world, entry } = chain(kind); world.enemy.evidence.push(cloneSerializable(entry));
    expect(link(world).resolution).toBe('ambiguous');
  });
  it('missing physical evidence stays missing', () => {
    const { world, index } = chain(kind); world.enemy.evidence.splice(index, 1);
    expect(link(world).resolution).toBe('missing');
  });
  it('a later physical trace is no substitute for the recorded sighting', () => {
    const { world, sightingIndex } = chain(kind, true);
    world.chronicle[sightingIndex]!.tick += 15; world.tick += 15;
    expect(link(world).resolution).toBe('unrecorded');
  });
  it('does not backdate a late received atom into an earlier digest', () => {
    const { world, feature, observedAt } = chain(kind);
    retain(world, feature, Math.floor(observedAt / 1440) - 1);
    expect(link(world).resolution).toBe('late');
    retain(world, feature); expect(link(world).resolution).toBe('resolved');
  });
  it('keeps orphan digest day unknown independently of a known receipt date', () => {
    const { world } = chain(kind); world.enemy.decisions = [];
    expect(featureLinks(world)[0]!.recordedDay).toBeNull();
    expect(link(world).resolution).toBe('unrecorded');
  });
  it('does not borrow an ordinary null-ID twin after a copied marker is removed', () => {
    const { world, feature, entry } = chain(kind, true);
    const asking = { kind: 'asking' as const, tick: entry.tick, venue: entry.venue, speaker: 'ada',
      addressedTo: entry.observer, about: { subject: 'you' }, authority: false,
      heardBy: [{ id: entry.observer, addressed: true }] };
    world.chronicle.push(asking);
    world.enemy.evidence.push({ kind: 'asking', tick: entry.tick, venue: entry.venue, observer: entry.observer,
      speaker: 'ada', addressedTo: entry.observer, about: { subject: 'you' }, mode: null, claimId: null,
      family: null, reported: null, overheard: false });
    feature.kind = 'runaround'; retain(world, feature);
    expect(link(world).resolution).toBe('resolved');
    delete feature.evidence[0]!.residue; delete feature.evidence[0]!.nightVisit; retain(world, feature);
    expect(link(world)).toMatchObject({ resolution: 'unsupported', attentionIds: [] });
  });
  it('cross-channel and dual markers cannot satisfy a physical feature', () => {
    const { world, feature } = chain(kind);
    feature.kind = kind === 'arcane-residue' ? 'night-visit' : 'arcane-residue'; retain(world, feature);
    expect(link(world).resolution).toBe('unsupported');
    feature.evidence[0]!.residue = { id: 's0', witness: 'guard', observedAt: feature.evidence[0]!.tick };
    feature.evidence[0]!.nightVisit = { actor: 'you', witness: 'guard', observedAt: feature.evidence[0]!.tick };
    retain(world, feature); expect(link(world).resolution).toBe('unsupported');
  });
  it('owns all nested output and leaves every retained input byte unchanged', () => {
    const { world } = chain(kind); const before = hashWorld(world);
    const expected = counterFeatureLinks(world, 10); const actual = counterFeatureLinks(world, 10);
    expect(actual).toEqual(expected);
    const ref = actual.features[0]!.references[0]!;
    if (ref.ref.residue) ref.ref.residue.witness = 'mutated';
    if (ref.ref.nightVisit) ref.ref.nightVisit.actor = 'mutated';
    ref.evidenceIndexes.push(999); ref.attentionIds.push('invented');
    actual.features[0]!.feature.evidence[0]!.observer = 'mutated';
    expect(hashWorld(world)).toBe(before);
    expect(counterFeatureLinks(world, 10)).toEqual(expected);
  });
});

it('distinct daily night visits retain their own original identities across physical reports', () => {
  const { world } = chain('night-visit'); runUntil(world, 1486, R);
  const entries = world.enemy.evidence.filter((entry) => entry.kind === 'night-visit');
  expect(entries.map((entry) => entry.nightVisit.observedAt)).toEqual([0, 1440]);
  expect(entries.map((entry) => entry.receipt!.tick)).toEqual([45, 1485]);
  const arrivals = evidenceArrivals(world);
  expect(entries.map((entry) => arrivals[world.enemy.evidence.indexOf(entry)]!.learnedAt)).toEqual([45, 1485]);
});

function mixed(omitPhysical = false) {
  const world = nightVisitWorld(); step(world, R); // real remote sighting, still no HQ evidence
  const speech: NetworkSpeech = { tick: 45, venue: 'hq', circleMembers: ['guard', 'boss'], speaker: 'guard',
    addressedTo: 'boss', messageId: 'mixed-proof', cause: null, spoken: { kind: 'field-report', onwardTo: null, items: [
      { factRefs: [], observation: { kind: 'presence', observedAt: 0, venue: 'chapel-d0', actor: 'you', witness: 'guard' } },
      { factRefs: [], observation: { kind: 'asking', observedAt: 15, venue: 'square', speaker: 'ada',
        addressedTo: 'bez', overheard: true, authority: false, about: { subject: 'you' } } },
    ] } };
  world.tick = 45;
  if (speech.spoken.kind !== 'field-report') throw new Error('missing field report');
  if (omitPhysical) speech.spoken.items.shift();
  world.chronicle.push({ kind: 'asking', tick: 15, venue: 'square', speaker: 'ada', addressedTo: 'bez',
    authority: false, about: { subject: 'you' }, heardBy: [{ id: 'guard', addressed: false }] });
  world.chronicle.push({ ...speech, kind: 'network-speech', heardBy: [{ id: 'boss', addressed: true }] });
  captureEvidence(world, { tick: 45, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] }, R);
  return { world, speech };
}
it('mixed actual physical and ordinary spoken items preserve ordinary child receipt chronology', () => {
  const { world } = mixed();
  expect(world.enemy.evidence.map((entry) => entry.kind)).toEqual(['network', 'night-visit', 'asking']);
  expect(evidenceArrivals(world)).toMatchObject([
    { timing: 'direct', learnedAt: 45 }, { timing: 'report', learnedAt: 45 }, { timing: 'report', learnedAt: 45 },
  ]);
});
it('an actually omitted physical atom leaves the ordinary append index intact', () => {
  const { world } = mixed(true);
  expect(world.enemy.evidence.map((entry) => entry.kind)).toEqual(['network', 'asking']);
  expect(evidenceArrivals(world)).toMatchObject([{ timing: 'direct', learnedAt: 45 }, { timing: 'report', learnedAt: 45 }]);
});
it('a mixed wrapper missing its receipt reserves ordinary candidates across the physical slot', () => {
  const { world } = mixed(); world.chronicle = world.chronicle.filter((row) => row.kind !== 'network-speech');
  expect(evidenceArrivals(world)).toMatchObject([
    { timing: 'unrecorded', learnedAt: null }, { timing: 'unrecorded', learnedAt: null }, { timing: 'unrecorded', learnedAt: null },
  ]);
});
it('an ambiguous physical slot leaves its following ordinary candidate conservatively undated', () => {
  const { world } = mixed();
  const receipt = world.chronicle.find((row) => row.kind === 'network-speech')!;
  world.chronicle.push(cloneSerializable(receipt));
  expect(evidenceArrivals(world)[2]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
});
it('duplicate physical append rows cannot extend receipt association beyond the maximum span', () => {
  const { world } = mixed();
  world.enemy.evidence.splice(1, 0, cloneSerializable(world.enemy.evidence[1]!));
  world.chronicle = world.chronicle.filter((row) => row.kind !== 'asking');
  const outside = evidenceArrivals(world)[3]!;
  expect(outside).toMatchObject({ timing: 'unrecorded', learnedAt: null });
  expect(outside).not.toHaveProperty('reportEvidenceIndex');
});
it('an already acquired physical identity can dedupe while the next report still appends ordinary speech', () => {
  const { world, speech } = mixed();
  const physical = cloneSerializable(world.enemy.evidence[1]!);
  world.enemy.evidence = [physical];
  captureEvidence(world, { tick: 45, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] }, R);
  expect(world.enemy.evidence.map((entry) => entry.kind)).toEqual(['night-visit', 'network', 'asking']);
  expect(evidenceArrivals(world)[2]).toMatchObject({ timing: 'report', learnedAt: 45 });
  expect(world.enemy.evidence[0]).toEqual(physical);
});
it('real simultaneous residue and night-visit evidence cannot alias through their null speech IDs', () => {
  const world = nightVisitWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'chapel-d0', day: 1, from: 0, to: 60 }, R);
  world.tick = 1440; runUntil(world, 1486, R);
  const features = enemyDigest(world.enemy, 1, R).features.filter((feature) => feature.kind === 'arcane-residue' || feature.kind === 'night-visit');
  expect(features).toHaveLength(2);
  world.enemy.decisions = [{ day: 1, features, watches: [], inquiries: [], interrogations: [] }]; world.enemy.sketch = features;
  const rows = featureLinks(world);
  expect(rows.map((row) => row.references[0]!.resolution)).toEqual(['resolved', 'resolved']);
  expect(rows.map((row) => row.references[0]!.ref)).toMatchObject([
    { tick: 1440, observer: 'guard', claimId: null, messageId: null },
    { tick: 1440, observer: 'guard', claimId: null, messageId: null },
  ]);
  expect(rows[0]!.references[0]!.evidenceIndexes).not.toEqual(rows[1]!.references[0]!.evidenceIndexes);
});
it('the actual runaround consumer retains a marked night visit and cannot borrow an ordinary asking twin', () => {
  const { world, feature, entry } = chain('night-visit');
  world.enemy.actionLedger = [{ orderKey: 'watch:d0', kind: 'watch', directiveIds: ['recorded-HQ-work'],
    leadFeatureId: feature.id, subject: 'you', about: { subject: 'you' }, district: 'd0', scheduleStartDay: 1,
    posts: [{ guard: 'guard', venue: 'square' }], workedDays: [1, 2], askedAt: null }];
  const copied = enemyDigest(world.enemy, 3, R).features.find((row) => row.kind === 'runaround')!;
  expect(copied).toBeDefined(); retain(world, copied, 3);
  expect(link(world)).toMatchObject({ resolution: 'resolved', ref: { nightVisit: entry.nightVisit } });
  world.enemy.evidence.push({ kind: 'asking', tick: entry.tick, venue: entry.venue, observer: entry.observer,
    speaker: 'ada', addressedTo: entry.observer, about: { subject: 'you' }, mode: null, claimId: null,
    family: null, reported: null, overheard: false });
  world.chronicle.push({ kind: 'asking', tick: entry.tick, venue: entry.venue, speaker: 'ada',
    addressedTo: entry.observer, about: { subject: 'you' }, authority: false,
    heardBy: [{ id: entry.observer, addressed: true }] });
  delete copied.evidence[0]!.nightVisit; retain(world, copied, 3);
  expect(link(world)).toMatchObject({ resolution: 'unsupported', attentionIds: [] });
});
