# Task 5B terminal chronology and ending identity correction

13 September 2026. Complete versioned author proposal, ready for independent review.
This is the bounded correction to the two Important findings in the frozen 278-case
composition proposal. It does not change any production path, tests, configuration,
index or commit. The canonical author skill and inherited root capability were used.

## Frozen authority and source

Actual base: ef7fa3848ac3e1e71e2490576f1af9ea4f77eb64, 356 archived files unchanged.
The complete final map has 34 bodies: 14 debrief modules, 11 test bodies and nine
explicit future recording/watch predecessors. The 29 upstream bodies, including
the approved 241-case identity correction and prior physical/receipt models, remain
exactly unchanged. Two other composition modules, calendar.ts and overlay.ts, also
remain unchanged. Original artifacts and all failed evidence remain frozen.

| Fixed authority | SHA-256 |
| --- | --- |
| `task-5b-composition-author-draft.md` | `6bdcfb577a61751e14a83f84fc995d23eb0c719db65fdeae4a6483f64844a98d` |
| `task-5b-composition-author-report.md` | `5d64bea6bceff5971ad938ee0c1f6c0617fbb37701a1d773b49bfb5f43b8837a` |
| `task-5b-composition-constraints.md` | `7b2dad7de91709f6757737424c3325fff3a1b5e675cda24e0a2538b301413599` |
| `final-green.source-map.json` | `359659cc2139bfe6e77e2e6e2fc1a6417ff81c4d6bc034d77765f7b3e883017c` |
| `file-inventory.json` | `0e4f679f1bf02ac7147aa919332e5f240f99b9d945d8bdc67d1fa99d5ef26c75` |
| `task-5b-composition-native-review-2026-09-13.md` | `9e6cd3d09d13950791b3f21e7d8f6343d34c47aefa7f08344c8a2863f073c01f` |
| `file-inventory.json` | `5b5a0b3e71f29e53af4b3e7e87da6d17913c44271659d087dfb63b843426707c` |

## Corrected public contract

Existing `operations.enemyEvidence`, `operations.physical.evidence` and
`operations.featureReferences` keep their row types. They now contain only current
or undated rows. The additive typed section is:

```text
operations.beyondClock = {
  enemyEvidence: OperationThreads['enemyEvidence'],
  physicalEvidence: PhysicalObservationHistory['evidence'],
  featureReferences: FeatureLink[]
}
```

An evidence row is beyond the view clock if its retained observation, resolved
acquisition, explicit physical receipt or physical observation marker is future.
An explicit future receipt stays beyond the clock even when the acquisition reader
cannot yet corroborate it; that reader's null/unrecorded state remains unchanged.
A feature row is beyond the clock if its retained decision day, own retained day,
reference observation timestamp or referenced evidence row is future. A feature
with contradictory current/future dates is preserved wholly in beyondClock; the
model does not repair the dates or fabricate a new feature. An undated feature
still has recordedDay:null. Unknown acquisition remains learnedAt:null. Original
evidence indexes and ordering survive the partition; array position is not identity.
Both partitions retain detached nested values, including independent physical and
general evidence copies. No retained operation or orphan is deleted from the model.

The existing ending.resolutionState union remains consistent/missing/inconsistent.
The raw resolution stays visible and detached. Consistent now means the payload's
retained source identities resolve uniquely and agree; it does not mean the referee
was re-run or the outcome/thresholds were independently recomputed.

- All non-null variants still require matching scenario kind and a nonnegative
  safe-integer day no later than the view clock. They also need exactly one retained
  status-specific institutional event on that day at or before the clock. Resolution
  has no event index, so duplicate candidate ending records remain inconsistent.
- Won requires nonempty, unique member turns matching the denouncement's ordered
  actors and claim IDs. Each exact keyed claim must retain its ID/family and name
  the institution's subject. Credence must be finite in its declared 0..1 domain.
  The denouncement proves the member/claim event; the model does not infer historical
  credence, reapply valence/quorum thresholds, or consult today's council roster.
