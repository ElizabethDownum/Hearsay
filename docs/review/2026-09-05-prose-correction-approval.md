# Corrected Task 7A — independent native plan review

**Verdict: Approved-for-base-reconciliation — 0 Critical, 0 Important, 0 Minor.**

The exact correction closes the original I1 predicate-loss and M1 avatar-agreement findings. This is approval of the frozen proposal plus amendment, not approval of installed code or the unknown Task 4 predecessor. Completed 2026-09-05 Central by a new native reviewer thread inheriting controller capability, separate from the correction author.

## Frozen scope and actual basis

Independently measured SHA256 identities:

| Input | SHA256 |
| --- | --- |
| Original `task-7a-author-draft.md` | `4E75A99545ACCC5269E5BA9CB23E8C02F0EE8EA48687F2ABE5B8A60C5E6AA0A7` |
| Exact amendment `task-7a-corrected-author-draft.md` | `59A9CCB4CE547B7A978DA6CC7FE667481F4B9E23B2D604208FCC436E71D25EF0` |
| Correction author report | `B941DCE232BC484DD1CAB983101E857104F8A28E3694E12E671B0AD02AC98513` |
| Correction constraints | `49EC5C35A61CA34567F90B93B03D325C4B098EC35263CCA8335E2D31B39C4D66` |

Initial checkout HEAD was `09e54582f0a5fc9505e396bd1910c800c7413fff`, with controller documentation dirt only. The authored compiler/Vitest hosts deliberately override **only** `src/sim/enemy/digest.ts` and `tests/sim/forensics.test.ts` with their exact `git show 3bc637ff82d6a5588e6d91462715f3e4a640ba95:<path>` texts. I independently checked both equalities, their canonical-path maps, and exclusion from the 11 proposed-file map. Relevant prose/UI source at the initial checkout equals 3bc637f. These are isolated 3bc637f proposal checks; they do not certify the R20 correction at 09e5458.

All required compiler, lint, completeness and 78-case RED/GREEN runs completed before root announced the documentation checkpoint `20a342ac9736306c21c3f645cf28f0df450d2f42` and the start of Task 3A. I did not rerun whole compiler/world checks against partial Task 3A. The final additional edge controls import only the frozen renderer and the exact 3bc637f claim module, independently equal to the current unchanged claim module; no partial scrying input enters them.

I read the complete original and amended drafts, original I1/M1 review, correction brief/report/constraints, original author brief, relevant design-spec clauses and Plan 6/7/8/11 constraint files. Plan-authored code was treated as reviewable code, not presumed correct.

## Focused charges

| Charge | Disposition |
| --- | --- |
| 1. Predicate preservation and role partition | **Pass; I1 closed.** The three measured fixed targets survive actual objectifier mutation. All ten disclosed role removals are consistent with the original non-relational-object rule and the root-accepted correction. The complete fixed clause remains and the extra person is visibly named without an unsupported role. The 17 fixed and seven relational keys form a disjoint, complete partition of the actual 24 registry keys. |
| 2. Public labels, grammar and information boundary | **Pass; M1 closed.** `NameOf(id): string` and the public `you` label remain unchanged. Subject agreement, neutral-object agreement and attribution use only that label. Actual enrolled-avatar subject and attribution cases pass. No world/identity/relationship lookup, extra received field, API, action/control change or hidden state was introduced. |
| 3. Executed-input and historical integrity | **Pass.** Reconstructed identities and source equalities independently; did not rely on author manifests. Exact amendment fences equal the executed virtual source texts. Only renderer and the two declared test bodies differ from the original proposal; RED/GREEN differ only in renderer. All original test bodies survive as exact prefixes or unchanged files. All 141 protected historical/corrected files remain unchanged through the runs. |
| 4. Independent enforcement and runtime execution | **Pass on proposal basis.** Actual native compiler controls are clean; adding the future key fires one TS2741. All 24 metadata values compare equal. All 11 virtual files lint with zero errors/warnings. Full RED reproduces 27 assertion failures/51 passes, targeted RED reproduces five original regressions, and exact GREEN passes 78/78. All 15 original preflight assertion calls remain text-identical. Future-base reconciliation remains mandatory. |

### I1 semantic disposition

