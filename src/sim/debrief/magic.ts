import { TICKS_PER_DAY } from '../../core/time';
import type { IntelEntry } from '../../intel/entry';
import type { EvidenceEntry } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { ArcaneTrace } from '../magic';
import type { SeanceRecord } from '../magic-types';
import { CLAIM_FIELDS, type Claim } from '../rumors/claim';
import type { ResidueRecord, ScryRecord, WorldState } from '../types';
import { evidenceArrivals, type EvidenceArrival } from './evidence';
import { featureLinks, type FeatureReferenceLink } from './feature-links';
import { fieldReportThreads, type FieldReportThread } from './reports';

export type MagicRecord = ScryRecord | SeanceRecord;
export type MagicAssociation = 'linked' | 'ambiguous' | 'inconsistent' | 'unrecorded';
export interface IndexedMagicRecord<T> { chronicleIndex: number; record: T }
export interface MagicIntelLink {
  entryIndex: number;
  entry: IntelEntry;
  association: MagicAssociation;
  /** Only an explicit, consistent, uniquely retained operation corroborates this acquisition. */
  learnedAt: number | null;
}
export interface ResidueHistory {
  residueId: string;
  /** Operation-to-trace association is separate from what an enemy channel reported. */
  association: MagicAssociation;
  traces: { traceIndex: number; trace: ArcaneTrace }[];
  created: IndexedMagicRecord<ResidueRecord>[];
  observed: IndexedMagicRecord<ResidueRecord>[];
  reports: FieldReportThread[];
  evidence: {
    evidenceIndex: number;
    entry: Extract<EvidenceEntry, { kind: 'arcane-residue' }>;
    arrival: EvidenceArrival;
    features: {
      featureId: string; recordedDay: number | null; referenceIndex: number;
      reference: FeatureReferenceLink;
    }[];
  }[];
}
interface MagicThreadBase {
  kind: 'magic';
  id: string;
  operation: string;
  recordState: 'recorded' | 'ambiguous';
  /** Historical prices are not retained by ScryRecord or SeanceRecord. */
  price: { state: 'unrecorded' };
  intel: MagicIntelLink[];
}
export interface ScryThread extends MagicThreadBase {
  spell: 'scrying';
  records: IndexedMagicRecord<ScryRecord>[];
  window: { from: number; to: number; phase: 'scheduled' | 'active' | 'elapsed' } | null;
  captureState: 'recorded' | 'none-recorded' | 'uncertain';
  residue: ResidueHistory;
}
export interface SeanceThread extends MagicThreadBase {
  spell: 'seance';
  records: IndexedMagicRecord<SeanceRecord>[];
  /** A historical claim retained before the ritual, never a newly minted cast-time version. */
  claim: { state: 'retained-root' | 'missing' | 'inconsistent' | 'ambiguous'; value: Claim | null };
  receiptState: 'complete' | 'incomplete' | 'ambiguous' | 'inconsistent';
}
export type MagicThread = ScryThread | SeanceThread;
export interface MagicHistory {
  operations: MagicThread[];
  unassociatedIntel: MagicIntelLink[];
  residuesWithoutOperation: ResidueHistory[];
}

const operationKey = (spell: string, operation: string): string => JSON.stringify(['magic', spell, operation]);
const byTime = <T extends { tick: number }>(a: IndexedMagicRecord<T>, b: IndexedMagicRecord<T>): number =>
  a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex;

function scryWindow(record: ScryRecord, now: number): ScryThread['window'] {
  const from = record.day * TICKS_PER_DAY + record.from;
  const to = record.day * TICKS_PER_DAY + record.to;
  if (![record.tick, record.day, record.from, record.to, from, to].every(Number.isSafeInteger)
    || record.tick < 0 || record.day < 0 || record.from < 0 || record.to > TICKS_PER_DAY
    || record.from >= record.to || record.from % 15 !== 0 || record.to % 15 !== 0
    || record.to - record.from > 60 || Math.floor(record.tick / TICKS_PER_DAY) + 1 !== record.day) return null;
  return { from, to, phase: now < from ? 'scheduled' : now < to ? 'active' : 'elapsed' };
}

