# Native independent R15 / Task 2 review

Reviewer: native frontier reviewer (independent of implementation)  
Review range: `b8ff101d3d60332f15a03d7df83bc984e423c96f..dc114da3006a75115784e4e894e880dd113226f5`  
Actual documentation HEAD at identity check: `c3e86d57afdb78e1a8bcf23cdc2a7c7800793bf2`  
Verdict: **NEEDS FIXES** — 0 Critical, 1 Important, 0 Minor

## Independently executed native gates

Every mode used the exact licensed command `pwsh.exe -NoProfile -NonInteractive -File .superpowers/sdd/review-native-utf8.ps1 -Review t2 -Mode MODE`, with `MODE` respectively `Identity`, `Focused`, `Probe`, `Tests`, `Lint`, `Types`, `Build`, `Soak`, `Mc`, and `Compare`. Modes blocked by the managed sandbox were rerun unchanged under narrow native escalation. Raw stdout/stderr, invocation metadata and native exits are in `.superpowers/sdd/review-native-utf8/t2/`.

| Mode | Native exit | Result |
|---|---:|---|
| Identity | 0 | Endpoint `dc114da3006a75115784e4e894e880dd113226f5`; tracked production/test/config equal endpoint: `true`; started `2026-09-06T01:39:09.8828276Z`. |
| Focused (sandbox attempt) | 1 | Repository esbuild helper could not launch under the managed sandbox; no assertion result. Exact licensed command was rerun with narrow escalation. |
| Focused (native escalation) | 0 | 162/162 tests in 4 files: forensics 16, fair-cop 2, artifacts 51, evidence-hierarchy enforcement 93. |
| Probe (sandbox attempt) | 1 | Repository esbuild helper could not launch under the managed sandbox; no assertion result. Exact licensed command was rerun with narrow escalation. |
| Probe (native escalation) | 1 | 9 existing independent cases passed; the added two-hop fair-cop case failed. Exact failure: `feature sf0 ref {"tick":1980,"observer":"ada","claimId":"c1","messageId":null} matches no telling heard by ada` (`probe.probe.ts:329`). |
| Tests (sandbox attempt) | 1 | Repository esbuild helper could not launch; no test result. |
| Tests (native escalation) | 0 | 1780/1780 tests in 114 files. |
| Lint | 0 | Literal `eslint .` completed cleanly. |
| Types | 0 | Both `tsc --noEmit` configurations completed cleanly. |
| Build (sandbox attempt) | 1 | Ancestor/config read denied before build; no build result. |
| Build (native escalation) | 0 | 107 modules; `index-hHcrttYf.js` 490.61 kB / 145.28 kB gzip; CSS 5.26/1.54. |
| Soak (sandbox attempt) | 1 | Repository esbuild helper could not launch; no soak result. |
| Soak (native escalation) | 0 | 150 seeds, 94.0% first-try validity, attempts 141/9; one report test passed. |
| Mc (sandbox attempt) | 1 | Repository esbuild helper could not launch; no MC result. |
| Mc (native escalation) | 0 | 15/15 tests in 8 files. |
| Compare | 0 | All 10 complete report blocks / 230 deterministic lines matched `bd930cc`; known-good, changed-value, extra-output and missing-output controls passed. |
| Identity (final) | 0 | HEAD remained `c3e86d57afdb78e1a8bcf23cdc2a7c7800793bf2`; tracked production/test/config still equal `dc114da`; started `2026-09-06T01:50:02.7917771Z`. |

## Charge dispositions

