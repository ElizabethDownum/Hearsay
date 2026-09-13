# Task 5B magic operations and séance story proposal

13 September 2026. Complete-code bounded proposal, authored using the canonical author
skill and inherited root capability. No production source is changed or shipped.
Fresh independent proposal review remains required before production dispatch.

## Result and retained-data contract

`magicThreads(world)` reads actual retained ScryRecord and SeanceRecord operations.
Operation identity is the tuple [magic, spell, operation], so identical text across spells
does not merge channels. Duplicate same-spell IDs preserve every indexed record and expose
ambiguity. The mutable pending-window store cannot create a missing historical operation.
Explicit magic provenance selects intel; an ordinary channel named scrying or seance does
not qualify. Indexed rows preserve chronology, retained content and their separate receipt
status. Every returned nested object/array is owned by the result.

Scry histories show the actual purchased venue and absolute half-open window, computed
scheduled/active/elapsed phase, and actual captured intel. Invalid retained windows stay
unknown. `none-recorded` means there are no retained captures; it does not prove that nothing
happened, that a story died, that a sensor failed, or that a refund occurred. Historical
price is explicitly unrecorded for both spells; present rules or current coin are not proof
of an old transaction amount. Rejected actions create no operation record.

Residue history keeps operation-to-trace corroboration distinct from creation, sightings,
held/report stages, enemy acquisition and digest references. The operation-to-trace
association requires one operation, one actual trace and one creation record agreeing on
ID, venue and window start. It never supplies caster identity. Reports are the unchanged
fieldReportThreads outputs selected by a retained raw residue ID; their own stages say
whether atoms were held, spoken, omitted or unknown. Selecting such a thread does not prove
that every planned packet was heard. Enemy evidence and reference rows reuse the exact
physical evidenceArrivals/featureLinks interfaces, preserving late, missing, ambiguous and
unrecorded outcomes. Orphan trace, residue record, enemy evidence or raw held report remains
visible without fabricating an operation. A missing raw root cannot be recovered by matching
packet text; the separate report reader still retains its report facts.

A séance history retains the cast record, referenced historical root claim and exact edge,
plus the actual two explicitly marked intel rows. A retained claim reference and a proved
root are separate: missing, mismatched or parented claims remain explicit. `receiptState`
describes the recorded intel pair; `claim.state` separately describes the retained root.
A complete pair cannot repair a missing or inconsistent root. No current departed object
fills a missing receipt. Duplicate operation or receipt records remain ambiguous.

The family's new StoryEvent is the actual séance receipt at cast time. It has changes []
and changedBy null, does not create a version or origin, and advances lastActivityAt as
recorded receipt activity. A missing or ID-inconsistent claim reference goes to
unresolvedStoryEvents. Existing story lineage and human/artifact events are preserved.
An invalid parent can remain a retained lineage fact; the séance does not become a human
mutation. The dead acquires no mind, telling, belief delivery, carrier or questioning role.
A coincident chapel night visit proves location/time only and is never joined to a ritual.

## Exact source basis and prerequisite order

All tracked source/configuration starts from detached actual commit
152f2a0d788d7166150ba31b25090f3aa21d199c, including complete Task 3/4. The 351-file snapshot
starts directly inside owned validation/node_modules/hearsay-baseline and remains unchanged.
The fixed physical source map is a transitive input. It began this unit pending review;
parent subsequently reported Approved-for-base-reconciliation with no source/map/test
correction. That status amendment is recorded separately, preserving original input bytes.
The prior volatile Vitest cache is not an input. Twenty named immutable input files and
their owned copies are hashed, including the physical draft/constraints/report/map.

prepare.py performs the explicit reconciliation: retain the 18 physical model/test bodies,
merge nine required future Task 5A/T5A-A1/5A2/R16/R17 overlays against actual 152f2a0, and
use actual Task 4C source directly. No old speech-only union or duplicate provenance overlay
replaces committed source. The sole chronicle merge conflict is retained as evidence and
resolved by the already reconciled T5A-A1 body after checking that actual chronicle.ts is
unchanged from its prior physical basis. The full 27-file integrated baseline passes 198
cases and both compilers/lint. prepare.py is a one-time fresh-snapshot assembler; do not
rerun it over the frozen archive. Source maps make subsequent review independent of it.

