# Plan 9 remaining-task audit — 2026-09-05

## Review result

Tasks 2–8 are not executable as one continuous implementation plan against the current source. Task 2's separately authored brief is dispatch-ready after one bounded production-license correction, its base placeholder is filled, and the expected Task-1 dirty files are reconciled. Tasks 3, 4, and 5 require authoring before dispatch. Task 7's rendering foundation must precede Task 6, and Task 8 must be rewritten around the real victory quorum and a debrief model that exposes the already-recorded report divergence.

This is a plan audit, not an implementation approval. I inspected the repository at `49cc3e7a83f...` with the two disclosed Task-1 test modifications present. I made no production or test edits. Per the audit brief, I did not run the full suite; the controller owns baseline gates during Task-1 recovery.

## Confirmed findings

### 1. Critical — plan-mandated: Task 5's proposed folds omit retained report history and lack stable joins for the full causal view

**Plan claim.** Task 5 says three pure folds can read the substrate already recorded, with “no new recording,” and models a `Thread` as rumor-family injection/telling hops (`docs/plans/archive/2026-07-05-plan-9.md:109-137`). The governing design requires **every operation** end-to-end, every mutation and mind, what landed or died, what became enemy evidence, an honest sketch calendar, and a v1 causal substrate even for deferred views (`docs/design-spec.md:79-89`).

**Current evidence.**

- `ChronicleEntry` contains several operation families, including institution, vignette, network speech, and artifact records (`src/sim/types.ts:144-153`), but the proposed `Thread` can represent only `family`, `claimId`, teller, and hearer. It has no representation for directives, recruitment, couriers, artifact custody, magic, institutional action, or report delivery.
- An artifact viewing mints a fresh claim/family in `deliverDocument`, then appends a separate artifact record (`src/sim/artifacts.ts:149-156`, `src/sim/artifacts.ts:200-212`, `src/sim/artifacts.ts:229-262`, `src/sim/artifacts.ts:419-472`). `ArtifactRecord` stores artifact/by/to but no `claimId` (`src/sim/types.ts:144-151`). The fold cannot join a specific show/pickup/reshow to the claim it caused without inference.
- Remote destination rows are backdated: player intel and enemy evidence store `tick: observation.observedAt` (`src/sim/directives/field-reports.ts:329-405`). **Follow-up correction:** receipt chronology and the delivered report copy are not absent from all state. Each `NetworkSpeechRecord` retains the speech tick, speaker, addressee, message id, and complete spoken field-report items (`src/sim/types.ts:122-131`; `src/sim/directives/types.ts:265-289`; `src/sim/phases.ts:510-518`). `HeldFieldObservation` and `NetworkMessage` also retain `deliveredAt` (`src/sim/directives/types.ts:312-319`, `src/sim/directives/types.ts:379-394`; `src/sim/directives/transport.ts:612-630`). A correct Task 5 fold can derive final receipt time from the final field-report speech instead of filtering destination rows by their backdated `tick`. The plan does not specify that fold and would be wrong if implemented over `IntelEntry.tick`/`EvidenceEntry.tick` alone, but no `receivedAt` production field is required merely to recover final receipt chronology.
- Plan 8's canary lesson is also retained twice: in the reported copies in `world.intel.log` and in the final field-report `NetworkSpeechRecord.spoken.items`. The existing e2e test proves the loyal and turned channels report different count/severity and omit different observations (`tests/network/canary-turncoat.e2e.test.ts:64-142`). Thus the terminal divergence is derivable without new recording by grouping final field-report speeches by reported claim/family and comparing their delivered copies. The proposed rumor-claim `Thread` still has nowhere to represent or diff those report projections.
- The remaining recording gap is narrower and exact: per-item identity across **multiple report relays** is not durably recorded in the chronicle. `HeldFieldObservation` has `rootFingerprint`, and the mutable network payload pairs each current rendered item with that root (`src/sim/directives/types.ts:379-394`, `src/sim/directives/types.ts:233-240`). At every hop, transport overwrites `payload.renderedItems` with the newest projected/possibly omitted list while preserving roots internally (`src/sim/directives/transport.ts:179-190`, `src/sim/directives/transport.ts:246-254`). The spoken field-report payload and its chronicle row retain only item content, not root fingerprints (`src/sim/directives/types.ts:285-289`; `src/sim/phases.ts:510-518`). After another relay transforms or drops an item, final state preserves only the latest root-to-item map. If two source items are content-identical, or one disappears at a later relay, an earlier chronicle item cannot be joined uniquely to its source root. Whole-message `messageId` does not resolve this item-level ambiguity. Therefore “every mutation with the mind that caused it” is not structurally provable for arbitrary multi-hop reports without one small association record.

