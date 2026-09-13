# Task 5B complete pure debrief models and composition plan

13 September 2026. Complete-code author proposal, using the canonical author skill and
inherited root capability. This document combines the frozen lower-level model proposals
with the four remaining pure composition modules. Independent proposal approval, actual
predecessor reconciliation, production implementation and accumulated code review remain
separate requirements. No production or UI code has been written by this author.

## Intended behavior

The single public value entry is `debriefView(world)` in `src/sim/debrief/index.ts`.
It returns null before reading any hidden substrate if the scenario is absent or running.
A terminal world returns its actual ending, dated calendar, typed operation-family sections,
retained chronicle, undated headquarters ledger and current ungraded player annotations.
Missing or inconsistent ending metadata remains explicit; a future resolution date is not
called consistent. The current engine has won, lost-clock, lost-exposed and lost-caught;
no escape variant is invented to satisfy older prose.

Calendar rows preserve recorded observation timestamps, player receipt times, enemy
acquisition times and digest days as separate fields. Reported observation timestamps
describe an account and do not prove that headquarters or the player knew it then.
`counterKnowledge` and `counterLogThrough` preserve the actual board's append order.
The sparse calendar includes actual retained observation/receipt/decision/attention dates
and the current clock date; `gapBefore` explains missing intervening dates. A closing
clock date is not an invented activity. Unknown receipts remain in undated arrays and
cannot acquire a synthetic day-zero entry. Future records stay outside earlier knowledge.
The typed chronological index preserves same-tick index order; decisions retain their
original indexes even when several occurred on the same day.

`sketchTimeline` supplies actual retained cumulative conclusions and the identification
date. Calendar evidenceKeys group distinct (kind, subject) pairs with their feature IDs.
They are descriptive historical groups, never an exposure score computed from today's
informant roster, a pressure meter or a features-until-identification countdown.
Identification is the actual retained carrier-profile naming the avatar on a digest day.
An orphan feature remains visible as unrecorded and cannot invent an earlier digest.

The semantic overlay composes `attentionAt` and `counterFeatureLinks`; it does not join
counter-signal keys to feature IDs. Its statuses distinguish corroborated attention,
partial corroboration, missing work history, issued but unproved work and unproved signals.
Missing history and absent resulting features are not proof that a fear was a phantom.
Actual unseen attention IDs and features without a counter link remain separate lag sets.
Repeated receipts/views of one act retain all input indexes while the act remains one.
Physical sightings/acquisition stay in a separate section and do not become questioning,
compulsion or staffed-watch episodes merely because a stale handoff listed extra attention.

Actually heard per-item report copies retain spoken/omitted/unknown status, root identity,
speaker, chronological index and the existing value diffs. A changed copy does not rewrite
the raw root. These copies can explain distortion without grading unrelated player notes.
Daily headquartersAccounts are literal recorded report speeches audible to headquarters;
they do not prove that every assertion was true or accepted into a ledger. The current
enemy actionLedger is explicitly undated reported bookkeeping because its update history
is not retained. Actual performed work remains the independent attention/outcome record.

Operation sections make every existing reader reachable: stories and artifacts, actual
network messages and report-item versions, authored/delivered directives and private local
outcomes, both magic operations and orphans, physical records/evidence/sightings, every
enemy evidence arrival, feature references and unresolved story events. The full indexed
chronicle keeps unassociated institutional/vignette/other records reachable. No universal
operation identity or content-based causal join is introduced. Missing routes, roots,
claims, receipts and dates retain the lower readers' explicit uncertainty.

Player cards are detached terminal-current annotations, ungraded and absent from historical
calendar rows. Root adopted this bounded default for R28: the existing cards have current
created/updated metadata but no retained edit history from which to reconstruct old text.
This closes the premise verifier's card question without inventing a grading rule or state.

## Fixed inputs and reconciliation

All tracked source/configuration comes from committed
ef7fa3848ac3e1e71e2490576f1af9ea4f77eb64, including approved Task 4 and committed Task 7A1.
The snapshot began directly inside owned validation/node_modules/hearsay-baseline.
All 356 archived files and 21 original fixed inputs/copies remain immutable. The initial
magic 240 source map was pending independent review and was copied with its five mandated
hashes. All ten model modules and ten test bodies are preserved except an explicitly
licensed, separately versioned upstream story identity correction recorded in the final
source/provenance manifest. Original source maps and failed/passing evidence never change.
The physical 198 and ordinary 147 preservation floors remain intact.

The final upstream review/reconciliation status is recorded verbatim in
`upstream-reconciliation.json` when supplied by root; the executed map, case registry and
report identify the actual final baseline. A later review correction cannot silently
overwrite a frozen input or be treated as already approved.

Nine future overlapping files carry only approved Task 5A/T5A-A1/5A2/R16/R17 changes.
Their actual source at 152f2a0 is byte-identical to ef7fa38; therefore the previously
reconciled future values carry forward exactly. Actual committed 7A1 fieldwork prose is
read directly from this new archive, and actual Task 4C physical/provenance code is used.
No moving primary source, obsolete future Task 4C replacement or old speech-only union
is substituted. The complete maps and dependency inventory identify every value.

## Prerequisites are separate implementation units

Before any Task 5B writer, root reconciles the actual approved Task 4 and Task 7A source,
then completes the separately approved recording/watch units with their own owners,
subjects, cases and gates. The nine virtual bodies in this validation host are not a
license to install those changes as incidental Task 5B work.

1. Task 5A1 uses the complete exact artifact-claim/report-root recording draft, its
   constraints and T5A-A1 base amendment. Six production files and the licensed recording
   tests have their own implementation/review. Preserve actual inject/telling/seance
   threadOf membership and optional artifact explanation links. Scoped subject:
   `feat: record exact document and report associations for the debrief`.
2. R16 self-presence correction remains its separate evaluator/test unit. Carry the
   independent execution amendment's attempted-state assertion. Full six gates and
   separate code review precede R17. Existing gameplay pins, rules and seeds stay intact.
3. R17 watch-stage correction uses its own execution/test unit on actual committed R16,
   followed by full six gates and separate code review. Do not silently expand it into
   deferred cancellation/expiry/interpretation issues.
4. Task 5A2 preserves private directive outcomes and exact report/response association
   on the actual Task 5A1/R16/R17 base. Its recording/view tests, full six gates and
   separate code review remain mandatory before the complete model reads the records.

