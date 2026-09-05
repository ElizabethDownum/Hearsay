# Independent Task 3 authored-plan review — 2026-09-05

**Verdict: Needs-fixes.** The frozen Task 3 plan is broadly consistent with the accepted R5/R6 design, but its `SketchEvidenceRef` widening does not atomically migrate two existing digest consumers. Both gaps concern physical-reference identity and must be corrected before base reconciliation or implementation dispatch. No Critical finding was found.

## Review target and source state

- Frozen draft: `.superpowers/sdd/task-3-author-draft.md`
- Verified SHA-256: `16655291E98D8CEF7A7FB3E8EF84DE28CBAC41B7C52C2D066D36DA9259A1F00B`
- Brief baseline: `2fe440fcf34c12aea1fa6bbf5481090f58d5448b`
- Closing read-only HEAD: `a53551d6e47fc575f7c306f43f9fa0ff836250cc`; HEAD moved during this concurrent review. The relevant `src/sim/enemy/digest.ts` blob was unchanged between the brief baseline, closing HEAD and worktree (`2c0e1649ffac4b2ef937955f322d8dd60b8b2749`), so the findings below do not depend on the concurrent movement.
- This is a plan review. Task 3 has no implementation diff and Task 2 is not a certified base. The mandatory reviewer license was applied: plan-authored code was not presumed correct, and plan-mandated defects are classified at full severity.

## Findings

### Important 1 — `sameRefs` still erases the identity of physical references

**Evidence.** The draft adds `residue?: ResidueEvidenceData` to `SketchEvidenceRef` and states that the nested residue data is the physical resolver (`task-3-author-draft.md:429`). It adds that discriminator when projecting evidence (`task-3-author-draft.md:602-606`). It also deliberately permits separate paid operations to create separate traces (`task-3-author-draft.md:12`) and has a real-flow case with two traces and two evidence rows at the same tick, venue and observer (`task-3-author-draft.md:1215-1226`). However, the existing consumer still compares only `tick`, `observer`, `claimId` and `messageId` (`src/sim/enemy/digest.ts:132-135`). For residue refs, both ID fields are null by design.

The in-memory control confirmed both collisions:

```json
{
  "oldDistinctResiduesAlias": true,
  "oldResidueAliasesLegacy": true,
  "fixedDistinctResiduesAlias": false,
  "fixedResidueAliasesLegacy": false
}
```

Thus two references to `s0` and `s1` with the same tick and witness compare equal, and a residue ref compares equal to a legacy null-ID ref with the same tick and observer. `sameRefs` is used to decide whether a runaround already exists (`src/sim/enemy/digest.ts:358-365`), and its contract says the copied reference trail is the lead identity and that genuinely distinct leads must remain distinct (`src/sim/enemy/digest.ts:127-130`). Task 3's own null-subject residue feature cannot become a runaround lead because of the guard at line 360, so this is latent in Task 3-only play. It becomes behaviorally reachable at the already-authorized Task 4 subjectful physical lead seam. Task 4's draft independently identifies the same predecessor defect (`task-4-author-draft.md:870-888`). Leaving the union migration incomplete until then would make the shared physical-reference base internally inconsistent.

**Required bounded correction.** Extend the current comparator without changing legacy ordering or fields:

```ts
const sameRefs = (a: readonly SketchEvidenceRef[], b: readonly SketchEvidenceRef[]): boolean =>
  a.length === b.length && a.every((ref, i) => ref.tick === b[i]!.tick
    && ref.observer === b[i]!.observer && ref.claimId === b[i]!.claimId
    && ref.messageId === b[i]!.messageId
    && ref.residue?.id === b[i]!.residue?.id
    && ref.residue?.witness === b[i]!.residue?.witness
    && ref.residue?.observedAt === b[i]!.residue?.observedAt);
```

Task 4 can then append its three `nightVisit` comparisons. Add a non-vacuous consumer regression proving that an exact cloned physical reference is equal, two real references that differ only by residue ID are unequal, and a residue reference is unequal to a legacy null-ID reference. Task 4's real-flow runaround test may carry the final integration proof, but it must retain an explicit residue-ID control rather than proving only the later `nightVisit` arm.

**Mandate.** R5 requires a dedicated resolvable physical reference and now explicitly records that separate residues must not compare equal merely because speech IDs are null (`docs/review/current.md:40-46`). The design requires traceable magic and end-to-end causal provenance (`docs/design-spec.md:83,166-167`). The plan itself promises separate paid traces and a dedicated residue reference (`task-3-author-draft.md:12,20,429`).

### Important 2 — runaround's claimed deep copy becomes shallow after the nested residue widening

**Evidence.** The digest contract says a runaround “deep-copies its lead's exact refs” (`src/sim/enemy/digest.ts:127-130`), but the implementation copies each reference with only `{ ...row }` (`src/sim/enemy/digest.ts:365`). That was sufficient while every reference field was scalar. After the draft adds nested `residue` data (`task-3-author-draft.md:429,602-606`), the copied runaround and original lead share the same physical-reference object.