**Next action.** Author the corrected folds and the narrow identity repair required by the chosen v1 scope. At minimum:

1. Add stable correlation from each artifact act/viewing to the minted claim/family. The smallest reversible change is optional `claimId` on applicable `ArtifactRecord` rows, emitted at the mint site and absent on untouched worlds. `deliverDocument` does mint immediately before its caller appends the artifact row (`src/sim/artifacts.ts:149-156`, `src/sim/artifacts.ts:200-212`, `src/sim/artifacts.ts:229-262`, `src/sim/artifacts.ts:443-470`), so a global complement/order derivation is conceivable: subtract claim ids referenced by non-artifact chronicle rows, sort the remaining roots by numeric claim id, and align them with claim-producing artifact acts. That is not a currently proven invariant. Claims carry no mint tick; classifying a `plant` row as venue placement versus handover is ambiguous when one string exists in both NPC and venue namespaces; same-content papers defeat content matching; and avatar-targeted reshow mints no claim (`src/sim/artifacts.ts:318-339`, `src/sim/artifacts.ts:466-471`). Do not make the debrief depend on global negative inference over every mint site. Record explicit `claimId`, using null for non-view/avatar-targeted acts.
2. For final receipt chronology and turncoat divergence, use the retained final `network-speech` chronicle rows; do not add duplicate `receivedAt` fields solely for Task 5. Build historical player knowledge from immediate/self rows plus final field-report speech items available at `speech.tick`, excluding the backdated remote destination duplicates.
3. If the required “every mutation with the mind” includes intermediate field-report relays, add an optional, non-knowledge root-association vector to the chronicle speech record (or an equivalent append-only report-projection record). Populate it beside the projected items at each hop. This is association metadata permitted by the speech-only law; it must not alter what a principal learns. Avoid adding it if v1 deliberately shows only original observation versus final delivered copy.
4. Define a general operation/report-lineage model that covers speech, paper, directives/couriers, magic, and the altered report copy. If v1 scope is intentionally narrower than “every operation,” amend the design explicitly; do not silently call rumor threads complete.
5. Write substrate/fold tests before UI tests: an artifact row resolves to its minted claim or explicit null; a delayed report is absent from a day-N knowledge snapshot until its final chronicle speech; two channel copies preserve the canary divergence; and, if intermediate relay mutations are in scope, duplicate-content/omitted-item twins resolve by root identity rather than content matching.

### 2. Critical — plan-mandated: Task 3 teleports enemy knowledge and names a digest path that cannot consume residue

**Plan claim.** Scrying directly appends `arcane-residue` to enemy evidence even when no guard is present, then says heuristic 3 will treat it as district activity (`docs/plans/archive/2026-07-05-plan-9.md:87-94`).

**Governing conflict.** Remote observation changes no principal knowledge until a physical field report reaches a handler (`.superpowers/sdd/plan11-constraints.md:27-33`), and spoken projection is the complete knowledge-bearing content (`.superpowers/sdd/plan11-constraints.md:34-41`). The enemy digest must remain a pure consumer of enemy state rather than look into world traces (`.superpowers/sdd/plan11-constraints.md:93-96`; `.superpowers/sdd/plan8-constraints.md:31-40`).