1. R15 scanner closure — **PASS**. The 93-case enforcement file passed under the independent focused run. Source inspection confirms checker-resolved destination leaves cover assignments, every compiler assignment operator, updates, destructuring, for-in/of, captured writes and merged `var` initializers. Receivers, keys, default RHS reads, bare declarations and shadow symbols remain non-writes. Forwarding rejects defaults/written parameter symbols. The shared const predicate guards both standard-library value aliases and `ARTIFACT_CREDENCE` anchor declarations. Mutable API aliases remain visible under the separate conservative write-surface purpose. The existing exact R12 retention/R14 recorded inventories and R13 guards remain green; the accepted opaque holder/accessor boundary was not widened.
2. Task 2 document-marker transport — **PASS for marker/lazy transport; the received row's fair-cop use fails under charges 3–4**. `chooseAnswer` uses the brief's strict `belief.credence > HEARSAY_CEILING` discriminant. Types and conditional spreads keep the key absent on ordinary speech. The 16 implementation tests and independent probe cover direct observation, held raw data, projected reports, two relays and final received evidence; reporting traits still mutate claim fields while `document:true` survives. The probe independently passed strict-above versus at-ceiling and a non-vacuous no-forge interrogation with no serialized `document` key.
3. H10 tracing fold — **NEEDS FIX**. The pure fold, gates, ordering, first-ref and dedupe behavior passed, but a two-hop received answer can mint an unresolvable fair-cop claim ref.
4. Interrogation reachability / fair-cop auditor — **NEEDS FIX only for the finding below**. The focused suite proves a real staged order physically reaches its guard, produces a compelled answer in the invitational venue, reaches the digest and resolves its one-hop fair-cop ref. The temporary helper's function text equals the unchanged private pillar after CRLF/LF normalization, and `docs/plans/drafts/2026-09-05-task-3-base-reconciliation.md` explicitly migrates both callers to one shared helper and deletes the temporary copy in Task 3. The added real two-hop transport probe proves the current helper correctly rejects H10's bad ref.
5. Informant exposure / anonymity / replay — **PASS**. The focused cases prove one-hop attribution (re-show recipient names the immediate hand), unique kind/subject exposure, no automatic avatar identification, eroded-asset flip through the unchanged consumer, and sketch-tip delivery only after physical speech. Venue pickup self-attribution mints nothing; silent circulation mints nothing. The live staged campaign records its own successful forge/plant actions and replays that same log to an identical world hash.
6. Disclosed vehicle choices — **PASS**. Hand-overs include required `venue:null` (`forensics.test.ts:44,186,271`); pickup waits for the later beat (`:98`); the re-show fixture selects the paper-backed family by `heardFrom` and credence rather than insertion order (`:204`); named-source lying uses `name-dropper` (`:138-144`); H10 retains one H5-style first ref (`:163`). These are sound fixture corrections. No confidence, formula, seed, gate, exposure, turncoat, artifact, rumor, pillar or app source changed. The finding below is a source/plan integration defect rather than a fixture correction.

## Findings

### Important (plan-mandated) — a two-hop received document answer mints an unresolvable fair-cop reference

`src/sim/directives/field-reports.ts:371-385` constructs the received utterance evidence with `observer` equal to the final field-report speaker, while retaining the original answer's `observedAt`/`claimId`. `src/sim/enemy/digest.ts:378-392` accepts every marked answer and emits `ref(answer)` as a claim ref. After `bez -> ada -> cyn`, that ref is `{ tick: 1980, observer: 'ada', claimId: 'c1', messageId: null }`, but the original answer's chronicle row was heard by `bez`; `ada` heard the later field-report speech, not its original answer. The unchanged fair-cop rule therefore cannot resolve the ref.

Independent runtime evidence: Probe native exit 1, 9 passed / 1 failed, exact assertion above. The probe used `holdFieldObservation`, `queueUnqueuedFieldReports`, two real `realizeNetworkForward` hops, final `captureEvidence`, real `enemyDigest`, and the exact copied pillar `auditSketch`. The document marker itself survived and H10 non-vacuously minted the feature before the audit failed.

This blocks approval because the brief requires both second-relay/received preservation and resolving fair-cop references. P9-5(d) explicitly prescribed `ref(e)` of the compelled-answer evidence row while the transport amendment also prescribed second-relay receipt, so the incompatible mechanism is **plan-mandated** and receives full Important severity. It is still a source defect in the new H10/received-evidence integration, not a fixture correction and not an expansion of the closed R15 scanner mandate.

Bounded correction: H10 can consume the already captured final `kind:'network'` field-report evidence in evidence order. For each lawfully spoken field-report item whose observation is a marked answer, apply the existing SOMEONE/self/first-subject gates to its post-trait reported fields and retain `ref(networkEntry)`. `ingestEnemyObservation` appends that actual heard network row immediately before the inner received utterance, so the later inner copy dedupes by subject; direct local marked answers continue using their claim refs. This uses the existing network branch of the unchanged auditor and no hidden custody/transport lookup. It adds no import or serialized field, preserves the required received inner marker and reporting traits, and leaves no-forge worlds byte-compatible. Required correction controls: direct claim ref; one-hop and two-hop network refs resolving to actual field-report speech; post-trait subject; first-evidence ordering; no duplicate feature from the following inner row.

## Conformance and limits

The actual range changes 8 licensed production files and 3 licensed test files, +711/-15; `git diff --check` is clean. The pure digest import set and all named original pillar files are byte-unchanged. Runtime cost is a bounded linear evidence fold plus sorted unique subjects; scanner alias traversal retains its eight-hop cap and AST visits terminate over finite descendants. No new dependency or unproven external API was introduced; the TypeScript compiler APIs used by R15 compile and execute in the enforcement suite.

The original Plan 9 held-only anchor clause conflicts with the already binding P9-2 lifetime adjudication. This review follows the later explicit adjudication recorded in the current brief/R15 plan and does not reopen it. The original watched-holder and never-avatar clauses are likewise expressly repaired out of v1 by P9-5; current code conforms to those repairs.

I did not independently rerun the root-only 12-snapshot no-forgery harness because the licensed reviewer runner exposes no such mode. The independently run full suite, strict lazy-key probe, soak/MC and complete report comparison support compatibility but do not replace that separate snapshot artifact. Task 8 generated-town/UI forger-arc reachability and Task 3's future consolidation remain intentionally unimplemented and were not claimed.