Production sequencing remains actual predecessor reconciliation, approved Task 5A and
R16/R17/5A2, ordinary debrief readers, the physical extension, then this atomic magic unit.
The final actual predecessor must be checked additively before transcription. Existing
recording, transport, evidence/feature and report APIs are prerequisites, not new production
ownership granted by this proposal. Full Task 5B still needs remaining attention/calendar/
terminal composition and later UI/integration work.

## Atomic implementation unit and acceptance

Own NEW src/sim/debrief/magic.ts, MODIFY the proposed src/sim/debrief/stories.ts, and NEW
tests/debrief/magic.test.ts. Transcribe the complete bodies below. All transitive types and
consumers needed by the change are included; no runtime or config edit is required.
Use a capable implementation worker for these causal TypeScript readers, followed by
independent review of at least the same capability. Root owns index and serial writer order.

Preserve all nine inherited test bodies and eight unaffected model bodies byte-for-byte.
MIGRATED: none. Measured final cases: 240 = 198 inherited + 42 additions. The 147 ordinary
floor and physical R24/R25/R26 reservation/uncertainty controls remain unchanged. New tests
use real successful/rejected actions, before/after/expired captures, direct and delivered
residue chains, actual digest computation, real ritual family/edge/intel, missing and
duplicated records, cross-spell identity, ordinary via labels, concurrent chapel presence,
future records and nested ownership. Damaged-retention controls mutate only their test worlds.
Digest timing uses actual enemyDigest with an explicitly retained decision fixture; it does
not claim that a full campaign performed that decision. Simulation seeds/rules are unchanged.

RED is an importable empty magic reader plus original stories.ts, not a loader failure.
It executes the identical final permanent test bodies: 202 pass / 38 fail. GREEN has all
240 pass. Two self-review traces preserve the intermediate reader defects and the separate
unresolved-story defect. Both actual compiler configs pass; all 29 virtual files lint with
zero errors/warnings. At each actual changed model path, mandatory Math.random, Date.now,
new Date and forbidden content-rules import restrictions fire. No whole-game/timing result
is claimed for this pure proposal. Actual implementation still runs repository-required
tests, lint, typecheck/build and independent committed-code review; broader integration
performs its separately required simulation gates.

## Review defaults and limits

Recommended schema defaults: tuple operation IDs; separate operation, intel, trace and
receipt states; explicit unrecorded historical price; orphan retained physical facts;
séance receipt events with no new origin/version; no coincident ritual/visit causal join.
These require no gameplay recording change. Parent may queue concise HTML review items;
none blocks independent review of this proposal. Arbitrary deleted history cannot be
reconstructed and duplicate IDs are not silently selected. No new magic UI, calendar,
terminal, attention mechanism, hidden price record or game-state mutation is authorized.

## Complete bodies

| Exact production target | UTF-8/LF SHA256 |
| --- | --- |
| `src/sim/debrief/magic.ts` | `f65a9400d2dffd26a450fdb3389699cc5320335ae74256e271530087cab35f46` |
| `src/sim/debrief/stories.ts` | `31bbd45ad6222ce17303385f7ea7daa9016de21e9fd1c9da347afc64a91d97d0` |
| `tests/debrief/magic.test.ts` | `80d608180aa83193a8a3c8f840544cf08db4813da5c55f0263c4ca608ef683ce` |

## Exact file: src/sim/debrief/magic.ts

```ts
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
```

## Exact file: src/sim/debrief/stories.ts