- Lost-clock validates its partial turn claim list against the coronation. Because
  that record does not retain member actors, a nonempty partial-progress pointer
  additionally needs its retained member belief with the exact claim and credence,
  first heard by the coronation tick. Missing or changed snapshots remain inconsistent.
  This is consistency against retained data, not reconstruction of lost belief edits.
- Lost-exposed requires nonempty, unique feature pointers resolving to one retained
  feature identity and matching subject; at least one names the recorded unmasking
  subject. Identical decision/sketch mirrors count as one identity; conflicting
  same-ID values remain ambiguous. Future-only decision identity cannot borrow its
  current-sketch mirror as past proof. Undated current-sketch identity stays usable
  as an identity without inventing a missing digest day. Current informant/council
  rosters and feature-count/identification thresholds are never reapplied.
- Lost-caught requires one retained arrest for the avatar naming the guard and
  one matching telling or network-speech record at the same tick/venue, with that
  guard in the audience. The arrest's claim list must match the telling or be empty
  for network speech. Missing, mismatched or multiple matching captures remain
  inconsistent. Current guard staffing and vigilance are not used as historical proof.

Calendar, overlay and all 29 upstream bodies remain byte-identical. This correction
changes only threads.ts, index.ts and additive composition.test.ts. It does not add
world recording, schema, session, gameplay, UI or a new public value export.

## Complete five-chunk installation amendment

After this versioned correction receives independent approval, use the corrected
34-body map and the complete maps under this validation tree's chunks directory.
Do not install the stale 278-case composition bodies. The nine recording/watch
overlays are validation-only prerequisites, not incidental Task 5B production work.
Reconcile them with the actual approved Task 5A1/T5A-A1, R16, R17 and Task 5A2 commits;
each predecessor keeps its own six gates and separate code review. The immutable
dependency-inventory.json and copied original plan name the exact approved source,
recording amendments, constraints and prior drafts. Root binds the actual HEAD
before each source writer. No old Task 4C overlay is substituted for actual code.

One production writer and root-owned index at a time. Use an implementation worker
capable of the causal TypeScript models and an independent accumulated reviewer.
Root preserves unrelated changes and verifies each exact scoped diff before staging.
Any material actual-base overlap is reconciled before writing; do not weaken a test
or overwrite later approved UI/model work to force an obsolete body.

| Chunk | Exact owned model/test filenames | Scoped subject |
| --- | --- | --- |
| 5B1 | `knowledge.ts`, `network.ts`, `knowledge.test.ts`, `network.test.ts` | `feat: add debrief knowledge and network history readers` |
| 5B2 | `directives.ts`, `timeline.ts`, `attention.ts`, `directive-history.test.ts`, `attention.test.ts` | `feat: add debrief directive history and semantic attention` |
| 5B3 | `reports.ts`, `evidence.ts`, `feature-links.ts`, `reports.test.ts`, `evidence-arrival.test.ts`, `feature-links.test.ts`, `physical-links.test.ts` | `feat: connect debrief report receipts and physical evidence` |
| 5B4 | `stories.ts`, `magic.ts`, `stories.test.ts`, `magic.test.ts` | `feat: add debrief story and magic operation histories` |
| 5B5 | `calendar.ts`, `overlay.ts`, `threads.ts`, `index.ts`, `composition.test.ts` | `feat: debrief models — threads, the timeline, and the overlay where your fear was wrong` |

Model files are under src/sim/debrief; tests under tests/debrief. The manifest
implementation-chunks.json includes every exact owned path, cumulative test path,
command, subject and map hash. Chunks 5B1–5B4 are byte-for-byte unchanged from the
frozen approved-input proposal; only 5B5's map replaces the three corrected bodies.
All 25 debrief model/test paths are owned once. Nine future predecessor bodies are
present in validation maps for compilation and must already be installed separately.

For every chunk: reconcile actual HEAD, install only the named files, run its exact
cumulative Vitest files, both actual TypeScript configurations and scoped lint, then
root verifies diff/input preservation and makes the scoped commit. 5B4 includes the
approved 241-case magic identity floor. 5B5 brings the complete model suite to the
measured 313 cases, preserving every earlier assertion. Chunk maps contain all and
only the cumulative models/tests plus the same explicit recording/watch prerequisites.
consumer-map.json preserves the earlier/same-chunk dependency order and sole public
value entry debriefView; no additional debrief import edge is needed by this correction.

