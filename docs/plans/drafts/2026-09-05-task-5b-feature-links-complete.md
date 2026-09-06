# Task5B — complete ordinary feature-link proposal fragment

**Authored-by:** Codex GPT-6, inherited highest controller capability · **Date:**5September2026
**Spec:** docs/design-spec.md:79–89; task-5b-model-premises.md; Plan11 constraints.
**Base:**09e54582f0a5fc9505e396bd1910c800c7413fff with frozen virtual predecessors below.
**Constraints:** task-5b-feature-links-completion-constraints.md.
**Dependency order:** actual Task3/4 → approved Task7A → Task5A with T5A-A1 →
R16 then R17 and Task5A2 → preceding eight Task5B modules → this atomic fragment;
full-model magic/calendar/composition must be reconciled before full Task5B dispatch.
**Author gate:** `python -X utf8 .superpowers/sdd/task-5b-feature-links-completion-validation/run.py green tests final-green-native`
then the same runner with `green preflight final-preflight`.

This is a complete-code bounded proposal, not implementation or approval. It replaces
the untested feature-link WIP and its separate evidence extension only. The original
eight-module/96-case proof remains immutable. No full Task5B readiness is asserted.

## Premises the next controller must verify

The committed09e source includes approved R20: H10 stores the actual received report
network ref, and direct local paper retains a claim ref. Live magic source is not
the validation base. The snapshot was extracted directly under this validation's
node_modules directory from `git archive`09e; every tracked snapshot file is checked.

The frozen26-file input map is task-5b-reports-validation/relative-sources.json,
SHA256 03234a82fcafa458cfec9828b508f98e62ec1d1076401b94e60a84edd389e9c6.
Its eight model sources and seven test files are exact author inputs. Eleven
other source overlays are explicit future prerequisites: Task5A's artifact claim
links and report-root recording in sim/types, artifacts, directives/types,
directives/transport, phases, chronicle; Task3's exact provenance type/module in
intel/entry and intel/provenance; and Task5A2/R16/R17 in directives/types, reports,
execution and evaluator. Overlap is assembled exactly by the frozen original
builders. Only this new proposal replaces debrief/evidence; it adds feature-links
and one test file. See snapshot-manifest.json and integrity.json for every hash.

Task5A's binding T5A-A1 preserves future séance family membership. That future
ritual is absent from this ordinary09e overlay and is not certified here. Do not
apply its older speech-only chronicle replacement over actual Task4. The snapshot
also does not contain full Task3/4 magic or corrected Task7A UI: their actual bases
must be reconciled, never overwritten with these historical overlays.

The R24 correction is PROVISIONAL controller-adopted in
task-5b-incomplete-batch-adjudication-2026-09-05.md. It affects the supporting pure
evidence fold only; no engine record or acquisition mechanism is changed.

Frozen WIP identities (do not edit):

| Original artifact | SHA256 |
| --- | --- |
| task-5b-feature-links-proposal.txt | 59422b99fd175d8fd0e4529e92c13049c44ce2b7bf0ee70a9ea2256b9b951926 |
| task-5b-feature-evidence-proposal.txt | 1a406a2b4e501cb3508725c448ee47c7cba2f443b5f0660b2405bcd5bb007fb4 |
| task-5b-evidence-proposal.txt (96-case source) | 043c3daba278ea9dbe91a56dd493324b6dabac7d5e1fe3f38922a0c644bebfed |

## Task5B-F1 — ordinary reference and performed-attention fold

**Model:** frontier_implementer (Sol/high or higher); independent review at least
frontier_reviewer, in a different thread. One production writer; root owns index.
**Files:** src/sim/debrief/evidence.ts; new src/sim/debrief/feature-links.ts;
new tests/debrief/feature-links.test.ts. No other file is licensed by this fragment.
**Goal:** explain a retained feature's ordinary evidence and any proved physical
attention without inventing receipt dates, source witnesses or continuous watch work.

This is one atomic causal-interface unit: the optional reportEvidenceIndex and
reportItemIndex/rootFingerprint fields must land with their consumer and tests.
There are no placeholders or implicit helper dependencies in the code below.
The test file contains its complete fixtures, including five mechanically copied
helpers from committed09e forensics tests. Do not edit those existing tests.

**Tests first:** land the exact48-case test file below. Against a missing new module,
an import failure proves wiring only. Before production transcription, rerun the
provided isolated frozen-WIP RED to verify the mechanisms: final122 pass/22 fail,
including lost one/two-hop question/compulsion links, null/object-root exceptions,
incorrect late classification, unsupported causal ambiguity, later-watch false link,
and R24's direct1980 backdating. The corrected exact proposal passes all144 cases.
No existing96 assertion is relaxed. Do not commit temporary WIP production code
merely to manufacture RED; its reproduction remains in the isolated author harness.

**Self-checks before editing:** verify the three complete code-fence hashes below,
the28-file virtual map (26 original entries minus one replacement plus two new),
all25 preserved map values, seven preserved test files and48 new measured cases.
Check actual predecessor unions, acquisition branches and imports. If new physical
variants differ, STOP for the separately required magic migration; this ordinary
fragment does not authorize a broad whole-file overwrite. Verify no source writer
or unexpected dirty overlap before root stages a scoped commit.

**Acceptance:** actual direct/one-hop/two-hop H10 sources preserve their original
refs; actual invitational compulsion and questioning link only through the unique
retained original event; same-envelope distractors and competing candidates do not
borrow links; actual watch work links only at its recorded beat. Complete and broken
report batches, exact witness identity, late/missing/unknown/unsupported refs,
unrecorded digest days and nested ownership must pass the exact tests below.

