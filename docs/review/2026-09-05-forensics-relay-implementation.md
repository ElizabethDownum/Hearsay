# Task 2 / R20 relay correction — implementer report

## Summary

Status: **IMPLEMENTED AND LOCALLY GATED; independent review remains.**

At exact base `3bc637ff82d6a5588e6d91462715f3e4a640ba95`, H10 now processes
document-answer candidates in evidence insertion order. A received spoken field
report takes its post-trait answer attribution and cites the outer network evidence
that the enemy actually heard. The following received utterance copy cannot replace
that first subject ref. Direct/local document answers retain their claim refs.

The implementation preserves the existing SOMEONE/self exclusions, first evidence
per subject, whole-sketch kind/subject deduplication, lexicographic feature output,
public-directory district lookup, feature placement, pure digest boundary, and
unchanged auditor. No state, interface, transport, confidence, physics, threshold,
formula, seed, exposure, turncoat, scanner, package, or configuration shape changed.

Three permanent tests were added. They drive the original answer and every report
hop through normal `step` phases, so production records the answer and network
speeches with their real `heardBy` rows before capture and digest. They pin a direct
claim ref, one-hop and two-hop network refs, post-trait attribution, unchanged
fair-cop resolution, capture ordering, and first-evidence choice across direct and
received artifacts. Suite arithmetic: 1780/114 -> **1783/114**, +3 tests, zero
removals.

No commit, index operation, or push was performed.

## Actual RED and GREEN

The initial sandbox launch was denied while esbuild loaded repository config;
`task-2-relay-fix-validation/red-focused.log` (exit 1) is retained as infrastructure
evidence and is not claimed as RED.

After the fixture adjudication, the adopted digest change was snapshotted, the base
H10 restored, and the repaired normal-phase tests ran natively. Meaningful RED is
`task-2-relay-fix-validation/red-repaired-native-v2.log` (exit 1):

```text
Test Files  1 failed | 4 passed (5)
Tests       4 failed | 68 passed (72)

existing received interrogation:
expected network {tick:2475, observer:cyn, claimId:null, messageId:m3}
received claim   {tick:2355, observer:bez, claimId:c1, messageId:null}

one-hop expected network {tick:1995, observer:cyn, claimId:null, messageId:m0}
received claim           {tick:1980, observer:bez, claimId:c2, messageId:null}

two-hop expected network {tick:2010, observer:cyn, claimId:null, messageId:m0}
received claim           {tick:1980, observer:ada, claimId:c2, messageId:null}
```

The fourth failure was the received-first ordering arm selecting the inner claim
ref. The direct positive arm and all 68 other focused tests passed.

After restoring the adopted H10 change, final focused GREEN is
`task-2-relay-fix-validation/green-focused-final.log` (exit 0):

```text
✓ tests/directives/field-reports.test.ts (11 tests)
✓ tests/sim/enemy-runaround.test.ts (36 tests)
✓ tests/sim/no-omniscience.test.ts (4 tests)
✓ tests/sim/forensics.test.ts (19 tests)
✓ tests/sim/sketch-faircop.test.ts (2 tests)

Test Files  5 passed (5)
Tests       72 passed (72)
```

Earlier stopped-run artifacts and the first repaired-fixture return-value failure
remain in the validation directory and are not relabelled as final RED/GREEN.

## Pasted full-gate output

Full native logs and separate exit files are under
`.superpowers/sdd/task-2-relay-fix-validation/`.

### Tests — `tests-final.log`, exit 0

```text
Test Files  114 passed (114)
Tests       1783 passed (1783)
Duration    33.69s
```

### Lint — `lint-v2.log`, exit 0

```text
> hearsay@0.0.1 lint
> eslint .
```

### Typecheck — `typecheck-v2.log`, exit 0

```text
> hearsay@0.0.1 typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.app.json
```

### Build — `build.log`, exit 0

```text
✓ 107 modules transformed.
../dist/index.html                   1.06 kB │ gzip:   0.55 kB
../dist/assets/index-WAkZKZ13.css    5.26 kB │ gzip:   1.54 kB
../dist/assets/index-3DUkO8tk.js   490.90 kB │ gzip: 145.38 kB
✓ built in 1.27s
```

### Soak — `soak.stdout.log`, exit 0

```text
first-try validity: 94.0%
attempts histogram: 1→141  2→9
Test Files  1 passed (1)
Tests       1 passed (1)
```

### MC — `mc.stdout.log`, exit 0

```text
Test Files  8 passed (8)
Tests       15 passed (15)
```

### Complete comparison — `comparison.log`, exit 0

```json
{
  "reportBlocks": 10,
  "deterministicLines": 230,
  "allBlocksEqual": true,
  "controls": [
    "known-good",
    "changed-value",
    "extra-output",
    "missing-output"
  ]
}
```

The unchanged comparator read `.superpowers/sdd/controller-gate-p9.log`, the fresh
`soak.stdout.log` and `mc.stdout.log`, and wrote task-owned `comparison.json`.

## Deviations and judgment calls

- The first implementation run surfaced two contradictory vehicle requirements and
  stopped before further edits or full gates, as the original brief required. Root
  inspected the exact diff and failures, then issued
  `task-2-relay-fix-adjudication-2026-09-05.md`. That amendment explicitly supersedes
  the old all-claim-ref expectation for the one affected received-interrogation
  assertion and requires new relay fixtures to use normal phase chronology. Work
  resumed only under that written adjudication.
- The original received-interrogation fixture, subject, feature-count check, marker
  checks, and `auditSketch` call remain. Only its expected ref and local delivery-row
  extraction changed, exactly as adjudication §1 licenses.
- The new deterministic schedule keeps Cyn away from the source answer, brings Cyn
  to the one-hop receipt at minute 555, or to the two-hop receipt at minute 570.
  Both boundaries are 15-minute conversation beats. `step` records every speech;
  the tests derive ref fields from the resulting evidence/chronicle rather than
  inventing them.
- The first static run found test-only TypeScript union narrowing and unsafe optional
  assertions. Explicit fail-fast variant guards replaced those assertions. Focused,
  lint, typecheck, and the full suite were rerun after this correction.
- No other deviations or judgment calls.

## Concerns

No implementation concern remains from this bounded correction. Independent
frontier review still owns approval and should inspect the uncommitted two-file diff
and rerun proportional gates. The historical incomplete reviewer probe is preserved;
its old failure remains valid evidence of the original wrong witness, while the new
permanent tests are the complete positive vehicle for network-ref resolution.

## Exact changed-file inventory

- `src/sim/enemy/digest.ts` — licensed H10 candidate extraction for spoken received
  field reports; 17 insertions / 4 deletions.
- `tests/sim/forensics.test.ts` — three new permanent cases plus the one explicitly
  adjudicated received-ref expectation; 136 insertions / 1 deletion.
- `.superpowers/sdd/task-2-relay-fix-validation/` — incremental sandbox/native RED,
  repaired RED, GREEN, full-gate, comparison, exit, and digest-snapshot artifacts.
- `.superpowers/sdd/task-2-relay-fix-report.md` — this report.

Root-owned documentation files changed concurrently. They were preserved and were
not edited, staged, reverted, or included in this task's implementation inventory.