After 5B5, run npm test, npm run lint, npm run typecheck and npm run app:build against
the actual integrated branch. Root runs the required soak, Monte Carlo and complete
deterministic report comparison under the existing process. Explain any real delta;
do not retune seeds, rules, thresholds, clocks or the comparator. The reserved final
Task 5 subject in the table is used only after all complete model integration gates
pass. Obtain independent accumulated committed-code review covering the terminal
gate, chronology, identity uncertainty, ownership and all predecessor provenance.

Task 6 owns exactly one main.tsx terminal branch, props-only panels, running-session
non-reachability and import-fence firing. The UI must distinguish the additive
beyondClock section and preserve unknown values. Task 7B owns final vocabulary/prose;
Task 8 owns actual terminal lessons, full integration and whole-plan review. Ritual
purchase composers and Plan 10 remain outside this unit. No production/UI/gameplay
completion is implied by this author proposal.

## Acceptance and verification

313 = 278 preserved cases + 35 additive cases. The latter include all five binding
independent regressions, current/future/unknown chronology, inclusive clock boundary,
detached partitions, all four real endings, partial clock progress, missing/mismatched/
ambiguous resolution sources, historical member/guard identity independent of today's
roster, and retained network capture. No migrations or removed assertions.

The exact reviewer probe changes only import paths in the new isolated host. Its
five failures reproduce against the frozen map; its five cases pass against final
GREEN. The permanent version adapts only helper names and gives the three resolution
tuples an explicit mutable TypeScript annotation, preserving fixture values/assertions.
Original 278 test bytes are an unchanged contiguous body between one additive type
import and the appended new cases. The audit verifies case-name multisets, not counts
alone. Every old case passes in permanent RED and GREEN.

| Native gate | Result |
| --- | --- |
| Original fixed baseline | 278 passed, exit 0 |
| Original five reviewer probes | 0 passed / 5 failed, exit 1 |
| Final permanent RED against old models | 284 passed / 29 failed, exit 1 |
| Final permanent GREEN | 313 passed, exit 0 |
| Second author pass, conflicting-sketch control | 312 passed / 1 failed, exit 1; corrected in final GREEN |
| Final original reviewer probes | 5 passed, exit 0 |
| Both actual compiler configurations | Zero diagnostics, exit 0 |
| Exact-body lint | 34 files, zero errors and warnings, exit 0 |
| Mandatory law firing | Two changed model paths, four expected diagnostics each, exit 0 |
| Final integrity audit | 592 author entries, 457 reviewer entries, 24 fixed inputs, 356 archive files unchanged; exit 0 |

Recorded commands run from the isolated author checkout using PowerShell 7 and
python -X utf8. The established narrow native-read escalation reaches its native-owned
archive; no ACL, dependencies, network or project configuration is changed.

```text
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py baseline tests original-278
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py reviewer-red tests exact-reviewer-red
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py final-red tests complete-313-red
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py final-green tests complete-313-green
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py reviewer-final tests final-reviewer-controls
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py final-green preflight final-compiler-lint
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py root firing final-firing
python -X utf8 .superpowers/sdd/task-5b-contract-validation/run.py root audit final-integrity
```

These prefixes are immutable. Re-review uses its own host/cache and new labels;
never rerun a cache in the original composition, identity, physical or review hosts.
Each native gate saves executable identity, argv/cwd, exact source map, separate
binary stdout/stderr, real exit and preservation proof. Compiler diagnostics/lint
outputs are copied to the immutable run prefix before any later stage may refresh
generated output. Final file-inventory.json excludes itself and only owned disposable
.vite-* cache directories, and includes all three final markdown artifacts.

## Complete corrected bodies