```ts
import type { SeanceRecord } from '../magic-types';
import { TICKS_PER_DAY } from '../../core/time';
import type { Artifact } from '../artifacts';
import { cloneSerializable } from '../hash';
import { diffClaims, type Claim, type FieldChange } from '../rumors/claim';
import { STANCE } from '../rumors/propagation';
import type { ArtifactRecord, Belief, InjectRecord, TellingRecord, WorldState } from '../types';

export interface StoryVersion {
  claim: Claim;
  parentState: 'root' | 'recorded' | 'missing' | 'other-family';
  changes: FieldChange[] | null;
}
export interface StoryEvent {
  chronicleIndex: number;
  record: InjectRecord | TellingRecord | ArtifactRecord | SeanceRecord;
  claimId: string;
  /** Null means the parent was not retained; [] means no content changed. */
  changes: FieldChange[] | null;
  changedBy: string | null;
}
export interface StoryThread {
  kind: 'story';
  id: string;
  family: string;
  versions: StoryVersion[];
  events: StoryEvent[];
  originEventIndexes: number[];
  artifactIds: string[];
  beliefs: { npc: string; belief: Belief }[];
  lastActivityAt: number | null;
  /** No recorded activity leaves this unknown, rather than inventing a death date. */
  died: boolean | null;
  becameEvidence: number[];
}

/** Current family lineage plus every retained injection, speech, linked paper viewing and séance receipt. */
export function storyThreads(world: WorldState): StoryThread[] {
  const families = new Map<string, StoryThread>();
  const versions = new Map<string, StoryVersion>();
  for (const claim of Object.values(world.claims).sort((a, b) => a.id.localeCompare(b.id))) {
    const parent = claim.parent === null ? null : world.claims[claim.parent];
    const parentState = claim.parent === null ? 'root' : !parent ? 'missing'
      : parent.family === claim.family ? 'recorded' : 'other-family';
    const version: StoryVersion = { claim: cloneSerializable(claim), parentState,
      changes: parentState === 'root' ? [] : parentState === 'recorded' ? diffClaims(parent!, claim) : null };
    versions.set(claim.id, version);
    const thread: StoryThread = families.get(claim.family) ?? { kind: 'story', id: 'story:' + claim.family,
      family: claim.family, versions: [], events: [], originEventIndexes: [], artifactIds: [],
      beliefs: [], lastActivityAt: null, died: null, becameEvidence: [] };
    thread.versions.push(version); families.set(claim.family, thread);
  }
  world.chronicle.forEach((row, chronicleIndex) => {
    if (row.tick > world.tick || (row.kind !== 'inject' && row.kind !== 'telling' && row.kind !== 'artifact' && row.kind !== 'seance')) return;
    if (row.claimId === undefined) return;
    if (row.kind === 'seance' && world.claims[row.claimId]?.id !== row.claimId) return;
    const version = versions.get(row.claimId);
    if (!version) return;
    const thread = families.get(version.claim.family)!;
    const changes = row.kind === 'seance' ? [] : cloneSerializable(version.changes);
    thread.events.push({ chronicleIndex, record: cloneSerializable(row), claimId: row.claimId, changes,
      changedBy: row.kind !== 'seance' && changes !== null && changes.length > 0 ? (row.kind === 'telling' ? row.speaker : row.by) : null });
    if ((row.kind === 'inject' || row.kind === 'artifact') && version.parentState === 'root') {
      thread.originEventIndexes.push(chronicleIndex);
    }
    if (row.kind === 'artifact' && !thread.artifactIds.includes(row.artifact)) thread.artifactIds.push(row.artifact);
    thread.lastActivityAt = Math.max(thread.lastActivityAt ?? row.tick, row.tick);
  });
  for (const [npc, store] of Object.entries(world.beliefs).sort(([a], [b]) => a.localeCompare(b))) {
    if (!world.npcs[npc]) continue;
    for (const [family, belief] of Object.entries(store)) {
      families.get(family)?.beliefs.push({ npc, belief: cloneSerializable(belief) });
    }
  }
  world.enemy.evidence.forEach((entry, index) => {
    // Family is immutable lineage metadata, not the reported subject or a content guess.
    if (entry.family !== null) families.get(entry.family)?.becameEvidence.push(index);
  });
  for (const thread of families.values()) {
    thread.events.sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex);
    thread.artifactIds.sort();
    thread.died = thread.lastActivityAt === null ? null
      : world.tick - thread.lastActivityAt >= 2 * TICKS_PER_DAY
        && !thread.beliefs.some((row) => row.belief.credence >= STANCE.REPEAT);
  }
  return [...families.values()].sort((a, b) => a.family.localeCompare(b.family));
}

/** Retained speech or ritual receipts can lack an identifiable claim; never silently discard them. */
export function unresolvedStoryEvents(world: WorldState): { chronicleIndex: number; record: InjectRecord | TellingRecord | SeanceRecord }[] {
  return world.chronicle.flatMap((row, chronicleIndex) =>
    row.tick <= world.tick && (row.kind === 'inject' || row.kind === 'telling' || row.kind === 'seance') && (!world.claims[row.claimId] || (row.kind === 'seance' && world.claims[row.claimId]!.id !== row.claimId))
      ? [{ chronicleIndex, record: cloneSerializable(row) }] : []);
}

export interface ArtifactEvent {
  chronicleIndex: number;
  record: ArtifactRecord;
  claim: Claim | null;
  family: string | null;
  claimLink: 'linked' | 'missing-claim' | 'unrecorded' | 'not-a-viewing';
}
export interface ArtifactThread {
  kind: 'artifact';
  id: string;
  artifactId: string;
  /** Current custody and immutable paper text, distinct from each interpretation. */
  artifact: Artifact | null;
  events: ArtifactEvent[];
  storyFamilies: string[];
}

function isNpcViewing(world: WorldState, row: ArtifactRecord): boolean {
  if (row.act === 'pickup') return row.by !== world.playerId;
  if (row.act === 'show' || row.act === 'reshow') return row.to !== null && row.to !== world.playerId;
  return row.act === 'plant' && row.to !== null && row.to !== world.playerId && Object.hasOwn(world.npcs, row.to);
}

/** Exact Task5A1 claim ids connect fresh viewing families; identical text is never an identity join. */
export function artifactThreads(world: WorldState): ArtifactThread[] {
  const threads = new Map<string, ArtifactThread>();
  const get = (id: string): ArtifactThread => {
    const row: ArtifactThread = threads.get(id) ?? { kind: 'artifact', id: 'artifact:' + id, artifactId: id,
      artifact: null, events: [], storyFamilies: [] };
    threads.set(id, row); return row;
  };
  for (const artifact of world.artifacts ?? []) get(artifact.id).artifact = cloneSerializable(artifact);
  world.chronicle.forEach((row, chronicleIndex) => {
    if (row.kind !== 'artifact' || row.tick > world.tick) return;
    const thread = get(row.artifact);
    const claim = row.claimId === undefined ? null : world.claims[row.claimId] ?? null;
    const claimLink = row.claimId === undefined ? isNpcViewing(world, row) ? 'unrecorded' : 'not-a-viewing'
      : claim === null ? 'missing-claim' : 'linked';
    thread.events.push({ chronicleIndex, record: cloneSerializable(row), claim: cloneSerializable(claim),
      family: claim?.family ?? null, claimLink });
    if (claim && !thread.storyFamilies.includes(claim.family)) thread.storyFamilies.push(claim.family);
  });
  for (const thread of threads.values()) {
    thread.events.sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex);
    thread.storyFamilies.sort();
  }
  return [...threads.values()].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}
```

