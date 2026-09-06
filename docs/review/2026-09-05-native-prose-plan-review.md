# Task 7A native independent plan review — Needs-fixes

Verdict: **Needs-fixes — 0 Critical, 1 Important, 1 Minor.** Findings are plan-mandated errors in the exact renderer. Completed 2026-09-05 Central. This is a plan review, not implementation approval.

Reviewer: separate native thread, inherited controller capability matching the root author. Scope: frozen prose-foundation proposal only; no production implementation approval.

Frozen draft SHA256 confirmed: `4E75A99545ACCC5269E5BA9CB23E8C02F0EE8EA48687F2ABE5B8A60C5E6AA0A7`.
Author report SHA256 confirmed: `54DBBC55187C4A42CE95BF83007EB7E9306481E9882A0BC3F47DA94A16BC0F9D`.
Initial tracked dirt: the four controller-owned docs named in the dispatch; no production/test changes.

The original preflight writes historical output paths. Reviewer stopped before execution and reported this to root. Root supplied `.superpowers/sdd/task-7a-native-render-preflight-2026-09-05.mjs`, changing only its output directory to the reviewer-owned scratch area. Reviewer inspected that one-line diff before independently executing it. Original script and historical evidence remain preserved.

Initial docs HEAD was `c3e86d57afdb78e1a8bcf23cdc2a7c7800793bf2`, with source/test/config equal to `dc114da3006a75115784e4e894e880dd113226f5`. Root later committed documentation at `3bc637ff82d6a5588e6d91462715f3e4a640ba95`; reviewer verified zero source/test/app/config delta between these docs commits. Root announced a later H10 fix dispatch; this review does not certify that code. Both frozen proposal/report hashes were rechecked unchanged at review completion.

An independent reconstruction proved the embedded UI patch equals the proposal JSON's actual delta against production: SHA256 `f58606f977d265ea0b0f5c2c3b77637c385f4edc5b3266512629ea13624015fa` (UTF-8/LF). All 11 fresh virtual source texts equal both the historical source map and the author's per-file SHA256 manifest. Renderer/test code fences match exact runtime inputs, including their CRLF bytes. Evidence: `task-7a-native-review-2026-09-05/input-integrity.json`.

## Incremental evidence

- Native sandbox preflight exit 1: TypeScript (both configs), the future-key diagnostic and virtual lint completed, then esbuild could not read ancestor `../../..`. This was infrastructure failure, not gameplay RED. Full logs and diagnostics preserved in the owned scratch directory.
- Exact licensed escalation of the output-only preflight copy: native exit 0; zero diagnostics in both compiler configurations, one missing-template TS2741 diagnostic, all 24 registry values equal production, 11 virtual lint files clean.
- Exact original virtual Vitest command: native exit 0; 44/44 cases passed in one isolated probe entry. Fresh raw binary-captured stdout/stderr/exits are saved; no production suite additions are claimed.
- Before/after SHA256 inventories prove historical `task-7a-validation/` files unchanged through both commands.

## Findings

### I1 — Important, plan-mandated: a supplied object deletes fixed predicate facts

**Location:** draft lines 80, 95–97; governing preservation rule at draft lines 12 and 16. Canonical meanings: `src/content/predicates.ts:14`, `:24`, `:25`; `src/content/terms.ts:152`, `:161`, `:162`. The existing trait is at `src/content/traits.ts:167`.

The exact templates replace the predicate's fixed target with the optional person. A real `objectifier` transformation changes only `{ object: 'bez' }`, leaving the predicate unchanged, but the reading line changes as follows:

| Unchanged predicate | Before object-only mutation | After object-only mutation |
| --- | --- | --- |
| `bribed-the-council` | Adelaide bribed the council | Adelaide bribed Benedict |
| `rescued-the-drowning-child` | Adelaide saved a drowning child from the water | Adelaide saved Benedict from the water |
| `gave-alms-to-the-poor` | Adelaide gave alms to the poor | Adelaide gave alms to Benedict |

The council, drowning child and poor are facts of the received predicate. The renderer removes them and assigns a role to Benedict even though no predicate mutation occurred. Exact structured fields remain available, but the newly primary reading line misstates them. This violates the plan's explicit non-relational-object rule and weakens the visible distinction between object and predicate mutations, which matters to trait deduction (`docs/design-spec.md:108`).

