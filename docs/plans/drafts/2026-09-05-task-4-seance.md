# Plan 9 Task 4 — séance author draft (PARTIAL; NOT DISPATCH-READY)

Authored-by: native Codex, inherited GPT-6 capability; no Claude or child agents.
Date: 2026-09-05.
Inspected source base: `caa5a38`; this is an authoring base, not a future dispatch base.
Spec: `docs/design-spec.md`, Magic, priced like sin; Symmetric observability;
`docs/plans/plan-9-current.md`, Task 4; `docs/review/current.md`, R7.
Constraints: `.superpowers/sdd/plan6-constraints.md`, `plan7-constraints.md`,
`plan8-constraints.md`, and `plan11-constraints.md`.
Gate: `npm test`, `npm run lint`, `npm run typecheck`, `npm run app:build`,
plus complete `npm run soak` and `npm run mc` comparison.
Dependency order: Task 1 closure -> Task 2 forensics -> Task 3 provenance/physical
evidence -> Task 4 generation -> action/session -> physical risk -> integration/review.

**Stopped on the user's handoff/restart request.** This file preserves source-derived
design and candidate code. It is not a complete-code executable brief. The controller
must complete the exact integration patches and test bodies listed below, inspect the
completed Task 3 seams, and obtain independent review before dispatching implementation.
No source or tests were modified and no tests were executed during this author seat.

## Binding correction to the original Task 4

The archive's departed id must never enter `Secret.witnesses`. `validateTown` requires
those witnesses to be living NPCs, and `worldFromTown` immediately indexes their belief
stores. The session constructs a WorldState and discards the generated town, so runtime
needs its own small copied historical record. Do not remove a living cast member,
graph node, schedule, scenario principal, or dossier informant to create the departed.

Generate exactly one historical witness on the isolated `gen:departed` stream after
all existing sections, including scenario secret retargeting. Retain one real secret's
truthful reported fields and one real outgoing relationship of its subject. The action
must read that retained data, never rediscover hidden NPC edges or beliefs at ritual time.

Generated metadata has the existing tri-state contract: value is valid data; explicit
`null` means the draw failed and validation rerolls; omitted metadata is supported only
for hand-built towns. `worldFromTown` should reject present invalid/null metadata loudly;
it should preserve omission byte-for-byte. No new draws on an existing RNG stream.

## Confirmed shared seam with author_scrying

Task 3 owns an additive optional property on IntelEntry:

```ts
interface MagicProvenance {
  kind: 'magic';
  spell: 'scrying' | 'seance';
  operation: string;
}
// IntelEntry.provenance?: MagicProvenance; existing via remains a string.
```

Task 3 plans `src/intel/provenance.ts`: `sourceOf`, `sourceKey`, `sourceLabel`,
`isMagic`, `singleInformantChannel`. Séance must emit:

```ts
via: 'seance',
provenance: { kind: 'magic', spell: 'seance', operation },
```

The separate provenance property distinguishes a spell from a real NPC named `seance`.
Séance testimony uses `kind: 'utterance'`, with null `speaker` and `addressedTo`.
It remains claimful for evidence clustering, but must not create a fictional speaking
NPC, web carrier, receive/emit Codex pair, or route hop. Task 3's author agreed to guard
route endpoints and Codex received endpoints. Actual scry observations of living actors
can still fingerprint their traits; do not globally exclude all magic from Codex.

Task 3 plans `ScryRecord {kind:'scry';tick;operation;venue;day;from;to}` and
`ResidueRecord {kind:'residue';act:'created'|'observed';tick;residueId;venue;observer}`.
Its `WorldState.magic?: MagicState` holds scry windows/traces only. Task 4 should use
separate `src/sim/seance.ts`, `src/sim/magic-types.ts`, `WorldState.departed?`, and
`WorldState.seanceUsed?`, avoiding a shared magic-state rewrite.