## Exact file: tests/debrief/magic.test.ts

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { magicThreads, type ScryThread, type SeanceThread } from '../../src/sim/debrief/magic';
import { storyThreads, unresolvedStoryEvents } from '../../src/sim/debrief/stories';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { captureScryIntel } from '../../src/sim/magic';
import { runUntil, step } from '../../src/sim/step';
import { scryWorld } from '../sim/helpers/scry-world';
import { seanceWorld, nightVisitWorld } from '../sim/helpers/seance-town';

function bought() {
  const world = scryWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
  return world;
}
function captured() { const world = bought(); world.tick = 1440; step(world, R); return world; }
function delivered() { const world = captured(); runUntil(world, 1486, R); return world; }
function ritual() {
  const world = seanceWorld(); world.tick = 15;
  applyAction(world, { tick: 15, kind: 'seance' }, R); return world;
}
function scry(world: ReturnType<typeof bought>): ScryThread {
  const thread = magicThreads(world).operations.find((row) => row.spell === 'scrying');
  if (thread?.spell !== 'scrying') throw new Error('missing scry operation'); return thread;
}
function seance(world: ReturnType<typeof ritual>): SeanceThread {
  const thread = magicThreads(world).operations.find((row) => row.spell === 'seance');
  if (thread?.spell !== 'seance') throw new Error('missing séance operation'); return thread;
}