The complete source and constraints are named in dependency-inventory.json: tracked
Task 5A recording/base amendment, R17 and watch execution amendment; the fixed R16 author
draft/constraints; and Task 5A2 outcome-history/constraints. Historical count predictions
are not unconditional production floors. Root reconciles legitimate intervening counts.
Full six gates mean tests, lint, both compiler configurations/build, soak and Monte Carlo
with all report blocks compared under the existing project process, not a selective excerpt.

## Serial Task 5B writer chunks

One production writer and root-owned index at a time. Use an implementation worker capable
of these causal TypeScript readers and an independent accumulated reviewer of at least the
same capability. Do not stage or commit anyone else's changes. At each boundary reconcile
the current actual HEAD, preserve original case identities, run the named focused files
plus both typechecks and scoped lint, then root verifies the exact owned diff and commits.
`implementation-chunks.json` contains exact owned paths, cumulative tests and complete body
maps; `consumer-map.json` verifies debrief imports only target an earlier/same chunk.

| Chunk | Exact source responsibility | Permanent tests | Proposed scoped subject |
| --- | --- | --- | --- |
| 5B1 | knowledge.ts, network.ts | knowledge.test.ts, network.test.ts (24 inherited cases) | `feat: add debrief knowledge and network history readers` |
| 5B2 | directives.ts, timeline.ts, attention.ts | directive-history.test.ts, attention.test.ts (29 inherited cases) | `feat: add debrief directive history and semantic attention` |
| 5B3 | reports.ts, evidence.ts, feature-links.ts | reports.test.ts, evidence-arrival.test.ts, feature-links.test.ts, physical-links.test.ts (128 inherited cases) | `feat: connect debrief report receipts and physical evidence` |
| 5B4 | stories.ts, magic.ts, including the approved story identity amendment | stories.test.ts, magic.test.ts and separately approved identity correction cases | `feat: add debrief story and magic operation histories` |
| 5B5 | calendar.ts, overlay.ts, threads.ts, index.ts | composition.test.ts plus all accumulated debrief cases | Original Task 5 final subject, only when all complete models are integrated |

Every module above is under src/sim/debrief; every test is under tests/debrief. The first
three chunks contain 181 exact inherited cases. Chunk 5B4 brings in the complete final
reconciled model baseline; 5B5 adds the measured composition cases listed in the report.
No test is migrated, removed or weakened. Chunk 5B3 installs the final physical/R24/R25/R26
receipt/feature bodies together, avoiding an intermediate speech-only evidence interface.
Chunk 5B4 installs story and magic together, so séance identity and unresolved events have
their complete consumer/test coverage at that commit. Exact bodies come from the final
approved composed map, not from an abandoned earlier fragment.

For 5B1–5B4, focused Vitest runs name the cumulative test files in the manifest. Both
actual TypeScript configurations and scoped lint must pass; fix only licensed source or
return a concrete contradiction to root. The host validates import completeness without
inventing source files that a production writer has not yet installed. Each per-chunk
source map includes only its cumulative models/tests and explicit predecessor overlays.

For 5B5, run all debrief cases, npm test, npm run lint, npm run typecheck and npm run app:build
using the actual reconciled code. Root then runs the required soak/MC and full report
comparison as accumulated implementation checks, preserving native exits and performance
evidence. No game state or formula changes are expected from these pure readers; explain
any actual delta instead of retuning thresholds. The original reserved final subject is:
`feat: debrief models — threads, the timeline, and the overlay where your fear was wrong`.
Use it only after complete model integration passes the actual gates. Then obtain a
separate independent review of the accumulated committed Task 5B branch, covering the
terminal guard, all causal/unknown states, ownership and predecessor provenance. Author
validation is not that review, and the author's own self-passes cannot approve the code.

## Public consumer and later task boundaries

index.ts exports only debriefView as a value, plus the complete DebriefView/Calendar/Day/
Overlay/Operation/PhysicalHistory types. The four new modules compose the ten lower
modules and introduce no additional world, rules, RNG, time or session fields. All nested
records, refs, claims, report copies, ledger rows and annotation arrays are detached.

Task 6 still owns EXACTLY ONE main.tsx terminal composition branch, props-only panels,
running-session non-reachability, the existing sim import-fence firing proof, changed-span
prose presentation and the actual terminal UI lesson. Pure debriefView guards running
worlds here; this does not claim that main.tsx has been wired or tested. Never pass these
models to a running UI. Task 7B owns debrief vocabulary/slots and its reserved final prose
subject. Existing seed+action-log persistence and exact replay remain unchanged. Task 8
owns the real canary/turncoat terminal lesson, the legal forger route and interrogation
mirror, integration reports, full-plan independent review and closeout. Near-miss panels
remain the first v1.1 item; no counterfactual replay is implemented here.

## Acceptance, preserved evidence and limits

Use the final report and case registry for actual arithmetic, not provisional estimates.
The permanent RED and GREEN maps execute identical tests; RED's public entry is an
importable typed null-return baseline, so terminal behavior fails without a loader error.
Both actual compiler configurations, scoped virtual lint and all four mandatory laws at
calendar.ts/overlay.ts/threads.ts/index.ts must pass. The native host captures binary
stdout/stderr, argv/cwd, exits, exact source maps and input preservation before formatting.
No packages, services, installs, network, UI automation or whole-game/timing claim belongs
to this pure proposal. The original volatile caches are never inputs; this host's cache
is explicitly excluded from its immutable evidence inventory.

Real fixtures cover every current terminal variant, before/after late player and physical
receipts, no-report and reported watch work, actual omitted envelopes and two-hop report
distortion, duplicated views, missing/ambiguous roots, unrelated features, gaps/ties,
unresolved/orphan categories, ungraded cards and deep purity. Retained negative results
and two adversarial author passes are disclosed, including the calendar observation-date
omission and the future-ending metadata defect. Neither required gameplay recording.
The independent premise verifier's conclusions and root's R28 default are preserved.

Missing history cannot prove absence, phantomhood, ritual causation or caster identity.
Current headquarters ledger and card edits have no historical reconstruction. A signal
key is not a feature ID. An expired report route is not proof its item landed. All these
limits are renderable data in the complete model. Complete-plan authoring does not approve
the plan, ship gameplay, wire a terminal panel or close Plan 9.

## Exact new production bodies