**Production gate after actual-base reconciliation:** `npm test`, `npm run lint`,
`npm run typecheck`, `npm run app:build`. The focused gate is
`npx vitest run tests/debrief/feature-links.test.ts tests/debrief/evidence-arrival.test.ts`
plus all existing debrief tests. Full integration later adds soak/MC under Plan11.
The current144 isolated author cases are not a new whole-game suite total.

**Reusable work:** keep the versioned snapshot/virtual-map runner as a script;
its exact-input, native-exit and fence checks fit mechanical_worker after review.
Do not create a new global skill or modify shared fabric for this fragment.

## Exact file: src/sim/debrief/evidence.ts

UTF8/LF SHA256 `d601b03da929f027893d1341b10509844bff0097b0f0863627160e934179908d`.

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
 * Legacy speech evidence only; physical magic receipt branches are a separate
 * integration requirement. Replay the retained append structure, not an ambiguous
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
    if (arrivals[index]!.timing !== 'unrecorded' || incompleteBatchCandidates.has(index) || !directlyHeard(world, entry)) return;
    arrivals[index] = { ...arrivals[index]!, learnedAt: entry.tick, timing: 'direct' };
    if (entry.kind !== 'network' || entry.network.spoken.kind !== 'field-report') return;
    const items = entry.network.spoken.items;
    const children = items.flatMap((item, itemIndex) => {
      const child = projected(item.observation, entry.speaker);
      return child === null ? [] : [{ child, itemIndex }];
    });
    if (!children.every(({ child }, offset) => {
      const actual = world.enemy.evidence[index + offset + 1];
      return actual !== undefined && key(actual) === key(child);
    })) {
      const expected = new Set(children.map(({ child }) => key(child)));
      // Each projected speech item appends at most one row, synchronously. Deletion can
      // shorten that original span; it cannot move a surviving child beyond its end.
      // Equivalent direct/report occurrences inside a broken span are indistinguishable:
      // leave their arrival unknown rather than asserting the original observation date.
      for (let offset = 1; offset <= children.length; offset++) {
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
      const childIndex = index + offset + 1;
      arrivals[childIndex] = { ...arrivals[childIndex]!, learnedAt: entry.tick,
        reportMessageId: entry.network.messageId, timing: 'report',
        ...(linked ? { reportEvidenceIndex: index, reportItemIndex: itemIndex, rootFingerprint: roots[itemIndex]! } : {}) };
    });
  });
  return arrivals;
}
```

## Exact file: src/sim/debrief/feature-links.ts

UTF8/LF SHA256 `9a5da1137f96f9e5b5066dfc6d0683db943374f22733f4edd303d985f9d05987`.

```ts
import { dayOf, TICKS_PER_DAY } from '../../core/time';
import type { Observation } from '../perception';
import type { EvidenceEntry, SketchEvidenceRef, SketchFeature } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import { SOMEONE } from '../rumors/claim';
import type { WorldState } from '../types';
import { attentionAt, type ActualAttention } from './attention';
import { evidenceArrivals, type EvidenceArrival } from './evidence';
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