function intelFor(world: WorldState, spell: 'scrying' | 'seance', operation: string,
  records: IndexedMagicRecord<MagicRecord>[]): MagicIntelLink[] {
  const selected = world.intel.log.flatMap((entry, entryIndex) => entry.tick <= world.tick
    && entry.provenance?.kind === 'magic' && entry.provenance.spell === spell
    && entry.provenance.operation === operation ? [{ entryIndex, entry }] : []);
  return selected.map(({ entry, entryIndex }): MagicIntelLink => {
    let association: MagicAssociation = records.length === 0 ? 'unrecorded' : records.length > 1 ? 'ambiguous' : 'linked';
    if (association === 'linked') {
      const record = records[0]!.record;
      let consistent = entry.venue === record.venue;
      if (record.kind === 'scry') {
        const window = scryWindow(record, world.tick);
        consistent &&= window !== null && entry.tick >= window.from && entry.tick < window.to
          && ['scene-presence', 'utterance', 'asking'].includes(entry.kind);
      } else {
        const claim = world.claims[record.claimId];
        consistent &&= entry.tick === record.tick && entry.speaker === null && entry.addressedTo === null
          && (entry.kind === 'utterance' ? entry.claimId === record.claimId
            && (!claim || (entry.family === claim.family && CLAIM_FIELDS.every((field) => entry.reported?.[field] === claim[field])))
            : entry.kind === 'edge-read' && entry.edgeFrom === record.edge.from
              && entry.edgeTo === record.edge.to && entry.edgeKind === record.edge.kind);
      }
      if (!consistent) association = 'inconsistent';
    }
    return { entryIndex, entry: cloneSerializable(entry), association,
      learnedAt: association === 'linked' ? entry.tick : null };
  }).sort((a, b) => a.entry.tick - b.entry.tick || a.entryIndex - b.entryIndex);
}

