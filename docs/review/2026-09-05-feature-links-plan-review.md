# Task 5B ordinary feature links — independent native review

**Verdict: Needs-fixes — 0 Critical, 1 Important, 0 Minor.**

The authored 144-case proposal, both compilers, virtual lint and enforcement proofs pass independently. A new ordinary legacy-history counterexample still backdates a report child when its receipt record is missing. Approval is withheld pending a bounded correction and focused independent re-review. This is a proposal review, not installed-code or full Task 5B approval. Completed 5 September 2026 Central, in a different native thread from the author, at inherited controller capability.

## I1 — Important, plan-mandated: a missing receipt record turns a report child into direct evidence

**Location:** completed draft `task-5b-feature-links-completed-author-draft.md:183`, the early `!directlyHeard(world, entry)` return in `evidenceArrivals`; the direct assignment follows at line 184. The same code is `src/sim/debrief/evidence.ts` in the exact proposal map. The R24 reservation mechanism at draft lines 181–206 is reached only for a corroborated wrapper.

**Authority:** completion constraints lines 16–19 and 35–36 require explicit unknown/unrecorded receipt states and prohibit backdating unknown receipts. `task-5b-model-premises.md:36–43` requires occurrence-aware acquisition and an unknown timestamp for unmatched legacy rows. The completion brief requires missing/undated distinctions and prohibits substituting content coincidence for a retained causal link. Plan 11 separates a remote witness's observation from headquarters receipt; `docs/design-spec.md:79–89` requires an honest postgame reconstruction. The controller's provisional R24 amendment explicitly covers corroborated but incomplete batches; it does not waive the broader chronology requirement when the corroborating receipt record itself is absent.

**Independent native counterexample:** use the proposal's real normal-phase `delivered(1)` fixture, generated through actual report queueing/transport/capture at committed R20 semantics. Remove **only** the exact received network-speech chronicle row. Keep its evidence wrapper, projected child, all original tellings and all other history. No claim words, observer, evidence order or receipt timestamp is edited.

The separately preserved trace records:

| Fact / row | Before removal | After removal |
| --- | --- | --- |
| Actual report speech | `m0`, tick **1995**, `bez → cyn`; `cyn` in addressed `heardBy` | Only this chronicle row is absent |
| Evidence wrapper index 1 | direct at 1995 | unrecorded / null, correctly |
| Projected child index 2 | observedAt **1980**, report receipt **1995**, wrapper index 1, item 0, complete root | **timing: direct, learnedAt: 1980**, incorrectly |
| Original answer `c2` | tick 1980, `ada → bez`; heard by `bez` and `you` | Preserved unchanged; headquarters `cyn` did not hear this answer |

The early return skips all wrapper/child handling. Later, the child is tested as a standalone direct row; its recorded relay observer `bez` heard the original answer, so the fold substitutes 1980 for headquarters acquisition. The returned wrapper and child therefore contradict their own retained append structure. This is a wrong acquisition fact, not merely an omitted attention label.

This is the same supported missing/legacy-history class already exercised by the proposal's unrecorded and incomplete-batch tests. It does not assume arbitrary corrupted-state recovery or a guaranteed identity after unrestricted edits. One retained receipt record is missing; the algorithm should preserve uncertainty rather than invent a direct date.

**Evidence:** all paths below are under `.superpowers/sdd/task-5b-feature-links-native-review/`.

- `boundary-additions.txt:3` contains the complete acceptance counterexample. `boundary/boundary-native.*` preserves **146 passed / 1 failed / 147 total**, native exit 1. All 144 authored cases and both other reviewer controls pass.
- `trace-addition.txt` and `trace/receipt-trace-native.*` reproduce the failure with exact before/after data: one selected failure, 147 skipped, 148 collected. The added trace case preserves the previous 147 case bodies and assertions. It is a diagnostic, not an authored-suite increase.
- `receipt-chronology-trace.json` is extracted from the raw `INDEPENDENT_RECEIPT_TRACE` stdout line and records the complete receipt, original tellings, and arrival arrays. `final-audit.py` verifies actual 1995 receipt, false direct1980 result and the unrecorded wrapper.
- The restoration control passes: restoring that exact receipt row at its original chronicle position restores the complete original report arrival row, including its actual 1995 date and item/root association.

**Recommended bounded correction, requiring controller adjudication:** recognize possible ordinary child projections before the physical-wrapper corroboration gate. An uncorroborated retained wrapper must grant neither a receipt date nor root truth, but matching candidates inside its mechanically bounded possible child span must also be prevented from falling through to direct dating. Keep those candidates unrecorded/null. Preserve distinguishable direct rows, the maximum-span limit, nested-envelope non-recursion, complete corroborated batches and all existing R24 controls. This recommendation extends R24's conservative uncertainty treatment; it is not a silently approved new algorithm or a production change. No new engine metadata, acquisition physics, chronology guess or scanner change is proposed.