The final complete executed source map is
task-5b-contract-validation/final-green/complete-313-green.source-map.json,
SHA-256 `f25076daf877b0ffba3a41bf33525c01c69ee318ea309f5bbf3a84bb069e1229`. final-green-map.json is byte-identical.

| Target | SHA-256 | Bytes |
| --- | --- | --- |
| `src/sim/debrief/threads.ts` | `c03aeb1f920e89395a07d81fa8c82437f7a9f5525ff6d64697d250d7f2287ad2` | 4710 |
| `src/sim/debrief/index.ts` | `5585e10d0ec4cd75211f6361be2c60559d449070514670cce52e5e729a2103ae` | 7012 |
| `tests/debrief/composition.test.ts` | `63e6d1ae92ec53a0efa1998d04bbbd17931a0b7a760d80993379d60eb9da6428` | 39934 |

### `src/sim/debrief/threads.ts`

```ts
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
  const featureIsFuture = (row: FeatureLink): boolean =>
    (row.recordedDay !== null && row.recordedDay > dayOf(world.tick)) || row.feature.day > dayOf(world.tick)
    || row.references.some((ref) => futureTick(ref.ref.tick) || futureTick(ref.ref.residue?.observedAt)
      || futureTick(ref.ref.nightVisit?.observedAt)
      || [...ref.evidenceIndexes, ...ref.undatedEvidenceIndexes, ...ref.laterEvidenceIndexes].some(evidenceIsFuture));
  const allFeatures = featureLinks(world);
  return { stories: storyThreads(world), artifacts: artifactThreads(world), messages: network.messages,
    directives: network.directives, reportItems: fieldReportThreads(world, network.messages), magic: magicThreads(world),
    physical: { records: world.chronicle.flatMap((record, chronicleIndex) => (record.kind === 'residue' || record.kind === 'night-visit')
      && record.tick <= world.tick ? [{ chronicleIndex, record: cloneSerializable(record) }] : [])
      .sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex),
    evidence: allPhysical.filter((row) => !evidenceIsFuture(row.evidenceIndex)) },
    unresolvedStories: unresolvedStoryEvents(world),
    enemyEvidence: allEvidence.filter((row) => !evidenceIsFuture(row.evidenceIndex)),
    featureReferences: allFeatures.filter((row) => !featureIsFuture(row)),
    beyondClock: { enemyEvidence: allEvidence.filter((row) => evidenceIsFuture(row.evidenceIndex)),
      physicalEvidence: allPhysical.filter((row) => evidenceIsFuture(row.evidenceIndex)),
      featureReferences: allFeatures.filter(featureIsFuture) } };
}
```

### `src/sim/debrief/index.ts`