**Independent native proof:** `semantic.probe.ts` calls the real `applyTraits([TRAITS.objectifier], ...)`, then the exact proposed renderer. Native exit **1**, **3 failed / 3 passed**: controls prove the delta is object-only and the null-object baseline retains the predicate; all three preservation assertions fail afterward. Full strings and assertion stacks are in `semantic-probe.stdout.log` / `.stderr.log`. This is an expected reviewer counterexample, not a loader error or untraceable existing-suite regression. No assertion or physics was weakened.

**Correction:** retain the fixed-target clause regardless of object and append the existing neutral `involving(object)` phrase, e.g. “Adelaide bribed the council; Benedict is named in the account.” Audit other fixed-target and role-implying branches against the same rule instead of deriving the named person's role from unstated assumptions. Add preservation controls for null, named and `SOMEONE` objects, including a real object-only trait delta. The current 24-case loop checks names, zero, fallback and formatting, but never checks these predicate facts; therefore all 44 authored tests pass with this defect.

### M1 — Minor, plan-mandated: the actual avatar label breaks verb agreement

**Location:** draft `claimNames` addition at line 276 supplies `you`; renderer examples at lines 73–74, 79, 84, 100, 104 and attribution at line 124 hard-code third-person verbs.

The real selector plus renderer outputs “They plainly say that **you has** fallen into bankruptcy. The source is unnamed.” Other affected constructions include “you owes,” “you means,” and “you swears it.” These are legitimate avatar references, not malformed inputs. Meaning remains clear, so this is Minor presentation quality.

**Independent native proof:** `avatar.probe.ts` builds miniTown, enrolls the player, calls the exact proposed `claimNames`, proves the avatar label is `you`, and renders that subject. Native exit **1**, one failed agreement assertion. Exact output and stack are in `avatar-probe.stdout.log` / `.stderr.log`.

**Correction:** choose an explicit grammatical strategy for subject and attribution labels, such as agreement-aware public label metadata or a consistent third-person avatar designation. Preserve the pure/public-data boundary and cover both avatar subject and avatar attribution; no hidden-state lookup is needed.

## Seven bounded charges

| Charge | Disposition and independent evidence |
| --- | --- |
| 1. Unchanged registry, completeness, public facade | **Pass.** Every registry value equals production. `RegisteredPredicate = keyof typeof DEFINITIONS` uses actual literal keys, while the exported `Record<PredicateId, PredicateDef>` facade remains. Native preflight confirms 24 values unchanged. The future-key probe fires one TS2741 diagnostic requiring `future-prose-sentinel` in `src/content/render.ts`; both unmutated compiler configurations have zero diagnostics. |
| 2. Seven fields and honest prose | **Needs-fixes: I1; M1 also affects prose.** Count zero survives; null place/count are omitted; `SOMEONE` bypasses name lookup; unknown/prototype keys use an own-key-checked fallback. Severity changes emphasis without reading credence, no units are invented, and contradictory geography stays explicitly the received place. I1 nevertheless deletes predicate meaning and supplies unwarranted roles in the reading line. |
| 3. Public names, transient composition root, props-only panels | **Pass on information boundary.** The selector iterates `townMapFor(world)`'s existing venue/directory view and reads directory members' names plus the known avatar label. No serialized world/map field or hidden knowledge input is added. Unknown IDs fall back unchanged. Main constructs an own-key-checked callback; panels receive it. Four native authored selector tests pass, including public scope, hidden-field twins and purity. M1 is grammar, not a knowledge leak. |
| 4. Action values, pending/local offers, payloads, hidden controls, empty board | **Pass.** Independent TypeScript AST inspection proves all 206 `onClick`/`onChange`/`disabled`/`value` attributes in DayPlanner and all 7 in main unchanged. `payloadsFrom`, `defaultDirectiveDraft`, `missionOf`, `directiveIntentFrom`, `directiveIssues`, and `DayPlanner` function bodies are unchanged. Ask-family and coercive-Recruit hunks were inspected directly: only passed labels and option text change; values, modes and callbacks remain. Default-visible SSR controls and empty-board refusal pass. No hidden-mode interactive test is claimed. Evidence: `ui-integrity.json`. |
| 5. Details, diffs, report copies, escaping, dl structure | **Pass within foundation scope.** Raw rows read their supplied `reported`; cluster lines read each stored version; exact field comparison and `diff-cell` logic remain inspectable in details; routes remain. Directives render only received report copies or unchanged observation text. React text children escape names. `Fragment` leaves dt/dd direct grid children (`app/src/theme.css:247`). Seven authored SSR cases pass. Later changed-span/debrief prose is not certified here. |
| 6. Unknown Task 3/4 predecessor; additive reconciliation | **Pass as a plan boundary; future work remains open.** Draft lines 4–7, 13, 228–232 and 869–875 explicitly prohibit wholesale snapshot application, require the actual approved Task 4 predecessor plus narrow reconciled hunks, and preserve magic controls/provenance/medium/vocabulary. No future hash/count is invented. Current probes certify current-source compatibility only. |
| 7. 33 + 4 + 7 = 44; virtual evidence only | **Pass.** Exact original Vitest command independently passes 44/44 in one probe entry, native exit 0. Renderer arithmetic: 24 registry iterations plus 9 edge cases; selector 4; panels 7. Chunk arithmetic is +37/+2 files then +7/+1 relative to the future predecessor. Neither authored cases nor reviewer diagnostic cases were added to the production suite. |

