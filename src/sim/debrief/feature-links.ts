import { dayOf, TICKS_PER_DAY } from '../../core/time';
import type { Observation } from '../perception';
import type { EvidenceEntry, SketchEvidenceRef, SketchFeature } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import { SOMEONE } from '../rumors/claim';
import type { WorldState } from '../types';
import { attentionAt, type ActualAttention } from './attention';
import { evidenceArrivals, physicalAcquisition, physicalSightings, type EvidenceArrival, type PhysicalEvidence } from './evidence';
import { sketchTimeline } from './timeline';

export interface FeatureReferenceLink {
  ref: SketchEvidenceRef;
  /** Receipt resolution and performed-attention resolution are independent. */
  resolution: 'resolved' | 'ambiguous' | 'unrecorded' | 'late' | 'missing' | 'unsupported';
  evidenceIndexes: number[];
  undatedEvidenceIndexes: number[];
  laterEvidenceIndexes: number[];
  attentionResolution: 'linked' | 'ambiguous' | 'unrecorded' | 'missing' | 'none' | 'unsupported';
  attentionIds: string[];
}
export interface FeatureLink {
  feature: SketchFeature;
  /** The retained decision day, never inferred from an observation or feature.day. */
  recordedDay: number | null;
  references: FeatureReferenceLink[];
}
type Source = { observer: string; observation: Observation };
type SourceResult = { source: Source } | { status: 'ambiguous' | 'unrecorded' | 'missing' | 'none' };
const legacyKinds = new Set<string>(['entry-point', 'district-activity', 'origin-vague',
  'carrier-profile', 'runaround', 'forged-document']);
const legacyRefFields = new Set(['tick', 'observer', 'claimId', 'messageId']);

function directSource(world: WorldState, entry: EvidenceEntry): Source | null {
  const observer = entry.kind === 'network' && entry.leaked ? world.network.spymaster : entry.observer;
  if (observer === null) return null;
  if (entry.kind === 'utterance') {
    const claim = world.claims[entry.claimId];
    if (!claim) return null;
    return { observer, observation: { kind: 'utterance', tick: entry.tick, venue: entry.venue,
      speaker: entry.speaker, addressedTo: entry.addressedTo, claim,
      overheard: entry.overheard, mode: entry.mode } };
  }
  if (entry.kind === 'asking') return { observer, observation: { kind: 'asking',
    tick: entry.tick, venue: entry.venue, speaker: entry.speaker, addressedTo: entry.addressedTo,
    overheard: entry.overheard, about: entry.about, authority: false } };
  if (entry.kind === 'network') return { observer, observation: { kind: 'network-speech',
    tick: entry.tick, venue: entry.venue, speaker: entry.speaker, addressedTo: entry.addressedTo,
    overheard: entry.overheard, messageId: entry.network.messageId, spoken: entry.network.spoken } };
  return null;
}

/** Raw holdings retain the original witness; reported holdings are never promoted to raw truth. */
function rootSource(world: WorldState, arrival: EvidenceArrival): SourceResult {
  if (arrival.rootFingerprint === undefined) return { status: 'unrecorded' };
  const sources = new Map<string, Source>();
  for (const held of world.network.directiveState?.heldObservations ?? []) {
    if (held.rootFingerprint !== arrival.rootFingerprint || held.content.kind !== 'raw') continue;
    const source = { observer: held.observer, observation: held.content.observation };
    sources.set(stableStringify(source), source);
  }
  if (sources.size !== 1) return { status: sources.size > 1 ? 'ambiguous' : 'unrecorded' };
  return { source: sources.values().next().value! };
}

