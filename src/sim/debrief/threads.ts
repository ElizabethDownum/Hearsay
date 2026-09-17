import { dayOf } from '../../core/time';
import type { EvidenceEntry } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { NightVisitRecord } from '../magic-types';
import type { ResidueRecord, WorldState } from '../types';
import { directiveHistories, type DirectiveThread } from './directives';
import { evidenceArrivals, physicalSightings, type EvidenceArrival, type PhysicalEvidence } from './evidence';
import { featureLinks, type FeatureLink } from './feature-links';
import { magicThreads, type MagicHistory } from './magic';
import type { NetworkThread } from './network';
import { fieldReportThreads, type FieldReportThread } from './reports';
import { artifactThreads, storyThreads, unresolvedStoryEvents, type ArtifactThread, type StoryThread } from './stories';

export interface PhysicalObservationHistory {
  records: { chronicleIndex: number; record: ResidueRecord | NightVisitRecord }[];
  evidence: { evidenceIndex: number; entry: PhysicalEvidence; sightingIndexes: number[]; arrival: EvidenceArrival }[];
}
export interface OperationThreads {
  stories: StoryThread[];
  artifacts: ArtifactThread[];
  messages: NetworkThread[];
  reportItems: FieldReportThread[];
  directives: DirectiveThread[];
  magic: MagicHistory;
  physical: PhysicalObservationHistory;
  unresolvedStories: ReturnType<typeof unresolvedStoryEvents>;
  /** Current or undated rows; retained indexes survive the clock partition. */
  enemyEvidence: { evidenceIndex: number; entry: EvidenceEntry; arrival: EvidenceArrival }[];
  /** Clock-scoped references; a current feature can also retain later receipt context in beyondClock. */
  featureReferences: FeatureLink[];
  /** These retained rows contain observation, receipt or feature dates beyond this view's clock. */
  beyondClock: {
    enemyEvidence: OperationThreads['enemyEvidence'];
    physicalEvidence: PhysicalObservationHistory['evidence'];
    featureReferences: FeatureLink[];
  };
}

/** Typed sections reuse the reviewed folds; no universal identity or extra physical-attention act is invented. */
export function operationThreads(world: WorldState): OperationThreads {
  const network = directiveHistories(world); const arrivals = evidenceArrivals(world);
  const futureTick = (tick: number | null | undefined): boolean => typeof tick === 'number' && tick > world.tick;
  const evidenceIsFuture = (index: number): boolean => {
    const entry = world.enemy.evidence[index]; const arrival = arrivals[index];
    return entry !== undefined && (futureTick(entry.tick) || futureTick(arrival?.learnedAt)
      || futureTick(entry.receipt?.tick) || futureTick(entry.residue?.observedAt) || futureTick(entry.nightVisit?.observedAt));
  };
  const allEvidence = world.enemy.evidence.map((entry, evidenceIndex) => ({ evidenceIndex, entry: cloneSerializable(entry),
    arrival: cloneSerializable(arrivals[evidenceIndex]!) }));
  const allPhysical = world.enemy.evidence.flatMap((entry, evidenceIndex) => entry.kind === 'arcane-residue' || entry.kind === 'night-visit'
    ? [{ evidenceIndex, entry: cloneSerializable(entry), sightingIndexes: physicalSightings(world, entry),
      arrival: cloneSerializable(arrivals[evidenceIndex]!) }] : []);
  const featureDateIsFuture = (row: FeatureLink): boolean =>
    (row.recordedDay !== null && row.recordedDay > dayOf(world.tick)) || row.feature.day > dayOf(world.tick)
    || row.references.some((ref) => futureTick(ref.ref.tick) || futureTick(ref.ref.residue?.observedAt)
      || futureTick(ref.ref.nightVisit?.observedAt));
  const currentFeatures: FeatureLink[] = []; const futureFeatures: FeatureLink[] = [];
  for (const row of featureLinks(world)) {
    if (featureDateIsFuture(row)) { futureFeatures.push(row); continue; }
    const hasFutureReceipt = row.references.some((ref) =>
      [...ref.evidenceIndexes, ...ref.undatedEvidenceIndexes, ...ref.laterEvidenceIndexes].some(evidenceIsFuture));
    if (!hasFutureReceipt) { currentFeatures.push(row); continue; }
    // This original link supplies context for future receipts, not a newly created future feature.
    futureFeatures.push(row);
    const current = cloneSerializable(row);
    for (const ref of current.references) {
      const removedSupport = [...ref.evidenceIndexes, ...ref.undatedEvidenceIndexes].some(evidenceIsFuture);
      const removedLater = ref.laterEvidenceIndexes.some(evidenceIsFuture);
      ref.evidenceIndexes = ref.evidenceIndexes.filter((index) => !evidenceIsFuture(index));
      ref.undatedEvidenceIndexes = ref.undatedEvidenceIndexes.filter((index) => !evidenceIsFuture(index));
      ref.laterEvidenceIndexes = ref.laterEvidenceIndexes.filter((index) => !evidenceIsFuture(index));
      if (removedSupport || (removedLater && ref.evidenceIndexes.length === 0
        && ref.undatedEvidenceIndexes.length === 0 && ref.laterEvidenceIndexes.length === 0)) {
        // Filtering is not evidence for a new association or attention join. Preserve honest uncertainty.
        ref.resolution = 'unrecorded'; ref.attentionResolution = 'unrecorded'; ref.attentionIds = [];
      }
    }
    currentFeatures.push(current);
  }
  return { stories: storyThreads(world), artifacts: artifactThreads(world), messages: network.messages,
    directives: network.directives, reportItems: fieldReportThreads(world, network.messages), magic: magicThreads(world),
    physical: { records: world.chronicle.flatMap((record, chronicleIndex) => (record.kind === 'residue' || record.kind === 'night-visit')
      && record.tick <= world.tick ? [{ chronicleIndex, record: cloneSerializable(record) }] : [])
      .sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex),
    evidence: allPhysical.filter((row) => !evidenceIsFuture(row.evidenceIndex)) },
    unresolvedStories: unresolvedStoryEvents(world),
    enemyEvidence: allEvidence.filter((row) => !evidenceIsFuture(row.evidenceIndex)),
    featureReferences: currentFeatures,
    beyondClock: { enemyEvidence: allEvidence.filter((row) => evidenceIsFuture(row.evidenceIndex)),
      physicalEvidence: allPhysical.filter((row) => evidenceIsFuture(row.evidenceIndex)),
      featureReferences: futureFeatures } };
}