## Exact executed evidence

All paths in this section are under `.superpowers/sdd/task-7a-native-review-2026-09-05/` unless stated otherwise.

| Check | Native result | Evidence |
| --- | --- | --- |
| `node .superpowers/sdd/task-7a-native-render-preflight-2026-09-05.mjs` in normal sandbox | exit 1: esbuild ancestor access denied after compiler/lint stages | `preflight.*`; initial diagnostics copied to `sandbox-preflight-evidence/` |
| Same exact preflight command with licensed escalation | exit 0; compilers 0 diagnostics, missing-template diagnostic 1, 24 unchanged values, 11 virtual lint files clean | `preflight-escalated.*`, `types-current.json`, `types-app.json`, `types-future-key.json`, `virtual-lint.json`, `proof.json`, `samples.json` |
| `node node_modules/vitest/vitest.mjs run --config .superpowers/sdd/task-7a-validation/vitest-proposal.config.mjs` | exit 0; 44 passed / 1 file | `proposal-tests.*` |
| `python .superpowers/sdd/task-7a-native-review-2026-09-05/audit-inputs.py` | exit 0 | `input-integrity.json`, script preserved |
| `node .superpowers/sdd/task-7a-native-review-2026-09-05/ui-integrity.mjs` | exit 0 | `ui-integrity.json`, script preserved |
| Vitest with this directory's `vitest-semantic.config.mjs` | exit 1; 3 semantic failures / 3 controls passed | `semantic-probe.*`, exact probe/config preserved |
| Vitest with this directory's `vitest-avatar.config.mjs` | exit 1; 1 agreement failure | `avatar-probe.*`, exact probe/config preserved |

For each native gate, `run-gate.py` uses subprocess argument arrays, captures stdout/stderr as bytes, writes the actual child exit to `.exit.txt`, and inventories historical validation hashes before/after in `.manifest.json`. Every historical inventory remains unchanged. Automatic review accepted the exact native escalations; no configuration or permission bypass was used.

## Disclosures and remaining work

- The output-only preflight copy was supplied by root after the reviewer reported the historical-overwrite risk. Only its output constant changed; assertions and input paths are identical.
- An initial reviewer input-audit assertion compared Python newline-normalized code with Node's CRLF-preserving text. That audit-vehicle mismatch was corrected to compare exact decoded bytes; final integrity audit passes without changing any proposal/source input.
- No whole production suite, production build, simulation gates or interactive UI actions were rerun by this plan reviewer. These virtual compiler/lint/runtime checks are planning evidence only.
- Findings were saved incrementally. Reviewer writes are limited to this report and the owned scratch directory. No source/test/plan/index edits, commits, pushes, child agents or external calls occurred.
- Resolve I1, address or explicitly disposition M1, then independently re-review the revised frozen proposal. Actual Task 4 base reconciliation, implementation, full gates and separate code review remain required afterward.
