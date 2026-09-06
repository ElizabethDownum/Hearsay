# Task5B feature-link continuation — UNTESTED WIP

Authored-by: root Codex GPT-6, 5 September 2026. Saved at Ellie's explicit request
to reach a stopping point and stop for a computer restart.

The verified checkpoint remains c91e9e8: eight partial model modules,96 isolated
tests, both compiler configurations and lint passing. Production is unchanged at
dc114da (1780/114). **The code below is incomplete author work, not validated code,
an executable plan, a passing ninth module or an independent review result.**

This draft starts exact feature-ref resolution and semantic links to performed
attention. It proposes distinguishing unique, ambiguous, undated, late and missing
evidence; recovering original reported observations through recorded root identity;
and keeping actual attention separate from features that resulted. Physical magic
support remains a later explicit migration and is currently labelled unsupported.

No tests were authored for this continuation. Its preparation script expects a
nonexistent task-5b-feature-links-tests.txt and has NOT been run. No typecheck,
syntax probe, runtime assertion or review has evaluated this code. Reconcile
nullable-day array inference, exact Observation shapes, duplicate report histories,
source-witness identity, report-root completeness and chronology before acceptance.
Do not downgrade ambiguity to a positive match just to make the model look complete.

The untested evidence extension was copied to
.superpowers/sdd/task-5b-feature-evidence-proposal.txt. The shared
task-5b-evidence-proposal.txt was restored from the exact96-case virtual source map,
so established author builders cannot silently consume the WIP. The feature-specific
builder now names the separate extension. All original bytes/hashes, including the
pre-separation builder, are in .superpowers/sdd/restart-2026-09-05-final/.

Resume by authoring meaningful cases for known-good/ambiguous/missing/delayed refs,
changed report fields, omitted/malformed root associations, raw-versus-relayed
observations, questioning/compulsion/watch linkage, and output ownership. Then run
both compiler configurations, the isolated complete model set and lint. Keep this
proposal outside src/tests until actual predecessors, complete planning and separate
review satisfy the execution plan. No new reviewer has been dispatched.

## Feature links module