**Current evidence.** `EvidenceEntry` is a closed union of utterance, asking, and network evidence and requires an observer/speaker-shaped evidence base (`src/sim/enemy/state.ts:64-78`). Heuristic 3 does not consume arbitrary district evidence: it first builds suspicious **rumor families** from damaging reported predicates and then requires at least two story-bearing speakers for that family in one district (`src/sim/enemy/digest.ts:204-251`). A residue row with no speaker, family, or reported claim cannot enter that path. Appending it at ritual time would also tell the enemy a remote fact before any patrol found and reported it.

**Next action.** Re-author Task 3 around two separate lawful channels:

- Scrying is a direct, explicit player magic sensor over the live tick event bundle. It reads only the named venue/window as events occur and never reads chronicle or hidden world state retrospectively.
- Residue is a persistent physical world trace. It becomes enemy knowledge only after an actual observer encounters it and that observer's ordinary physical report is spoken to the spymaster. The spoken projection must name only lawfully observed facts.
- Give the digest a dedicated, fair-cop residue rule and resolvable report reference, or decide that residue affects a later operation without becoming a sketch feature. Do not route it through rumor heuristic 3 and do not synthesize a guard identity for a patrol that never occurred.
- Clarify “residue lands regardless of outcome” as “after a valid, paid scry action regardless of useful captured content.” Validate before mutation; invalid actions must leave no cost, window, or residue.

### 3. Important — missing source seam: scrying has no lawful venue-sensor API and its proposed provenance aliases an NPC id

**Current evidence.** The only perception entry point is `observationsFor(observer, events)`. It looks up `events.positions[observer]` and yields speech only when the observer is a member of the recorded conversation circle (`src/sim/perception.ts:57-99`). A synthetic `'scrying'` entity would therefore see nothing unless code falsified positions/circle membership. `captureIntel` is the correct current capture stage (`src/sim/fieldwork.ts:98-143`; `src/sim/phases.ts:486-567`), but it has no magic coverage input.

`IntelEntry.via` is declared as `'self' | 'dossier' | EntityId` (`src/intel/entry.ts:37-40`). Since `EntityId` is a string, adding `'scrying' | 'seance'` does not create a discriminated provenance type. Existing consumers treat every non-self value as a carrier/informant: `webView` derives a carrier from `via` (`src/intel/web.ts:74-90`), and the app classifies every value except self/dossier as a single channel (`app/src/main.tsx:74-83`). Magic would be mislabeled as an NPC report and could participate in channel/corroboration UI incorrectly.

**Next action.** Author an explicit venue-observation function over `TickEvents` (or a scoped sensor argument to capture) with a test that it returns only events in the scheduled venue/window. Replace or wrap the string union with provenance that distinguishes self, dossier, informant id, scrying, and séance; update every grouping/badge/corroboration consumer. Pin that magic channels never become network carriers and never count as independent informant corroboration unless the design affirmatively chooses that rule.

### 4. Important — plan-mandated: Task 4's departed witness cannot survive generation-to-runtime attachment

**Plan claim.** Generation adds a departed id to a real secret's witness list; the séance later resolves truthful testimony from `GeneratedTown.departed`, plus an edge-read about the subject (`docs/plans/archive/2026-07-05-plan-9.md:98-105`).

**Current evidence.**

- `GeneratedTown` ends at fixture/district/keystone/guard/secret/dossier/cast data and has no departed field (`src/world/types.ts:113-122`). More importantly, runtime session construction converts the generated town to `WorldState` and does not retain the town (`app/src/loop/session.ts:111-115`). The séance action executes against `WorldState`; a generation-only field would be unreachable.
- `worldFromTown` seeds each secret witness through `world.beliefs[witness]!` (`src/world/attach.ts:44-57`). A departed id that intentionally collides with no living NPC has no belief store, so the planned witness-list mutation makes attachment fail.
- Validation currently requires every secret witness to be a living NPC and rejects unknown witnesses (`src/world/validate.ts:139-149`). Merely adding a `departed-sane` check does not reconcile that invariant.
- The promised edge-read is undefined: a nonliving id has no NPC edges in the runtime graph. “Name struck from the cast” is also ambiguous about whether generation removes an otherwise live NPC, which would risk dangling schedules, edges, cast, and scenario references.