/** Ordinary postgame references only. Dedicated physical magic shapes are visibly unsupported. */
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
        if (!legacyKinds.has(feature.kind) || Object.keys(ref).some((key) => !legacyRefFields.has(key))) {
          link.resolution = 'unsupported'; link.attentionResolution = 'unsupported'; return link;
        }
        world.enemy.evidence.forEach((entry, index) => {
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

## Exact file: tests/debrief/feature-links.test.ts

UTF8/LF SHA256 `19969cd062f405088f239ac14500c2afba209792debf60cdb9276bde71f1fea1`.

```ts
import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyForge } from '../../src/sim/artifacts';
import { applyAction } from '../../src/sim/campaign';
import { applyEnemyDecision, captureEvidence } from '../../src/sim/counterintel';
import { attentionAt } from '../../src/sim/debrief/attention';
import { evidenceArrivals } from '../../src/sim/debrief/evidence';
import { featureLinks, counterFeatureLinks } from '../../src/sim/debrief/feature-links';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { allocateNetworkMessage } from '../../src/sim/directives/state';
import type { NetworkSpeech } from '../../src/sim/directives/types';
import { enemyDigest } from '../../src/sim/enemy/digest';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { blankIntel } from '../../src/sim/fieldwork';
import { chooseAnswer } from '../../src/sim/inquiry';
import { observationsFor, type Asking, type TickEvents } from '../../src/sim/perception';
import { prepareTick } from '../../src/sim/phases';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';
const SPEC = { subject: 'cyn', predicate: 'met-secretly-with', object: null,
  count: 2, severity: 4 as const, place: 'square', attribution: SOMEONE };
const ANSWER_AT = at(1, 9);

function answerWorld(paper: boolean) {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
  for (const npc of fixture.npcs) {
    npc.edges = npc.edges.filter((edge) => edge.to !== 'dov');
    npc.traits = npc.id === 'bez' ? ['moralizer'] : [];
  }
  const world = buildWorld(fixture, 'forensics-boundaries', RULES);
  enrollPlayer(world, { home: 'square' });
  if (paper) {
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = at(1, 8);
    applyAction(world, { tick: world.tick, kind: 'plant', artifact: 'a0', to: 'ada', venue: null },
      RULES, prepareTick(world, RULES));
  } else {
    applyInject(world, 'ada', SPEC);
  }
  world.tick = ANSWER_AT;
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  const asking: Asking = {
    tick: ANSWER_AT, venue: 'backroom', circleMembers: ['ada', 'bez'],
    speaker: 'bez', addressedTo: 'ada', about: { family }, authority: true,
  };
  const answer = chooseAnswer(world, 'ada', asking, ANSWER_AT, RULES)!;
  expect(answer).not.toBeNull();
  const events: TickEvents = {
    tick: ANSWER_AT, positions: { ada: 'backroom', bez: 'backroom', cyn: 'square' },
    utterances: [answer], askings: [asking],
  };
  return { world, answer, events };
}

function interrogationBase(traits: string[] = []) {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
  for (const npc of fixture.npcs) {
    npc.edges = [];
    npc.traits = npc.id === 'ada' ? traits : [];
    npc.rivals = npc.id === 'ada' ? ['cyn'] : [];
  }
  fixture.npcs.find((npc) => npc.id === 'bez')!.occupation = 'guard';
  fixture.npcs.find((npc) => npc.id === 'ada')!.schedule.unshift({
    days: 'all', from: 900, to: 1020, venue: 'backroom',
  });
  const world = buildWorld(fixture, 'forensics-interrogation', RULES);
  world.enemy.map = buildTownMap(fixture);
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  world.network.spymaster = 'cyn';
  enrollPlayer(world, { home: 'square' });
  return world;
}

function interrogatedWorld(traits: string[] = [], pickup = false) {
  const world = interrogationBase(traits);
  applyForge(world, SPEC, at(0, 8), RULES);
  world.tick = at(1, 8);
  applyAction(world, { tick: world.tick, kind: 'plant', artifact: 'a0',
    to: pickup ? null : 'ada', venue: pickup ? 'square' : null },
    RULES, prepareTick(world, RULES));
  if (pickup) {
    runUntil(world, at(1, 8, 16), RULES); // pickup requires a later beat than the plant
    expect(world.artifacts![0]!.heldBy).toBe('ada');
  }
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  const issuedAt = world.tick;
  applyEnemyDecision(world, {
    day: 1, features: [], inquiries: [], watches: [],
    interrogations: [{ target: 'ada', guard: 'bez', day: 1, about: { family }, venue: 'backroom' }],
  });
  step(world, RULES);
  // A pickup consumes the first beat; deliver the order at the next actual contact.
  while (world.network.directiveState!.records[0]!.received === null && world.tick < at(1, 9)) {
    step(world, RULES);
  }
  expect(world.network.directiveState!.records[0]!.received?.tick).toBeGreaterThanOrEqual(issuedAt);
  runUntil(world, at(2, 0), RULES);
  const asking = world.chronicle.find((row) => row.kind === 'asking'
    && row.speaker === 'bez' && row.addressedTo === 'ada' && row.authority);
  expect(asking).toMatchObject({ venue: 'backroom' });
  const answer = world.enemy.evidence.find((entry) => entry.kind === 'utterance'
    && entry.mode === 'answer' && entry.speaker === 'ada')!;
  expect(answer).toMatchObject({ document: true, venue: 'backroom', observer: 'bez' });
  return { world, answer };
}

function stagedPaperAnswer(spymaster: 'bez' | 'cyn', cynArrivesAt: number | null = null) {
  const { world } = answerWorld(true);
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  world.network.spymaster = spymaster;
  world.enemy.observers = [];
  if (cynArrivesAt !== null) {
    world.npcs['cyn']!.schedule = [
      { days: 'all', from: 0, to: cynArrivesAt, venue: 'backroom' },
      { days: 'all', from: cynArrivesAt, to: 1439, venue: 'square' },
    ];
  }
  world.inquiries['bez'] = [{
    about: { family }, from: 'enemy', expiresDay: 3, asked: [], answersHeard: 0,
    addressee: 'ada',
  }];
  const events = step(world, RULES);
  const answer = events.utterances.find((entry) => entry.mode === 'answer'
    && entry.speaker === 'ada' && entry.claim.family === family)!;
  expect(answer).toMatchObject({ document: true, addressedTo: 'bez' });
  const telling = world.chronicle.find((entry) => entry.kind === 'telling'
    && entry.tick === answer.tick && entry.claimId === answer.claim.id);
  if (telling?.kind !== 'telling') throw new Error('missing normal-phase answer chronicle');
  expect(telling.heardBy).toContainEqual({ id: 'bez', addressed: true });
  return { world, events, answer };
}

function captureRelayedPaper(hops: 1 | 2) {
  const { world, events } = stagedPaperAnswer('cyn', hops === 1 ? 555 : 570);
  if (hops === 2) {
    world.npcs['ada']!.traits = ['name-dropper'];
    world.npcs['ada']!.rivals = ['cyn'];
  }
  const observation = observationsFor('bez', events).observations
    .find((entry) => entry.kind === 'utterance')!;
  holdFieldObservation(world, 'enemy', 'bez', { kind: 'raw', observation },
    null, hops === 1 ? ['cyn'] : ['ada', 'cyn'], null, []);
  queueUnqueuedFieldReports(world);
  const message = world.network.directiveState!.messages[0]!;
  const before = world.enemy.evidence.length;
  runUntil(world, message.availableAfter, RULES);
  const firstEvents = step(world, RULES);
  const first = firstEvents.networkSpeeches?.find((speech) => speech.messageId === message.id);
  if (!first) throw new Error('missing normal-phase first report hop');
  let delivered = first;
  if (hops === 2) {
    runUntil(world, message.availableAfter, RULES);
    const secondEvents = step(world, RULES);
    const second = secondEvents.networkSpeeches?.find((speech) => speech.messageId === message.id);
    if (!second) throw new Error('missing normal-phase second report hop');
    delivered = second;
  }
  const added = world.enemy.evidence.slice(before);
  const network = added.find((entry) => entry.kind === 'network'
    && entry.network.messageId === message.id);
  if (network?.kind !== 'network') throw new Error('missing captured report evidence');
  const answer = added.find((entry) => entry.kind === 'utterance'
    && entry.mode === 'answer' && entry.document === true);
  if (answer?.kind !== 'utterance') throw new Error('missing received document answer');
  expect(added.indexOf(network)).toBeLessThan(added.indexOf(answer));
  const heard = world.chronicle.find((entry) => entry.kind === 'network-speech'
    && entry.tick === network.tick && entry.messageId === network.network.messageId);
  if (heard?.kind !== 'network-speech') throw new Error('missing normal-phase report chronicle');
  expect(heard.heardBy).toContainEqual({ id: network.observer, addressed: true });
  return { world, delivered, network, answer };
}

function retained(world: WorldState, feature: SketchFeature, day = 1) {
  world.enemy.decisions = [{ day, features: [cloneSerializable(feature)], inquiries: [], interrogations: [], watches: [] }];
  world.enemy.sketch = [cloneSerializable(feature)];
  world.tick = Math.max(world.tick, (day + 1) * 1440 - 1);
}
function direct() {
  const { world, answer } = stagedPaperAnswer('bez');
  const feature = enemyDigest(world.enemy, 1, RULES).features.find((row) => row.kind === 'forged-document')!;
  expect(feature).toBeDefined(); retained(world, feature);
  const index = world.enemy.evidence.findIndex((row) => row.kind === 'utterance' && row.claimId === answer.claim.id);
  const eventIndex = world.chronicle.findIndex((row) => row.kind === 'telling' && row.claimId === answer.claim.id);
  const askingIndex = world.chronicle.findIndex((row) => row.kind === 'asking' && row.tick === answer.tick
    && row.speaker === answer.addressedTo && row.addressedTo === answer.speaker);
  expect(index).toBeGreaterThanOrEqual(0); expect(eventIndex).toBeGreaterThanOrEqual(0);
  expect(askingIndex).toBeGreaterThanOrEqual(0);
  return { world, feature, index, eventIndex, askingIndex };
}
function delivered(hops: 1 | 2 = 2) {
  const value = captureRelayedPaper(hops);
  const feature = enemyDigest(value.world.enemy, 1, RULES).features.find((row) => row.kind === 'forged-document')!;
  expect(feature).toBeDefined(); retained(value.world, feature);
  const index = value.world.enemy.evidence.indexOf(value.network);
  const child = value.world.enemy.evidence.indexOf(value.answer);
  const receipt = value.world.chronicle.find((row) => row.kind === 'network-speech'
    && row.tick === value.network.tick && row.messageId === value.network.network.messageId)!;
  if (receipt.kind !== 'network-speech' || receipt.spoken.kind !== 'field-report') throw new Error('missing real receipt');
  const askingIndex = value.world.chronicle.findIndex((row) => row.kind === 'asking'
    && row.tick === value.answer.tick && row.speaker === value.answer.addressedTo && row.addressedTo === value.answer.speaker);
  return { ...value, feature, index, child, receipt, askingIndex };
}
const reference = (world: WorldState) => featureLinks(world)[0]!.references[0]!;

function multiItemReport(competing: boolean, hops: 1 | 2 = 2) {
  const first = stagedPaperAnswer('cyn', 585);
  const { world } = first;
  if (!competing) applyInject(world, 'ada', { ...SPEC, subject: 'bez', predicate: 'stole' });
  const family = competing ? first.answer.claim.family : Object.values(world.beliefs.ada!)
    .find((belief) => belief.claim.subject === 'bez')!.claim.family;
  world.inquiries.bez = [{ about: { family }, from: 'enemy', expiresDay: 3,
    asked: [], answersHeard: 0, addressee: 'ada' }];
  runUntil(world, at(1, 9, 15), RULES);
  const second = step(world, RULES);
  const secondAnswer = second.utterances.find((row) => row.mode === 'answer' && row.claim.family === family)!;
  expect(secondAnswer).toBeDefined();
  expect(secondAnswer.document === true).toBe(competing);
  for (const events of [first.events, second]) {
    const raw = observationsFor('bez', events).observations.find((row) => row.kind === 'utterance' && row.mode === 'answer')!;
    expect(raw).toBeDefined();
    holdFieldObservation(world, 'enemy', 'bez', { kind: 'raw', observation: raw }, null, hops === 1 ? ['cyn'] : ['ada', 'cyn'], null, []);
  }
  queueUnqueuedFieldReports(world);
  runUntil(world, at(1, 9, 46), RULES);
  const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'field-report')!;
  expect(packet.deliveredAt).not.toBeNull();
  const network = world.enemy.evidence.find((row) => row.kind === 'network' && row.network.messageId === packet.id)!;
  if (network.kind !== 'network' || network.network.spoken.kind !== 'field-report') throw new Error('no multi-item receipt');
  expect(network.network.spoken.items).toHaveLength(2);
  const feature = enemyDigest(world.enemy, 1, RULES).features.find((row) => row.kind === 'forged-document')!;
  expect(feature).toBeDefined(); retained(world, feature);
  const questionIds = [first.answer.tick, secondAnswer.tick].map((tick) => 'asking:' + world.chronicle.findIndex((row) =>
    row.kind === 'asking' && row.tick === tick && row.speaker === 'bez' && row.addressedTo === 'ada'));
  return { world, questionIds };
}

function watchWithEvidence(delay = 0) {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez', 'cyn'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'feature-live-watch', RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  const record = world.network.directiveState!.records[0]!;
  runUntil(world, at(1, 16), RULES);
  const firstWork = record.outcomes?.find((row) => row.result.enemyAction?.kind === 'watch-worked');
  // The actual outcome is generated by normal settlement on the next eligible beat.
  if (!firstWork) {
    for (let tries = 0; tries < 31 && !record.outcomes?.some((row) => row.result.enemyAction?.kind === 'watch-worked'); tries++) {
      step(world, RULES);
    }
  }
  const outcome = record.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!;
  expect(outcome, 'normal watch outcome: ' + JSON.stringify(record)).toBeDefined();
  const tick = outcome.result.enemyAction!.occurredAt;
  // Re-grow the staged watch, then deliver a real network speech on its proved work beat.
  const replay = buildWorld(town, 'feature-live-watch', RULES);
  replay.network.spymaster = 'ada';
  replay.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  replay.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(replay, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  runUntil(replay, tick + delay, RULES);
  const messageId = allocateNetworkMessage(replay, 'player', 'cyn', ['bez'],
    { kind: 'invitation-response', invitationId: 'unrelated', response: 'accept' }, replay.tick, null, null);
  const events = step(replay, RULES);
  const observation = observationsFor('bez', events).observations.find((row) => row.kind === 'network-speech' && row.messageId === messageId)!;
  expect(observation, 'watch observation: ' + JSON.stringify(events)).toBeDefined();
  const worked = replay.network.directiveState!.records[0]!.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!;
  expect(worked.result.enemyAction!.occurredAt).toBe(tick);
  holdFieldObservation(replay, 'enemy', 'bez', { kind: 'raw', observation }, null, ['ada'], null, []);
  queueUnqueuedFieldReports(replay); runUntil(replay, tick + delay + 31, RULES);
  const entry = replay.enemy.evidence.find((row) => row.kind === 'network' && row.tick === events.tick
    && row.network.messageId === messageId && row.observer === 'bez')!;
  expect(entry, 'received watch evidence: ' + JSON.stringify(replay.enemy.evidence)).toBeDefined();
  retained(replay, { id: 'watch-proof', kind: 'carrier-profile', day: 1, subject: 'cyn', family: null,
    district: 'd0', detail: 'a model fixture referencing the actual heard network speech',
    evidence: [{ tick: entry.tick, observer: entry.observer, claimId: null, messageId }] });
  const act = attentionAt(replay, replay.tick).actual.find((row) => row.kind === 'watch')!;
  expect(act).toBeDefined();
  return { world: replay, record: replay.network.directiveState!.records[0]!, act, tick };
}

describe('ordinary feature references preserve receipts and actual attention separately', () => {
  it('an untouched world has no invented features, attention or lazy state', () => {
    const world = buildWorld(miniTown(), 'feature-empty', RULES); const before = hashWorld(world);
    expect(counterFeatureLinks(world, 0)).toMatchObject({ features: [], signals: [], unresolvedFeatureIds: [], unrecordedFeatureIds: [] });
    expect(hashWorld(world)).toBe(before); expect(world.network.directiveState).toBeUndefined();
  });
  it('an actual direct paper answer keeps its claim ref and links its exact authority question', () => {
    const { world, feature, index, askingIndex } = direct();
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index],
      attentionIds: ['asking:' + askingIndex] });
    expect(reference(world).ref).toEqual(feature.evidence[0]);
    expect(reference(world).ref.claimId).not.toBeNull();
  });
  it.each([1, 2] as const)('actual %i-hop paper receipt keeps its network ref and follows the original witness root', (hops) => {
    const { world, feature, index, child, askingIndex, answer } = delivered(hops);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], attentionIds: ['asking:' + askingIndex] });
    expect(reference(world).ref).toEqual(feature.evidence[0]);
    expect(reference(world).ref.claimId).toBeNull();
    expect(reference(world).ref.messageId).not.toBeNull();
    expect(evidenceArrivals(world)[child]).toMatchObject({ reportEvidenceIndex: index, reportItemIndex: 0 });
    if (hops === 2) {
      expect(answer.observer).toBe('ada');
      const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
        && row.content.observation.kind === 'utterance')!;
      expect(raw.observer).toBe('bez');
      expect(raw.content.observation).toMatchObject({ claim: { attribution: 'you' } });
      expect(answer.reported.attribution).toBe('cyn');
      expect(feature.subject).toBe('cyn');
    }
  });
  it('a real invitational interrogation links both the asking and its compelled answer', () => {
    const { world } = interrogatedWorld();
    const feature = world.enemy.sketch.find((row) => row.kind === 'forged-document')!;
    retained(world, feature);
    const all = attentionAt(world, world.tick).actual;
    const expected = all.filter((act) => act.kind === 'questioning' || act.kind === 'compelled-answer').map((act) => act.id).sort();
    expect(expected).toHaveLength(2);
    expect(reference(world).attentionIds).toEqual(expected);
  });
  it('repeated direct evidence with the same ref remains ambiguous rather than first-match resolved', () => {
    const { world, index } = direct(); world.enemy.evidence.push(cloneSerializable(world.enemy.evidence[index]!));
    expect(reference(world)).toMatchObject({ resolution: 'ambiguous', attentionIds: [] });
    expect(reference(world).evidenceIndexes).toHaveLength(2);
  });
  it('a dated candidate plus an undated competing occurrence remains ambiguous', () => {
    const { world, index } = direct();
    const twin = cloneSerializable(world.enemy.evidence[index]!); twin.venue = 'missing-history'; world.enemy.evidence.push(twin);
    expect(reference(world)).toMatchObject({ resolution: 'ambiguous', evidenceIndexes: [index],
      undatedEvidenceIndexes: [world.enemy.evidence.length - 1], attentionIds: [] });
  });
  it('only a later receipt is explicitly late, without backdating it to the reported observation', () => {
    const { world, child } = delivered();
    const entry = world.enemy.evidence[child]!;
    const feature = { ...world.enemy.sketch[0]!, evidence: [{ tick: entry.tick, observer: entry.observer, claimId: entry.claimId, messageId: null }] };
    retained(world, feature, 0);
    expect(reference(world)).toMatchObject({ resolution: 'late', evidenceIndexes: [], laterEvidenceIndexes: [child], attentionIds: [] });
  });
  it('a later duplicate does not make the unique earlier received occurrence ambiguous', () => {
    const { world, index } = direct();
    const before = reference(world).attentionIds;
    // Actual report ingestion supplies a later row with the same inner reference.
    const entry = world.enemy.evidence[index]!;
    if (entry.kind !== 'utterance') throw new Error('missing utterance');
    const speech: NetworkSpeech = { tick: 4320, venue: 'square', speaker: entry.observer!, addressedTo: 'cyn',
      circleMembers: [entry.observer!, 'cyn'], messageId: 'late', cause: null, spoken: { kind: 'field-report', onwardTo: null,
        items: [{ factRefs: [], observation: { kind: 'utterance', observedAt: entry.tick, venue: entry.venue,
          speaker: entry.speaker, addressedTo: entry.addressedTo, overheard: entry.overheard,
          mode: entry.mode, claimId: entry.claimId, family: entry.family, reported: entry.reported, document: true } }] } };
    world.chronicle.push({ ...speech, kind: 'network-speech', heardBy: [{ id: 'cyn', addressed: true }] });
    world.network.spymaster = 'cyn'; captureEvidence(world, { tick: 4320, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] }, RULES);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], attentionIds: before });
    expect(reference(world).laterEvidenceIndexes).toHaveLength(1);
  });
  it('missing evidence and uncorroborated evidence have different results', () => {
    const { world } = direct(); world.chronicle = [];
    expect(reference(world)).toMatchObject({ resolution: 'unrecorded', attentionIds: [] });
    world.enemy.evidence = [];
    expect(reference(world)).toMatchObject({ resolution: 'missing', attentionIds: [] });
  });
  it('an orphan feature keeps an unknown recorded day despite its feature.day and observed tick', () => {
    const { world } = direct(); world.enemy.decisions = [];
    expect(featureLinks(world)[0]!.recordedDay).toBeNull();
    expect(reference(world)).toMatchObject({ resolution: 'unrecorded', attentionIds: [] });
    expect(counterFeatureLinks(world, 10).unrecordedFeatureIds).toEqual([world.enemy.sketch[0]!.id]);
  });
  it('a retained digest day takes precedence over mutable feature.day and an older observation day', () => {
    const { world, feature } = direct(); feature.day = 99; retained(world, feature, 4);
    expect(featureLinks(world)[0]).toMatchObject({ recordedDay: 4, feature: { day: 99 } });
    expect(counterFeatureLinks(world, 3).features).toEqual([]);
    expect(counterFeatureLinks(world, 4).features).toHaveLength(1);
  });
  it.each(['missing', 'short', 'extra', 'duplicate', 'null', 'object', 'number', 'empty', 'sparse'] as const)(
    '%s report roots keep the real receipt but cannot confer an original attention link', (kind) => {
      const { world, receipt } = delivered();
      const root = receipt.reportRoots![0]!;
      if (kind === 'missing') delete receipt.reportRoots;
      if (kind === 'short') receipt.reportRoots = [];
      if (kind === 'extra') receipt.reportRoots = [root, 'other'];
      if (kind === 'duplicate') receipt.reportRoots = [root, root];
      if (kind === 'null') Reflect.set(receipt, 'reportRoots', null);
      if (kind === 'object') Reflect.set(receipt, 'reportRoots', { length: 1, 0: root });
      if (kind === 'number') Reflect.set(receipt, 'reportRoots', [3]);
      if (kind === 'empty') receipt.reportRoots = [''];
      if (kind === 'sparse') receipt.reportRoots = new Array<string>(1);
      expect(() => featureLinks(world)).not.toThrow();
      expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionIds: [] });
    });
  it('a duplicate receipt record is ambiguous even if its roots and words agree', () => {
    const { world, receipt } = delivered(); world.chronicle.push(cloneSerializable(receipt));
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('a correctly sized but duplicate root array cannot associate two real received items', () => {
    const { world } = multiItemReport(false);
    const receipt = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === reference(world).ref.tick && row.messageId === reference(world).ref.messageId)!;
    if (receipt.kind !== 'network-speech') throw new Error('missing receipt');
    receipt.reportRoots = [receipt.reportRoots![0]!, receipt.reportRoots![0]!];
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionIds: [] });
    expect(evidenceArrivals(world).filter((row) => row.rootFingerprint !== undefined)).toEqual([]);
  });
  it('a partial retained child batch cannot borrow roots from the intact report envelope', () => {
    const { world, child } = delivered(); world.enemy.evidence.splice(child, 1);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'unrecorded', attentionIds: [] });
  });
  it('an incomplete one-hop batch cannot backdate a remaining reported row just because its relay heard the original', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    expect(index).toBeGreaterThanOrEqual(0);
    const remaining = world.enemy.evidence[index + 2]!;
    expect(evidenceArrivals(world)[index + 2]).toMatchObject({ timing: 'report' });
    world.enemy.evidence.splice(index + 1, 1);
    expect(world.enemy.evidence[index + 1]).toBe(remaining);
    expect(evidenceArrivals(world)[index + 1]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
  });
  it('an independent directly captured HQ question inside a broken batch span keeps its own date', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    const remaining = world.enemy.evidence[index + 2]!;
    world.enemy.evidence.splice(index + 1, 1);
    // Unit capture fixture: a separate contemporaneous asking, with its actual addressed listener.
    // The complete report/partial child above was produced by normal phases.
    const asking: Asking = { tick: remaining.tick, venue: 'square', speaker: 'ada', addressedTo: 'cyn',
      circleMembers: ['ada', 'cyn'], authority: false, about: { subject: 'bez' } };
    world.chronicle.push({ ...asking, kind: 'asking', heardBy: [{ id: 'cyn', addressed: true }] });
    captureEvidence(world, { tick: asking.tick, positions: {}, utterances: [], askings: [asking] }, RULES);
    expect(world.enemy.evidence).toHaveLength(index + 3);
    expect(world.enemy.evidence[index + 2]).toMatchObject({ kind: 'asking', observer: 'cyn' });
    expect(evidenceArrivals(world)[index + 2]).toMatchObject({ timing: 'direct', learnedAt: asking.tick });
  });
  it('byte-indistinguishable direct/report candidates inside a broken span remain unrecorded', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    world.enemy.evidence.splice(index + 1, 1);
    const candidate = cloneSerializable(world.enemy.evidence[index + 1]!);
    world.enemy.evidence.push(candidate);
    // The original physical hearing corroborates either copy. It cannot identify their append paths.
    expect(evidenceArrivals(world).slice(index + 1)).toMatchObject([
      { timing: 'unrecorded', learnedAt: null }, { timing: 'unrecorded', learnedAt: null },
    ]);
  });
  it('a broken two-item batch cannot reserve an equivalent candidate beyond its maximum append span', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    world.enemy.evidence.splice(index + 1, 1);
    const candidate = world.enemy.evidence[index + 1]!;
    world.enemy.evidence.push(cloneSerializable(candidate), cloneSerializable(candidate));
    expect(evidenceArrivals(world)[index + 3]).toMatchObject({ timing: 'direct', learnedAt: candidate.tick });
    expect(evidenceArrivals(world).slice(index + 1, index + 3).every((row) => row.learnedAt === null)).toBe(true);
  });
  it('a root-associated relayed inner answer links actual attention despite its changed attribution', () => {
    const { world, child, feature, askingIndex } = delivered();
    const entry = world.enemy.evidence[child]!;
    retained(world, { ...feature, evidence: [{ tick: entry.tick, observer: entry.observer, claimId: entry.claimId, messageId: null }] });
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [child], attentionIds: ['asking:' + askingIndex] });
  });
  it('reported-only holdings never become a reconstructed raw witness', () => {
    const { world } = delivered();
    world.network.directiveState!.heldObservations = world.network.directiveState!.heldObservations.filter((row) => row.content.kind !== 'raw');
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'unrecorded', attentionIds: [] });
  });
  it('a raw witness who did not hear the original event cannot borrow the relay or another listener', () => {
    const { world } = delivered();
    const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
      && row.content.observation.kind === 'utterance')!;
    raw.observer = 'unheard';
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'missing', attentionIds: [] });
  });
  it('two distinct raw sources under one root remain ambiguous', () => {
    const { world } = delivered();
    const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
      && row.content.observation.kind === 'utterance')!;
    const twin = cloneSerializable(raw); twin.id = 'conflict'; twin.observer = 'ada';
    world.network.directiveState!.heldObservations.push(twin);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('duplicate identical raw holdings do not invent two separate original acts', () => {
    const { world, askingIndex } = delivered();
    const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
      && row.content.observation.kind === 'utterance')!;
    world.network.directiveState!.heldObservations.push(cloneSerializable(raw));
    expect(reference(world).attentionIds).toEqual(['asking:' + askingIndex]);
  });
  it('post-trait changes to the current carried packet cannot rewrite the retained receipt link', () => {
    const { world } = delivered(); const before = featureLinks(world);
    const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'field-report')!;
    if (packet.payload.kind !== 'field-report') throw new Error('missing packet');
    packet.payload.renderedItems = [];
    expect(featureLinks(world)).toEqual(before);
  });
  it('a real same-envelope unmarked answer cannot lend its unrelated question to the document feature', () => {
    const { world, questionIds } = multiItemReport(false);
    expect(reference(world).attentionIds).toEqual([questionIds[0]]);
    expect(reference(world).attentionIds).not.toContain(questionIds[1]);
  });
  it('two matching real document answers in one received envelope leave the original attention ambiguous', () => {
    const { world } = multiItemReport(true);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('a runaround copied from a document lead follows the same received ref without adding other envelope items', () => {
    const { world, feature, askingIndex } = delivered();
    retained(world, { ...feature, kind: 'runaround' });
    expect(reference(world).attentionIds).toEqual(['asking:' + askingIndex]);
  });
  it('an actually heard source on an actual normal-phase worked beat links the retained watch episode', () => {
    const { world, act } = watchWithEvidence();
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'linked' });
    expect(reference(world).attentionIds).toContain(act.id);
  });
  it('an earlier recorded work beat does not prove that a later coincident observation was watch work', () => {
    const { world, act, tick } = watchWithEvidence(15);
    expect(attentionAt(world, world.tick).actual.some((row) => row.id === act.id)).toBe(true);
    expect(reference(world).ref.tick).toBe(tick + 15);
    expect(reference(world).attentionIds).not.toContain(act.id);
  });
  it('issued watch state and headquarters claims cannot replace missing physical outcomes', () => {
    const { world, record } = watchWithEvidence(); delete record.outcomes;
    expect(reference(world).attentionIds.some((id) => id.startsWith('watch:'))).toBe(false);
    expect(world.enemy.sketch).toHaveLength(1);
  });
  it('an actual questioning signal and feature link coexist without deriving attention from a feature id', () => {
    const { world, askingIndex, feature } = direct();
    const asking = world.chronicle[askingIndex]!;
    if (asking.kind !== 'asking') throw new Error('missing question');
    world.intel.log.push({ ...blankIntel(), kind: 'asking', tick: asking.tick, venue: asking.venue,
      via: 'self', overheard: false, speaker: asking.speaker, addressedTo: asking.addressedTo, about: asking.about, authority: true });
    const model = counterFeatureLinks(world, 1);
    expect(model.signals[0]).toMatchObject({ attentionIds: ['asking:' + askingIndex], featureIds: [feature.id] });
    world.enemy.decisions = []; world.enemy.sketch = [];
    expect(counterFeatureLinks(world, 1).signals[0]).toMatchObject({ attentionIds: ['asking:' + askingIndex], featureIds: [] });
  });
  it('a duplicate original telling or same-beat asking cannot be chosen silently', () => {
    for (const which of ['telling', 'asking'] as const) {
      const { world, eventIndex, askingIndex } = direct();
      world.chronicle.push(cloneSerializable(world.chronicle[which === 'telling' ? eventIndex : askingIndex]!));
      expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
    }
  });
  it('same family, target and words at another tick do not create an attention link', () => {
    const { world, askingIndex } = direct(); world.chronicle[askingIndex]!.tick -= 15;
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionIds: [] });
  });
  it('a missing claim never recovers source content from a similarly worded claim', () => {
    const { world, index } = direct(); const id = world.enemy.evidence[index]!.claimId!;
    world.claims['similar'] = { ...world.claims[id]!, id: 'similar' }; delete world.claims[id];
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'unrecorded', attentionIds: [] });
  });
  it('direct asking refs resolve to their own actual event', () => {
    const { world, feature } = direct();
    const row: Asking = { tick: 2040, venue: 'square', speaker: 'ada', addressedTo: 'bez',
      circleMembers: ['ada', 'bez'], about: { subject: 'cyn' }, authority: true };
    const chronicleIndex = world.chronicle.length;
    world.chronicle.push({ ...row, kind: 'asking', heardBy: [{ id: 'bez', addressed: true }] });
    captureEvidence(world, { tick: row.tick, positions: {}, utterances: [], askings: [row] }, RULES);
    retained(world, { ...feature, kind: 'runaround', evidence: [{ tick: row.tick, observer: 'bez', claimId: null, messageId: null }] });
    expect(reference(world).attentionIds).toEqual(['asking:' + chronicleIndex]);
  });
  it.each(['extended-ref', 'physical-kind'] as const)('a %s remains unsupported without borrowing an ordinary null-id asking', (kind) => {
    const { world, feature } = direct();
    if (kind === 'extended-ref') Reflect.set(feature.evidence[0]!, 'residue', { operation: 's0' });
    else Reflect.set(feature, 'kind', 'arcane-residue');
    retained(world, feature);
    expect(reference(world)).toMatchObject({ resolution: 'unsupported', attentionIds: [] });
  });
  it('read-only folds and all nested feature/reference/index/attention arrays own their output', () => {
    const { world } = direct(); const before = hashWorld(world);
    const first = counterFeatureLinks(world, 1); const same = counterFeatureLinks(world, 1);
    expect(first).toEqual(same);
    first.features[0]!.feature.evidence[0]!.observer = 'mutated';
    first.features[0]!.references[0]!.ref.observer = 'other';
    first.features[0]!.references[0]!.evidenceIndexes.push(999);
    first.features[0]!.references[0]!.attentionIds.push('wrong');
    first.attention.actual[0]!.chronicleIndexes.push(999);
    expect(hashWorld(world)).toBe(before);
    expect(counterFeatureLinks(world, 1)).toEqual(same);
  });
});
```

## Escalation license

Emergent-behavior assertions are hypotheses. Failing acceptance → STOP and report
with evidence; never weaken thresholds/formulas/physics/seeds or edit the spec.
Untraceable existing-suite failure → BLOCKED. A plan-mandated defect is a finding
at full severity. Workers preserve others' edits and never push or self-approve.

## Deferred scope

Dedicated magic operations, physical residue/night-visit receipt and feature
branches, actual séance/story membership integration, calendar bounds, terminal
composition and the complete-model implementation plan remain later Task5B work.
The two unsupported-shape cases document this fragment's boundary; they do not
certify actual physical evidence variants or the future complete magic model.
Task5A/T5A-A1, Task5A2, R16/R17 and the other eight modules remain separate reviewed
predecessors. Full Plan9/Task8 integration and actual committed-code review remain.