```ts
import { dayOf } from '../../core/time';
import type { Observation } from '../perception';
import type { EvidenceEntry, SketchEvidenceRef, SketchFeature } from '../enemy/state';
import { WATCH } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import type { WorldState } from '../types';
import { attentionAt, type ActualAttention } from './attention';
import { evidenceArrivals, type EvidenceArrival } from './evidence';
import { sketchTimeline } from './timeline';

export interface FeatureReferenceLink {
  ref: SketchEvidenceRef;
  resolution: 'resolved' | 'ambiguous' | 'unrecorded' | 'missing' | 'unsupported';
  evidenceIndexes: number[];
  undatedEvidenceIndexes: number[];
  laterEvidenceIndexes: number[];
  /** Actual chronicle/work links only; reported content is not silently treated as a raw event. */
  attentionIds: string[];
}
export interface FeatureLink {
  feature: SketchFeature;
  /** The retained decision day, not a date inferred from the evidence's observation tick. */
  recordedDay: number | null;
  references: FeatureReferenceLink[];
}
type Source = { observer: string; observation: Observation };
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

/** Recover original physical observation by recorded identity, never by similar reported content. */
function sourceOf(world: WorldState, index: number, arrival: EvidenceArrival): Source | null {
  if (arrival.timing === 'direct') return directSource(world, world.enemy.evidence[index]!);
  if (arrival.rootFingerprint === undefined) return null;
  const sources = new Map<string, Source>();
  for (const held of world.network.directiveState?.heldObservations ?? []) {
    if (held.rootFingerprint !== arrival.rootFingerprint || held.content.kind !== 'raw') continue;
    const source = { observer: held.observer, observation: held.content.observation };
    sources.set(stableStringify(source), source);
  }
  return sources.size === 1 ? sources.values().next().value! : null;
}

/** Require the actual event and original witness, even when a relay changed its reported fields. */
function eventIndexes(world: WorldState, source: Source): number[] {
  const observation = source.observation;
  const indexes: number[] = [];
  world.chronicle.forEach((row, index) => {
    if (row.tick !== observation.tick || row.venue !== observation.venue || !('heardBy' in row)) return;
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
      && row.messageId === observation.messageId) indexes.push(index);
  });
  return indexes;
}

function attentionFor(world: WorldState, source: Source, acts: ActualAttention[]): string[] {
  const indexes = eventIndexes(world, source);
  if (indexes.length !== 1) return []; // duplicate or absent physical history is unresolved
  const event = world.chronicle[indexes[0]!]!;
  return acts.filter((act) => {
    if (act.chronicleIndexes.some((index) => indexes.includes(index))) return true;
    // A same-beat answer can support its asking, including a voluntary answer at a public venue.
    if (act.kind === 'questioning' && event.kind === 'telling' && event.mode === 'answer') {
      const asking = world.chronicle[act.chronicleIndexes[0]!]!;
      if (asking.kind === 'asking' && asking.tick === event.tick && asking.venue === event.venue
        && asking.speaker === event.addressedTo && asking.addressedTo === event.speaker) return true;
    }
    // A real staffed episode can yield heard evidence; a coincidentally present guard cannot.
    const minute = source.observation.tick % 1440;
    return act.kind === 'watch' && act.actor === source.observer && act.venue === source.observation.venue
      && dayOf(act.occurredAt) === dayOf(source.observation.tick)
      && source.observation.tick >= act.occurredAt && minute >= WATCH.from && minute < WATCH.to;
  }).map((act) => act.id).sort();
}

/**
 * Legacy speech reference support. Unrecorded dates and non-unique refs stay explicit.
 * Physical magic refs require their dedicated future migration: unknown feature kinds
 * and extended ref shapes are visibly unsupported, never joined to an ordinary asking.
 */
export function featureLinks(world: WorldState): FeatureLink[] {
  const timeline = sketchTimeline(world);
  const arrivals = evidenceArrivals(world);
  const acts = attentionAt(world, world.tick).actual;
  const rows = timeline.nights.flatMap((night) => night.added.map((feature) => ({ feature, day: night.day })))
    .concat(timeline.unrecorded.map((feature) => ({ feature, day: null as number | null })));
  return rows.map(({ feature, day }): FeatureLink => ({ feature: cloneSerializable(feature), recordedDay: day,
    references: feature.evidence.map((ref): FeatureReferenceLink => {
      const link: FeatureReferenceLink = { ref: cloneSerializable(ref), resolution: 'missing',
        evidenceIndexes: [], undatedEvidenceIndexes: [], laterEvidenceIndexes: [], attentionIds: [] };
      if (!legacyKinds.has(feature.kind) || Object.keys(ref).some((key) => !legacyRefFields.has(key))) {
        link.resolution = 'unsupported'; return link;
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
        link.resolution = link.undatedEvidenceIndexes.length > 0 ? 'unrecorded' : 'missing';
      } else if (link.evidenceIndexes.length > 1 || link.undatedEvidenceIndexes.length > 0) {
        link.resolution = 'ambiguous';
      } else {
        link.resolution = 'resolved';
        const index = link.evidenceIndexes[0]!;
        const source = sourceOf(world, index, arrivals[index]!);
        if (source && day !== null && dayOf(source.observation.tick) <= day) {
          link.attentionIds = attentionFor(world, source, acts);
        }
      }
      return link;
    }) }));
}

/** End-of-day comparison: actual attention and resulting recorded features are distinct outputs. */
export function counterFeatureLinks(world: WorldState, throughDay: number) {
  const attention = attentionAt(world, (throughDay + 1) * 1440 - 1);
  const all = featureLinks(world);
  const features = all.filter((row) => row.recordedDay !== null && row.recordedDay <= throughDay);
  const signals = attention.signals.map((signal) => ({ signalId: signal.id,
    attentionIds: [...signal.attentionIds], featureIds: features.filter((row) =>
      row.references.some((ref) => ref.attentionIds.some((id) => signal.attentionIds.includes(id))))
      .map((row) => row.feature.id) }));
  return { attention, features, signals,
    unresolvedFeatureIds: features.filter((row) => row.references.length === 0
      || row.references.some((ref) => ref.resolution !== 'resolved' || ref.attentionIds.length === 0))
      .map((row) => row.feature.id),
    unrecordedFeatureIds: all.filter((row) => row.recordedDay === null).map((row) => row.feature.id) };
}
```