describe('recorded magic operations and distinct acquisition facts', () => {
  it('an untouched world creates no magic operations or lazy state', () => {
    const world = scryWorld(); const before = hashWorld(world);
    expect(magicThreads(world)).toEqual({ operations: [], unassociatedIntel: [], residuesWithoutOperation: [] });
    expect(hashWorld(world)).toBe(before); expect(world.magic).toBeUndefined();
  });
  it('a successful purchase records the actual scheduled target/window and unknown historical price', () => {
    const world = bought();
    expect(scry(world)).toMatchObject({ operation: 's0', recordState: 'recorded', price: { state: 'unrecorded' },
      records: [{ record: { kind: 'scry', tick: 0, venue: 'hall', day: 1, from: 0, to: 60 } }],
      window: { from: 1440, to: 1500, phase: 'scheduled' }, captureState: 'none-recorded', intel: [] });
  });
  it('rejected scry and séance actions add no operations', () => {
    const world = scryWorld(); const before = hashWorld(world);
    expect(() => applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 2, from: 0, to: 60 }, R)).toThrow();
    expect(hashWorld(world)).toBe(before); expect(magicThreads(world).operations).toEqual([]);
    const dead = seanceWorld(); dead.coin = 0;
    expect(() => applyAction(dead, { tick: 0, kind: 'seance' }, R)).toThrow();
    expect(magicThreads(dead).operations).toEqual([]);
  });
  it('actual captures retain provenance, exact indexes and their immediate observation time', () => {
    const world = captured(); const thread = scry(world);
    expect(thread.window?.phase).toBe('active'); expect(thread.captureState).toBe('recorded');
    expect(thread.intel.length).toBeGreaterThan(0);
    for (const row of thread.intel) {
      expect(row.entry).toEqual(world.intel.log[row.entryIndex]);
      expect(row).toMatchObject({ association: 'linked', learnedAt: 1440 });
      expect(row.entry.provenance).toEqual({ kind: 'magic', spell: 'scrying', operation: 's0' });
    }
  });
  it('a paid but uninformative expired window stays none-recorded without an invented death or refund', () => {
    const world = bought(); world.tick = 1440;
    captureScryIntel(world, { tick: 1440, positions: {}, utterances: [], askings: [] });
    world.tick = 1500;
    expect(scry(world)).toMatchObject({ window: { phase: 'elapsed' }, captureState: 'none-recorded', intel: [],
      price: { state: 'unrecorded' } });
  });
  it('past the half-open window no later sensor capture is attributed to the purchase', () => {
    const world = bought(); world.tick = 1500;
    captureScryIntel(world, { tick: 1500, positions: { guard: 'hall' }, utterances: [], askings: [] });
    expect(scry(world).intel).toEqual([]);
  });
  it('actual residue creation and discovery precede actual remote receipt', () => {
    const world = captured(); const held = scry(world).residue;
    expect(held).toMatchObject({ association: 'linked', created: [{ record: { act: 'created', tick: 1440 } }],
      observed: [{ record: { act: 'observed', tick: 1440, observer: 'guard' } }], evidence: [] });
    expect(held.reports.length).toBeGreaterThan(0);
    runUntil(world, 1486, R);
    expect(scry(world).residue.evidence[0]).toMatchObject({ entry: { speaker: null, residue: { witness: 'guard' } },
      arrival: { observedAt: 1440, learnedAt: 1485, timing: 'report' } });
  });
  it('direct principal residue acquisition stays direct and does not fabricate a report route', () => {
    const world = bought(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
    world.tick = 1440; step(world, R);
    expect(scry(world).residue.evidence[0]).toMatchObject({ arrival: { timing: 'direct', learnedAt: 1440, reportMessageId: null } });
  });
  it('an actual later digest is separate from residue observation and receipt', () => {
    const world = delivered();
    expect(scry(world).residue.evidence[0]!.features).toEqual([]);
    const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
    world.enemy.decisions = [{ day: 1, features, inquiries: [], watches: [], interrogations: [] }]; world.enemy.sketch = features;
    expect(scry(world).residue.evidence[0]!.features[0]).toMatchObject({ recordedDay: 1,
      reference: { resolution: 'resolved', attentionIds: [] } });
    world.enemy.decisions[0]!.day = 0;
    expect(scry(world).residue.evidence[0]!.features[0]).toMatchObject({ recordedDay: 0, reference: { resolution: 'late' } });
  });
  it('removing an actual physical receipt keeps its acquisition unknown despite the operation and trace', () => {
    const world = delivered(); const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue')!;
    if (entry.kind !== 'arcane-residue') throw new Error('missing residue');
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'network-speech' || row.messageId !== entry.receipt!.messageId);
    expect(scry(world).residue).toMatchObject({ association: 'linked', evidence: [{ arrival: { learnedAt: null, timing: 'unrecorded' } }] });
  });
  it('duplicate physical receipts retain the existing feature ambiguity', () => {
    const world = delivered(); const receipt = world.chronicle.find((row) => row.kind === 'network-speech')!;
    world.chronicle.push(cloneSerializable(receipt));
    const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
    world.enemy.decisions = [{ day: 1, features, inquiries: [], watches: [], interrogations: [] }]; world.enemy.sketch = features;
    expect(scry(world).residue.evidence[0]!.features[0]!.reference.resolution).toBe('ambiguous');
  });
  it('duplicate operation IDs expose every record and refuse one arbitrarily selected window', () => {
    const world = captured(); const record = world.chronicle.find((row) => row.kind === 'scry')!;
    world.chronicle.push({ ...record, venue: 'away' });
    expect(scry(world)).toMatchObject({ recordState: 'ambiguous', window: null, captureState: 'uncertain' });
    expect(scry(world).records).toHaveLength(2);
    expect(scry(world).intel.every((row) => row.association === 'ambiguous' && row.learnedAt === null)).toBe(true);
  });
  it.each(['trace', 'creation'] as const)('missing %s history does not establish the operation-to-residue link', (missing) => {
    const world = captured();
    if (missing === 'trace') world.magic!.traces = [];
    else world.chronicle = world.chronicle.filter((row) => row.kind !== 'residue' || row.act !== 'created');
    expect(scry(world).residue.association).toBe('unrecorded');
  });
  it.each(['trace', 'creation'] as const)('duplicate %s history stays ambiguous', (duplicate) => {
    const world = captured();
    if (duplicate === 'trace') world.magic!.traces.push(cloneSerializable(world.magic!.traces[0]!));
    else world.chronicle.push(cloneSerializable(world.chronicle.find((row) => row.kind === 'residue' && row.act === 'created')!));
    expect(scry(world).residue.association).toBe('ambiguous');
  });
  it('a wrong-venue same-ID trace cannot become an operation fact', () => {
    const world = captured(); world.magic!.traces[0]!.venue = 'away';
    expect(scry(world).residue.association).toBe('inconsistent');
  });
  it('retained capture provenance without an operation record stays explicitly unassociated', () => {
    const world = captured(); world.chronicle = world.chronicle.filter((row) => row.kind !== 'scry');
    const history = magicThreads(world);
    expect(history.operations).toEqual([]); expect(history.unassociatedIntel.length).toBeGreaterThan(0);
    expect(history.unassociatedIntel.every((row) => row.association === 'unrecorded' && row.learnedAt === null)).toBe(true);
    expect(history.residuesWithoutOperation[0]!.association).toBe('unrecorded');
  });
  it('mutable pending windows cannot fabricate missing operation records', () => {
    const world = bought(); world.chronicle = [];
    expect(world.magic!.scries).toHaveLength(1); expect(magicThreads(world).operations).toEqual([]);
  });
  it('unknown physical residue IDs remain orphaned rather than joined by shared venue and time', () => {
    const world = captured(); world.magic!.traces[0]!.id = 'other';
    expect(magicThreads(world).residuesWithoutOperation[0]!.residueId).toBe('other');
    expect(scry(world).residue.traces).toEqual([]);
  });
  it('a retained raw physical report survives as unassociated residue when its operation and trace records are missing', () => {
    const world = captured(); world.magic!.traces = [];
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'scry' && row.kind !== 'residue');
    expect(world.network.directiveState!.heldObservations.length).toBeGreaterThan(0);
    const history = magicThreads(world);
    expect(history.operations).toEqual([]);
    expect(history.residuesWithoutOperation[0]).toMatchObject({ residueId: 's0', association: 'unrecorded' });
    expect(history.residuesWithoutOperation[0]!.reports.length).toBeGreaterThan(0);
  });
  it('an NPC channel named scrying is human without explicit magic provenance', () => {
    const world = captured(); const magic = world.intel.log.find((row) => row.provenance?.spell === 'scrying')!;
    const human = cloneSerializable(magic); delete human.provenance; human.via = 'scrying'; world.intel.log.push(human);
    expect(scry(world).intel.map((row) => row.entryIndex)).not.toContain(world.intel.log.length - 1);
    expect(magicThreads(world).unassociatedIntel).toEqual([]);
  });
  it.each(['outside-window', 'wrong-venue', 'wrong-kind'] as const)('%s provenance is retained as inconsistent, not acquired', (fault) => {
    const world = captured(); const entry = world.intel.log.find((row) => row.provenance?.spell === 'scrying')!;
    if (fault === 'outside-window') entry.tick = 1439;
    if (fault === 'wrong-venue') entry.venue = 'away';
    if (fault === 'wrong-kind') entry.kind = 'edge-read';
    expect(scry(world).intel.some((row) => row.association === 'inconsistent' && row.learnedAt === null)).toBe(true);
  });
  it('an invalid retained window exposes no computed active interval', () => {
    const world = bought(); const record = world.chronicle.find((row) => row.kind === 'scry')!;
    if (record.kind !== 'scry') throw new Error('missing purchase'); record.to = record.from;
    expect(scry(world)).toMatchObject({ window: null, captureState: 'uncertain' });
  });
});