Correction locations: amendment lines 25–41 and 78–108; permanent regressions begin at lines 233–280. The governing rule is the original draft's non-relational-object preservation clause, the accepted correction brief and `docs/design-spec.md:108` (fields are the rumor; prose is their projection). Canonical predicate definitions/glosses are in `src/content/predicates.ts` and `src/content/terms.ts:145` onward.

The ten corrected branches retain theft (`stole`), falsified lineage, throne-seizure plans, council bribery, card cheating, broken betrothal, rescue of a drowning child, charity to the poor, regatta victory and nursing the sick through fever. An object-only mutation supplies no additional victim/owner/incumbent/opponent/fiance/patient role for those fixed or unspecified-role predicates. The neutral account phrase keeps the supplied entity visible. In particular it no longer replaces the council, child, poor or sick with that entity. This is a presentation correction under the accepted rule, not a new claim ontology or a repair of the received claim.

The seven explicit relational/transitive templates still express meeting companions, an affair partner, creditor, poisoning target, quarrel partner, ancestry target and night-meeting companion. I independently executed 35 additional comparisons across those seven templates: null, named, `SOMEONE` and public-avatar objects, plus avatar subjects. Every expected argument remains in its relation; none is demoted to the neutral account phrase. These controls use the exact frozen renderer, not a rewritten renderer or stubbed template.

The actual objectifier tests call `applyTraits` with the registered trait and prove the delta is exactly `{ object: 'object-id' }`. Targeted RED reproduces the original three losses; GREEN preserves the full predicate clauses. The unchanged seven fixed-branch controls and all 44 original cases also pass in full RED, so the result is not a blanket loader failure or a blanket changed-expectation failure.

### M1 grammatical disposition

Correction locations: amendment lines 68–71, present-tense templates and lines 121–132; regression groups at lines 284–321 and 371 onward. The selector and its data sources are byte-identical to the original proposal.

The actual enrolled selector now composes to “They plainly say that you have fallen into bankruptcy. The source is unnamed.” and “They plainly say that Ada poisoned Bez. You swear it.” The nine present-tense templates, unknown fallback, neutral object and source cases all pass. Named-NPC controls remain green.

My additional source controls verify named, `you` and `SOMEONE` attribution, exactly one lookup for a named source, and no sentinel lookup. Two further controls distinguish label from identity: an entity id `you` publicly labeled `Count You` keeps third-person agreement, while an unrelated id publicly labeled `you` receives second-person agreement. This confirms the implementation does not infer private identity. The explicit English-pronoun contract and future localization limitation are disclosed in the amendment; neither is an unresolved defect in this scope.

## Exact input and host verification

Reviewer evidence lives under `.superpowers/sdd/task-7a-correction-native-review/`.

`audit-inputs.py` independently reconstructs the original UI diff against 3bc637f and matches the embedded patch SHA256 `f58606f977d265ea0b0f5c2c3b77637c385f4edc5b3266512629ea13624015fa`. It binds the original renderer/tests to their exact code fences, then binds all three amended code fences to the RED/GREEN maps. The other eight proposed file bodies are byte-identical. It checks both baseline snapshots against Git, verifies the three-test import entry and RED/GREEN configuration equivalence, and saves `input-integrity.json` with measured source hashes.

The root-provided reviewer preflight is exactly the author correction preflight with its single output constant changed. Reverse replacement reproduces the complete original bytes; `preflight-output-only.diff` contains that one-line change. I also inspected the original-to-correction host diff: only declared input/output paths, two baseline read overrides and reported counts change. `structural-and-edge-controls.mjs` independently parses all three preflights and proves all 15 original assertion calls are identical. Fresh preflight virtual sources equal the exact GREEN map. There is no assertion bypass or altered source map hidden behind the output relocation.

The frozen correction changes no proposed panel/main/selector source. I read the original complete hunks, including default-hidden Ask-family and coercive-Recruit label changes. Their existing action/value/gating behavior and received-copy boundary remain the same as in the original independently reviewed proposal. This focused review does not claim a new interactive UI test or a fresh execution of the previous review's UI AST scanner.

## Actual independent commands and results

Each command below was invoked by reviewer-owned `run-gate.py`, which captures stdout/stderr as bytes and saves the native child exit before display or post-checking. Every invocation records its exact argument array in `*.command.json`, exit in `*.exit.txt`, and separate protected-input preservation result. The normal-sandbox preflight's partial outputs were preserved in `preflight-sandbox-evidence/` before the native retry.

