# Native Task 4 séance plan review

**Status: COMPLETE (2026-09-05). Verdict: Approved-for-base-reconciliation**, conditioned on the exact Task 4 amendments T4-A1 and T4-A2 below being placed in the dispatch brief. T4-A1 closes one **Important, plan-mandated** fair-cop omission in the frozen proposal. T4-A2 removes a **Minor** execution ambiguity. No Critical finding was found. This is a plan review; it does not certify an implementation.

Reviewer: native Codex, independent bounded read-only review. I changed only this report. I did not edit source, tests, plans, frozen author artifacts, indexes, prior interrupted reports, or documentation; I made no external call and used no child agent.

## Bound artifact and stage

- Draft: `.superpowers/sdd/task-4-author-draft.md`, SHA-256 `14ABA1730FF43696C17D0D81D293C6B96E2065F7B2DE83BD91F1515C4D8EE005`, 87,286 bytes.
- Author report: `.superpowers/sdd/task-4-author-report.md`, SHA-256 `A0200BFED039582714BC9AB96B9B9793553C0A41ED0ADFBAB61FFBF70F0E84F0`, 7,945 bytes.
- Production/test source remains at `dc114da3006a75115784e4e894e880dd113226f5`; later HEAD is documentation-only. No Task 3 or Task 4 magic implementation is assumed.
- Task 3's operative predecessor proposal is `.superpowers/sdd/task-3-author-draft.md` at SHA-256 `EBACFF982443BA604006D33CE62F5AD9AA11D95FE08E4C3DA70DB523A91176ED` plus binding amendment A1 in `.superpowers/sdd/task-3-base-reconciliation.md:1-64`. The Task 4 draft's older `16655291...` identity at `task-4-author-draft.md:1226` is historical input, not a dispatchable predecessor identity.
- The saved external Claude launcher remains unavailable until `2026-09-06T05:00:00Z` (`task-4-plan-review-resume-brief.md:3`), but the native supplement explicitly supersedes that provider deadline for this thread (`task-4-native-plan-review-2026-09-05.md:3-10`). It does **not** gate native review or implementation. The independent Task 2/R15 review has since returned **Needs-fixes** (0 Critical/1 Important/0 Minor) for H10 retaining an invalid original-answer ref after a two-hop field report. Root owns that bounded fix and the resulting actual-base reconciliation; this review remains bound to the unmodified `dc114da` snapshot. Implementation of the certified Task 3 base also remains outside this review.

## Findings

### Important 1 — a copied night-visit runaround can lose its marker and borrow an ordinary asking

**Proposed behavior.** A real subjectful `night-visit` feature can become a lead (`task-4-author-draft.md:904-917`). The real runaround consumer copies that lead's refs (`:920-927`; current consumer seam `src/sim/enemy/digest.ts:358-366`). Task 4 correctly adds night-visit identity to `sameRefs` after preserving Task 3's residue identity (`task-4-author-draft.md:889-901`), and it correctly deep-copies both optional nested physical markers (`:920-927`).

**Omission.** The permanent auditor guards a missing marker only when `feature.kind === 'night-visit'` (`:934-978`). A copied ref now belongs to a feature whose kind is `runaround`, so deleting `ref.nightVisit` bypasses that guard. Both speech IDs remain null. The legacy auditor then resolves by tick/observer/null IDs and treats the ref as asking evidence; the current exact path is visible at `tests/sim/helpers/forensics-audit.ts:10-38`, and Task 3 deliberately preserves that lawful asking path while excluding physical evidence from its finder. The direct missing-marker fault at `task-4-author-draft.md:1188-1210` only corrupts a `night-visit` feature, so it proves the direct guard but cannot catch the copied-feature seam. The runaround comparator test at `:1152-1174` exercises equality and copy isolation, not `auditSketch` on a stripped derived runaround.

**Failing scenario by trace.** Start with the draft's actual delivered night-visit chain, obtain the actual `night-visit` lead and an `enemyDigest`-produced runaround using the existing staged worked-night vehicle, and add that runaround to `world.enemy.sketch`. Stage the same lawful ordinary asking twin used by the direct fault at the copied ref's tick and observer. The intact runaround audits through its physical branch. After deleting only the runaround ref's `nightVisit`, the frozen proposed auditor finds the asking `EvidenceEntry` and asking chronicle row and returns successfully. The causal trail on the runaround has been erased, but the fair-cop gate is green.