describe('séance is receipt of a historical root and edge', () => {
  it('a real ritual retains one operation, its historical claim, exact edge and two received rows', () => {
    const world = ritual(); const thread = seance(world);
    expect(thread).toMatchObject({ recordState: 'recorded', receiptState: 'complete',
      claim: { state: 'retained-root', value: { id: world.departed!.claimId, parent: null } } });
    expect(thread.intel).toHaveLength(2);
    expect(thread.intel.every((row) => row.learnedAt === 15 && row.association === 'linked')).toBe(true);
    expect(thread.records[0]!.record.edge).toEqual(world.departed!.edge);
  });
  it('the actual story event records later receipt without a new version or invented origin', () => {
    const world = seanceWorld(); const before = cloneSerializable(world.claims);
    const existing = storyThreads(world).find((row) => row.family === world.departed!.secretId)!;
    const origins = existing.originEventIndexes;
    world.tick = 15; applyAction(world, { tick: 15, kind: 'seance' }, R);
    const thread = storyThreads(world).find((row) => row.family === world.departed!.secretId)!;
    const event = thread.events.find((row) => row.record.kind === 'seance')!;
    expect(event).toMatchObject({ claimId: world.departed!.claimId, changes: [], changedBy: null, record: { tick: 15 } });
    expect(thread.originEventIndexes).toEqual(origins); expect(world.claims).toEqual(before);
    expect(thread.versions).toHaveLength(existing.versions.length); expect(thread.lastActivityAt).toBe(15);
  });
  it('a missing historical claim keeps the actual séance event in unresolved stories', () => {
    const world = ritual(); delete world.claims[world.departed!.claimId];
    expect(seance(world).claim).toEqual({ state: 'missing', value: null });
    expect(unresolvedStoryEvents(world).some((row) => row.record.kind === 'seance')).toBe(true);
  });
  it('a malformed parent never attributes a human mutation to the dead', () => {
    const world = ritual(); world.claims[world.departed!.claimId] = { ...world.claims[world.departed!.claimId]!, parent: 'missing-parent' };
    expect(seance(world).claim.state).toBe('inconsistent');
    const event = storyThreads(world).flatMap((row) => row.events).find((row) => row.record.kind === 'seance')!;
    expect(event).toMatchObject({ changes: [], changedBy: null });
  });
  it('a missing magic edge row is incomplete rather than reconstructed from the current departed', () => {
    const world = ritual(); world.intel.log = world.intel.log.filter((row) => row.provenance?.spell !== 'seance' || row.kind !== 'edge-read');
    expect(seance(world).receiptState).toBe('incomplete'); expect(seance(world).intel).toHaveLength(1);
  });
  it('duplicate actual magic rows remain ambiguous instead of selecting the first', () => {
    const world = ritual(); world.intel.log.push(cloneSerializable(world.intel.log.find((row) => row.provenance?.spell === 'seance')!));
    expect(seance(world).receiptState).toBe('ambiguous'); expect(seance(world).intel).toHaveLength(3);
  });
  it('duplicate ritual operation records retain both and no uniquely attributed historical claim', () => {
    const world = ritual(); world.chronicle.push(cloneSerializable(world.chronicle.find((row) => row.kind === 'seance')!));
    expect(seance(world)).toMatchObject({ recordState: 'ambiguous', receiptState: 'ambiguous', claim: { state: 'ambiguous', value: null } });
    expect(seance(world).records).toHaveLength(2);
  });
  it.each(['edge', 'reported', 'human-speaker'] as const)('a corrupt %s magic receipt is explicit inconsistency', (fault) => {
    const world = ritual(); const entry = world.intel.log.find((row) => row.provenance?.spell === 'seance'
      && row.kind === (fault === 'edge' ? 'edge-read' : 'utterance'))!;
    if (fault === 'edge') entry.edgeFrom = 'invented';
    if (fault === 'reported') entry.reported!.subject = 'invented';
    if (fault === 'human-speaker') entry.speaker = 'seance';
    expect(seance(world).receiptState).toBe('inconsistent');
  });
  it('an NPC called seance cannot stand in for the missing explicitly marked receipt', () => {
    const world = ritual();
    for (const row of world.intel.log) if (row.provenance?.spell === 'seance') delete row.provenance;
    expect(seance(world)).toMatchObject({ receiptState: 'incomplete', intel: [] });
  });
  it('a mismatched retained claim ID cannot masquerade as the ritual historical root', () => {
    const world = ritual(); const id = world.departed!.claimId;
    world.claims[id] = { ...world.claims[id]!, id: 'other-root' };
    expect(seance(world).claim.state).toBe('inconsistent');
    expect(storyThreads(world).flatMap((row) => row.events).some((row) => row.record.kind === 'seance')).toBe(false);
    expect(unresolvedStoryEvents(world).some((row) => row.record.kind === 'seance')).toBe(true);
  });
  it('same operation text across spells cannot collapse two distinct channels', () => {
    const world = ritual(); world.coin = 15;
    applyAction(world, { tick: 15, kind: 'scry', venue: 'chapel-d0', day: 1, from: 0, to: 15 }, R);
    const record = world.chronicle.find((row) => row.kind === 'scry')!;
    if (record.kind !== 'scry') throw new Error('missing purchase'); record.operation = seance(world).operation;
    const operations = magicThreads(world).operations;
    expect(operations).toHaveLength(2); expect(new Set(operations.map((row) => row.id)).size).toBe(2);
    expect(operations.find((row) => row.spell === 'scrying')!.intel).toEqual([]);
  });
  it('an actual same-place night visit never becomes proof that its observer saw the ritual', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R);
    expect(world.chronicle.some((row) => row.kind === 'night-visit')).toBe(true);
    const history = magicThreads(world);
    expect(history.operations).toHaveLength(1); expect(history.operations[0]!.spell).toBe('seance');
    expect(history.residuesWithoutOperation).toEqual([]);
    expect(JSON.stringify(history)).not.toContain('nightVisit');
  });
  it('future ritual records and magic rows do not backdate into the retained current reader', () => {
    const world = ritual(); world.tick = 0;
    expect(magicThreads(world).operations).toEqual([]); expect(magicThreads(world).unassociatedIntel).toEqual([]);
    expect(storyThreads(world).flatMap((row) => row.events).some((row) => row.record.kind === 'seance')).toBe(false);
  });
});