/** Retained records identify operations. A lazy runtime window, trace or label alone does not. */
export function magicThreads(world: WorldState): MagicHistory {
  const groups = new Map<string, IndexedMagicRecord<MagicRecord>[]>();
  world.chronicle.forEach((record, chronicleIndex) => {
    if ((record.kind !== 'scry' && record.kind !== 'seance') || record.tick > world.tick) return;
    const key = operationKey(record.kind === 'scry' ? 'scrying' : 'seance', record.operation);
    const records = groups.get(key) ?? [];
    records.push({ chronicleIndex, record }); groups.set(key, records);
  });
  const arrivals = evidenceArrivals(world);
  const features = featureLinks(world);
  const reports = fieldReportThreads(world);
  const residueHistory = (id: string, records: IndexedMagicRecord<ScryRecord>[]): ResidueHistory => {
    const traces = (world.magic?.traces ?? []).flatMap((trace, traceIndex) => trace.id === id
      && trace.createdAt <= world.tick ? [{ traceIndex, trace: cloneSerializable(trace) }] : []);
    const recorded = world.chronicle.flatMap((record, chronicleIndex) => record.kind === 'residue'
      && record.residueId === id && record.tick <= world.tick ? [{ chronicleIndex, record: cloneSerializable(record) }] : []);
    const created = recorded.filter((row) => row.record.act === 'created').sort(byTime);
    const observed = recorded.filter((row) => row.record.act === 'observed').sort(byTime);
    let association: MagicAssociation = records.length === 0 ? 'unrecorded'
      : records.length > 1 || traces.length > 1 || created.length > 1 ? 'ambiguous'
        : traces.length === 0 || created.length === 0 ? 'unrecorded' : 'linked';
    if (association === 'linked') {
      const record = records[0]!.record; const window = scryWindow(record, world.tick);
      const trace = traces[0]!.trace; const creation = created[0]!.record;
      if (window === null || trace.venue !== record.venue || trace.createdAt !== window.from
        || creation.venue !== record.venue || creation.tick !== window.from || creation.observer !== null) association = 'inconsistent';
    }
    return { residueId: id, association, traces, created, observed,
      // Reuse the existing root/report model. A retained raw physical ID is an association,
      // not a claim that every intended packet or atom was heard.
      reports: cloneSerializable(reports.filter((thread) => thread.held.some((held) => held.content.kind === 'raw'
        && held.content.observation.kind === 'arcane-residue' && held.content.observation.residueId === id))),
      evidence: world.enemy.evidence.flatMap((entry, evidenceIndex) => entry.kind === 'arcane-residue'
        && entry.residue.id === id ? [{ evidenceIndex, entry: cloneSerializable(entry), arrival: cloneSerializable(arrivals[evidenceIndex]!),
          features: features.flatMap((feature) => feature.references.flatMap((reference, referenceIndex) =>
            reference.ref.residue?.id === id && [...reference.evidenceIndexes, ...reference.undatedEvidenceIndexes,
              ...reference.laterEvidenceIndexes].includes(evidenceIndex) ? [{ featureId: feature.feature.id,
                recordedDay: feature.recordedDay, referenceIndex, reference: cloneSerializable(reference) }] : [])) }] : []),
    };
  };
  const operations: MagicThread[] = [];
  for (const [id, rows] of groups) {
    rows.sort(byTime);
    const first = rows[0]!.record;
    const spell = first.kind === 'scry' ? 'scrying' : 'seance';
    const intel = intelFor(world, spell, first.operation, rows);
    const common: MagicThreadBase = { kind: 'magic', id, operation: first.operation,
      recordState: rows.length === 1 ? 'recorded' : 'ambiguous', price: { state: 'unrecorded' }, intel };
    if (first.kind === 'scry') {
      const records = rows as IndexedMagicRecord<ScryRecord>[];
      operations.push({ ...common, spell: 'scrying', records: cloneSerializable(records),
        window: rows.length === 1 ? scryWindow(first, world.tick) : null,
        captureState: rows.length !== 1 || scryWindow(first, world.tick) === null
          || intel.some((row) => row.association !== 'linked') ? 'uncertain'
          : intel.length > 0 ? 'recorded' : 'none-recorded', residue: residueHistory(first.operation, records) });
    } else {
      const claim = world.claims[first.claimId];
      const claimState = rows.length > 1 ? 'ambiguous' : !claim ? 'missing'
        : claim.id !== first.claimId || claim.parent !== null ? 'inconsistent' : 'retained-root';
      const claims = intel.filter((row) => row.entry.kind === 'utterance');
      const edges = intel.filter((row) => row.entry.kind === 'edge-read');
      const receiptState = rows.length > 1 || claims.length > 1 || edges.length > 1 ? 'ambiguous'
        : intel.some((row) => row.association === 'inconsistent') ? 'inconsistent'
          : claims.length === 1 && edges.length === 1 ? 'complete' : 'incomplete';
      operations.push({ ...common, spell: 'seance', records: cloneSerializable(rows as IndexedMagicRecord<SeanceRecord>[]),
        claim: { state: claimState, value: rows.length === 1 && claim ? cloneSerializable(claim) : null }, receiptState });
    }
  }
  operations.sort((a, b) => a.records[0]!.record.tick - b.records[0]!.record.tick
    || a.records[0]!.chronicleIndex - b.records[0]!.chronicleIndex || a.id.localeCompare(b.id));
  const unassociatedIntel = world.intel.log.flatMap((entry, entryIndex): MagicIntelLink[] => entry.tick <= world.tick
    && entry.provenance?.kind === 'magic' && !groups.has(operationKey(entry.provenance.spell, entry.provenance.operation))
    ? [{ entryIndex, entry: cloneSerializable(entry), association: 'unrecorded', learnedAt: null }] : []);
  const residueIds = new Set([
    ...(world.magic?.traces ?? []).filter((trace) => trace.createdAt <= world.tick).map((trace) => trace.id),
    ...world.chronicle.flatMap((row) => row.kind === 'residue' && row.tick <= world.tick ? [row.residueId] : []),
    ...world.enemy.evidence.flatMap((entry) => entry.kind === 'arcane-residue' ? [entry.residue.id] : []),
    ...reports.flatMap((thread) => thread.held.flatMap((held) => held.content.kind === 'raw'
      && held.content.observation.kind === 'arcane-residue' ? [held.content.observation.residueId] : [])),
  ]);
  const residuesWithoutOperation = [...residueIds].filter((id) => !groups.has(operationKey('scrying', id))).sort()
    .map((id) => residueHistory(id, []));
  return { operations, unassociatedIntel, residuesWithoutOperation };
}