## Six review charges

| Charge | Disposition and evidence |
| --- | --- |
| 1. Exact refs, acquisition chronology and associations | **Needs-fixes: I1.** Real direct and one/two-hop R20 references otherwise pass with their original ref shapes preserved. The received wrapper/index/item association and complete unique nonempty root array govern source recovery; malformed, sparse, duplicate and conflicting metadata do not acquire attention truth. The missing-wrapper-history case nevertheless falsely grants a direct child acquisition date. |
| 2. R24 bounded reservation and nested ingestion | **Pass within R24's stated corroborated-wrapper boundary; I1 identifies the adjacent uncovered legacy case.** Independent WIP RED reproduces the actual one-hop1980 backdating; corrected proposal passes its reservation, distinguishable direct-row, byte-indistinguishable uncertainty and beyond-span controls. A new unit-acquisition control also passes: a nested field-report child in a broken batch stays unknown, does not recursively ingest its own payload, and a distinct direct asking in the vacated span remains direct. |
| 3. Original witness and performed attention | **Pass on corroborated ordinary inputs.** Unique post-trait marked-answer selection is scoped to the actual received envelope and feature subject. Competing answers, distractors, reported-only holdings, absent raw sources, conflicting original witnesses and duplicate physical events do not borrow attention. Real invitational questioning/compulsion and direct/local positive controls pass. Mutating the later carried packet does not rewrite the retained link. |
| 4. Watch work proves a beat | **Pass.** Both real normal-phase controls execute independently. A heard source on the actual retained work beat links the watch episode; the15-minute-later observation does not. The later fixture retains the original proved `occurredAt` rather than moving it to match the observation. Issued state and headquarters claims cannot replace removed raw work outcomes. The actual attention module lines55–70 and86–87 group a day's work episode without claiming continuous staffing; committed execution plus the frozen R17 overlay records a proved occupied beat. The exact-equality condition in the proposed link fold respects that contract. |
| 5. Resolution states and dates | **Needs-fixes: I1 for acquisition uncertainty.** The retained decision day remains separate from feature.day and observedAt; orphan features stay undated, and later-only references are explicit late results. Attention status remains separate from receipt status. No full calendar composition is supplied or approved. The false direct acquisition must be corrected before this fragment may feed that future calendar. |
| 6. Pure folds, ownership and exact inputs | **Pass.** All original96 identities/assertions survive, all nested ownership tests pass, and no live actor knowledge or state mutation is introduced. Three exact source/test fences match runtime maps. Seven old model sources and seven old test files are unchanged. Physical kinds/extended refs remain explicitly unsupported in this ordinary fragment; full widened magic unions are intentionally outside this host. |

## Source and host integrity

Frozen identities independently rechecked:

| Input | SHA256 |
| --- | --- |
| Native review brief | `947EAC236295D30B0A0E2E96C56F212EA11BE8C0BE62315CCFF75F34F8066551` |
| Completed draft | `22B1B12FA0BA1DEDE919247BD9B93F7D044FA975290EE0AF8EA0AF343696B664` |
| Author report | `88537F44E31068BEA8AAE03A91C89EFE37F8DD68D8588D9D593052555B50F979` |
| Completion constraints | `DC318D600FCB641A5B5B5BF7D86973C0213A7E938B22B7864922F40A8107B800` |
| Frozen26 relative-source map | `03234A82FCAFA458CFEC9828B508F98E62EC1D1076401B94E60A84EDD389E9C6` |

`prepare-owned.py` creates its own snapshot **from the start** under the licensed review directory's `node_modules/hearsay-baseline`, using `git archive 09e54582f0a5fc9505e396bd1910c800c7413fff`. Every archive path is checked to stay inside that destination. All **302** original snapshot files equal the committed archive and author's retained snapshot manifest. No live3C2 files supplied compiler or test inputs.

The reviewer reconstructs the corrected map directly from the frozen26 inputs plus the three draft fences, then compares it with the author's executed map. The28-entry map preserves25 original values; evidence.ts is the only replaced old source. Both added files are exact fence bodies. All seven old test files are byte-identical, and all96 native baseline case identities appear and pass in both WIP RED and GREEN.

RED uses the frozen original feature/evidence WIP. Its only nonsemantic host adjustment is the disclosed nullable-day concat annotation; the test bytes are identical to GREEN. Baseline, RED and GREEN configurations/preflight/entry copies change only the author-to-reviewer path prefix, with reverse-replacement equality checked. The lint-firing script is copied byte-identically and resolves its own snapshot/output directory. No original writer was executed in place.