```ts
import { dayOf } from '../../core/time';
import type { HypothesisCard } from '../../intel/entry';
import type { EnemyActionLedgerEntry, SketchFeature } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import type { Resolution, ScenarioStatus } from '../scenario/types';
import type { ChronicleEntry, InstitutionRecord, WorldState } from '../types';
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

/** Validate retained identities, not the referee's rules, thresholds or today's council/informant roster. */
function resolutionMatches(world: WorldState, resolution: Resolution): boolean {
  const actions = { won: 'denounce', 'lost-clock': 'coronation', 'lost-exposed': 'unmasking', 'lost-caught': 'arrest' } as const;
  const institutions = world.chronicle.filter((row): row is InstitutionRecord => row.kind === 'institution'
    && row.action === actions[resolution.kind] && row.tick <= world.tick && dayOf(row.tick) === resolution.day);
  // Resolution carries a day, not an event index: multiple candidate endings remain ambiguous.
  if (institutions.length !== 1) return false;
  const institution = institutions[0]!;
  if (resolution.kind === 'won' || resolution.kind === 'lost-clock') {
    if (new Set(resolution.turned.map((row) => row.npc)).size !== resolution.turned.length
      || (resolution.kind === 'won' && resolution.turned.length === 0)
      || stableStringify(institution.claimIds) !== stableStringify(resolution.turned.map((row) => row.claimId))) return false;
    if (resolution.kind === 'won'
      && stableStringify(institution.actors) !== stableStringify(resolution.turned.map((row) => row.npc))) return false;
    return resolution.turned.every((row) => {
      const claim = world.claims[row.claimId];
      if (!claim || claim.id !== row.claimId || claim.family !== row.family || claim.subject !== institution.subject
        || !Number.isFinite(row.credence) || row.credence < 0 || row.credence > 1) return false;
      if (resolution.kind === 'won') return true; // The denouncement names each member and claim in matching order.
      // Coronation records omit member names; only a retained matching belief can resolve this partial-progress pointer.
      const belief = world.beliefs[row.npc]?.[row.family];
      return belief !== undefined && stableStringify(belief.claim) === stableStringify(claim)
        && belief.credence === row.credence && belief.firstHeardAt <= institution.tick;
    });
  }
  if (resolution.kind === 'lost-exposed') {
    if (resolution.features.length === 0
      || new Set(resolution.features.map((row) => row.featureId)).size !== resolution.features.length) return false;
    const recordedIds = new Set(world.enemy.decisions.flatMap((row) => row.features.map((feature) => feature.id)));
    const dated = world.enemy.decisions.filter((row) => row.day <= resolution.day).flatMap((row) => row.features);
    const currentIds = new Set(dated.map((feature) => feature.id));
    const retained = dated.concat(world.enemy.sketch.filter((feature) => !recordedIds.has(feature.id) || currentIds.has(feature.id)));
    const sources: SketchFeature[] = [];
    for (const ref of resolution.features) {
      const candidates = retained.filter((feature) => feature.id === ref.featureId
        && feature.day <= resolution.day && feature.evidence.every((evidence) => evidence.tick <= institution.tick));
      // A feature may be mirrored by its decision and current sketch; identical copies are one retained identity.
      const identities = new Map(candidates.map((feature) => [stableStringify(feature), feature]));
      if (identities.size !== 1) return false;
      const source = identities.values().next().value!;
      if (source.subject !== ref.subject) return false;
      sources.push(source);
    }
    return sources.some((feature) => feature.subject === institution.subject);
  }
  if (institution.subject !== world.playerId || institution.actors.length !== 1
    || institution.actors[0] !== resolution.heardBy) return false;
  const captures = world.chronicle.filter((row) => (row.kind === 'telling' || row.kind === 'network-speech')
    && row.tick === institution.tick && row.venue === resolution.venue && row.speaker === institution.subject
    && row.heardBy.some((hearer) => hearer.id === resolution.heardBy)
    && stableStringify(institution.claimIds) === stableStringify(row.kind === 'telling' ? [row.claimId] : []));
  return captures.length === 1;
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
        && resolutionMatches(world, resolution) ? 'consistent' : 'inconsistent' },
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

### `tests/debrief/composition.test.ts`

```ts
import type { Resolution } from '../../src/sim/scenario/types';
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

function contractReviewWorld(): WorldState {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.edges = []; npc.traits = ['literalist']; }
  const w = buildWorld(town, 'composition-independent-review', R); enrollPlayer(w, { home: 'backroom' });
  w.enemy.observers = []; w.tick = 100;
  w.scenario = { defId: 'composition', days: 1, win: { kind: 'council-turns', quorum: 1 },
    cast: { usurper: 'bez', council: ['ada'] }, status: 'lost-clock',
    resolution: { kind: 'lost-clock', day: 0, turned: [] } };
  return w;
}
function contractReviewFeature(id: string): SketchFeature { return { id, kind: 'carrier-profile', day: 9, subject: 'you', family: null,
  district: null, detail: 'future retained digest', evidence: [] }; }

it('terminal operations do not disclose a retained enemy digest beyond the current clock', () => {
  const w = contractReviewWorld(); const f = contractReviewFeature('future-feature');
  w.enemy.decisions.push({ day: 9, features: [f], inquiries: [], watches: [], interrogations: [] }); w.enemy.sketch.push(f);
  const view = debriefView(w)!;
  expect(view.calendar.days.every((day) => day.day <= 0)).toBe(true);
  expect(view.operations.featureReferences).toEqual([]);
});