**Mandate and severity.** The design requires every sketch feature to carry a causal observation chain (`docs/design-spec.md:205`), and the review brief explicitly charges this exact copied-physical-reference collision (`task-4-plan-review-resume-brief.md:23-31,45-49`). This is **Important, plan-mandated**. It corrupts a required proof boundary rather than production physics itself.

#### T4-A1 — required additive dispatch amendment

In the permanent auditor, make this the canonical per-ref order:

1. Task 3 residue-feature marker precondition.
2. Task 4 night-visit-feature marker precondition.
3. The bounded runaround/null-ID physical-marker precondition below.
4. Night-visit value branch.
5. Residue value branch.
6. Legacy claim/network/asking path.

This refines the order recorded at `.superpowers/sdd/task-3-base-reconciliation.md:60-64` so every feature-kind precondition runs before either value branch can `continue`:

```ts
if (feature.kind === 'runaround' && ref.claimId === null && ref.messageId === null) {
  expect(ref.residue ?? ref.nightVisit,
    `runaround ${feature.id} null-id ref lacks its physical marker`).toBeDefined();
}
```

The condition is deliberately narrow. It does not prohibit ordinary null/null asking refs on `entry-point` or other legacy feature kinds. At `dc114da` plus the Task 3/4 proposals, no lawful subjectful lead mints an ordinary null/null asking ref; Task 3's recovered review traces that inventory at `.superpowers/sdd/task-3-recovered-plan-review.md:102-107`. The existing physical branches still reject dual markers and wrong speech IDs.

Add three causal tests in the licensed 4C2 auditor/consumer files:

1. Use the real `enemyDigest` runaround consumer and the existing delivered-night-visit/worked-night fixture. With an asking twin at the copied ref's tick/observer, the intact derived runaround passes; deleting only its nested `nightVisit` must throw the new missing-physical-marker diagnostic.
2. Change an otherwise valid night-visit feature's kind to `arcane-residue` while retaining its valid `nightVisit` ref. It must fail the residue-feature marker precondition before the night-visit value branch.
3. Symmetrically change an otherwise valid Task 3 residue feature's kind to `night-visit` while retaining its valid residue ref. It must fail the night-visit-feature marker precondition before the residue value branch.

Those controls prove both the copied seam and the required dispatch order. Merely reusing the direct missing-marker test does not.

#### Unexecuted proposed T4-A1 test additions

The following code is a bounded proposal for root/4C2 transcription and execution. It uses the frozen draft's existing imports and fixtures. It has not been compiled or run.

Append in the second `describe` of the proposed `tests/sim/night-visits.test.ts`, using its existing `delivered`, `features`, `enemyDigest`, `cloneSerializable`, `runUntil`, `R`, and `auditSketch` bindings:

```ts
it('a copied night-visit runaround cannot borrow an ordinary asking after its marker is stripped', () => {
  const world = delivered();
  const lead = enemyDigest(world.enemy, 0, R).features.find((row) => row.kind === 'night-visit');
  if (lead === undefined) throw new Error('test needs a night-visit lead');

  world.enemy.sketch = [lead];
  world.enemy.featureCounter = 1;
  world.enemy.actionLedger = [{
    orderKey: 'watch:d0', kind: 'watch', directiveIds: ['d-test'], leadFeatureId: lead.id,
    subject: 'you', about: { subject: 'you' }, district: 'd0', scheduleStartDay: 1,
    posts: [{ guard: 'guard', venue: 'square' }], workedDays: [1, 2], askedAt: null,
  }];

  const runaround = enemyDigest(world.enemy, 3, R).features.find((row) => row.kind === 'runaround');
  if (runaround === undefined) throw new Error('test needs the real runaround consumer');
  const ref = runaround.evidence[0]!;
  expect(ref).toMatchObject({ tick: 0, observer: 'guard', claimId: null, messageId: null });
  expect(ref.nightVisit).toBeDefined();

  // A lawful ordinary asking shares the copied physical ref's legacy lookup key.
  world.enemy.evidence.push({
    kind: 'asking', tick: ref.tick, venue: 'chapel-d0', observer: ref.observer,
    speaker: 'ada', addressedTo: 'bez', overheard: true, mode: null, claimId: null,
    family: null, reported: null, about: { subject: 'ada' },
  });
  world.chronicle.push({
    kind: 'asking', tick: ref.tick, venue: 'chapel-d0', speaker: 'ada', addressedTo: 'bez',
    about: { subject: 'ada' }, authority: false,
    heardBy: [{ id: ref.observer, addressed: false }],
  });
  world.enemy.sketch.push(runaround, {
    id: 'legacy-asking-twin', kind: 'entry-point', day: 0, family: null,
    subject: null, district: 'd0', detail: 'lawful asking beside copied physical evidence',
    evidence: [{ tick: ref.tick, observer: ref.observer, claimId: null, messageId: null }],
  });

  auditSketch(world); // intact physical runaround and ordinary legacy asking both pass
  const bad = cloneSerializable(world);
  const corrupted = bad.enemy.sketch.find((row) => row.id === runaround.id)!;
  delete corrupted.evidence[0]!.nightVisit;
  expect(() => auditSketch(bad)).toThrow(/runaround .* null-id ref lacks its physical marker/);
});

it('the residue-feature marker precondition runs before the night-visit value branch', () => {
  const world = nightVisitWorld();
  runUntil(world, 1440, R);
  const feature = features(world)[0]!;
  expect(feature.evidence[0]!.nightVisit).toBeDefined();
  feature.kind = 'arcane-residue';
  expect(() => auditSketch(world)).toThrow(/lacks its residue discriminant/);
});
```