**Next action.** Re-author the departed as its own lazy/runtime-safe record, not a living witness id. A minimal reversible design is `WorldState.departed?` carrying display name, a stable claim/secret reference, and one explicitly grounded clue copied from valid generated data. Keep `Secret.witnesses` living-only. Define whether the departed is newly generated metadata or selected from an excluded pre-cast candidate; never remove a member after graph/cast construction. Add generation, validation, attach, serialization, replay, and no-dangling-reference tests.

Also define séance action placement. It is location/time bound and must validate the avatar's frozen offered venue/window under the offer/execution law (`.superpowers/sdd/plan11-constraints.md:58-67`). `LocalActionKind` is an exhaustive selected union and `localParticipants` has an exhaustive switch (`app/src/loop/session.ts:17-26`, `app/src/loop/session.ts:88-108`). The likely seam is a local action with zero named participants, but that is an authoring choice. The risk test must assert a guard's local observation is held and later physically reported, not immediate enemy evidence.

### 5. Important — plan-mandated: Task 5's overlay has no defined match relation

**Plan claim.** The overlay lists counter-signal keys, actual feature ids, “phantoms” with no matching feature, and lag as actual count minus matched count (`docs/plans/archive/2026-07-05-plan-9.md:124-137`).

**Current evidence.** Counter-sketch keys and enemy feature ids are different namespaces. Questioning signals key by `f:<family>` or `s:<subject>`, watch signals by `<actor>@<venue>`, and compelled-answer signals by asker (`src/intel/countersketch.ts:26-73`). Actual feature ids are generated opaque `sfN` ids; features instead carry kind/family/subject/district (`src/sim/enemy/digest.ts:193-198`; `src/sim/enemy/state.ts:93-103`). Equality between `knownSignalKeys` and `actualFeatureIds` cannot express “matching.” One observed watch can also correspond to an order/action rather than a feature that landed that day.

**Next action.** Author and test an explicit relation for each signal kind, using stable semantic fields or the enemy action ledger rather than `sfN` equality. Define cardinality: whether several observations of one watch match one actual order, whether an asking matches a family lead or issued inquiry, and how compelled answers map to a landed feature. Compute phantom/lag from this relation. State whether timeline cards show newly landed features (`EnemyDecision.features`) or the cumulative sketch; current decisions log only the nightly output (`src/sim/enemy/state.ts:135-175`).

### 6. Important — plan ordering and stale fence amendment: Task 6 depends on Task 7 and asks for a redundant ESLint edit

**Plan evidence.** Task 6 renders Task 7 prose templates but appears before Task 7 (`docs/plans/archive/2026-07-05-plan-9.md:141-163`). Task 6 also says to append `**/sim/debrief/**` to the panels-law ban (`docs/plans/archive/2026-07-05-plan-9.md:148`). The existing panels-law already bans the broader `**/sim/**` pattern for all panel/town sources (`eslint.config.js:87-98`). Adding a narrower duplicate does not extend the fence or prove anything new.

**Next action.** Split/reorder the work:

1. Task 7A: implement and exhaustively test `renderClaim`, predicate templates, channel labels/terms, and required slots; migrate existing reported-claim reading lines.
2. Task 5: implement the corrected substrate/folds.
3. Task 6: build terminal-only, props-fed panels consuming plain app view types and Task 7A rendering.
4. Task 7B, if needed: finish debrief-specific terms/slots as part of Task 6 rather than a forward dependency.

Do not change `eslint.config.js` for the debrief import ban. Keep new panel files under the existing panel glob and add a firing/source proof that a representative `src/sim/debrief` import is rejected by the existing rule. The runtime gate needs a behavioral proof that debrief folds are not invoked and no debrief prop is produced while status is running; a source scan alone does not prove reachability.