| Exact production target | UTF-8/LF SHA256 |
| --- | --- |
| `src/sim/debrief/calendar.ts` | `2b31607eb4fd47bf29f3555cd5879e9cb0865937f63f1a4675f0d560ef35bcc8` |
| `src/sim/debrief/overlay.ts` | `415f97da7660c5e2db78448288f1523587009d56144d9fae7b2e83d6772feffd` |
| `src/sim/debrief/threads.ts` | `51c2875119b6304810eb009fc01ac82fb26a229ad0ce71c513a740bc549847d0` |
| `src/sim/debrief/index.ts` | `b5765af37c52340c2df164546df37e861016b12c0e0726529aad14f1ae3c5f56` |
| `tests/debrief/composition.test.ts` | `2bc4c24e11cf9fd23f61df2dfb6af18c3c78af2efaf59311828972da366ce618` |

## Exact file: src/sim/debrief/calendar.ts

```ts
import { dayOf, TICKS_PER_DAY } from '../../core/time';
import { counterSignals, type CounterSignal } from '../../intel/countersketch';
import type { IntelEntry } from '../../intel/entry';
import type { EnemyDecision, SketchFeature } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import { attentionAt } from './attention';
import { evidenceArrivals } from './evidence';
import { counterKnowledge, counterLogThrough, type CounterKnowledge } from './knowledge';
import { counterSketchOverlay, type OverlayDay } from './overlay';
import { sketchTimeline, type SketchNight } from './timeline';

export interface DebriefDay {
  day: number;
  through: number;
  /** Sparse dates retain gaps explicitly; no absent operation gets a synthetic day-zero event. */
  gapBefore: number;
  observedChronicleIndexes: number[];
  /** Recorded observation timestamps can be reported accounts; they do not establish knowledge at this date. */
  observationEntryIndexes: number[];
  observedEvidenceIndexes: number[];
  newlyReceivedEntryIndexes: number[];
  newlyAcquiredEvidenceIndexes: number[];
  player: { knowledge: CounterKnowledge[]; log: IntelEntry[]; signals: CounterSignal[] };
  decisions: { decisionIndex: number; decision: EnemyDecision }[];
  sketch: { known: SketchNight['known']; identified: boolean; identifiedOnDay: number | null;
    /** Distinct retained (kind, subject) groups, without applying today's roster as a historical exposure score. */
    evidenceKeys: { kind: SketchFeature['kind']; subject: string | null; featureIds: string[] }[] };
  overlay: OverlayDay;
}
export interface DebriefCalendar {
  through: number;
  days: DebriefDay[];
  unknownKnowledge: CounterKnowledge[];
  unknownEvidenceIndexes: number[];
  unrecordedSketch: ReturnType<typeof sketchTimeline>['unrecorded'];
}

/** Receipt and digest dates share a calendar while preserving original board order and unknown dates. */
export function debriefCalendar(world: WorldState): DebriefCalendar {
  const knowledge = counterKnowledge(world); const arrivals = evidenceArrivals(world);
  const timeline = sketchTimeline(world); const dates = new Set<number>();
  const addTick = (tick: number): void => {
    if (Number.isSafeInteger(tick) && tick >= 0 && tick <= world.tick) dates.add(dayOf(tick));
  };
  addTick(world.tick);
  for (const row of world.chronicle) addTick(row.tick);
  for (const row of world.intel.log) addTick(row.tick);
  for (const row of world.enemy.evidence) addTick(row.tick);
  for (const row of knowledge) if (row.learnedAt !== null) addTick(row.learnedAt);
  for (const row of arrivals) if (row.learnedAt !== null) addTick(row.learnedAt);
  for (const row of attentionAt(world, world.tick).actual) addTick(row.occurredAt);
  for (const decision of world.enemy.decisions) {
    if (Number.isSafeInteger(decision.day) && decision.day >= 0 && decision.day <= dayOf(world.tick)) dates.add(decision.day);
  }
  let previous: number | null = null;
  const days = [...dates].sort((a, b) => a - b).map((day): DebriefDay => {
    const through = Math.min(world.tick, (day + 1) * TICKS_PER_DAY - 1);
    const log = counterLogThrough(world, through);
    const known = knowledge.filter((row) => row.learnedAt !== null && row.learnedAt <= through);
    const night = timeline.nights.filter((row) => row.day <= day).at(-1);
    const keys = new Map<string, DebriefDay['sketch']['evidenceKeys'][number]>();
    for (const feature of night?.known ?? []) {
      const key = JSON.stringify([feature.kind, feature.subject]);
      const group = keys.get(key) ?? { kind: feature.kind, subject: feature.subject, featureIds: [] };
      group.featureIds.push(feature.id); keys.set(key, group);
    }
    const row: DebriefDay = { day, through, gapBefore: previous === null ? 0 : day - previous - 1,
      observedChronicleIndexes: world.chronicle.flatMap((record, index) => record.tick <= through && dayOf(record.tick) === day ? [index] : []),
      observationEntryIndexes: world.intel.log.flatMap((entry, index) => entry.tick <= through && dayOf(entry.tick) === day ? [index] : []),
      observedEvidenceIndexes: world.enemy.evidence.flatMap((entry, index) => entry.tick <= through && dayOf(entry.tick) === day ? [index] : []),
      newlyReceivedEntryIndexes: known.filter((row) => dayOf(row.learnedAt!) === day).map((row) => row.entryIndex),
      newlyAcquiredEvidenceIndexes: arrivals.filter((row) => row.learnedAt !== null && row.learnedAt <= through
        && dayOf(row.learnedAt) === day).map((row) => row.evidenceIndex),
      player: { knowledge: cloneSerializable(known), log, signals: counterSignals(log) },
      decisions: world.enemy.decisions.flatMap((decision, decisionIndex) => decision.day === day
        ? [{ decisionIndex, decision: cloneSerializable(decision) }] : []),
      sketch: { known: cloneSerializable(night?.known ?? []), identified: night?.identified ?? false,
        identifiedOnDay: night?.identifiedOnDay ?? null, evidenceKeys: [...keys.values()] }, overlay: counterSketchOverlay(world, day) };
    previous = day; return row;
  });
  return { through: world.tick, days, unknownKnowledge: cloneSerializable(knowledge.filter((row) => row.learnedAt === null)),
    unknownEvidenceIndexes: arrivals.filter((row) => row.learnedAt === null).map((row) => row.evidenceIndex),
    unrecordedSketch: cloneSerializable(timeline.unrecorded) };
}
```

## Exact file: src/sim/debrief/overlay.ts