/** Require the original physical event and witness; reported words may have changed. */
function eventIndexes(world: WorldState, source: Source): number[] {
  const observation = source.observation;
  const indexes: number[] = [];
  world.chronicle.forEach((row, index) => {
    if (row.tick !== observation.tick || !('heardBy' in row) || row.venue !== observation.venue) return;
    if (!row.heardBy.some((hearer) => hearer.id === source.observer)
      && !(row.kind === 'network-speech' && row.speaker === source.observer)) return;
    if (observation.kind === 'utterance' && row.kind === 'telling'
      && row.speaker === observation.speaker && row.addressedTo === observation.addressedTo
      && row.claimId === observation.claim.id && row.mode === observation.mode) indexes.push(index);
    if (observation.kind === 'asking' && row.kind === 'asking'
      && row.speaker === observation.speaker && row.addressedTo === observation.addressedTo
      && stableStringify(row.about) === stableStringify(observation.about)) indexes.push(index);
    if (observation.kind === 'network-speech' && row.kind === 'network-speech'
      && row.speaker === observation.speaker && row.addressedTo === observation.addressedTo
      && row.messageId === observation.messageId
      && stableStringify(row.spoken) === stableStringify(observation.spoken)) indexes.push(index);
  });
  return indexes;
}

function sourceOf(world: WorldState, index: number, feature: SketchFeature,
  arrivals: EvidenceArrival[]): SourceResult {
  const arrival = arrivals[index]!;
  if (arrival.timing === 'report') return rootSource(world, arrival);
  const entry = world.enemy.evidence[index]!;
  const direct = directSource(world, entry);
  if (direct === null) return { status: 'unrecorded' };
  if (entry.kind !== 'network' || entry.network.spoken.kind !== 'field-report') return { source: direct };
  const receiptEvents = eventIndexes(world, direct);
  if (receiptEvents.length !== 1) return { status: receiptEvents.length > 1 ? 'ambiguous' : 'missing' };
  // R20: H10 cites the actual received envelope. Its document answer still needs a unique
  // retained item/root to explain earlier attention. A runaround can copy that same lead ref.
  // Other envelope items and the packet's mutable carried copy confer no causal links.
  if (feature.kind !== 'forged-document' && feature.kind !== 'runaround') return { source: direct };
  const candidates = entry.network.spoken.items.flatMap((item, itemIndex) => {
    const observation = item.observation;
    return observation.kind === 'utterance' && observation.mode === 'answer' && observation.document === true
      && observation.reported.attribution !== SOMEONE && observation.reported.attribution !== observation.speaker
      && observation.reported.attribution === feature.subject ? [itemIndex] : [];
  });
  if (candidates.length !== 1) return { status: candidates.length > 1 ? 'ambiguous' : 'none' };
  const children = arrivals.filter((row) => row.reportEvidenceIndex === index && row.reportItemIndex === candidates[0]);
  if (children.length !== 1) return { status: children.length > 1 ? 'ambiguous' : 'unrecorded' };
  return rootSource(world, children[0]!);
}

function attentionFor(world: WorldState, source: Source, acts: ActualAttention[]):
  Pick<FeatureReferenceLink, 'attentionResolution' | 'attentionIds'> {
  const indexes = eventIndexes(world, source);
  if (indexes.length !== 1) return { attentionResolution: indexes.length > 1 ? 'ambiguous' : 'missing', attentionIds: [] };
  const event = world.chronicle[indexes[0]!]!;
  const matchingQuestions = event.kind === 'telling' && event.mode === 'answer' ? acts.filter((act) => {
    if (act.kind !== 'questioning') return false;
    const asking = world.chronicle[act.chronicleIndexes[0]!]!;
    return asking.kind === 'asking' && asking.tick === event.tick && asking.venue === event.venue
      && asking.speaker === event.addressedTo && asking.addressedTo === event.speaker;
  }) : [];
  // Duplicate same-beat askings do not let findIndex silently select a compulsion cause.
  if (matchingQuestions.length > 1) return { attentionResolution: 'ambiguous', attentionIds: [] };
  const ids = acts.filter((act) => {
    if (act.chronicleIndexes.includes(indexes[0]!)) return true;
    if (matchingQuestions.some((question) => question.id === act.id)) return true;
    if (act.kind !== 'watch' || act.actor !== source.observer || act.venue !== source.observation.venue) return false;
    // Work history proves one staffing beat. It does not prove uninterrupted staffing later.
    return (world.network.directiveState?.records ?? []).some((record) => act.directiveIds.includes(record.id)
      && (record.outcomes ?? []).some((outcome) => {
        const work = outcome.result.enemyAction;
        return work?.kind === 'watch-worked' && work.guard === source.observer
          && work.venue === source.observation.venue && work.occurredAt === source.observation.tick
          && work.workedDay === dayOf(source.observation.tick) && outcome.tick <= world.tick;
      }));
  }).map((act) => act.id).sort();
  return { attentionResolution: ids.length > 0 ? 'linked' : 'none', attentionIds: ids };
}