**Late handoff from Task 3 (unverified proposal):** its partial draft section 3C defines
`ResidueEvidenceData {id:string;witness:EntityId;observedAt:Tick}` and
`ResidueReceipt {tick:Tick;observer:EntityId;messageId:MessageId}`. The residue EvidenceEntry
arm omits speaker/addressedTo from EvidenceBase and re-adds both as null, with
claimId/family/reported/about/mode null, residue data, and optional receipt. Older arms
gain `residue?:never; receipt?:never`. SketchEvidenceRef has optional residue data.
Direct evidence names the true physical witness with no receipt; delayed evidence retains
that witness plus a separate receipt naming the actual principal who heard the report.
Task 3's fair-cop audit extension/tests remain missing, and its author explicitly marks
the chain uncertified. Read the saved Task 3 draft before adapting this pattern; do not
claim the predecessor supplies a finished, verified physical-evidence seam.

## Candidate type module (source-mapped; not yet compiled)

Proposed complete new `src/sim/magic-types.ts`:

```ts
import type { Tick } from '../core/time';
import type { ReportedClaim } from './enemy/state';
import type { ClaimId, EntityId, VenueId } from './rumors/claim';
import type { Edge } from './types';

export interface DepartedEdge {
  from: EntityId;
  to: EntityId;
  kind: Edge['kind'];
}

/** Historical metadata, deliberately not an NPC or a living secret witness. */
export interface DepartedWitness {
  id: string;
  name: string;
  secretId: string;
  reported: ReportedClaim;
  edge: DepartedEdge;
}

/** The claim id is bound while worldFromTown mints the matching secret. */
export interface RuntimeDeparted extends DepartedWitness {
  claimId: ClaimId;
}

export interface SeanceRecord {
  kind: 'seance';
  tick: Tick;
  operation: string;
  venue: VenueId;
  departedId: string;
  claimId: ClaimId;
  edge: DepartedEdge;
}
```

Required exact splices still to author:

- `GeneratedTown.departed?: DepartedWitness | null` with tri-state comment; correct
  GeneratedTown's current claim that all metadata is never read by the sim.
- `WorldState.departed?: RuntimeDeparted`, lazily copied only when valid metadata exists.
- `WorldState.seanceUsed?: { operation: string; tick: Tick }`, absent until success.
- `ChronicleEntry` gains `SeanceRecord`, preserving Task 3's two new record kinds.

## Generation algorithm selected for completion

Add `src/world/departed.ts` containing a pure helper that accepts seed, living fixture,
post-retarget secrets, and generated name content. Construct its own
`new Rng(seed, 'gen:departed')`. No existing subsystem receives the helper's RNG.

1. Index living NPCs and venue ids. Candidate secrets must have a real living subject
   with at least one outgoing non-self edge to another living NPC. Sort secrets by id;
   sort each subject's eligible edges by `(to, kind)`. A missing candidate pool returns
   null and does not synthesize a relationship or secret.
2. Choose a secret uniformly from the sorted eligible-secret pool, then one of its
   sorted eligible edges, using the new stream only.
3. Pick an unused eligible display name from injected generated content: trim, dedupe,
   sort, exclude case-insensitive living names/ids and venue ids. This selection is a
   new historical name, never a deletion or reservation in the existing cast draw.
4. If every content name is in use, use a documented stable metadata fallback:
   `The unnamed witness`, then `The unnamed witness 2`, etc. until unused. Choose the
   first unused `departed:0`, `departed:1`, etc. id against living and venue namespaces,
   including reserved avatar/safehouse identities. These loops terminate because the
   blocked namespace is finite and each iteration advances a fresh integer suffix.
5. Store `reported` as the exact seven secret fields: subject/predicate/object,
   count:null, severity/place, attribution:SOMEONE. Store edge.from=secret.subject,
   edge.to and edge.kind from the chosen real edge. Do not include trust or hidden
   information beyond the approved relationship clue.
6. Call after existing generation sections and append `departed` to the returned town.
   No input object is mutated by this helper.

The proposed `departedProblems(town): string[]` helper should be shared by validation
and attachment. Omission returns []; null returns a named failure; otherwise check
identity noncollision, nonempty/unused name, exactly one real referenced secret,
exact reported-field match, living subject/edge endpoints, edge.from equals subject,
and matching actual directional edge kind. `validateTown` appends `departed-sane`
failures before graph checks. It must retain the original living-only witness check.

At attachment, validate the small metadata before building/mutating world state. In
the existing secret-mint loop, when `secret.id === town.departed?.secretId`, assign a
new RuntimeDeparted with explicit copied scalar fields, `{...reported}` and `{...edge}`,
and the existing minted `claim.id`. No extra claim, belief, witness or genesis event.
Test both directions of alias isolation: generated town mutation cannot alter runtime;
runtime/intel mutation cannot rewrite generated truth or other sessions.

