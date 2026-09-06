# Focused independent R20 relay-fix review

Review range: `3bc637ff82d6a5588e6d91462715f3e4a640ba95..09e54582f0a5fc9505e396bd1910c800c7413fff`  
Verdict: **APPROVED** — 0 Critical, 0 Important, 0 Minor

## Independently executed gates

Every mode uses `pwsh.exe -NoProfile -NonInteractive -File .superpowers/sdd/task-2-relay-native-review.ps1 -Review t2 -Mode MODE`. Raw invocation, stdout/stderr and exit artifacts are under `.superpowers/sdd/task-2-relay-native-review/t2/`.

| Mode | Native exit | Result |
|---|---:|---|
| Identity | 0 | HEAD and pinned endpoint `09e54582f0a5fc9505e396bd1910c800c7413fff`; tracked production/test/config equality `true`; started `2026-09-06T02:15:13.3029365Z`. |
| Focused (sandbox attempt) | 1 | esbuild helper launch denied; no assertion result. |
| Focused (native escalation) | 0 | 72/72 tests in 5 files: forensics 19, no-omniscience 4, enemy-runaround 36, field-reports 11, fair-cop 2. |
| Tests (sandbox attempt) | 1 | esbuild helper launch denied; no assertion result. |
| Tests (native escalation) | 0 | 1783/1783 tests in 114 files. |
| Lint | 0 | Literal `eslint .` completed cleanly. |
| Types | 0 | Both TypeScript configurations completed cleanly. |
| Build (sandbox attempt) | 1 | Ancestor/config read denied before build; no build result. |
| Build (native escalation) | 0 | 107 modules; `index-3DUkO8tk.js` 490.90 kB / 145.38 kB gzip; CSS 5.26/1.54. |
| Soak (sandbox attempt) | 1 | esbuild helper launch denied; no soak result. |
| Soak (native escalation) | 0 | 150 seeds; 94.0% first-try validity; attempts 141/9. |
| Mc (sandbox attempt) | 1 | esbuild helper launch denied; no MC result. |
| Mc (native escalation) | 0 | 15/15 tests in 8 files. |
| Compare | 0 | All 10 complete report blocks / 230 deterministic lines matched; known-good, changed-value, extra-output and missing-output controls passed. |
| Identity (final) | 0 | HEAD remained the pinned endpoint `09e54582f0a5fc9505e396bd1910c800c7413fff`; tracked production/test/config equality remained `true`; started `2026-09-06T02:20:39.5539426Z`. |

## Charge dispositions

1. Candidate/ref mechanism — **PASS**. [digest.ts](../../src/sim/enemy/digest.ts) still has exactly the four allowed imports. In one finite evidence-order pass, a received `kind:'network'`/`field-report` row reads only its actually spoken items, accepts only marked answer utterances, and uses their post-trait attribution for the hand while retaining the heard outer row for `ref(...)`. The immediately following inner received utterance cannot replace that first subject entry. Direct/local marked utterances retain claim refs. SOMEONE/self exclusion, first-subject selection, whole-sketch kind/subject dedupe, lexicographic output, public-directory district and feature-before-order placement are unchanged. No state, transport, import or auditor shape changed.
2. Normal-phase fixtures — **PASS**. The three added cases drive the answer and every report hop through normal `step`/phase recording. The focused run proved a direct claim ref, one-hop and two-hop network refs, post-trait `name-dropper` attribution, outer-before-inner capture order, and direct-versus-received first-evidence selection. Each positive calls the unchanged auditor where applicable. The one licensed legacy expectation now derives the actual delivered field-report evidence and asserts its network ref; its subject, feature count, real interrogation, marker, exposure and auditor checks remain.
3. Auditor/compatibility — **PASS**. The unchanged auditor resolves direct refs through the original telling and received refs through the actual network speech heard by the principal. Original 16 forensics cases remain and pass alongside the 3 additions; the full focused set also holds no-omniscience, runaround, field-report and fair-cop suites. No-forge/ordinary lazy markers, anonymous pickup, silent circulation, exposure, flip/tip and live-replay controls remain green. H10's field-report branch is inert when no spoken item is a marked document answer, so old-report shapes require no migration.
4. TDD/gate arithmetic — **PASS**. The preserved repaired RED at `.superpowers/sdd/task-2-relay-fix-validation/red-repaired-native-v2.log` has native exit 1 and exactly 4 mechanism failures / 68 passes: the legacy received interrogation, one-hop, two-hop and received-first ordering all expected network refs but base H10 returned inner claim refs. The preserved final GREEN has 72/72 in 5 files, exit 0. The final suite is 1783/114, exactly +3 tests from 1780/114 with zero deletions. Lint, both typechecks, build, soak, MC and complete comparison all independently pass as recorded above.

## Findings

None.

## Adjudication and conformance

The original P9-5(d) all-claim-ref expectation was incompatible with the speech-only and remote-receipt laws for received reports. The written R20 adjudication supersedes only that causal-reference vehicle: direct observation still cites the answer telling; received reports cite the field-report speech actually heard. This is a tighter fair-cop proof, not an auditor exception or new game rule. The two initial positive-fixture failures are correctly disclosed: `realizeNetworkForward` alone did not record `heardBy`, so the final cases use normal phases instead of inventing chronicle rows. The historical failing probe remains valid evidence of the original defect but is not treated as a positive proof.

The real delta is only `src/sim/enemy/digest.ts` and `tests/sim/forensics.test.ts`, +153/-5, and `git diff --check` is clean. Production work is +17/-4 inside H10. The nested field-report loop is bounded by finite spoken items and adds no recursion, ambient entropy, new dependency, external API, threshold, seed or physics change. No undisclosed implementation choice or scope violation was found.

## Verification limits

I did not independently rerun the separate root-only 12-snapshot no-forgery harness; the runner exposes no such mode. The full suite's existing compatibility controls and the 10-block/230-line deterministic comparison are independent supporting evidence but do not replace that artifact. I did not run an optional reviewer probe because the three committed normal-phase tests supersede the earlier incomplete vehicle and directly reproduce the reviewed boundary. R15 and the previously closed Task 2 charges 2/5/6 were not reopened beyond regression checks required by this two-file fix.