it('all nested operation, record, claim, edge, report, trace, reference and intel output is detached', () => {
  const world = delivered();
  const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
  world.enemy.decisions = [{ day: 1, features, inquiries: [], watches: [], interrogations: [] }]; world.enemy.sketch = features;
  const before = hashWorld(world); const expected = magicThreads(world); const changed = magicThreads(world);
  expect(changed).toEqual(expected);
  const thread = changed.operations[0]!;
  thread.records[0]!.record.venue = 'changed'; thread.intel[0]!.entry.actor = 'changed';
  if (thread.spell !== 'scrying') throw new Error('missing scry');
  thread.residue.traces[0]!.trace.seenBy[0]!.observer = 'changed';
  thread.residue.observed[0]!.record.observer = 'changed';
  thread.residue.evidence[0]!.entry.residue.witness = 'changed';
  thread.residue.evidence[0]!.arrival.learnedAt = 99999;
  thread.residue.evidence[0]!.features[0]!.reference.ref.residue!.witness = 'changed';
  thread.residue.evidence[0]!.features[0]!.reference.evidenceIndexes.push(999);
  thread.residue.reports[0]!.held[0]!.observer = 'changed';
  expect(hashWorld(world)).toBe(before); expect(magicThreads(world)).toEqual(expected);
  const dead = ritual(); const deadBefore = hashWorld(dead); const deadExpected = magicThreads(dead);
  const ritualThread = magicThreads(dead).operations[0]!;
  if (ritualThread.spell !== 'seance') throw new Error('missing ritual');
  Reflect.set(ritualThread.claim.value!, 'subject', 'changed'); ritualThread.records[0]!.record.edge.from = 'changed';
  const story = storyThreads(dead).flatMap((row) => row.events).find((row) => row.record.kind === 'seance')!;
  if (story.record.kind !== 'seance') throw new Error('missing story'); story.record.edge.to = 'changed';
  expect(hashWorld(dead)).toBe(deadBefore); expect(magicThreads(dead)).toEqual(deadExpected);
});
```