```ts
import { TICKS_PER_DAY } from '../../core/time';
import type { SpokenNetworkPayload } from '../directives/types';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import type { AttentionMatch } from './attention';
import { counterFeatureLinks } from './feature-links';
import { fieldReportThreads, type ReportItemStage } from './reports';

export interface OverlaySignal extends AttentionMatch {
  featureIds: string[];
  status: 'corroborated-attention' | 'partly-corroborated' | 'unrecorded-work' | 'issued-unproved' | 'unproved-signal';
}
export interface OverlayDay {
  day: number;
  through: number;
  attention: ReturnType<typeof counterFeatureLinks>['attention'];
  features: ReturnType<typeof counterFeatureLinks>['features'];
  signals: OverlaySignal[];
  /** Separate sets, never a countdown. An absent feature link does not prove player ignorance. */
  lag: { unseenAttentionIds: string[]; featuresWithoutCounterLinkIds: string[] };
  /** Includes physical references with semantic attention deliberately none; inspect their separate receipt resolution. */
  unresolvedFeatureIds: string[];
  receivedReportItems: { rootFingerprint: string; messageId: string; stage: ReportItemStage }[];
  /** Literal report speeches heard/said by HQ, not proof that their claims were true or accepted into the ledger. */
  headquartersAccounts: {
    chronicleIndex: number; receivedAt: number;
    copy: Extract<SpokenNetworkPayload, { kind: 'directive-report' }>;
  }[];
}

/** Compose existing causal matches; neither unmatched signals nor absent features prove a phantom. */
export function counterSketchOverlay(world: WorldState, day: number): OverlayDay {
  const through = Math.min(world.tick, (day + 1) * TICKS_PER_DAY - 1);
  const linked = counterFeatureLinks(world, day);
  const signals = linked.attention.signals.map((signal): OverlaySignal => ({ ...cloneSerializable(signal),
    featureIds: [...(linked.signals.find((row) => row.signalId === signal.id)?.featureIds ?? [])],
    status: signal.matchedEntryIndexes.length > 0 ? signal.unmatchedEntryIndexes.length > 0
      ? 'partly-corroborated' : 'corroborated-attention'
      : signal.missingWorkHistoryIds.length > 0 ? 'unrecorded-work'
        : signal.issuedDirectiveIds.length > 0 ? 'issued-unproved' : 'unproved-signal' }));
  const linkedFeatures = new Set(signals.flatMap((signal) => signal.featureIds));
  const avatar = world.playerId;
  const receivedReportItems = fieldReportThreads(world).flatMap((thread) => thread.packets.flatMap((packet) =>
    packet.stages.filter((stage) => stage.tick <= through && avatar !== null
      && (stage.speaker === avatar || stage.heardBy.some((hearer) => hearer.id === avatar)))
      .map((stage) => ({ rootFingerprint: thread.rootFingerprint, messageId: packet.messageId, stage: cloneSerializable(stage) }))))
    .sort((a, b) => a.stage.tick - b.stage.tick || a.stage.chronicleIndex - b.stage.chronicleIndex
      || a.rootFingerprint.localeCompare(b.rootFingerprint));
  const headquartersAccounts = world.chronicle.flatMap((row, chronicleIndex) => row.kind === 'network-speech'
    && row.tick <= through && row.spoken.kind === 'directive-report'
    && (row.speaker === world.network.spymaster || row.heardBy.some((hearer) => hearer.id === world.network.spymaster))
    ? [{ chronicleIndex, receivedAt: row.tick, copy: cloneSerializable(row.spoken) }] : [])
    .sort((a, b) => a.receivedAt - b.receivedAt || a.chronicleIndex - b.chronicleIndex);
  return { day, through, attention: cloneSerializable(linked.attention), features: cloneSerializable(linked.features), signals,
    lag: { unseenAttentionIds: [...linked.attention.unseenAttentionIds],
      featuresWithoutCounterLinkIds: linked.features.filter((row) => !linkedFeatures.has(row.feature.id)).map((row) => row.feature.id) },
    unresolvedFeatureIds: [...linked.unresolvedFeatureIds], receivedReportItems, headquartersAccounts };
}
```

## Exact file: src/sim/debrief/threads.ts

```ts
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
  /** Every acquired or unassociated row remains reachable without a guessed operation join. */
  enemyEvidence: { evidenceIndex: number; entry: EvidenceEntry; arrival: EvidenceArrival }[];
  featureReferences: FeatureLink[];
}

/** Typed sections reuse the reviewed folds; no universal identity or extra physical-attention act is invented. */
export function operationThreads(world: WorldState): OperationThreads {
  const network = directiveHistories(world); const arrivals = evidenceArrivals(world);
  return { stories: storyThreads(world), artifacts: artifactThreads(world), messages: network.messages,
    directives: network.directives, reportItems: fieldReportThreads(world, network.messages), magic: magicThreads(world),
    physical: { records: world.chronicle.flatMap((record, chronicleIndex) => (record.kind === 'residue' || record.kind === 'night-visit')
      && record.tick <= world.tick ? [{ chronicleIndex, record: cloneSerializable(record) }] : [])
      .sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex),
    evidence: world.enemy.evidence.flatMap((entry, evidenceIndex) => entry.kind === 'arcane-residue' || entry.kind === 'night-visit'
      ? [{ evidenceIndex, entry: cloneSerializable(entry), sightingIndexes: physicalSightings(world, entry),
        arrival: cloneSerializable(arrivals[evidenceIndex]!) }] : []) },
    unresolvedStories: unresolvedStoryEvents(world),
    enemyEvidence: world.enemy.evidence.map((entry, evidenceIndex) => ({ evidenceIndex, entry: cloneSerializable(entry),
      arrival: cloneSerializable(arrivals[evidenceIndex]!) })), featureReferences: featureLinks(world) };
}
```

## Exact file: src/sim/debrief/index.ts