it('terminal operations do not disclose enemy evidence recorded beyond the current clock', () => {
  const w = contractReviewWorld(); w.enemy.evidence.push({ kind: 'asking', tick: 200, venue: 'square', observer: 'bez', overheard: true,
    speaker: 'ada', addressedTo: 'bez', mode: null, claimId: null, family: null, reported: null,
    about: { subject: 'you' } });
  expect(debriefView(w)!.operations.enemyEvidence).toEqual([]);
});

it.each<[Resolution['kind'], Resolution]>([
  ['won', { kind: 'won', day: 0, turned: [{ npc: 'ada', family: 'ghost-family', claimId: 'ghost-claim', credence: 4 }] }],
  ['lost-exposed', { kind: 'lost-exposed', day: 0, features: [{ featureId: 'ghost-feature', subject: 'you' }] }],
  ['lost-caught', { kind: 'lost-caught', day: 0, heardBy: 'bez', venue: 'square' }],
])('a %s resolution whose fair-cop payload resolves to no world record is inconsistent', (status, resolution) => {
  const w = contractReviewWorld(); w.scenario!.status = status; w.scenario!.resolution = resolution;
  expect(debriefView(w)!.ending.resolutionState).toBe('inconsistent');
});

function contractEvidence(tick = 0) {
  return { kind: 'asking' as const, tick, venue: 'square', observer: 'bez', overheard: true,
    speaker: 'ada', addressedTo: 'bez', mode: null, claimId: null, family: null, reported: null,
    about: { subject: 'you' } };
}
function contractPhysical(tick = 0) {
  return { kind: 'night-visit' as const, tick, venue: 'chapel-d0', observer: 'bez', overheard: false,
    speaker: null, addressedTo: null, mode: null, claimId: null, family: null, reported: null, about: null,
    nightVisit: { actor: 'you', witness: 'bez', observedAt: tick } };
}
function contractEnding(status: Resolution['kind']) {
  const world = fixture();
  if (status === 'lost-caught') {
    scenario(world, 10); world.playerVenue = 'square'; world.enemy.observers = [{ id: 'bez', vigilance: 1 }]; world.tick = 15;
    applyAction(world, { tick: 15, kind: 'tell', to: 'ada', spec }, R); step(world, R);
  } else {
    if (status === 'won') applyInject(world, 'ada', spec);
    if (status === 'lost-exposed') decision(world, 0, [feature('identity', { subject: 'you' })]);
    finish(world);
  }
  expect(world.scenario!.status).toBe(status); return world;
}

