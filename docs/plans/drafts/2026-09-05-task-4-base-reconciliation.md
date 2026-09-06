# Task 4 binding base-reconciliation amendment

Controller adoption: root Codex, 5 September 2026, evening continuation.
Authority: independent native plan review, T4-A1 (Important, plan-mandated) and
T4-A2 (Minor), adopted under the user's recommended-default/HTML-review direction.
Review record: docs/review/2026-09-05-native-seance-plan-review.md; SHA256
099CBA240D8ABED228F67AE53E39EF0F51178BD0CE641FCDDBEC5448C2E5655A.

This amendment accompanies the unchanged frozen Task 4 draft SHA256
14ABA1730FF43696C17D0D81D293C6B96E2065F7B2DE83BD91F1515C4D8EE005.
The text and exact tests below are copied from the independent review, verbatim.
They are proposed code, not implemented or executed. This satisfies the review's
required dispatch amendment; native RED/GREEN and separate implemented-code review
remain required. No source, tests, thresholds, physical rules or audit assertions
are weakened by this document.

Before execution, bind the actual independently closed Task 2/R20 and Task 3
commits, real suite floor and report baselines. Preserve H10's received network
reference correction and Task 3 A1's single-auditor extraction/caller migration.
All existing forensics cases, including R20 additions, remain in that migration.
Neither dc114da nor any proposed future hash is a certified Task 4 predecessor.

The 05:00Z quota guard is only for saved external Claude launchers; it does not
block native review or implementation. All changes remain Hearsay-local, one
production writer/index owner at a time, no push. Root owns the HTML question queue.

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

#### T4-A2 — required editorial dispatch amendment

In the dispatch brief, name the order `4A -> 4B -> 4C1 -> 4C2 -> 4D`; list the already licensed files under separate 4C1 and 4C2 rows; retain their two commit subjects and focused commands; state that 4D depends on both. This changes no source scope.


## Dispatch accounting

T4-A1 adds exactly three authored cases beyond the frozen draft. Its first test
keeps an intact positive world and a lawful ordinary asking reference alongside
the copied physical ref, then removes only the runaround marker. The other two
tests enforce feature-marker checks before value-branch early exits. Demonstrate
the causal RED and GREEN on the actual assembled predecessor; these are currently
unexecuted expectations, not counted production tests.

The order is 4A -> 4B -> 4C1 -> 4C2 -> 4D. At dispatch, mechanically extract the
existing 4C1/4C2 file lists, focused commands and distinct commit subjects from
the frozen body; do not infer a single oversized 4C. 4D depends on both.

The conditional plan verdict is Approved-for-base-reconciliation only with this
amendment. Any actual fixture/type/source contradiction returns to root with
evidence; never change the rules or delete an inconvenient assertion to pass.