Append beside Task 3's proposed `physical residue fair-cop chain` controls in `tests/sim/sketch-faircop.test.ts`, where `residueAuditWorld` already exists:

```ts
it('the night-visit marker precondition runs before the residue value branch', () => {
  const world = residueAuditWorld(true);
  const feature = world.enemy.sketch.find((row) => row.kind === 'arcane-residue')!;
  expect(feature.evidence[0]!.residue).toBeDefined();
  feature.kind = 'night-visit';
  expect(() => auditSketch(world)).toThrow();
});
```

The first test proves the real copied consumer, the false legacy match, the intact positive control, and the ordinary asking path in one fixture. The two cross-marker tests fail to throw if either physical value branch is allowed to `continue` before both feature-kind preconditions.

### Minor 1 — chunk inventory still describes one 4C despite two serial implementation units

The top-level order and file license call the work `4C` and budget it at 60–90 minutes (`task-4-author-draft.md:10,44-49`). The operative body later splits it into serial `4C1` and `4C2`, each 60–90 minutes, with separate mechanisms, tests, commit subjects, and focused gates (`:766-883,1220,1243-1248`). An executor following the inventory could misreport one oversized unit or treat the single 60–90-minute estimate as binding for both.

#### T4-A2 — required editorial dispatch amendment

In the dispatch brief, name the order `4A -> 4B -> 4C1 -> 4C2 -> 4D`; list the already licensed files under separate 4C1 and 4C2 rows; retain their two commit subjects and focused commands; state that 4D depends on both. This changes no source scope.

## Stage prerequisites, not authored-code findings

- Before 4A, bind the actual committed Task 2/Task 3 chain, Task 3 draft hash `EBACFF...76ED`, Task 3 base amendment A1, independently approved provenance/physical interfaces, suite/file floor, and clean or separately owned scope. The frozen Task 4 document itself already says its `16655291...` Task 3 hash is not an implementation base (`task-4-author-draft.md:1226`).
- Task 3 A1 must consolidate the Task 2 forensics caller into the one permanent auditor before Task 4 widens that helper. Otherwise the second caller can retain a weaker duplicate even while Task 4 tests pass.
- Task 2's H10 reference correction and its independent closure must be satisfied by the controller. The H10 finding changes the future actual predecessor and must be carried explicitly into Task 3/4 base reconciliation; it does not alter this frozen Task 4 proposal's séance/night-visit design. The external Claude launcher's saved 05:00Z reset is irrelevant to native implementation.

## Charge dispositions