describe('terminal time partitions retain every future and unknown row', () => {
  it('future physical observation appears only in the typed beyond-clock evidence sections', () => {
    const world = finish(fixture()); world.tick = 100; world.enemy.evidence.push(contractPhysical(200));
    const operations = view(world).operations;
    expect(operations.enemyEvidence).toEqual([]); expect(operations.physical.evidence).toEqual([]);
    expect(operations.beyondClock.enemyEvidence).toMatchObject([{ evidenceIndex: 0, entry: { tick: 200 } }]);
    expect(operations.beyondClock.physicalEvidence).toMatchObject([{ evidenceIndex: 0, entry: { tick: 200 } }]);
  });
  it('a retained future physical receipt is beyond the clock even when acquisition cannot yet be resolved', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.evidence.push({ ...contractPhysical(), receipt: { tick: 200, observer: 'ada', messageId: 'future-receipt' } });
    const operations = view(world).operations;
    expect(operations.enemyEvidence).toEqual([]); expect(operations.physical.evidence).toEqual([]);
    expect(operations.beyondClock.physicalEvidence[0]!.arrival).toMatchObject({ learnedAt: null, timing: 'unrecorded' });
  });
  it('a real later physical acquisition cannot appear as current acquisition when the world is rewound', () => {
    const world = scryWorld(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'away' }];
    applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; runUntil(world, 2880, R);
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }]; runUntil(world, 2926, R); finish(world);
    const evidenceIndex = world.enemy.evidence.findIndex((row) => row.kind === 'arcane-residue');
    world.tick = 2000; const operations = view(world).operations;
    expect(operations.enemyEvidence.some((row) => row.evidenceIndex === evidenceIndex)).toBe(false);
    expect(operations.physical.evidence.some((row) => row.evidenceIndex === evidenceIndex)).toBe(false);
    expect(operations.beyondClock.physicalEvidence.some((row) => row.evidenceIndex === evidenceIndex)).toBe(true);
  });
  it('ordinary and physical unknown acquisitions remain reachable without invented dates', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.evidence.push(contractEvidence(), contractPhysical());
    const operations = view(world).operations;
    expect(operations.enemyEvidence.map((row) => row.evidenceIndex)).toEqual([0, 1]);
    expect(operations.enemyEvidence.every((row) => row.arrival.learnedAt === null && row.arrival.timing === 'unrecorded')).toBe(true);
    expect(operations.physical.evidence.map((row) => row.evidenceIndex)).toEqual([1]);
    expect(operations.beyondClock.enemyEvidence).toEqual([]);
  });
  it('unrecorded feature days stay unknown while a retained future feature date is kept separately', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.sketch.push(feature('undated'), feature('future-orphan', { day: 9 }));
    const operations = view(world).operations;
    expect(operations.featureReferences).toMatchObject([{ feature: { id: 'undated' }, recordedDay: null }]);
    expect(operations.beyondClock.featureReferences).toMatchObject([{ feature: { id: 'future-orphan' }, recordedDay: null }]);
  });
  it('a current feature with a future observed reference is kept outside the current historical section', () => {
    const world = finish(fixture()); world.tick = 100;
    decision(world, 0, [feature('future-reference', { evidence: [{ tick: 200, observer: 'bez', claimId: null, messageId: null }] })]);
    const operations = view(world).operations;
    expect(operations.featureReferences).toEqual([]);
    expect(operations.beyondClock.featureReferences[0]!.recordedDay).toBe(0);
  });
  it('the boundary is inclusive, retained indexes are stable, and both partitions own their output', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.evidence.push(contractEvidence(200), contractEvidence(100), contractPhysical(200));
    decision(world, 0, [feature('current')]); decision(world, 9, [feature('future')]);
    const before = hashWorld(world); const expected = view(world); const changed = view(world);
    expect(changed.operations.enemyEvidence.map((row) => row.evidenceIndex)).toEqual([1]);
    expect(changed.operations.beyondClock.enemyEvidence.map((row) => row.evidenceIndex)).toEqual([0, 2]);
    changed.operations.beyondClock.physicalEvidence[0]!.entry.nightVisit!.actor = 'changed';
    expect(changed.operations.beyondClock.enemyEvidence[1]!.entry.nightVisit!.actor).toBe('you');
    changed.operations.beyondClock.featureReferences[0]!.feature.detail = 'changed';
    expect(hashWorld(world)).toBe(before); expect(view(world)).toEqual(expected);
  });
});