The current terminal branch occurs before running-world view-model construction (`app/src/main.tsx:208-215`), and `EndingScreen` currently receives status only (`app/src/main.tsx:90-105`). This is a feasible single composition-root gate. Use terminal-local tabs so no running `UIAction`/panel union needs a debrief arm.

### 7. Important — Task 8's forger arc does not meet the actual Coronation victory condition

**Plan claim.** The e2e expects a singular council member anchored at `>= 0.97` to produce a win (`docs/plans/archive/2026-07-05-plan-9.md:167-176`).

**Current evidence.** Coronation requires quorum 2 (`src/content/scenarios/coronation.ts:3-9`). The scenario adjudicator counts distinct council members, so one anchored member cannot win. Artifact auto-reshow is deliberately once per holder, so a non-council carrier cannot by itself anchor two council members through repeated reshow (`src/sim/artifacts.ts:406-408`).

**Next action.** Rewrite the e2e to reach two distinct council turns by real mechanisms. A stable route can make the first recipient a council member who then re-shows once to another council member, or combine one direct player show with one later handoff/reshow. Assert quorum membership and both belief thresholds before asserting status. Clarify “without a single tell in guard earshot” to “without a **player** tell/inject in guard earshot”; autonomous NPC retellings are emergent and must not be banned by the acceptance claim.

The mirror run remains a hypothesis. It must construct a family/holder/interrogation path that reaches a compelled answer and digest; if it reaches 0-of-N, stop under the plan's escalation law rather than widening interception or fabricating evidence (`.superpowers/sdd/plan11-constraints.md:123-128`).

### 8. Important — Task 8's canary debrief assertion is unreachable from the current proposed Thread model

**Plan claim.** Run the existing canary-vs-turncoat scenario to an ending and show the doctored divergence in Thread View (`docs/plans/archive/2026-07-05-plan-9.md:172-174`).

**Current evidence.** The existing “e2e” is a staged mechanism test. It calls `captureIntel` directly, manually realizes field-report speech, and never attaches or reaches a terminal scenario (`tests/network/canary-turncoat.e2e.test.ts:64-142`). Its lesson is in two `IntelEntry.reported` values and omission patterns. The Task 5 `Thread` interface reads claim lineage and enemy evidence indexes, not report versions (`docs/plans/archive/2026-07-05-plan-9.md:116-123`).

**Next action.** After the corrected Task 5 model, add an operation/report-lineage view that includes authored/observed/reported versions and derives delivery times from final report speeches. Then write a terminal scenario test through the session/phase API or a deliberately staged terminal-world fold test. Name which layer it proves: engine reachability, ending gate, or DOM rendering. Do not relabel the current direct-capture test as terminal reachability.

## Task-by-task dispatch disposition

| Task | Disposition | Required amendment |
|---|---|---|
| 2 — Forensics | **Ready after bounded brief correction + controller base fill** | Use `.superpowers/sdd/task-2-brief.md`, not the stale paragraph in the original plan. License the marker's complete perception projection, then replace `<FILL AT DISPATCH>` after Task-1 recovery and dispatch only from the reverified clean HEAD. |
| 3 — Scrying | **Author before dispatch** | Define the live venue sensor, phase placement, provenance, lazy state, physical residue discovery/report path, and dedicated digest semantics. |
| 4 — Séance | **Author before dispatch** | Define runtime departed substrate, generation semantics, grounded clue, offered-frame/local action behavior, provenance, and delayed risk-report test. |
| 5 — Debrief models | **Author before dispatch; targeted identity repair only where proven** | Derive receipt chronology/report copies from final network-speech records; add stable artifact correlation; add per-hop report root association only if intermediate relay mutations are v1; widen “thread” beyond rumor claim lineage; define overlay matching. |
| 7A — Prose foundation | **Amend, then dispatch before Task 6** | Implement exhaustive render templates and migrate existing reported-claim reading lines. Magic vocabulary waits for Tasks 3/4 decisions. |
| 6 — Debrief UI | **Blocked on corrected Task 5 + Task 7A** | Use the existing panel fence, terminal-only composition-root fold, props-only panels, and behavioral non-reachability test while running. |
| 7B — Debrief vocabulary/assets | **Fold into Task 6 or finish after it** | Register exact debrief surface terms/slots without duplicating conceptual rows already present in `docs/asset-slots.md`. |
| 8 — E2E/closeout | **Blocked on Tasks 2–7** | Require two council turns; build a real interrogation path; expose retained report divergence in the debrief selector; separate engine, gate, and rendering proofs. |