```ts
import { dayOf } from '../../core/time';
import type { HypothesisCard } from '../../intel/entry';
import type { EnemyActionLedgerEntry } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { Resolution, ScenarioStatus } from '../scenario/types';
import type { ChronicleEntry, WorldState } from '../types';
import { debriefCalendar, type DebriefCalendar } from './calendar';
import { operationThreads, type OperationThreads } from './threads';

export type { DebriefCalendar, DebriefDay } from './calendar';
export type { OverlayDay, OverlaySignal } from './overlay';
export type { OperationThreads, PhysicalObservationHistory } from './threads';
export interface DebriefView {
  at: number;
  ending: { status: Exclude<ScenarioStatus, 'running'>; resolution: Resolution | null;
    resolutionState: 'consistent' | 'missing' | 'inconsistent' };
  calendar: DebriefCalendar;
  operations: OperationThreads;
  chronicle: { chronicleIndex: number; record: ChronicleEntry }[];
  recordsBeyondClock: { chronicleIndex: number; record: ChronicleEntry }[];
  /** Current reported HQ bookkeeping has no retained update timestamps; never backdate it. */
  headquartersLedger: { timing: 'unrecorded'; entries: EnemyActionLedgerEntry[] };
  /** Current player-authored annotations only; no grades or reconstructed historical edits. */
  annotations: { timing: 'terminal-current'; graded: false; cards: HypothesisCard[] };
}

/** Sole public value entry. Check the terminal state before reading any hidden model substrate. */
export function debriefView(world: WorldState): DebriefView | null {
  const scenario = world.scenario;
  if (scenario === null || scenario.status === 'running') return null;
  const resolution = scenario.resolution;
  return { at: world.tick,
    ending: { status: scenario.status, resolution: cloneSerializable(resolution),
      resolutionState: resolution === null ? 'missing' : resolution.kind === scenario.status
        && Number.isSafeInteger(resolution.day) && resolution.day >= 0 && resolution.day <= dayOf(world.tick)
        ? 'consistent' : 'inconsistent' },
    calendar: debriefCalendar(world), operations: operationThreads(world),
    chronicle: world.chronicle.flatMap((record, chronicleIndex) => record.tick <= world.tick
      ? [{ chronicleIndex, record: cloneSerializable(record) }] : [])
      .sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex),
    recordsBeyondClock: world.chronicle.flatMap((record, chronicleIndex) => record.tick > world.tick
      ? [{ chronicleIndex, record: cloneSerializable(record) }] : []),
    headquartersLedger: { timing: 'unrecorded', entries: cloneSerializable(world.enemy.actionLedger ?? []) },
    annotations: { timing: 'terminal-current', graded: false,
      cards: cloneSerializable(world.intel.cards).sort((a, b) => a.id.localeCompare(b.id)) } };
}
```

## Exact file: tests/debrief/composition.test.ts

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyForge, applyShow } from '../../src/sim/artifacts';
import { applyAction } from '../../src/sim/campaign';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { debriefView, type DebriefView } from '../../src/sim/debrief/index';
import { holdFieldObservation, ingestObservedFieldReport, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { blankIntel } from '../../src/sim/fieldwork';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { scenarioNightly } from '../../src/sim/scenario/referee';
import { runUntil, step } from '../../src/sim/step';
import type { AskingRecord, WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';
import { scryWorld } from '../sim/helpers/scry-world';
import { seanceWorld, nightVisitWorld } from '../sim/helpers/seance-town';

const spec = { subject: 'bez', predicate: 'stole', object: null, count: 2,
  severity: 4 as const, place: 'square', attribution: 'someone' };
function fixture() {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'debrief-composition', R); enrollPlayer(world, { home: 'backroom' });
  world.enemy.observers = []; return world;
}
function scenario(world: WorldState, days = Math.floor(world.tick / 1440) + 1) {
  world.scenario = { defId: 'composition', days, win: { kind: 'council-turns', quorum: 1 },
    cast: { usurper: 'bez', council: ['ada'] }, status: 'running', resolution: null };
}
function finish(world: WorldState) { scenario(world); scenarioNightly(world, R); return world; }
function view(world: WorldState): DebriefView { const result = debriefView(world); if (!result) throw new Error('terminal debrief missing'); return result; }
function feature(id = 'opaque-id', over: Partial<SketchFeature> = {}): SketchFeature {
  return { id, kind: 'carrier-profile', day: 0, subject: 'ada', family: null,
    district: null, detail: 'retained conclusion', evidence: [], ...over };
}
function decision(world: WorldState, day: number, features: SketchFeature[]) {
  world.enemy.decisions.push({ day, features, inquiries: [], watches: [], interrogations: [] });
  world.enemy.sketch.push(...features);
}
const question = (tick = 15): AskingRecord => ({ kind: 'asking', tick, venue: 'square', speaker: 'bez', addressedTo: 'ada',
  about: { subject: 'ada' }, authority: true, heardBy: [{ id: 'ada', addressed: true }, { id: 'you', addressed: false }] });
function visibleQuestion(world: WorldState, tick = 15) {
  world.chronicle.push(question(tick));
  world.intel.log.push({ ...blankIntel(), kind: 'asking', tick, venue: 'square', via: 'self',
    speaker: 'bez', addressedTo: 'ada', about: { subject: 'ada' }, authority: true, overheard: true });
}
function hold(world: WorldState, route = ['you']) {
  const id = holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: {
    kind: 'presence', tick: 0, venue: 'square', actor: 'bez',
  } }, null, route, null, []);
  return world.network.directiveState!.heldObservations.find((row) => row.id === id)!;
}
function lateReport() {
  const world = fixture(); hold(world); queueUnqueuedFieldReports(world); runUntil(world, 1440, R);
  expect(world.intel.log).toEqual([]); world.playerVenue = 'square'; runUntil(world, 1441, R); return finish(world);
}
function noReportWatch(report: 'none' | 'full' = 'none') {
  const world = fixture(); world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  const record = world.network.directiveState!.records[0]!;
  const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
  if (packet.payload.kind !== 'directive') throw new Error('watch packet missing');
  record.authored.brief.report = report; packet.payload.version.brief.report = report;
  runUntil(world, 2581, R); runUntil(world, record.received!.version.brief.active.until + 1, R);
  return finish(world);
}