describe('resolution pointers require retained status-specific source identity', () => {
  it.each(['won', 'lost-clock', 'lost-exposed', 'lost-caught'] as const)('a real %s ending remains consistent without re-running the referee', (status) => {
    const world = contractEnding(status); const before = hashWorld(world);
    expect(view(world).ending.resolutionState).toBe('consistent'); expect(hashWorld(world)).toBe(before);
  });
  it('a real partial clock result resolves its retained member belief and claim', () => {
    const world = fixture(); applyInject(world, 'ada', spec); scenario(world); world.scenario!.win.quorum = 2; scenarioNightly(world, R);
    expect(view(world).ending).toMatchObject({ status: 'lost-clock', resolutionState: 'consistent' });
    const resolution = world.scenario!.resolution!; if (resolution.kind !== 'lost-clock') throw new Error('wrong ending');
    expect(resolution.turned).toHaveLength(1); delete world.beliefs.ada;
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it.each(['missing-claim', 'family', 'member', 'duplicate-member'] as const)('won %s metadata stays visible and inconsistent', (fault) => {
    const world = contractEnding('won'); const resolution = world.scenario!.resolution!;
    if (resolution.kind !== 'won') throw new Error('wrong ending');
    const turn = resolution.turned[0]!;
    if (fault === 'missing-claim') delete world.claims[turn.claimId];
    if (fault === 'family') turn.family = 'other-family';
    if (fault === 'member') turn.npc = 'other-member';
    if (fault === 'duplicate-member') resolution.turned.push(cloneSerializable(turn));
    expect(view(world).ending.resolutionState).toBe('inconsistent'); expect(view(world).ending.resolution).toEqual(resolution);
  });
  it('a won record resolves historical member identity without using the current council roster', () => {
    const world = contractEnding('won'); world.scenario!.cast.council = [];
    expect(view(world).ending.resolutionState).toBe('consistent');
  });
  it.each(['missing', 'duplicate'] as const)('%s retained institutional ending evidence cannot establish one resolution', (fault) => {
    const world = contractEnding('lost-clock'); const record = world.chronicle.find((row) => row.kind === 'institution')!;
    if (fault === 'missing') world.chronicle = world.chronicle.filter((row) => row !== record);
    else world.chronicle.push(cloneSerializable(record));
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it.each(['subject', 'conflicting-feature', 'conflicting-sketch', 'duplicate-reference', 'future-digest'] as const)('exposure %s cannot masquerade as resolved retained feature identity', (fault) => {
    const world = contractEnding('lost-exposed'); const resolution = world.scenario!.resolution!;
    if (resolution.kind !== 'lost-exposed') throw new Error('wrong ending');
    if (fault === 'subject') resolution.features[0]!.subject = 'other-person';
    if (fault === 'conflicting-feature') world.enemy.decisions[0]!.features.push(feature('identity', { subject: 'you', detail: 'conflicting same-ID copy' }));
    if (fault === 'conflicting-sketch') world.enemy.sketch.push(feature('identity', { subject: 'you', detail: 'conflicting sketch identity' }));
    if (fault === 'duplicate-reference') resolution.features.push(cloneSerializable(resolution.features[0]!));
    if (fault === 'future-digest') world.enemy.decisions[0]!.day = 9;
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it.each(['missing-speech', 'wrong-venue', 'wrong-guard', 'not-heard', 'duplicate-speech'] as const)('caught %s cannot resolve the retained arrest/capture pair', (fault) => {
    const world = contractEnding('lost-caught'); const resolution = world.scenario!.resolution!;
    if (resolution.kind !== 'lost-caught') throw new Error('wrong ending');
    const speech = world.chronicle.find((row) => row.kind === 'telling' && row.speaker === world.playerId)!;
    if (fault === 'missing-speech') world.chronicle = world.chronicle.filter((row) => row !== speech);
    if (fault === 'wrong-venue') resolution.venue = 'other-venue';
    if (fault === 'wrong-guard') resolution.heardBy = 'other-guard';
    if (fault === 'not-heard' && speech.kind === 'telling') speech.heardBy = [];
    if (fault === 'duplicate-speech') world.chronicle.push(cloneSerializable(speech));
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it('a retained network-speech capture resolves without inventing a claim or requiring the current guard roster', () => {
    const world = contractEnding('lost-caught');
    const at = world.chronicle.findIndex((row) => row.kind === 'telling' && row.speaker === world.playerId);
    const telling = world.chronicle[at]!; if (telling.kind !== 'telling') throw new Error('missing speech');
    world.chronicle[at] = { kind: 'network-speech', tick: telling.tick, venue: telling.venue,
      speaker: telling.speaker, addressedTo: telling.addressedTo, heardBy: cloneSerializable(telling.heardBy),
      messageId: 'retained-captured-envelope', spoken: { kind: 'field-report', items: [], onwardTo: null }, cause: null };
    const arrest = world.chronicle.find((row) => row.kind === 'institution' && row.action === 'arrest')!;
    if (arrest.kind !== 'institution') throw new Error('missing arrest'); arrest.claimIds = [];
    world.enemy.observers = [];
    expect(view(world).ending.resolutionState).toBe('consistent');
  });
});
```