## Candidate action module (source-mapped; not yet compiled)

This body assumes the type and provenance dependency above has landed. Shared sacred
venue recognition must be reused by the physical night-visit path, not re-spelled there.
The current venue model has no archetype field; public chapel grammar is `chapel` or
`chapel-<district>` and singleton `cathedral`.

```ts
import { minuteOfDay, type Tick } from '../core/time';
import { offeredVenueFor } from './actions';
import type { Circle } from './agents';
import { blankIntel } from './fieldwork';
import { canAfford, debitCoin } from './network/roster';
import { CONVERSATION_BEAT } from './rumors/propagation';
import type { Rules } from './rules';
import type { WorldState } from './types';

export interface SeanceAction { tick: Tick; kind: 'seance' }

export function isSacredVenue(id: string): boolean {
  return id === 'cathedral' || id === 'chapel' || id.startsWith('chapel-');
}

export function applySeance(
  world: WorldState, tick: Tick, rules: Rules, offered?: readonly Circle[],
): void {
  if (!Number.isFinite(tick) || !Number.isInteger(tick) || tick < 0
    || tick !== world.tick || tick % CONVERSATION_BEAT !== 0) {
    throw new Error('seance: requires the current finite conversation beat');
  }
  if (world.playerId === null || !world.npcs[world.playerId]) {
    throw new Error('seance: no player is enrolled');
  }
  const venue = offeredVenueFor(world, offered);
  if (venue === null || !world.venues[venue] || !isSacredVenue(venue)) {
    throw new Error('seance: requires a chapel or cathedral');
  }
  if (minuteOfDay(tick) >= 240) {
    throw new Error('seance: the dead speak before four in the morning');
  }
  const departed = world.departed;
  if (!departed) throw new Error('seance: no departed witness is recorded');
  if (world.seanceUsed) throw new Error('seance: the dead have already spoken');
  if (!world.claims[departed.claimId]) {
    throw new Error('seance: departed testimony has no recorded claim');
  }
  const price = rules.economy.seance;
  if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0) {
    throw new Error('seance: invalid price');
  }
  if (!canAfford(world, price)) throw new Error('seance: insufficient coin');
  const operation = `seance:${departed.id}`;
  debitCoin(world, price);
  world.seanceUsed = { operation, tick };
  world.intel.log.push({
    ...blankIntel(), tick, venue, via: 'seance',
    provenance: { kind: 'magic', spell: 'seance', operation },
    kind: 'utterance', overheard: false,
    claimId: departed.claimId, family: departed.secretId,
    reported: { ...departed.reported },
  }, {
    ...blankIntel(), tick, venue, via: 'seance',
    provenance: { kind: 'magic', spell: 'seance', operation },
    kind: 'edge-read', overheard: false,
    edgeFrom: departed.edge.from, edgeTo: departed.edge.to, edgeKind: departed.edge.kind,
  });
  world.chronicle.push({
    kind: 'seance', tick, operation, venue, departedId: departed.id,
    claimId: departed.claimId, edge: { ...departed.edge },
  });
}
```

This candidate still needs API verification of `debitCoin` before transcription; its
signature was not read before the restart. Validate-before-mutate tests must include
every refusal and hash the whole world immediately around applyAction, not around a
whole tick that lawfully continues autonomous work after a refused session action.

Required exact compile integrations:

- `EconomyDef.seance: number`; `STANDARD_ECONOMY.seance: 20`. Preserve Task 3 scry price.
- `campaign.ts`: import applySeance/SeanceAction, add union arm, require Rules, call
  `applySeance(world, action.tick, rules, frame?.circles)`.
- `app/src/loop/session.ts`: add seance to PlannedLocalActionKind and LOCAL_KINDS;
  `localParticipants` returns []; do not add it to SPEECH_KINDS. No composer in this task.
- `app/src/input/actions.ts`: `VERB_TERM.seance = 'verb-seance'`.
- Register `verb-seance`, `the-departed`, and `night-visit` as needed in TERMS without
  duplicating Task 3's magic source label. Tooltip says 20 coin, once, chapel/cathedral,
  before 04:00. Do not promise NPC testimony or create asset slots.