describe('the pure terminal entry has one executable hidden-data gate', () => {
  it.each(['no-scenario', 'running'] as const)('%s returns null before touching any hidden substrate', (state) => {
    const world = fixture(); if (state === 'running') scenario(world, 20);
    for (const key of ['enemy', 'claims', 'chronicle', 'network', 'intel']) Object.defineProperty(world, key, {
      get() { throw new Error('hidden reader ran'); }, configurable: true,
    });
    expect(debriefView(world)).toBeNull();
  });
  it('a real clock resolution opens the debrief with its actual institution evidence', () => {
    const world = finish(fixture());
    expect(view(world).ending).toMatchObject({ status: 'lost-clock', resolutionState: 'consistent', resolution: { day: 0 } });
    expect(view(world).chronicle.some((row) => row.record.kind === 'institution' && row.record.action === 'coronation')).toBe(true);
  });
  it('a real council win preserves the claim that met the quorum', () => {
    const world = fixture(); applyInject(world, 'ada', spec); finish(world);
    expect(world.scenario!.status).toBe('won');
    expect(view(world).ending.resolution).toMatchObject({ kind: 'won', turned: [{ npc: 'ada' }] });
    expect(view(world).operations.stories[0]!.versions[0]!.claim.subject).toBe('bez');
  });
  it('actual carrier identification opens exposure loss without a feature-count threshold', () => {
    const world = fixture(); decision(world, 0, [feature('identity', { subject: 'you' })]); finish(world);
    expect(view(world).ending.status).toBe('lost-exposed');
    expect(view(world).calendar.days[0]!.sketch).toMatchObject({ identified: true, identifiedOnDay: 0 });
  });
  it('an actual caught utterance opens the immediate arrest ending', () => {
    const world = fixture(); scenario(world, 10); world.playerVenue = 'square';
    world.enemy.observers = [{ id: 'bez', vigilance: 1 }]; world.tick = 15;
    applyAction(world, { tick: 15, kind: 'tell', to: 'ada', spec }, R); step(world, R);
    expect(view(world).ending).toMatchObject({ status: 'lost-caught', resolution: { kind: 'lost-caught', heardBy: 'bez', venue: 'square' } });
  });
  it.each(['missing', 'inconsistent'] as const)('a %s retained resolution remains explicit', (state) => {
    const world = finish(fixture()); world.scenario!.resolution = state === 'missing' ? null : { kind: 'won', day: 0, turned: [] };
    expect(view(world).ending.resolutionState).toBe(state);
  });
  it('a future-dated ending cannot masquerade as a consistent resolution at the current clock', () => {
    const world = finish(fixture()); world.scenario!.resolution!.day = 9;
    expect(view(world).ending.resolutionState).toBe('inconsistent');
    expect(view(world).ending.resolution!.day).toBe(9);
  });
  it('current player annotations remain detached and ungraded outside historical days', () => {
    const world = fixture(); world.tick = 3000;
    world.intel.cards.push({ id: 'guess', text: 'the guard knows me', confidence: 3, links: ['opaque-id'], createdTick: 0, updatedTick: 3000 });
    const model = view(finish(world));
    expect(model.annotations).toMatchObject({ timing: 'terminal-current', graded: false, cards: [{ text: 'the guard knows me' }] });
    expect(JSON.stringify(model.calendar)).not.toContain('the guard knows me');
  });
});