| Command | Actual result / raw evidence prefix |
| --- | --- |
| `python -X utf8 .superpowers/sdd/task-7a-correction-native-review/audit-inputs.py` | exit 0; independent reconstruction and 141-file before inventory |
| `node .superpowers/sdd/task-7a-correction-native-review/preflight.mjs` — normal sandbox | exit 1 after compiler/lint stages: esbuild cannot read ancestor `../../..`; `preflight-sandbox.*` |
| Same exact preflight — licensed native escalation | exit 0; zero diagnostics in both configurations, one future-key TS2741, all 24 values equal, 11 clean lint files; `preflight-native.*` and `preflight/` |
| `node node_modules/vitest/vitest.mjs run --config .superpowers/sdd/task-7a-correction-validation/vitest-red.config.mjs` | exit 1; **27 failed / 51 passed / 78 total**, all assertion failures; `red-native.*` |
| `node node_modules/vitest/vitest.mjs run --config .superpowers/sdd/task-7a-correction-validation/vitest-red.config.mjs -t 'actual objectifier\|actual enrolled-avatar'` | exit 1; **5 failed / 73 skipped / 78 collected**, exactly the three real-objectifier and two real-avatar cases; `red-targeted-native.*` |
| `node node_modules/vitest/vitest.mjs run --config .superpowers/sdd/task-7a-correction-validation/vitest-green.config.mjs` | exit 0; **78 passed / 1 virtual entry**, no stderr; `green-native.*` |
| `node .superpowers/sdd/task-7a-correction-native-review/structural-and-edge-controls.mjs` | exit 0; unchanged 15 assertions, exact fresh-map equality, compiler/lint output checks, actual 17/7 registry partition, **40 additional edge comparisons**; `structural-edges.*` and `structural-and-edge-controls.json` |
| `python -X utf8 .superpowers/sdd/task-7a-correction-native-review/audit-inputs.py --check-preserved` | exit 0; all 141 protected files unchanged |

Actual native summaries:

```text
RED:      Tests  27 failed | 51 passed (78)
TARGETED: Tests  5 failed | 73 skipped (78)
GREEN:    Test Files  1 passed (1)
          Tests  78 passed (78)
preflight: virtualTypeDiagnostics=0; virtualAppTypeDiagnostics=0;
           futureKeyDiagnostics=1; templates=24;
           registryValuesUnchanged=true; virtualLintFiles=11
edge controls: 35 relational + 3 source + 2 label-vs-identity = 40
```

The RED breakdown is ten corrected fixed/unspecified-role branches, three real-objectifier cases, nine present-tense subject cases, three fallback/object/source cases and two real-enrolled-avatar cases. All 44 original tests pass alongside the seven already-neutral fixed-branch controls. No expectation, threshold, seed, formula, physics or configuration law was weakened.

## Arithmetic and remaining boundary

The exact permanent proposal contains **65 renderer + 6 public-label + 7 panel cases = 78**, preserving the original 33 + 4 + 7 = 44 and appending 32 + 2 = 34. No test is retired or migrated. The future actual baseline remains B/F: 7A1 adds 71 cases/two files; 7A2 adds seven cases/one file, for B+78/F+3. The 40 reviewer edge comparisons are diagnostics only and do not increase the authored or production suite count.

Approval requires the original frozen draft **together with this exact amendment and constraints**. Actual approved Task 4 reconciliation must preserve all intervening Task 3/4 provenance, medium, corroboration, vocabulary, controls and the R20 correction. Apply narrow reconciled hunks, never install old-base whole-file snapshots. No future predecessor hash or test count is certified here.

Actual implementation RED/GREEN, full production tests, literal lint, both typechecks, build/bundle report and separate committed-code review remain required. No production build, simulation gate or interactive UI execution was claimed by this reviewer. Exact sandbox escalations were accepted; the sandbox loader failure was infrastructure evidence, not gameplay RED.

Reviewer writes are confined to this report and the licensed new scratch directory. Original scripts, plans, manifests, probes and reports remain preserved. No production/test/config/docs/index edits, commits, pushes, child agents, installs, external calls or process/UI automation were performed.
