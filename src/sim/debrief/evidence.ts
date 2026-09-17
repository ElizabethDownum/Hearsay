import type { ReportedFieldObservation } from '../directives/types';
import type { EvidenceEntry } from '../enemy/state';
import { stableStringify } from '../hash';
import type { WorldState } from '../types';

export interface EvidenceArrival {
  evidenceIndex: number;
  observedAt: number;
  learnedAt: number | null;
  reportMessageId: string | null;
  timing: 'direct' | 'report' | 'unrecorded';
  /** Present together only when the actual received copy has complete unique root metadata. */
  reportEvidenceIndex?: number;
  reportItemIndex?: number;
  rootFingerprint?: string;
}


export type PhysicalEvidence = Extract<EvidenceEntry, { kind: 'arcane-residue' | 'night-visit' }>;

export function physicalSightings(world: WorldState, entry: PhysicalEvidence): number[] {
  const indexes: number[] = [];
  world.chronicle.forEach((row, index) => {
    if (row.tick !== entry.tick || !('venue' in row) || row.venue !== entry.venue) return;
    if (entry.kind === 'arcane-residue' && row.kind === 'residue' && row.act === 'observed'
      && row.residueId === entry.residue.id && row.observer === entry.residue.witness) indexes.push(index);
    if (entry.kind === 'night-visit' && row.kind === 'night-visit'
      && row.actor === entry.nightVisit.actor && row.observer === entry.nightVisit.witness) indexes.push(index);
  });
  return indexes;
}