describe('received knowledge and retained digests share an honest calendar', () => {
  it('a real day-one report does not put its day-zero observation on the earlier board', () => {
    const world = lateReport(); const days = view(world).calendar.days;
    expect(days.find((row) => row.day === 0)!.player.log).toEqual([]);
    expect(days.find((row) => row.day === 0)!.observationEntryIndexes).toEqual([0]);
    const received = days.find((row) => row.day === 1)!;
    expect(received.player.log[0]!.tick).toBe(0);
    expect(received.player.knowledge[0]).toMatchObject({ learnedAt: 1440, timing: 'report' });
    expect(received.newlyReceivedEntryIndexes).toEqual([0]);
  });
  it('removing the actual receipt preserves unknown board data without a synthetic zero-day event', () => {
    const world = lateReport(); world.chronicle = world.chronicle.filter((row) => row.kind !== 'network-speech');
    const calendar = view(world).calendar;
    expect(calendar.unknownKnowledge).toMatchObject([{ entryIndex: 0, learnedAt: null }]);
    expect(calendar.days.every((row) => row.player.log.length === 0)).toBe(true);
  });
  it('a real physical report received the next day keeps enemy observation and acquisition on separate dates', () => {
    const world = scryWorld(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'away' }];
    applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; runUntil(world, 2880, R);
    expect(world.enemy.evidence.some((row) => row.kind === 'arcane-residue')).toBe(false);
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }]; runUntil(world, 2926, R);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'arcane-residue'); expect(index).toBeGreaterThanOrEqual(0);
    const model = view(finish(world));
    expect(model.calendar.days.find((row) => row.day === 1)!.observedEvidenceIndexes).toContain(index);
    expect(model.calendar.days.find((row) => row.day === 1)!.newlyAcquiredEvidenceIndexes).not.toContain(index);
    expect(model.calendar.days.find((row) => row.day === 2)!.newlyAcquiredEvidenceIndexes).toContain(index);
    expect(model.operations.enemyEvidence[index]!.arrival).toMatchObject({ observedAt: 1440, learnedAt: 2925, timing: 'report' });
  });
  it('day gaps stay explicit, same-day decisions retain indexes, and append order breaks chronology ties', () => {
    const world = fixture(); world.tick = 4320; visibleQuestion(world, 0);
    decision(world, 2, [feature('first')]); decision(world, 2, [feature('second')]); finish(world);
    const days = view(world).calendar.days;
    expect(days.map((row) => [row.day, row.gapBefore])).toEqual([[0, 0], [2, 1], [3, 0]]);
    expect(days[1]!.decisions.map((row) => row.decisionIndex)).toEqual([0, 1]);
    expect(days[1]!.sketch.known.map((row) => row.id)).toEqual(['first', 'second']);
  });
  it('a future receipt and future digest cannot appear in an earlier calendar', () => {
    const world = lateReport(); decision(world, 9, [feature('future', { subject: 'you' })]); world.tick = 100;
    const calendar = view(world).calendar;
    expect(calendar.days.map((row) => row.day)).toEqual([0]);
    expect(calendar.days[0]!.player.log).toEqual([]); expect(calendar.days[0]!.sketch.identified).toBe(false);
    expect(view(world).recordsBeyondClock.length).toBeGreaterThan(0);
    expect(view(world).recordsBeyondClock.every((row) => row.record.tick > world.tick)).toBe(true);
  });
  it('a retained sketch without a digest day is visible but is never backdated', () => {
    const world = fixture(); world.enemy.sketch.push(feature('orphan', { subject: 'you', day: 0 })); world.tick = 2880;
    const calendar = view(finish(world)).calendar;
    expect(calendar.unrecordedSketch[0]!.id).toBe('orphan');
    expect(calendar.days.every((row) => row.sketch.known.length === 0 && !row.sketch.identified)).toBe(true);
  });
  it('repeated feature keys are descriptive groups while identification follows the actual named carrier and digest day', () => {
    const world = fixture(); world.tick = 6000;
    decision(world, 0, [feature('a'), feature('b')]);
    decision(world, 2, [feature('me', { subject: 'you' })]);
    const days = view(finish(world)).calendar.days;
    expect(days.find((row) => row.day === 0)!.sketch).toMatchObject({ identified: false, evidenceKeys: [
      { kind: 'carrier-profile', subject: 'ada', featureIds: ['a', 'b'] },
    ] });
    expect(days.find((row) => row.day === 2)!.sketch).toMatchObject({ identified: true, identifiedOnDay: 2 });
    expect(days.at(-1)!.sketch.evidenceKeys).toHaveLength(2);
  });
  it('a feature without an act does not invent questioning, watch work or a known signal', () => {
    const world = fixture(); decision(world, 0, [feature('unrelated')]);
    const overlay = view(finish(world)).calendar.days[0]!.overlay;
    expect(overlay.attention.actual).toEqual([]); expect(overlay.signals).toEqual([]);
    expect(overlay.lag.featuresWithoutCounterLinkIds).toEqual(['unrelated']);
  });
  it('repeated board views corroborate one performed asking without requiring a resulting feature', () => {
    const world = fixture(); visibleQuestion(world); world.intel.log.push(cloneSerializable(world.intel.log[0]!)); world.tick = 30;
    const overlay = view(finish(world)).calendar.days[0]!.overlay;
    expect(overlay.attention.actual).toHaveLength(1); expect(overlay.signals[0]).toMatchObject({
      status: 'corroborated-attention', entryIndexes: [0, 1], attentionIds: ['asking:0'], featureIds: [] });
    expect(overlay.lag.unseenAttentionIds).toEqual([]);
  });
  it('a mismatched signal remains unproved even if its key equals a feature ID', () => {
    const world = fixture(); visibleQuestion(world); world.intel.log[0]!.venue = 'elsewhere'; world.tick = 30;
    decision(world, 0, [feature('s:ada')]);
    const overlay = view(finish(world)).calendar.days[0]!.overlay;
    expect(overlay.signals[0]).toMatchObject({ status: 'unproved-signal', featureIds: [], attentionIds: [] });
    expect(overlay.lag.unseenAttentionIds).toEqual(['asking:0']);
  });
  it('partial corroboration preserves both the matched and unproved original entries', () => {
    const world = fixture(); visibleQuestion(world); world.intel.log.push({ ...cloneSerializable(world.intel.log[0]!), venue: 'elsewhere' }); world.tick = 30;
    expect(view(finish(world)).calendar.days[0]!.overlay.signals[0]).toMatchObject({ status: 'partly-corroborated',
      matchedEntryIndexes: [0], unmatchedEntryIndexes: [1], attentionIds: ['asking:0'] });
  });
  it('real no-report watch work survives expiry and is visible without headquarters accounts or a feature', () => {
    const world = noReportWatch(); const model = view(world); const overlay = model.calendar.days.at(-1)!.overlay;
    expect(model.operations.directives[0]!.latestRun!.state).toBe('aborted');
    expect(overlay.attention.actual.some((row) => row.kind === 'watch')).toBe(true);
    expect(overlay.headquartersAccounts).toEqual([]);
    expect(model.operations.directives[0]!.localResults!.some((row) => row.result.enemyAction?.kind === 'watch-worked')).toBe(true);
  });
  it('current headquarters ledger rows never manufacture actual work or old receipt dates', () => {
    const world = fixture(); world.enemy.actionLedger = [{ orderKey: 'reported', kind: 'watch', directiveIds: ['unknown'],
      leadFeatureId: null, subject: 'you', about: null, district: 'd0', scheduleStartDay: 0,
      posts: [{ guard: 'bez', venue: 'square' }], workedDays: [0], askedAt: null }]; world.tick = 3000;
    const model = view(finish(world));
    expect(model.headquartersLedger).toMatchObject({ timing: 'unrecorded', entries: [{ workedDays: [0] }] });
    expect(model.calendar.days.every((row) => row.overlay.attention.actual.length === 0 && row.overlay.headquartersAccounts.length === 0)).toBe(true);
  });
  it('actual reported watch work retains headquarters receipt time separately from the asserted work time', () => {
    const world = noReportWatch('full'); const model = view(world);
    const accounts = model.calendar.days.at(-1)!.overlay.headquartersAccounts;
    expect(accounts.length).toBeGreaterThan(0);
    for (const account of accounts) {
      expect(account.receivedAt).toBe(world.chronicle[account.chronicleIndex]!.tick);
      if (account.copy.enemyAction) expect(account.receivedAt).toBeGreaterThanOrEqual(account.copy.enemyAction.occurredAt);
    }
    const first = accounts[0]!; world.tick = first.receivedAt - 1;
    expect(view(world).calendar.days.at(-1)!.overlay.headquartersAccounts).toEqual([]);
  });
  it.each(['received', 'issued'] as const)('missing %s watch work stays unknown instead of becoming a phantom', (state) => {
    const world = noReportWatch(); const record = world.network.directiveState!.records[0]!;
    const work = record.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!.result.enemyAction!;
    world.intel.log.push({ ...blankIntel(), kind: 'presence', via: 'self', tick: work.occurredAt, venue: work.venue, actor: work.guard, overheard: true });
    delete record.outcomes; if (state === 'issued') record.received = null;
    const signal = view(world).calendar.days.at(-1)!.overlay.signals.find((row) => row.kind === 'watch')!;
    expect(signal.status).toBe(state === 'received' ? 'unrecorded-work' : 'issued-unproved');
    expect(signal.attentionIds).toEqual([]);
  });
});