## Evidence identity extension (separate WIP variant)

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
  world.enemy.evidence.forEach((entry, index) => {
    if (arrivals[index]!.timing !== 'unrecorded' || !directlyHeard(world, entry)) return;
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
    })) return;
    const speeches = world.chronicle.filter((row) => row.kind === 'network-speech'
      && row.tick === entry.tick && row.messageId === entry.network.messageId
      && row.venue === entry.venue && row.speaker === entry.speaker && row.addressedTo === entry.addressedTo
      && stableStringify(row.spoken) === stableStringify(entry.network.spoken));
    const roots = speeches.length === 1 && speeches[0]!.kind === 'network-speech'
      ? speeches[0]!.reportRoots : undefined;
    const linked = roots !== undefined && roots.length === items.length && new Set(roots).size === roots.length;
    children.forEach(({ itemIndex }, offset) => {
      const childIndex = index + offset + 1;
      arrivals[childIndex] = { ...arrivals[childIndex]!, learnedAt: entry.tick,
        reportMessageId: entry.network.messageId, timing: 'report',
        ...(linked ? { reportItemIndex: itemIndex, rootFingerprint: roots[itemIndex]! } : {}) };
    });
  });
  return arrivals;
}
```

## Preparation script (tests absent; not executed)

```python
from pathlib import Path
import json

root = Path.cwd()
assert root.name.lower() == 'hearsay'
sdd = root / '.superpowers/sdd'
out = sdd / 'task-5b-feature-links-validation'
out.mkdir(exist_ok=True)
base = json.loads((sdd / 'task-5b-reports-validation/relative-sources.json').read_text(encoding='utf-8'))
for path, name in [('src/sim/debrief/feature-links.ts', 'task-5b-feature-links-proposal.txt'),
                   ('src/sim/debrief/evidence.ts', 'task-5b-feature-evidence-proposal.txt'),
                   ('tests/debrief/feature-links.test.ts', 'task-5b-feature-links-tests.txt')]:
    base[path] = (sdd / name).read_text(encoding='utf-8')
def normalized(path):
    return str((root / path).resolve()).replace('\\', '/').lower()
for name, value in [('relative-sources', base),
                    ('virtual-sources', {normalized(p): t for p, t in base.items()}),
                    ('virtual-original-paths', {normalized(p): str((root / p).resolve()) for p in base})]:
    (out / (name + '.json')).write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8', newline='\n')
config = (sdd / 'task-5b-reports-validation/vitest-proposal.config.mjs').read_text(encoding='utf-8')
(out / 'vitest-proposal.config.mjs').write_text(config.replace('task-5b-reports-validation', 'task-5b-feature-links-validation'), encoding='utf-8', newline='\n')
tests = [p[:-3] for p in base if p.startswith('tests/debrief/')]
(out / 'entry.probe.ts').write_text(''.join(f"import '../../../{p}';\n" for p in tests), encoding='utf-8', newline='\n')
preflight = (sdd / 'task-5b-reports-preflight.mjs').read_text(encoding='utf-8')
preflight = preflight.replace('task-5b-reports-validation', 'task-5b-feature-links-validation')
preflight = preflight.replace('partial report-item proposal', 'partial feature-link proposal')
preflight = preflight.replace('newSourceFiles: 8', 'newSourceFiles: 9')
(sdd / 'task-5b-feature-links-preflight.mjs').write_text(preflight, encoding='utf-8', newline='\n')
print(f'Prepared {len(tests)} isolated test suites; no production files changed.')
```
