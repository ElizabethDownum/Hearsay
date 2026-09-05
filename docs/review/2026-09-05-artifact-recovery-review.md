# Plan 9 Task 1 fix wave 2 — independent final review

**Verdict:** Needs-fixes — **1 Critical, 1 Important**
**Spec conformance:** No
**Reviewed identity:** base `bd930cc54ea457d855edf2b69347e5ad7cce962f`; exact HEAD `caa5a38fa6470082c2171024028bbe7a1a8556a7`.

The supplied `.superpowers/sdd/review-bd930cc-caa5a38.diff` is byte-identical to `git diff --binary bd930cc..caa5a38`: both hash as Git blob `077f1fb71c3c6358696c95d1c95750e46d68d99a`. The range contains the four stated commits and only the six stated tracked paths. Concurrent untracked `docs/plans/`, `docs/review.html`, and `docs/review/` were preserved.

## Findings

### Critical

1. **[Class (a): mechanism defect; plan-mandated] A checked `credence` read is classified as ceiling-bounded even though it may hold the 0.97 anchor, so the scanner does not establish a single anchor-minting sink.**
   Evidence: `tests/lint/evidence-hierarchy-law.test.ts:638-655`, reached from the assignment extraction at `:473-480` and accepted without a diagnostic at `:715-718`.

   For the declared-boundary form:

   ```ts
   destination.credence = source.credence;
   ```

   `credenceWrites` records `source.credence` as the visible value, then `classify` returns `bounded` solely because it is a property named `credence` (`:638-639`). But P9-2 explicitly allows such a field to hold `ARTIFACT_CREDENCE` after a paper-present viewing. Copying that value into another belief therefore mints 0.97 outside `deliverDocument`, while `anchorSites` does not count it because the verdict is `bounded`, not `anchor`. The same shortcut is what makes `Math.max(existing.credence, ...)` silent, but it is not sound for a transfer between distinct targets.

   This is inside P9-4: both source and destination are checker-visible credence carriers and the write is one of the declared syntactic positions. It is not the accepted class-(c) holder-flow residual. The wave-1 amendment explicitly called a governed `.credence` read bounded, so the defect is plan-mandated and retains full severity. The fix needs a verdict that preserves the possibility `bounded | anchor`, or a target-aware proof for the monotone same-field update, while reporting cross-target copies that may propagate the anchor.

### Important

1. **[Mechanism defect; plan-mandated] Venue/NPC disjointness is not preserved when the avatar is enrolled.**
   Evidence: `src/sim/world.ts:84-98`, especially the only ID guard at `:90`; `src/sim/artifacts.ts:351-365` relies on global namespace disjointness.

   `buildWorld` now rejects fixture NPC IDs that collide with venues, but `enrollPlayer` adds the avatar as a real `Npc` after construction and checks only `world.npcs[id]`. Both of these remain accepted:

   ```ts
   enrollPlayer(worldWithVenueYou, { home: 'square' });
   enrollPlayer(worldWithVenueSquare, { id: 'square', home: 'square' });
   ```

   The resulting `WorldState` again contains the same key in `world.venues` and `world.npcs`. `hasSeen` treats a `to` value as an NPC viewing only when `world.venues[viewer] === undefined`; after such enrollment, a prior avatar viewing is not recognized, so later holders can emit duplicate avatar re-shows and hint rows for a page the avatar has already seen. The G3 construction claim and its comment are therefore false for the public world-construction path. The brief prescribed only `validateTown` and initial `buildWorld`, making this omission plan-mandated; `enrollPlayer` needs the matching venue-ID guard and a firing test.

   A smaller instance of the same guard defect exists at `src/sim/world.ts:30-31` and `src/world/validate.ts:82-83`: `if (sharedId)` does not reject the empty-string ID even though the requirement says any shared ID and no separate invariant prohibits empty IDs. Using `sharedId !== undefined` closes that edge.

## Prior-finding closure