The in-memory control returned:

```json
{
  "shallowResidueSharesIdentity": true,
  "detachedResidueSharesIdentity": false
}
```

No current Task 3 path mutates a persisted residue reference after it is created, and its residue feature has null subject, so the alias does not presently corrupt a Task 3-only run. Nevertheless, the authored source contract is false once Task 3 lands, and Task 4's subjectful physical lead makes this exact copy path reachable. A later mutation, audit corruption control or additive physical-reference projection could mutate both the historical lead and derived runaround, destroying the independent causal snapshot. Task 4's draft also identifies and exercises this seam (`task-4-author-draft.md:907-914,1137-1159`).

**Required bounded correction.** Detach only the newly nested Task 3 data:

```ts
evidence: lead.evidence.map((row) => ({
  ...row,
  ...(row.residue === undefined ? {} : { residue: { ...row.residue } }),
})),
```

Task 4 can append the analogous conditional `nightVisit` copy. Preserve omission of optional keys; do not replace this with a broad serialization clone. The regression must assert value equality, reference inequality, and mutation isolation for the nested object. Task 4's proposed real-flow runaround aliasing regression is an appropriate final integration test if the Task 3 residue-preserving branch remains in the complete replacement.

**Mandate.** The source's own runaround identity contract requires an independent deep copy (`src/sim/enemy/digest.ts:127-130`). The design requires every operation and mutation to remain explainable by its causal trail (`docs/design-spec.md:81-84`), and the draft presents the widened reference as persistent fair-cop provenance (`task-3-author-draft.md:20,429`).

## Other checks

Apart from the two digest consumer omissions, the proposed structure is internally coherent and API-plausible at the inspected source seams:

- Action validation is ordered before lazy state allocation, debit and chronicle mutation, and the proposed app control checks byte-identical failure against an ordinarily advanced world.
- The live scry sensor consumes the final `TickEvents` bundle rather than chronicle, schedule or belief state; it keeps D1 to presence, ordinary utterance and asking.
- Residue activation, event projection, direct capture, held reporting, spoken receipt acknowledgement and later-encounter retry follow the existing five-phase and store-and-forward boundaries. Receipt does not erase the trace.
- Magic provenance is additive and its source grouping prevents magic from becoming an NPC/informant carrier. Positive claim-bearing narrowing avoids null-speaker physical evidence in existing digest voicing heuristics.
- The dedicated residue evidence/ref/feature and fair-cop auditor join creation, actual local sighting, captured evidence and, for remote knowledge, the exact spoken field-report envelope. Negative controls cover omitted or corrupted links.
- The digest retains its four-import allow-list. Optional/lazy JSON, no-magic absent-key behavior, Task 2's document marker instructions, file licenses and the 3A–3E commit boundaries are explicit and manageable.
- The two author self-reviews (`task-3-author-draft.md:1515-1525`; `task-3-author-report.md:37-51`) correctly limit their syntax/type evidence and runtime claims, but their asserted source-copy/consumer coverage missed both findings above.

No additional Critical, Important or Minor defect was established in the reviewed scope. No outside-scope mechanic is recommended.

## Read-only probes and actual limits

1. `Get-FileHash -Algorithm SHA256 .superpowers/sdd/task-3-author-draft.md` verified the frozen hash. `git rev-parse` and blob probes recorded the concurrent HEAD movement and proved the relevant digest source stayed identical.
2. Existing focused baseline: `npm test -- tests/sim/enemy-runaround.test.ts tests/sim/sketch-faircop.test.ts tests/directives/field-reports.test.ts tests/sim/tick-phases.test.ts tests/app/session.test.ts tests/intel/codex.test.ts` passed **6 files / 95 tests** in **19.51 s**. The first sandboxed attempt could not resolve the Vitest/esbuild configuration; the permitted rerun outside that restriction passed. This proves only current pre-Task-3 seams.
3. Installed TypeScript 5.9.3 `transpileModule` parsed the draft's 12 complete TS/TSX/JS blocks (fences 2, 6, 7, 18, 42–46 and 49–51) with zero syntax diagnostics. The other fenced snippets are fragments and were not misreported as standalone files.
4. A direct JavaScript identity probe reproduced both old-comparator collisions and the nested spread alias, then showed the bounded field comparisons and conditional nested copy eliminate them.

The following remain unverified runtime prerequisites and cannot be converted into approval: a certified Task 1/Task 2 implementation base; reconciliation against the actual Task 2 `document` projections; meaningful Task 3 RED/GREEN runs; full production typecheck and lint; app build; full suite; save/replay execution; long-run retry/termination behavior; soak and Monte Carlo behavior; bundle-size measurements; and complete deterministic report-block equality against real certified Task 2 logs. The proposed 72 cases are authored test bodies, not executed tests.

**Needs-fixes**