## Newly discovered risk defect and controller adjudication

Measured source facts at caa5a38:

- `counterintel.ts::noticedByObserver` rejects every presence observation.
- `directives/field-reports.ts::ingestEnemyItem` has no presence evidence arm.
- `phases.ts::recordAndIngest` skips captureEvidence on a silent tick.
- `fieldwork.ts` keeps player-side presence only for watch occupations. Its resulting
  Counter-Sketch watch label describes the observer seeing a guard, not the guard
  seeing the avatar. Asserting that row as chapel-avatar evidence is false.
- `enemyDigest`'s district-activity heuristic requires suspicious story-bearing
  speakers; a presence report does not feed it automatically.

The controller chose a mechanically consequential repair during authoring:

> Use the smallest direct/remote night-visit EvidenceEntry and fair-cop ref/chronicle
> sighting needed, reusing Task 3's widened physical-evidence pattern. Direct source
> must be a real local sighting; remote source the actual spoken report carrying visible
> actor/venue/time. A dedicated feature reads those evidence rows with pure digest
> imports unchanged. Dedupe per (kind,subject), like Task 2, rather than adding daily
> count pressure: ordinary exposure +1, no carrier-profile identification. Keep detection
> narrow to actual avatar chapel-night presence, independent of séance performed or
> hidden state. Explain the relation to the existing avatar caught-in-the-act scope.

Implementation must not create `EnemyState.nightVisits` alongside evidence. It must not
give a direct spymaster sighting a counterfeit network message. No synthetic watch,
identity, speaker, circle, report, schedule or immediate remote evidence is authorized.

Proposed narrow world-side `captureNightVisits(world, events)` executes alongside the
capture stage even for silent events, but immediately returns outside [00:00,04:00),
without a placed avatar in a real sacred venue, or without actual local observers.
It uses `observationsFor(observer, events)` to establish the encounter. It never reads
world.departed, seanceUsed, the action log, secret claims, or hidden spell state.
For a guard/asset: hold the real raw presence through `holdFieldObservation`, deduped
by actual encounter identity, then use the existing trait/candor field-report path.
Enemy knowledge changes only when the actual spoken report is perceived by the handler.
For a present spymaster: immediate real physical evidence plus an actual sighting
chronicle record, with no invented speech. Pure enemy digest emits `night-visit` once
per observed actor (subject), with resolvable direct/remote source references.

This is a disclosed narrow scenario law like the existing caught-in-the-act avatar
law. It is NOT implementation of the spec's general NPC anomaly-gossip machinery.
The no-magic byte promise needs a precise amendment: worlds without a chapel-night
avatar encounter keep their old bytes apart from generated departed metadata;
the same ordinary chapel-night visit can create evidence without a paid ritual.
Hiding this behavioral change behind a seanceUsed condition would be an oracle and
would contradict the approved event-local cause.

Task 3's current proposed speech capture guard is speech-present OR
`(events.residues?.length ?? 0) > 0`; retain it. A separate narrow captureNightVisits
call avoids broadening captureEvidence to every silent tick. Exact types/ref shapes,
deduping, receipt projection, and digest bodies remain UNAUTHORED; this is the principal
dispatch blocker, not a request for the worker to invent the code.

## Remaining exact tests and chunking to author

Use `frontier_implementer` for the integration/risk work; independent
`frontier_reviewer` (capability >= implementer), no children, serial source writer.
Split into roughly 45–90 minute scoped commit units:

1. **Historical metadata generation and attachment.** Exact helper/validator/attach code,
   generation tests, deterministic/null/reroll behavior. Tests: no living cast removal;
   no mutated witness list; every living belief store attaches; truthful seven fields;
   real subject-edge; name/id collision + exhausted names fallback; absent metadata
   byte identity; null/malformed metadata refusal; JSON/alias boundaries; same seed;
   new stream isolation against a captured prechange baseline. No guessed hash pin.
2. **Offered local action and session integration.** Complete the candidate above and all
   compile splices. Tests: success emits exactly two rows and one chronicle act, costs
   exactly 20, changes no beliefs/claims/counters/other magic state; correct operation;
   endpoints null; NPC named seance is distinct; board clusters but no fabricated
   routes/codex corroboration; once after later days/save load; all invalid preconditions
   leave world hash identical; finite/aligned/current tick; [0,240) boundaries with last
   legal beat 225; chapel/cathedral allowed, other/absent venue rejected. Frozen offered
   chapel/live elsewhere succeeds and offered elsewhere/live chapel fails, proving both
   directions and retaining frameless compatibility. No named participant requirement.
