# Task 5B physical evidence-arrival and feature-reference proposal

Authored 13 September 2026 with the canonical author skill, inherited root capability.
Proposal only; ready for separate independent review after the gates in the report.
Production is not changed or shipped. This proposal extends the independently approved
receipt-corrected ordinary fragment without migrating or deleting any inherited case.

## Behavior and boundaries

Arcane residue and chapel night visits resolve only through their own retained marked
reference and exact physical evidence. A direct principal observation requires its exact
recorded sighting. A remote entry requires its explicit receipt, exactly one actual heard
network speech and exactly one matching spoken physical atom. Missing receipts, omitted
atoms, ambiguous receipts and future receipts stay undated. The original witness, observation
time, acquisition time and recorded digest day remain separate. Retelling never rewrites
the original physical identity or first acquisition. Residue names a place, with no caster
subject; a night visit names the actually seen actor. Neither implies a séance occurred.

Receipt resolution and original-sighting resolution remain separate. A uniquely acquired
reported atom can resolve its receipt while its absent or duplicated original sighting
leaves attention missing or ambiguous. A unique physical sighting has no inferred attention
IDs: it does not establish a questioning, carrier, ritual or staffed watch. `none` retains
the inherited meaning of no proved association, not proof that unrecorded work never occurred.
Magic-operation history and any additional performed physical-operation/attention models
remain outside this unit, as do story/séance family integration, calendar, terminal and UI.

An intact physical reference cannot alias an ordinary asking or the other physical channel
through null speech IDs. Physical feature kinds require their own marker. A damaged copied
runaround with a retained same-key physical candidate stays unsupported instead of borrowing
an ordinary asking. The old purely ordinary runaround/asking regression remains unchanged.
This bound uses available retained evidence; it does not promise recovery after arbitrary
deletion of both the physical marker and every retained indication of its channel.

## Verified source basis and prerequisites

All tracked source comes from detached aaaa57bd6bea2ce11414440f8c702173b53fb4b4, containing
actual Task 3, Task 4A and Task 4B. The 349-file archive began directly under the owned
validation/node_modules/hearsay-baseline directory. Root's later Task 4C production commits
were not substituted into this fixed source basis.

`prepare.py` saves hashes and immutable copies of the 16 named primary inputs, then builds
the committed archive. `frozen147-sources.json` retains the entire approved 28-file map.
`merged-pre4c.json` and `overlay-provenance.json` preserve the mechanical three-way attempt
from 09e54582f0a5fc9505e396bd1910c800c7413fff to the fixed actual base. `assemble.py` supplies
all exact additive reconciliation operations. No historical speech-only union replaces
the committed physical/provenance interfaces. Actual intel entry/provenance supersede the
obsolete narrow overlay. The threadOf overlap preserves inject/telling/seance membership
under T5A-A1 while retaining the proposed exact artifact explanation links.

The virtual future overlays are explicit: Task 4C capture, marked presence transport,
night-visit evidence/ref/digest and nested copies from the frozen complete Task 4 plan;
Task 5A recording, Task 5A2 private outcome history, R16/R17 evaluator/execution behavior,
and the seven other ordinary debrief modules from the approved frozen map. The complete
final values and hashes are in green/complete-green.source-map.json and source-inventory.json.
The committed compiler/ESLint configuration is unchanged. Future Task 4 auditor/T4-A1 gates
remain the predecessor owner's responsibility; this host does not claim their implementation.

Actual production sequencing remains Task 4 closure, approved prose, Task 5A with T5A-A1,
R16 then R17 and Task 5A2, ordinary debrief folds, then this atomic extension. Reconcile
the final actual predecessor before transcription; retain additive interfaces and preserve
the frozen ordinary proposal. An evidenced source contradiction returns to root.

## Atomic implementation unit

Ownership: the two model files and one new permanent test file below. Use a capable
implementation worker for causal TypeScript folds, followed by an independent reviewer
of at least the same capability. Root owns the production index and serial writer order.
No runtime recording, rules, thresholds, RNG, schedules, UI, app or root config changes
are licensed by this unit. PhysicalEvidence is a pure extracted type over the existing
evidence union; the new helper consumers are completely included in these two files.

Transcribe all three complete bodies below. Preserve all eight inherited test files and
the other seven model bodies byte-for-byte. No MIGRATED cases: 0. The old two unsupported
controls remain honest because they intentionally contain an incomplete/incorrect marker
or a physical feature without its physical reference; proper physical cases are new.

The ordinary acquisition amendment is limited to physical append slots in mixed reports.
Skip only a row corroborated by the same explicit receipt, never an arbitrary null-ID row.
The maximum possible append span includes potentially appended physical atoms because
physical ingestion may append once or dedupe. A missing/ambiguous physical receipt blocks
complete ordinary association and reserves matching candidates inside that bounded span.
Never search or associate beyond its end. R24/R25 ordinary reservation, nested-envelope
non-recursion, distinguishable direct controls and unique per-item roots are preserved.

This mixed-slot defect was reported to root with the 186 pass / 1 fail native trace.
Root authorized the bounded repair under the existing recommended-default direction;
root will queue R26. The final mixed case retains an actual original guard hearing at 15:
old code falsely dates the received question direct at 15, corrected code dates it 45.
Removing the actual receipt leaves it unrecorded. These are postgame-fold changes only.

## Acceptance and verification

The permanent suite is 198 = 147 unchanged inherited cases + 51 additions. Both channels
have real direct and delivered chains, actual next-day receipt boundaries, actual retelling,
missing/conflicting/duplicate receipts, omitted/unheard atoms, original-witness controls,
missing/duplicate sightings/evidence, orphan digests, marker/cross-channel collisions,
nested output ownership and unchanged-world assertions. The cross-channel positive uses
a real simultaneous residue/night-visit encounter. The copied reference case uses the real
enemyDigest runaround consumer; its retained HQ worked-night ledger is a consumer fixture,
not a claim that this test physically performed those watch nights. Mixed report fixtures
use explicit retained hearings and real captureEvidence/ingestEnemyItem projection.

RED and GREEN execute identical permanent bodies. See the author report for native counts,
commands and raw artifact prefixes. Both actual compiler configurations, scoped virtual lint
and the four determinism/import diagnostics at each changed source path must pass.
Use the isolated .probe.ts loader; never place collectible scratch tests into a normal tree.
Production gates after actual-base reconciliation: npm test, npm run lint, npm run typecheck,
npm run app:build, followed by independent committed-code review. Full integration adds
the separately required soak/MC comparison. This pure proposal makes no full-game gate claim.

| Exact production target | UTF-8/LF SHA256 |
| --- | --- |
| `src/sim/debrief/evidence.ts` | `8d0a9383a097c664f6d97fc97ae2c87b0ce59b44fe7094d181b04780b40632b0` |
| `src/sim/debrief/feature-links.ts` | `6866278b62b715c54eaf8218eed90d670feeb8a3a167612e06f41903c0ff40fa` |
| `tests/debrief/physical-links.test.ts` | `131fbeca1e71c121093405f94516e94515619b377b4cc2f8450443b0232f9c83` |

## Exact file: src/sim/debrief/evidence.ts

```ts
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
```

## Exact file: src/sim/debrief/feature-links.ts

```ts
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
```

## Exact file: tests/debrief/physical-links.test.ts

```ts
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
```