I read `prepare.py`, `run.py`, `assemble-tests.mjs`, `publish.py`, lint-firing and the generated configs/preflight before using them as reference. `structural-audit.mjs` independently proves the five copied forensics helper bodies equal committed09e and all three original compiler/lint preflight assertions remain intact. The committed ESLint determinism and engine-import scopes were inspected before firing their actual rules at both new module paths. The closed R15 scanner mandate was not extended.

`input-integrity.json`, `snapshot-manifest.json`, `structural-audit.json` and `final-integrity.json` preserve those measurements. The author's193 historical-input hashes were independently rechecked. The reviewer additionally inventories **621 protected task5B files**, including the completed author's snapshot and outputs; every gate and final audit confirms them unchanged. The earlier prose verdict and its artifacts were not edited.

## Actual independent execution

All commands run from the Hearsay repository unless their captured invocation specifies the isolated snapshot. `run-owned.py` saves exact native argument arrays/cwd, stdout/stderr bytes, and child exit before post-checks. Native Vitest calls use the licensed exact escalation for the known esbuild ancestor-read restriction; no permission/config workaround or package installation occurred.

| Command | Actual result / output prefix |
| --- | --- |
| `python -X utf8 .superpowers/sdd/task-5b-feature-links-native-review/prepare-owned.py` | exit0; independent snapshot/fence/map/host reconstruction |
| `python -X utf8 .superpowers/sdd/task-5b-feature-links-native-review/run-owned.py root lint firing` | exit0; four expected diagnostics at **each** proposed source path; `firing.*`, `lint-firing-proof.json` |
| `python -X utf8 .superpowers/sdd/task-5b-feature-links-native-review/run-owned.py green preflight compiler-lint` | exit0; both actual compiler configurations0, all28 virtual files zero lint errors/warnings; `green/compiler-lint.*` |
| Same runner: `baseline tests baseline-native` | exit0; **96/96**; `baseline/baseline-native.*` |
| Same runner: `red tests red-native` | exit1; **122 passed / 22 failed**; `red/red-native.*` |
| Same runner: `green tests green-native` | exit0; **144/144**; `green/green-native.*` |
| Same runner: `boundary tests boundary-native` | exit1; **146 passed / 1 failed / 147 total**; `boundary/boundary-native.*` |
| Same runner: `trace tests receipt-trace-native -t 'independent receipt chronology trace'` | exit1; one selected failure /147 skipped; `trace/receipt-trace-native.*` |
| `node .superpowers/sdd/task-5b-feature-links-native-review/structural-audit.mjs` | exit0; exact helper and preserved assertion checks |
| `python -X utf8 .superpowers/sdd/task-5b-feature-links-native-review/final-audit.py` | exit0; case identities, native exits, trace values, lint/firing,621 protected files and302 committed snapshot files checked |

Actual summaries:

```text
BASELINE: Tests  96 passed (96)
WIP RED:  Tests  22 failed | 122 passed (144)
GREEN:    Tests  144 passed (144)
BOUNDARY: Tests  1 failed | 146 passed (147)
TRACE:    Tests  1 failed | 147 skipped (148)
tsconfig.json=0; tsconfig.app.json=0; lintErrors=0; lintWarnings=0
firing: no-restricted-properties x2, no-restricted-syntax x1,
        no-restricted-imports x1 at each of the two module paths
receipt1995 -> missing receipt history -> false direct1980
```

The WIP22 failures include the requested R20/root/ambiguity/late/watch/R24 mechanisms. Two malformed-root cases are actual runtime exceptions in the old WIP, not loader failures. No corrected authored case fails; I1 is a new independent acceptance failure. The exact complete147-case boundary source/map, raw failure, corrected144 proof and separate trace remain preserved for the next author/reviewer handoff.

## Boundary and handoff

The scope is nine partial ordinary model modules with144 author cases, not a production suite total or the full Task5B model. The explicit eleven production overlays remain historical virtual prerequisites for Task5A, Task5A2/R16/R17 and narrow provenance. They do not compile or certify actual full Task3/4 magic, T5A-A1 séance membership, physical evidence unions, calendar bounds or terminal composition. Those intentional future integrations are not additional findings in this bounded review.

Root must adjudicate I1's conservative uncertainty boundary before an author changes the proposal. Preserve all144 authored cases and the independent147-case acceptance evidence; introduce a versioned correction with meaningful RED/GREEN, actual compiler/lint gates and exact-input checks, then obtain focused independent re-review. Actual predecessor reconciliation, production implementation gates and separate committed-code review remain necessary afterward.

No source/test/app/config/docs/index edits, commits, pushes, child agents, installs, external calls, process control, UI automation or shared-AI writes were performed. Writes are confined to this new report and its licensed review directory. No failed assertion, physics, seed, rule, threshold or formula was weakened.