| Charge | Disposition |
|---|---|
| Complete code/test bodies, APIs, types, consumers | Read end-to-end and traced against the real `dc114da` seams. Union widening covers `Action`, session local kinds/participants/verb term, chronicle, evidence, report projection, digest refs/features, and the permanent auditor. No missing production consumer was found beyond the auditor proof gap above. |
| Departed generation and attachment | Coherent. Isolated `gen:departed` runs after scenario secret retargeting; candidates require a real retained secret and real outgoing subject edge; deterministic sorting and a finite blocked-candidate fallback terminate; generated `null` rerolls while omission preserves hand-built compatibility. Runtime attachment copies the seven-field report and edge without creating a dead NPC, belief, or claim. Validator binds name/id namespace, unique secret, exact report truth, and real subject relation. |
| Chronicle and metrics | Coherent and licensed in 4A. `SeanceRecord` truthfully joins the existing claim thread. Narrowing the `campaignMetrics` synthetic-hearer arm to `entry.kind === 'telling'` prevents a claimful séance row with no `heardBy` from fabricating a hearer; the before/after metric control covers the change. |
| Séance action and session reachability | Coherent. Validation checks finite nonnegative 15-aligned current tick, enrolled player, frozen offered circle and exact offered sacred venue, midnight-to-before-04:00 window, generated departed truth, once-per-campaign latch, positive integer price and funds before mutation. Success debits, latches, writes two explicit null-endpoint magic-provenance intel rows and one chronicle row. The real session path logs successful actions only and is exercised through live/replay, not only a helper. |
| Physical sighting/report/evidence reachability | Coherent. Capture reads the final `TickEvents`, independently of hidden magic state, and requires actual observer/actor/venue/tick geometry. Direct spymaster sightings need no invented speech; remote sightings remain held until an actual spoken field-report atom reaches the principal, with receipt provenance. Omissive/guarded reports can omit the atom; the plan does not rescue an undelivered held row. |
| Digest, no omniscience, exposure, copy/identity | Coherent apart from Important 1. Digest consumes enemy state/map/rules only; physical refs include exact actor/witness/observedAt identity; residue fields and conditional copies are preserved; one `(kind, subject)` night-visit feature yields ordinary exposure +1 without carrier-profile identification. The direct consequence fixture correctly keeps a nonempty guard roster while moving the guard away, preserving the existing enemy-off law. |
| Magnitude and performance sanity | The fixed séance price 20 equals the fixture's starting 20 coin; legal minute 225 and illegal boundary 240 match the specified window. One campaign séance, one feature per kind/subject, and first-sighting/delivery dedupe bound state growth. No new loop is unbounded; generation retries exclude a finite candidate set. No measured performance or balance improvement is claimed. |
| Tests and gates | Focused commands cover each unit and include legacy field-report, residue, runaround, fair-cop, no-omniscience, session, jargon, content and world controls. 4D retains before/after suite, soak, Monte Carlo, lint, typecheck, app build, replay, deterministic-report comparator, count and bundle/timing evidence. Existing tests may not be removed or weakened. T4-A1 adds the missing causal negative and order controls. |

## What was verified and what remains unverified

I independently read the frozen draft and report, the complete resume charge, operative Task 3 recovered draft/review/base amendment, current plan and carried constraints, design laws, current source consumers, and prior interrupted Task 4 review artifacts. I checked termination/reachability, namespace and truth invariants, action mutation order, physical report provenance, digest purity, legacy compatibility, copy identity, stage calibration, chunk ownership, test causality, magnitude bounds, and gate completeness by static trace. The bound hashes and source identity above were independently confirmed in this review environment.

I did **not** execute proposal code because none is implemented. No RED/GREEN, test, lint, typecheck, app-build, save/replay, soak, Monte Carlo, deterministic-report comparator, bundle-size, timing, or browser result is claimed here. The author's syntax/count/overlay evidence remains historical and limited to what its report states. All real gates, causal failure demonstrations, exact suite-count reconciliation, committed-or-absent checks, and independent implemented-code review remain mandatory after transcription.

## Final verdict

**Approved-for-base-reconciliation.** The core generation, séance, provenance, session, physical observation/reporting, digest, exposure and replay design is complete-code and internally coherent by static trace. Dispatch must incorporate T4-A1 exactly, preserve the canonical auditor order and ordinary asking path, and apply T4-A2's unit names. Dispatch must also bind the certified Task 2/3 predecessor and retained gates. Without T4-A1 the verdict is **Needs-fixes** because the required fair-cop proof can false-green a corrupted copied physical ref.

## Progress log

- [x] Read frozen Task 4 draft and author report end-to-end; reconciled code-block inventory and chunk names.
- [x] Traced generation, retargeting, witness/claim truth, omission/reroll, alias isolation and finite fallback.
- [x] Traced action validation, frozen offer, session success-only log, live/replay and consumer exhaustiveness.
- [x] Traced actual night sighting through held/spoken report, evidence, feature, runaround copy, auditor and exposure.
- [x] Verified Task 3 residue preservation, marker-precondition ordering requirement and null-ID asking collision controls.
- [x] Reconciled focused/full gates, magnitude/performance bounds and runtime limits.
- [x] Recorded final dispositions and verdict without modifying any other artifact.