function physicalReference(world: WorldState, feature: SketchFeature, ref: SketchEvidenceRef,
  day: number | null, arrivals: EvidenceArrival[], link: FeatureReferenceLink): FeatureReferenceLink {
  const residue = ref.residue;
  const visit = ref.nightVisit;
  const allowed = new Set([...legacyRefFields, 'residue', 'nightVisit']);
  const marker = residue ?? visit;
  const fields = residue === undefined ? ['actor', 'witness', 'observedAt'] : ['id', 'witness', 'observedAt'];
  const validMarker = marker !== undefined && Object.keys(marker).length === fields.length
    && Object.keys(marker).every((key) => fields.includes(key))
    && typeof marker.witness === 'string' && marker.observedAt === ref.tick
    && marker.witness === ref.observer
    && (residue === undefined ? typeof visit?.actor === 'string' : typeof residue.id === 'string');
  if (!validMarker || Object.keys(ref).some((key) => !allowed.has(key)) || (residue === undefined) === (visit === undefined)
    || ref.claimId !== null || ref.messageId !== null
    || (feature.kind === 'arcane-residue' && residue === undefined)
    || (feature.kind === 'night-visit' && visit === undefined)
    || !['arcane-residue', 'night-visit', 'runaround'].includes(feature.kind)) {
    return { ...link, resolution: 'unsupported', attentionResolution: 'unsupported' };
  }
  let ambiguousReceipt = false;
  world.enemy.evidence.forEach((entry, index) => {
    if (entry.tick !== ref.tick || entry.observer !== ref.observer) return;
    if (!(entry.kind === 'arcane-residue' && residue !== undefined
      && stableStringify(entry.residue) === stableStringify(residue))
      && !(entry.kind === 'night-visit' && visit !== undefined
      && stableStringify(entry.nightVisit) === stableStringify(visit))) return;
    if ((feature.kind === 'arcane-residue' && (feature.subject !== null || feature.family !== null || feature.venue !== entry.venue))
      || (feature.kind === 'night-visit' && (feature.subject !== visit?.actor || feature.family !== null || feature.venue !== entry.venue))) return;
    const acquired = physicalAcquisition(world, entry);
    ambiguousReceipt ||= acquired.ambiguous;
    const arrival = arrivals[index]!;
    if (arrival.learnedAt === null || day === null) link.undatedEvidenceIndexes.push(index);
    else if (dayOf(arrival.learnedAt) > day) link.laterEvidenceIndexes.push(index);
    else link.evidenceIndexes.push(index);
  });
  if (ambiguousReceipt || link.evidenceIndexes.length > 1
    || (link.evidenceIndexes.length > 0 && link.undatedEvidenceIndexes.length > 0)) {
    link.resolution = 'ambiguous'; link.attentionResolution = 'ambiguous';
  } else if (link.evidenceIndexes.length === 0) {
    link.resolution = link.undatedEvidenceIndexes.length > 0 ? 'unrecorded'
      : link.laterEvidenceIndexes.length > 0 ? 'late' : 'missing';
  } else {
    link.resolution = 'resolved';
    const entry = world.enemy.evidence[link.evidenceIndexes[0]!]! as PhysicalEvidence;
    const sightings = physicalSightings(world, entry);
    link.attentionResolution = sightings.length > 1 ? 'ambiguous' : sightings.length === 0 ? 'missing' : 'none';
    // A physical sighting establishes no question, carrier, séance or staffed watch by itself.
  }
  return link;
}