## Task 2 executable brief: verified seams and tests

The authored Task 2 brief repairs the stale original Task 2 assumptions and otherwise matches the current architecture. In particular, it keeps `enemyDigest` a pure fold with no new imports, learns paper only from an observed compelled answer, allows trait-mutated spoken attribution, excludes watched-holder forensics, suppresses anonymous/self attribution, and dedupes per `(kind, subject)` with fair-cop refs to answer rows (`.superpowers/sdd/task-2-brief.md:33-101`). These are adopted P9-5 decisions, not open forks.

There is one confirmed brief-completion defect before dispatch. `Utterance` and the utterance arm of `Observation` are separate shapes (`src/sim/perception.ts:5-14`, `src/sim/perception.ts:38-45`), and `observationsFor` reconstructs an observation field by field (`src/sim/perception.ts:69-75`). The brief's production license allows `src/sim/perception.ts` only for “the optional `document` field on `Utterance`” (`.superpowers/sdd/task-2-brief.md:134-140`). Following that literally drops the marker before `ingestEnemyObservation` can project it into evidence (`src/sim/counterintel.ts:36-46`). Amend the license to allow `document?: true` on both `Utterance` and the utterance `Observation` arm, plus a conditional projection in `observationsFor`; the key must remain absent when false.

The delayed path needs the same explicit chain: optional marker on `ReportedFieldObservation` (`src/sim/directives/types.ts:204-209`), conditional copy in `rawReportedObservation` (`src/sim/directives/field-reports.ts:139-152`), unchanged conditional pass-through after trait projection (`src/sim/directives/field-reports.ts:207-219`), and conditional copy into the evidence row (`src/sim/directives/field-reports.ts:369-383`). These files are already licensed by the brief, but the test matrix should name each boundary.

No `phases.ts` edit is needed. `chooseAnswer` results are pushed as the same object (`src/sim/phases.ts:224-227`); the extra-intent normalization uses object spread, which preserves the marker (`src/sim/phases.ts:248-258`); direct and autonomous answer arrays flow into the tick utterance collection (`src/sim/phases.ts:430-433`, `src/sim/phases.ts:475-483`); and `TickEvents` retains those utterance objects (`src/sim/phases.ts:617-636`). Add phase-level tests for both ordinary and direct/handler-relevant answer production so a later reconstruction cannot silently drop the marker.

The implementer should use these exact seams:

1. In `chooseAnswer`, add an optional `document: true` to the answer utterance iff the selected belief's credence is above `HEARSAY_CEILING`. Omit the key everywhere else.
2. Carry the spoken marker through `Utterance` → `Observation` → direct enemy evidence and through `ReportedFieldObservation` → projected report → delayed enemy evidence. Every reconstruction uses a conditional property so untouched shapes remain byte-identical. Report traits may alter claim fields; the medium marker remains the content that was spoken.
3. Add `'forged-document'` to `SketchFeature.kind` and a pure digest rule over compelled-answer evidence. Use spoken attribution as subject, reject `SOMEONE` and self-attribution, dedupe per kind/subject, and use existing `ref(e)` references.
4. Cover existing kind-agnostic consumers without special-casing them: exposure scoring, turncoat identification inheritance, and weekly walk-in reveal order.

Required acceptance tests, in addition to the brief's named suites:

- `observationsFor` preserves a true marker and omits the key on an ordinary utterance; direct spymaster observation and delayed non-spymaster report produce equivalent document-marked evidence only after lawful delivery;
- hearsay answer has no own `document` property; untouched/no-forge serialization stays byte-identical;
- interrogated first recipient names the spoken hand; a later holder reveals only one hop; trait-mutated attribution controls the result;
- `SOMEONE`, self-source venue pickup, and un-interrogated circulation produce no feature;
- repeated qualifying rows for one spoken subject produce one feature with deterministic, resolving refs;
- player or informant subject raises exposure through the existing generic key path while carrier-only `identified` behavior remains unchanged;
- no-omniscience import allow-list and fair-cop audit pass unchanged.

After the bounded perception-license correction, the remaining dispatch blocker is operational: `.superpowers/sdd/task-2-brief.md:4-7` still contains `<FILL AT DISPATCH>` and requires exact HEAD plus a clean tracked tree. Fill it only after the disclosed Task-1 recovery completes.

## Task 7 migration surface

The plan's phrase “wherever `reported` renders” needs an explicit inventory. At minimum, raw token prose currently appears in `app/src/panels/EvidenceBoard.tsx:53-69` and `app/src/panels/Directives.tsx:118-121`; Day Planner constructs structured reported claims at `app/src/panels/DayPlanner.tsx:102-116`. Preserve structured fields for inspection/tooltips while using `renderClaim` as the reading line. Add an exhaustive test keyed by the actual predicate registry rather than only asserting the current count 24, so adding a predicate without a template fails.

Adding `scry` and `seance` to the engine action union will also force action-label registration because `VERB_TERM` is exhaustive in `app/src/input/actions.ts:59-79`, even though Plan 10 owns action composers. That registration is engine/UI plumbing, not permission to add composers early.

## Hypotheses requiring measured tests

- A staged artifact route will autonomously reshow from one council member to a second within the remaining campaign clock. Treat the seed/route as a hypothesis and stop on 0-of-N.
- A staged holder will be interrogated soon enough for the Task 8 mirror run to reach a compelled answer and nightly feature. Test the exact family/subject prerequisites before relying on it.
- A chapel night visit will overlap a guard's real local observation and later report. The present plan's “tavern-evening override” does not establish a 00:00–04:00 collision by itself.
- A scry window can be executed in phase 2 and consume phase-4 tick observations without capturing earlier events from the same tick. The author must pin the phase boundary and prove it with adjacent-window twins.

## Design forks for controller authoring

These choices are local and reversible; they should be decided in authored briefs rather than left to implementers:

1. **Residue lifetime/discovery:** one persistent venue trace until first lawful patrol report, or a bounded trace with explicit expiry. Recommended default: persistent until first report, then latched, because the plan promises forensics and deterministic discovery without background probability.
2. **Departed generation:** independent historical metadata versus a rejected pre-cast candidate. Recommended default: independent metadata copied into lazy `WorldState.departed`; it avoids deleting graph nodes and preserves existing cast/soak behavior.
3. **Séance clue:** copied relationship fact, schedule/place fact, or another registered clue. Recommended default: one valid subject-edge fact selected deterministically at generation, stored as data, because runtime cannot derive an edge from a nonexistent departed NPC.
4. **Thread scope:** rename the current rumor lineage to “story thread” and add operation/report views, or widen one general `Thread` algebra. Recommended default: typed operation threads with rumor, artifact, network/report, and magic variants under one debrief selector; it satisfies “every operation” without flattening unlike records.
5. **Overlay matching:** match perceived signals to actual features versus to actual enemy orders/actions. Recommended default: match questioning/watch signals to issued/action-ledger records and compelled-answer signals to evidence/feature outcomes, then display both “attention was real” and “feature landed.” A single feature-id comparison cannot express both.

## Verification boundary

Read-only inspection covered the Plan 9 archive end-to-end; the authored Task 2 brief and premises report; design debrief/evidence laws; backlog; Plan 7/8/11 constraints; current action/session/perception/reporting/evidence/digest/artifact/generation/debrief-adjacent/UI sources; and the existing canary e2e. No network, process control, third-party binary loading, test execution, production edit, test edit, commit, or push was performed.