describe('typed composition retains actual routes, operation variants and orphans', () => {
  it('an actual paper viewing retains both the artifact and its independently minted story', () => {
    const world = fixture(); world.playerVenue = 'square'; applyForge(world, spec, 0, R); world.tick = 1440;
    applyShow(world, 'a0', 'ada', 1440, [{ venue: 'square', members: ['you', 'ada'] }]);
    const operations = view(finish(world)).operations;
    expect(operations.artifacts[0]!.storyFamilies).toEqual([operations.stories[0]!.family]);
    expect(operations.stories[0]!.events[0]!.record.kind).toBe('artifact');
  });
  it('actual scry captures and orphan residue stay reachable independently of physical attention', () => {
    const world = scryWorld(); applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; step(world, R); const model = view(finish(world));
    expect(model.operations.magic.operations[0]!.spell).toBe('scrying');
    expect(model.operations.physical.records.some((row) => row.record.kind === 'residue')).toBe(true);
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'scry');
    expect(view(world).operations.magic.residuesWithoutOperation[0]!.residueId).toBe('s0');
  });
  it('an actual séance stays a magic receipt and a story event without joining a visible chapel visit', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R);
    const model = view(finish(world));
    expect(model.operations.magic.operations[0]!.spell).toBe('seance');
    expect(model.operations.stories.flatMap((row) => row.events).some((row) => row.record.kind === 'seance')).toBe(true);
    expect(model.operations.physical.records.some((row) => row.record.kind === 'night-visit')).toBe(true);
    expect(model.operations.physical.evidence.some((row) => row.entry.kind === 'night-visit')).toBe(true);
  });
  it('missing séance and speech claims stay in the public unresolved section', () => {
    const world = seanceWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); delete world.claims[world.departed!.claimId];
    world.chronicle.push({ kind: 'inject', tick: 0, target: 'you', by: 'player', claimId: 'missing' });
    expect(view(finish(world)).operations.unresolvedStories.map((row) => row.record.kind)).toEqual(['inject', 'seance', 'inject']);
  });
  it('orphan paper, queued report root and network speaking history remain reachable', () => {
    const world = fixture(); const held = hold(world); held.queuedIn = 'missing';
    world.chronicle.push({ kind: 'artifact', tick: 0, act: 'forge', artifact: 'lost-paper', by: 'you', to: null },
      { kind: 'network-speech', tick: 0, venue: 'square', speaker: 'ada', addressedTo: 'you', messageId: 'orphan', cause: null,
        heardBy: [{ id: 'you', addressed: true }], spoken: { kind: 'field-report', onwardTo: null, items: [] }, reportRoots: [] });
    const operations = view(finish(world)).operations;
    expect(operations.artifacts[0]!.artifact).toBeNull();
    expect(operations.reportItems[0]!.packets[0]!.transport).toBe('unrecorded');
    expect(operations.messages[0]).toMatchObject({ messageId: 'orphan', transport: 'unrecorded', stages: [{ tick: 0 }] });
  });
  it('an actual omitted report arrives as an empty envelope and never becomes received knowledge', () => {
    const world = fixture(); world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true });
    const held = hold(world); queueUnqueuedFieldReports(world);
    const packet = world.network.directiveState!.messages[0]!;
    const heard = realizeNetworkForward(world, packet.id, { venue: 'backroom', members: ['ada', 'you'] }, 15, R)!;
    ingestObservedFieldReport(world, 'player', heard); world.tick = 15;
    world.chronicle.push({ kind: 'network-speech', tick: heard.tick, venue: heard.venue, speaker: heard.speaker,
      addressedTo: heard.addressedTo, heardBy: [{ id: 'you', addressed: true }], messageId: heard.messageId,
      spoken: heard.spoken, cause: null, reportRoots: [] });
    const model = view(finish(world));
    expect(held.deliveredAt).toBe(15); expect(model.calendar.days[0]!.player.log).toEqual([]);
    expect(model.calendar.days[0]!.overlay.receivedReportItems[0]!.stage.status).toBe('omitted');
  });
  it('ambiguous root metadata remains unknown in an actually heard report', () => {
    const world = lateReport(); const speech = world.chronicle.find((row) => row.kind === 'network-speech')!;
    if (speech.kind !== 'network-speech') throw new Error('missing speech'); speech.reportRoots = ['duplicate', 'duplicate'];
    expect(view(world).calendar.days.at(-1)!.overlay.receivedReportItems[0]!.stage.status).toBe('unknown');
  });
  it('a real two-hop exaggerated report exposes the mutation and its actual speaker without rewriting the root', () => {
    const world = fixture(); world.npcs.bez!.traits = ['exaggerator'];
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 30, venue: 'square' }, { days: 'all', from: 30, to: 1440, venue: 'backroom' }];
    const claim = applyInject(world, 'ada', spec); const id = claim.id;
    holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: { kind: 'utterance', tick: 0,
      venue: 'square', speaker: 'ada', addressedTo: 'bez', claim, overheard: false, mode: 'telling' } }, null, ['bez', 'you'], null, []);
    queueUnqueuedFieldReports(world); world.tick = 15; runUntil(world, 31, R);
    const model = view(finish(world));
    const received = model.calendar.days[0]!.overlay.receivedReportItems.find((row) => row.stage.speaker === 'bez')!;
    expect(received.stage.status).toBe('spoken'); expect(received.stage.changes!.length).toBeGreaterThan(0);
    expect(received.stage.changes!.some((row) => row.path.includes('/reported/'))).toBe(true);
    expect(world.claims[id]!.count).toBe(2);
  });
  it('every institution and vignette remains reachable even without an operation-family association', () => {
    const world = fixture(); world.chronicle.push({ kind: 'vignette', tick: 0, defId: 'retained', a: 'ada', b: null });
    const model = view(finish(world));
    expect(model.chronicle.map((row) => row.record.kind)).toEqual(['vignette', 'institution']);
  });
  it('composed physical histories own their sightings, receipt and nested evidence independently of magic views', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R); finish(world);
    const before = hashWorld(world); const expected = view(world); const changed = view(world);
    changed.operations.physical.records[0]!.record.tick = 999;
    const evidence = changed.operations.physical.evidence.find((row) => row.entry.kind === 'night-visit')!;
    if (evidence.entry.kind !== 'night-visit') throw new Error('missing night evidence');
    evidence.entry.nightVisit.witness = 'changed'; evidence.sightingIndexes.push(999); evidence.arrival.learnedAt = 999;
    expect(hashWorld(world)).toBe(before); expect(view(world)).toEqual(expected);
  });
});

it('the public view deeply owns calendar, report, claim, sketch, ledger, annotation and terminal arrays', () => {
  const world = lateReport(); decision(world, 1, [feature()]);
  world.intel.cards.push({ id: 'h', text: 'guess', confidence: 1, links: [], createdTick: 0, updatedTick: 1 });
  const before = hashWorld(world); const expected = view(world); const changed = view(world);
  expect(changed).toEqual(expected);
  changed.annotations.cards[0]!.links.push('changed'); changed.calendar.days.at(-1)!.player.log[0]!.actor = 'changed';
  changed.calendar.days.at(-1)!.decisions[0]!.decision.features[0]!.evidence.push({ tick: 0, observer: 'x', claimId: null, messageId: null });
  changed.operations.reportItems[0]!.held[0]!.route.push('changed');
  changed.calendar.days.at(-1)!.overlay.receivedReportItems[0]!.stage.heardBy[0]!.id = 'changed';
  changed.chronicle[0]!.record.tick = 999; changed.headquartersLedger.entries.push({ orderKey: 'fake', kind: 'watch',
    directiveIds: [], leadFeatureId: null, subject: null, about: null, district: 'd0', scheduleStartDay: 0, posts: [], workedDays: [], askedAt: null });
  expect(hashWorld(world)).toBe(before); expect(view(world)).toEqual(expected);
});
```