3. **Physical encounter and consequence repair.** After Task 3 physical types are verified,
   exact sighting/evidence/report/digest code and staged tests. A small hand-built town
   with actual guard, avatar, spymaster and nonoverlapping explicit schedules; never
   a generated fixture for timing mechanics. Run the real phase/session machinery:
   silent chapel encounter -> held observation while evidence/digest/exposure unchanged
   -> later actual guard/spymaster meeting -> spoken field report with actor/venue/time
   -> evidence -> one night-visit feature -> exposure +1, identified false. Assert stage
   local properties before later work masks them. Direct spymaster twin, no observer,
   observer elsewhere, daytime, ordinary unperformed-ritual visit, report omission,
   dedup repeated encounter/delivery, and clear fair-cop refs. No frame/position fabrication.
4. **Integration and independent verification.** Real `newSession`/requestLocalInteraction/
   chooseLocal/advance -> save -> loadSession at the same tick; log contains a successful
   seance action and live world, intel, coin and board results equal replay. A refused
   seance never enters the successful action log. Use generated session only for this
   session API test, with cathedral public at the first offered night beat; generated
   world data remains a premise requiring validation, not an emergent timer fixture.
   Full gates; complete soak/MC blocks vs verified dispatch baseline; independent review.

Every test body above still needs to be written. They are requirements, not executable
code. RED must fail at the intended missing behavior; negative controls must actively
exercise a nearby lawful case, not merely inspect an empty log. Do not call this plan
complete until those bodies and the risk mechanism code are present.

Final task commit subject: `feat: séance — the dead speak once, at night, for a price`.
Intermediate commits must remain scoped and independently green; no index ownership
until the controller dispatches a single implementer at an actually verified HEAD.

## Verification, compatibility, and escalation license

Authoring baseline is the controller's 1713 tests / 113 files at caa5a38. Future Task 2/3
commits will move it; do not pin this number as the future dispatch floor. Compare full
soak + MC output blocks, not selected familiar lines. Expect only isolated departed
metadata additions. A new `departed-sane` invalid draw may lawfully change reroll choice
only after proof and disclosed old/new attempt counts; investigate every existing
stream/content metric movement. Eight-seed sweep before any permitted re-pin. Never
change seeds, thresholds, invariants, formulas, or physics to rescue authored expectations.

Task 2's optional spoken document marker passes through ordinary utterance/report
projection. Séance is neither a document nor a counterfeit normal utterance: omit
the marker. Preserve every conditional Task 2 spread in any later touched report code.
Preserve Task 3's residue guard and physical source refs; verify its tests and the explicit
magic-provenance helper exports before final dispatch.

No new dependencies, lint config, UI composers, broad world clones, NPC mind edits,
secret witness edits, or unlicensed production files. Small copied metadata is permitted;
cloning an entire state per tick or observation is not. No shared AI memory edits.
No worker push, third-party binary loading, UI automation, process control or children.

Emergent-behavior assertions are hypotheses. Failing acceptance -> STOP and report with
evidence; never weaken the mechanism or edit the spec. Untraceable existing-suite failure
-> BLOCKED. Reviewers grade plan-mandated defects at full severity; authorship is not
evidence of correctness. Suite count may only rise without a per-test disposition table.

Reusable-work check: this task is game-specific; no new skill or script is warranted.
Reuse the existing generated-metadata, offered-frame, and physical-report patterns.
Deferred: ritual composer -> Plan 10; generalized NPC anomaly gossip -> separate approved
design/task; debrief rendering -> Plan 9 Task 5/6, consuming the explicit operation records.

Author self-audit so far: original dangling living-witness mutation rejected; generation
runtime loss closed in proposed shape; provenance identity collision addressed through
Task 3 seam; absent-state and copy boundaries explicit; fabricated risk assertion rejected;
silent-tick and direct-spymaster gaps named; consequence selected by controller. Complete
syntax/API, test, invariant, and bottom-up self-review remain unfinished at interruption.