| Prior charge | Status | Evidence |
|---|---|---|
| Critical C-1 — declared credence-write surface | **Mechanically covered for the enumerated syntax; law still not closed** | Assignment operators use the compiler range; property/shorthand/computed-literal, element, update, destructuring, API and nonliteral-element fixtures fire. The new Critical shows the visible-value proof accepts a typed anchor transfer. |
| Critical C-2 — nested anchor classification / one sink | **Open** | The min/max rules now classify the charged nested forms correctly, and the anchor site is counted by verdict. A `.credence` read carrying 0.97 is instead mislabeled `bounded`, bypassing that count. |
| Important I-1 — helper callers by binding | **Closed** | `referencesTo` resolves the `deliverDocument` symbol and fails closed on alias, `.call`, `.apply`, `.bind`, export/value use, and unauthorized direct call. Existing firing tests executed green. |
| Important I-2 — lifetime away from page for days | **Closed** | `tests/sim/artifacts.test.ts:653-683` moves the page to `market`, crosses day-2 and day-3 boundaries, proves Ada never re-holds it, and checks 0.97 at each boundary. |
| Important I-3 — venue/NPC namespaces disjoint | **Open** | Validator and `buildWorld` reject ordinary fixture collisions, but later avatar enrollment recreates the collision; falsy empty IDs also escape both new checks. |
| Minor M-1 — avatar-targeted replay | **Closed** | `tests/sim/artifacts.test.ts:967-997` asserts the `reshow` record, hint row, and whole-world replay hash. The implementation report documents the meaningful live-only one-shot probe and missing historical raw stdout without reconstructing it. |

No new class-(c) checker-disconnected holder flow was found or charged. No class-(b) expansion outside P9-4 is required by this review.

## Independent verification

- Identity/range: exact HEAD and base verified; four subjects and six tracked paths match the charter; `git diff --check bd930cc..HEAD` passed.
- Focused enforcement execution: `npx vitest run tests/lint/evidence-hierarchy-law.test.ts tests/sim/artifacts.test.ts tests/world/validate.test.ts` passed **125/125 in 3 files**. This proves the delivered fixtures fire, but none covers the Critical cross-target credence copy or post-build avatar collision.
- Full suite: `npm test` passed **1713/1713 in 113 files**.
- Typecheck: `npm run typecheck` passed both configured TypeScript checks.
- Build: `npm run app:build` passed, **107 modules**, JS **489.86 kB / 145.07 kB gzip**, CSS **5.26 kB / 1.54 kB gzip**.
- Literal lint gate: `npm run lint` **failed** on the ignored controller artifact `.superpowers/sdd/compare-report-blocks-2026-09-05.mjs:55` (`removed` assigned but unused). A proportional tracked-surface run, `npx eslint src app tests eslint.config.js`, passed. The controller lint log predates or excludes that script, so the claim “`npm run lint` passes in the present checkout” is not reproducible even though the exact-HEAD tracked code is lint-clean.
- Suite arithmetic: G1 is net **+23** tests (26 added `it` declarations, 3 replaced), G2 **+9** (11 added, 2 replaced), G3 **+2**, G4 **+1**. Thus **1678 + 35 = 1713** with 113 files unchanged; no test was retired.
- Complete measurement evidence: the controller logs record soak and MC success; rerunning `.superpowers/sdd/compare-report-blocks-2026-09-05.mjs` against those logs passed **10 complete report blocks / 230 deterministic lines**, with known-good, changed-value, extra-output, and missing-output controls. The independent output is `.superpowers/sdd/task-1-fix2-review-comparison.log`. This supersedes the worker's older selection-based comparison.
- Adopted-WIP/probe disclosure: the resume addendum and implementation report explicitly reconcile both inherited G2 units as keep/correct/complete, attribute G1 to the predecessor, and disclose that old focused RED/full-suite stdout was lost. Current firing tests and full gates were independently rerun; no missing stdout was invented. The two recorded known-bad patches are absent from the tracked diff at reviewed HEAD.

## Limits

I did not rerun soak or Monte Carlo because the charter directs inspection of the complete controller comparison unless it contains an evidence defect or unexplained movement; the complete-block comparator and all four controls passed. Historical temporary-probe execution order cannot be reconstructed from final bytes. The controller-owned ignored comparison script currently breaks the literal lint command as noted above.