/** An observed physical identity is explicit; null speech IDs cannot identify a channel. */
export function physicalAcquisition(world: WorldState, entry: PhysicalEvidence):
  { learnedAt: number | null; ambiguous: boolean } {
  const marker = entry.kind === 'arcane-residue' ? entry.residue : entry.nightVisit;
  const unknown = { learnedAt: null, ambiguous: false };
  if (entry.tick !== marker.observedAt || entry.observer !== marker.witness) return unknown;
  if (entry.receipt === undefined) {
    if (entry.observer !== world.network.spymaster || entry.tick > world.tick) return unknown;
    const sightings = physicalSightings(world, entry);
    return { learnedAt: sightings.length === 1 ? entry.tick : null, ambiguous: sightings.length > 1 };
  }
  const receipt = entry.receipt;
  if (receipt.observer !== world.network.spymaster || receipt.tick < entry.tick || receipt.tick > world.tick) return unknown;
  const receipts = world.chronicle.filter((row) => row.kind === 'network-speech'
    && row.tick === receipt.tick && row.messageId === receipt.messageId
    && row.heardBy.some((hearer) => hearer.id === receipt.observer));
  if (receipts.length !== 1) return { learnedAt: null, ambiguous: receipts.length > 1 };
  const speech = receipts[0]!;
  if (speech.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') return unknown;
  const atoms = speech.spoken.items.filter(({ observation: atom }) =>
    atom.observedAt === entry.tick && atom.venue === entry.venue
    && (entry.kind === 'arcane-residue'
      ? atom.kind === 'arcane-residue' && atom.residueId === entry.residue.id && atom.witness === entry.residue.witness
      : atom.kind === 'presence' && atom.actor === entry.nightVisit.actor && atom.witness === entry.nightVisit.witness));
  return { learnedAt: atoms.length === 1 ? receipt.tick : null, ambiguous: atoms.length > 1 };
}

/** Content used by the legacy utterance/asking/network ingestion branches. */
function key(entry: EvidenceEntry): string {
  return stableStringify([entry.kind, entry.tick, entry.venue, entry.observer,
    entry.overheard, entry.speaker, entry.addressedTo, entry.mode, entry.claimId,
    entry.family, entry.reported, entry.about, entry.kind === 'utterance' && entry.document === true,
    entry.network ? [entry.network.messageId, entry.network.spoken] : null]);
}

function projected(observation: ReportedFieldObservation, observer: string): EvidenceEntry | null {
  const base = { tick: observation.observedAt, venue: observation.venue, observer };
  if (observation.kind === 'utterance') return { ...base, kind: 'utterance',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: observation.mode, claimId: observation.claimId, family: observation.family,
    reported: observation.reported, about: null,
    ...(observation.document === true ? { document: true as const } : {}) };
  if (observation.kind === 'asking') return { ...base, kind: 'asking',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: null, claimId: null, family: 'family' in observation.about ? observation.about.family : null,
    reported: null, about: observation.about };
  if (observation.kind === 'network-speech') return { ...base, kind: 'network',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: null, claimId: null, family: null, reported: null, about: null,
    network: { messageId: observation.messageId, sourceDirectiveId: null, spoken: observation.spoken } };
  return null;
}

/** Does retained physical speech corroborate this direct evidence row? */
function directlyHeard(world: WorldState, entry: EvidenceEntry): boolean {
  if (entry.kind === 'arcane-residue' || entry.kind === 'night-visit') return false;
  return world.chronicle.some((row) => {
    if (row.tick !== entry.tick || !('heardBy' in row) || row.venue !== entry.venue
      || row.speaker !== entry.speaker || row.addressedTo !== entry.addressedTo) return false;
    // Compartment leaks use the leaking asset as evidence observer; the real listener
    // is still headquarters. Ordinary evidence uses the actual observer identity.
    const observer = entry.kind === 'network' && entry.leaked ? world.network.spymaster : entry.observer;
    const heard = observer !== null && (row.heardBy.some((hearer) => hearer.id === observer)
      || (row.kind === 'network-speech' && row.speaker === observer));
    if (!heard) return false;
    if (entry.kind === 'utterance') return row.kind === 'telling' && row.claimId === entry.claimId
      && row.mode === entry.mode;
    if (entry.kind === 'asking') return row.kind === 'asking'
      && stableStringify(row.about) === stableStringify(entry.about);
    return row.kind === 'network-speech' && row.messageId === entry.network.messageId
      && stableStringify(row.spoken) === stableStringify(entry.network.spoken);
  });
}

/**
 * Ordinary append reconstruction plus separately marked physical receipt reconstruction. Replay the retained append structure, not an ambiguous
 * global content join: captureEvidence appends the actual heard report first, then
 * ingestEnemyItem appends its projected children consecutively. A reported nested
 * network envelope does not recursively ingest its own contents.
 */
export function evidenceArrivals(world: WorldState): EvidenceArrival[] {
  const arrivals: EvidenceArrival[] = world.enemy.evidence.map((entry, evidenceIndex) => ({
    evidenceIndex, observedAt: entry.tick, learnedAt: null, reportMessageId: null, timing: 'unrecorded',
  }));
  const incompleteBatchCandidates = new Set<number>();
  world.enemy.evidence.forEach((entry, index) => {
    if (arrivals[index]!.timing !== 'unrecorded' || incompleteBatchCandidates.has(index)) return;
    if (entry.kind === 'arcane-residue' || entry.kind === 'night-visit') {
      const acquired = physicalAcquisition(world, entry);
      if (acquired.learnedAt !== null) arrivals[index] = { ...arrivals[index]!, learnedAt: acquired.learnedAt,
        timing: entry.receipt === undefined ? 'direct' : 'report',
        reportMessageId: entry.receipt?.messageId ?? null };
      return;
    }
    const corroborated = directlyHeard(world, entry);
    if (corroborated) arrivals[index] = { ...arrivals[index]!, learnedAt: entry.tick, timing: 'direct' };
    if (entry.kind !== 'network' || entry.network.spoken.kind !== 'field-report') return;
    const items = entry.network.spoken.items;
    const children = items.flatMap((item, itemIndex) => {
      const child = projected(item.observation, entry.speaker);
      return child === null ? [] : [{ child, itemIndex }];
    });
    const physicalSlots = items.filter(({ observation }) => observation.kind === 'arcane-residue'
      || (observation.kind === 'presence' && observation.witness !== undefined)).length;
    const maximumSpan = children.length + physicalSlots;
    const childIndexes: number[] = [];
    let cursor = index + 1;
    const complete = children.every(({ child }) => {
      // Physical ingestion can append once or dedupe an already retained identity. Skip only
      // an actual marked row corroborated by this same receipt, never an arbitrary null-ID row.
      while (cursor <= index + maximumSpan) {
        const candidate = world.enemy.evidence[cursor];
        if (candidate === undefined || (candidate.kind !== 'arcane-residue' && candidate.kind !== 'night-visit')
          || candidate.receipt?.tick !== entry.tick || candidate.receipt.messageId !== entry.network.messageId
          || candidate.receipt.observer !== entry.observer
          || physicalAcquisition(world, candidate).learnedAt !== entry.tick) break;
        cursor++;
      }
      const actual = world.enemy.evidence[cursor];
      if (cursor > index + maximumSpan) return false;
      childIndexes.push(cursor++);
      return actual !== undefined && key(actual) === key(child);
    });
    if (!corroborated || !complete) {
      const expected = new Set(children.map(({ child }) => key(child)));
      // Each eligible spoken item appends at most one row, synchronously; physical items may dedupe. Deletion can
      // shorten that original span; it cannot move a surviving child beyond its end.
      // Missing receipt corroboration cannot date this batch or grant its root links.
      // Equivalent direct/report occurrences inside an uncertain span are indistinguishable:
      // leave their arrival unknown rather than asserting the original observation date.
      for (let offset = 1; offset <= maximumSpan; offset++) {
        const actual = world.enemy.evidence[index + offset];
        if (actual !== undefined && expected.has(key(actual))) incompleteBatchCandidates.add(index + offset);
      }
      return;
    }
    const speeches = world.chronicle.filter((row) => row.kind === 'network-speech'
      && row.tick === entry.tick && row.messageId === entry.network.messageId
      && row.venue === entry.venue && row.speaker === entry.speaker && row.addressedTo === entry.addressedTo
      && stableStringify(row.spoken) === stableStringify(entry.network.spoken));
    const roots = speeches.length === 1 && speeches[0]!.kind === 'network-speech'
      ? speeches[0]!.reportRoots : undefined;
    const linked = Array.isArray(roots) && roots.length === items.length
      && Array.from(roots).every((root) => typeof root === 'string' && root.length > 0)
      && new Set(roots).size === roots.length;
    children.forEach(({ itemIndex }, offset) => {
      const childIndex = childIndexes[offset]!;
      arrivals[childIndex] = { ...arrivals[childIndex]!, learnedAt: entry.tick,
        reportMessageId: entry.network.messageId, timing: 'report',
        ...(linked ? { reportEvidenceIndex: index, reportItemIndex: itemIndex, rootFingerprint: roots[itemIndex]! } : {}) };
    });
  });
  return arrivals;
}