/** Retained ordinary and explicitly marked physical references, with independent acquisition and attention. */
export function featureLinks(world: WorldState): FeatureLink[] {
  const timeline = sketchTimeline(world);
  const arrivals = evidenceArrivals(world);
  const rows: { feature: SketchFeature; day: number | null }[] = timeline.nights.flatMap((night) =>
    night.added.map((feature) => ({ feature, day: night.day as number | null })))
    .concat(timeline.unrecorded.map((feature) => ({ feature, day: null })));
  return rows.map(({ feature, day }): FeatureLink => {
    const through = day === null ? world.tick : Math.min(world.tick, (day + 1) * TICKS_PER_DAY - 1);
    const acts = attentionAt(world, through).actual;
    return { feature: cloneSerializable(feature), recordedDay: day,
      references: feature.evidence.map((ref): FeatureReferenceLink => {
        const link: FeatureReferenceLink = { ref: cloneSerializable(ref), resolution: 'missing',
          evidenceIndexes: [], undatedEvidenceIndexes: [], laterEvidenceIndexes: [],
          attentionResolution: 'unrecorded', attentionIds: [] };
        if (ref.residue !== undefined || ref.nightVisit !== undefined
          || feature.kind === 'arcane-residue' || feature.kind === 'night-visit') {
          return physicalReference(world, feature, ref, day, arrivals, link);
        }
        // A damaged copied physical ref cannot borrow an ordinary same-key asking.
        if (feature.kind === 'runaround' && ref.claimId === null && ref.messageId === null
          && world.enemy.evidence.some((entry) => (entry.kind === 'arcane-residue' || entry.kind === 'night-visit')
            && entry.tick === ref.tick && entry.observer === ref.observer)) {
          return { ...link, resolution: 'unsupported', attentionResolution: 'unsupported' };
        }
        if (!legacyKinds.has(feature.kind) || Object.keys(ref).some((key) => !legacyRefFields.has(key))) {
          link.resolution = 'unsupported'; link.attentionResolution = 'unsupported'; return link;
        }
        world.enemy.evidence.forEach((entry, index) => {
          if (entry.kind === 'arcane-residue' || entry.kind === 'night-visit') return;
          if (entry.tick !== ref.tick || entry.observer !== ref.observer || entry.claimId !== ref.claimId
            || (entry.network?.messageId ?? null) !== ref.messageId) return;
          const arrival = arrivals[index]!;
          if (arrival.learnedAt === null || day === null) link.undatedEvidenceIndexes.push(index);
          else if (dayOf(arrival.learnedAt) > day) link.laterEvidenceIndexes.push(index);
          else link.evidenceIndexes.push(index);
        });
        if (link.evidenceIndexes.length === 0) {
          link.resolution = link.undatedEvidenceIndexes.length > 0 ? 'unrecorded'
            : link.laterEvidenceIndexes.length > 0 ? 'late' : 'missing';
        } else if (link.evidenceIndexes.length > 1 || link.undatedEvidenceIndexes.length > 0) {
          link.resolution = 'ambiguous'; link.attentionResolution = 'ambiguous';
        } else {
          link.resolution = 'resolved';
          const source = sourceOf(world, link.evidenceIndexes[0]!, feature, arrivals);
          if ('status' in source) link.attentionResolution = source.status;
          else if (source.source.observation.tick > through) link.attentionResolution = 'missing';
          else Object.assign(link, attentionFor(world, source.source, acts));
        }
        return link;
      }) };
  });
}

/** End-of-day comparison; performed attention and recorded features remain separate facts. */
export function counterFeatureLinks(world: WorldState, throughDay: number) {
  const attention = attentionAt(world, Math.min(world.tick, (throughDay + 1) * TICKS_PER_DAY - 1));
  const all = featureLinks(world);
  const features = all.filter((row) => row.recordedDay !== null && row.recordedDay <= throughDay);
  const signals = attention.signals.map((signal) => ({ signalId: signal.id,
    attentionIds: [...signal.attentionIds], featureIds: features.filter((row) =>
      row.references.some((ref) => ref.attentionIds.some((id) => signal.attentionIds.includes(id))))
      .map((row) => row.feature.id) }));
  return { attention, features, signals,
    unresolvedFeatureIds: features.filter((row) => row.references.length === 0
      || row.references.some((ref) => ref.resolution !== 'resolved' || ref.attentionResolution !== 'linked'))
      .map((row) => row.feature.id),
    unrecordedFeatureIds: all.filter((row) => row.recordedDay === null).map((row) => row.feature.id) };
}
