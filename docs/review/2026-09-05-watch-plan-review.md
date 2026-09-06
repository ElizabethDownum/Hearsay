# Independent plan review — R16 self-presence / R17 watch-stage corrections

**Status:** COMPLETE
**Verdict:** **Approved-for-implementation** for both proposals, strictly in the order R16 → gates
→ separate code review → R17 → gates → separate code review. Zero Critical, zero Important.
Three Minor carries (a)–(c) and three deferred observations (d1)–(d3) below. None blocks.
**Reviewer seat:** claude-fable-5-1, file-only (Read/Glob/Grep/Edit/Write). I inspected the
proposals, the actual source, the existing tests and root's saved native traces. I could not run
vitest, tsc, eslint, the build, soak or MC, and I did not compute any hash. Nothing here is an
independent code approval; root's virtual runs are evidence I assessed, not executions of mine.
Implementation still requires the full six gates and a separate reviewer with native execution.
**Brief:** .superpowers/sdd/watch-corrections-plan-review-brief.md
**Owned output:** this file only. No other file was touched.
**Date:** 2026-09-05

## Snapshot check

- The brief's SHA-256 values for the two drafts cannot be recomputed in this seat.
- Substitute check performed: `.superpowers/sdd/r16-validation/virtual-sources.json` and
  `r17-validation/virtual-sources.json` (the exact files vitest loaded for the RED/GREEN logs)
  were compared with the drafts. The virtual evaluator.ts is the current evaluator.ts plus exactly
  the one R16 clause; the virtual execution.ts is the current execution.ts plus exactly the one R17
  clause; the virtual R17 tree also carries the R16 clause (the "common R16 proposal"). Both
  virtual test files are the drafts' test blocks verbatim. The RED/GREEN evidence therefore
  corresponds to the proposed text.
- Diff anchors match current source: evaluator.ts:118-121 (`contradicted` predicate, one
  occurrence of the anchor line) and execution.ts:861-867 (`enemy-watch` arm, anchor unique).
  The brief states docs HEAD 4251cfd has source identical to dc114da; I verified the anchors
  against the working tree, not against a commit.
- No snapshot mismatch was demonstrated. Review proceeded.

## What I read

Drafts, constraints and author reports for R16 and R17; r16/r17-validation logs, diffs, proof
and diagnostics files; `task-5a2-validation/pre-r17-watch-history.json`; src/sim/directives
evaluator.ts, execution.ts, types.ts, state.ts, reports.ts (settlement), mutation.ts (envelope
delta), transport.ts (attemptHop/realizeNetworkForward); counterintel.ts orderBrief (watch
authoring, lines 196-212); enemy/state.ts WATCH window; phases.ts phase order (markDirectiveDue
in phase 1, attemptDirective in phase 4, settleDirectiveApplications then
expireDirectiveExecutions in phase 5); agents.ts positionOf/circlesAt; step.ts runUntil;
tests: evaluator, execution, enemy-orders, red-herring.e2e, plan11-proof.e2e,
enemy-integration, legacy-dispatch, handler-delivery, mutation, minitown helper, soak report;
docs/review/current.md R9/R16/R17; docs/review/2026-09-05-debrief-model-preflight.md;
project AGENTS.md, docs/handoff.md; the copied worker context (partnership, machine, Claude
binding, workspace loader, orchestrate skill and its SDD execution annex).

## Charge 1 — R16: does the one clause solve the measured contradiction lawfully?

**Yes.** Findings:

1. **Mechanism confirmed from source.** counterintel.ts:202-203 authors every watch order with
   `expected-presence { person: post.guard, venue: post.venue, at: startDay*1440+960 }`, i.e.
   the recipient's own presence. execution.ts:47-56 `localFeed` filters `npc.id !== actor`, so
   the feed handed to the evaluator can never contain the recipient. evaluator.ts:118-121 then
   marks the row contradicted whenever the guard is standing at the post venue at or after the
   window start. The guard is blocked precisely when they are where they were told to be.

2. **The clause is exactly "self at the local venue is present".** `row.person !==
   input.recipient.id` is evaluated only after `input.local.venue === row.venue` (short-circuit),
   so a self row at another venue keeps today's behaviour (inert, like every other-venue row) and
   a self row at the current venue is satisfied by the recipient's own supplied location. Both
   inputs already exist on `ReceivedBriefInput`; no world read, no synthesized observation, no
   change to `localFeed`. The evaluator fence tests (evaluator.test.ts:148-157) remain satisfied.

3. **Other actors and avoid/time guidance are untouched.** The other-person observation clause
   is unchanged; `before`/`after` return before the predicate (evaluator.ts:114-116); `forbidden`
   (avoid-venue / avoid-person) is computed independently (123-124). The eight table cases in
   the draft pin exactly these boundaries and I re-derived each expected method by hand from the
   evaluator: relationship 0.8 + office → attempt; no purpose/note → literal initiative; quiet
   −1, relationship +1 → measured risk; so any contradiction or forbidden venue yields `hold`.

4. **No policy or constant changes.** Report policy, WATCH window, WATCH_ORDER_DAYS, beats,
   priorities and commitment points are untouched. Interrogation orders (person = target),
   inquiries and cancel-watch (no guidance) are unaffected. The self row becomes fully inert,
   which is what the authored intent needs; its `at` was already only a start-time gate.

5. **Disclosure the draft understates (not a defect):** the clause also repairs any
   player-authored directive whose expected-presence row names the recipient (the DayPlanner
   composer permits it; tests/directives/enemy-orders.test.ts:650 hand-authors one for `cyn`).
   The mirror test compares the player posting and enemy watch pairwise, so it stays green
   because both twins change identically. The implementation report should say this.

6. **Pre-fix production behaviour, for the soak/MC comparison:** the defect only bites when the
   guard's ordinary schedule places them at the post venue at the attempt beat. When the guard is
   elsewhere at 16:15 the venue check short-circuits and the watch starts today already. In the
   miniTown fixture (everyone at `square` all day) the guard defers at every beat of the window
   and the default-policy control shows `deferred, changedAt 2580` at 19:01. In the red-herring,
   plan11 and enemy-integration fixtures the post differs from the guard's ordinary venue, so
   those suites should not move. Generated towns may contain the coincidence; compare complete
   MC blocks rather than assume.

## Charge 2 — R17: state transitions, the precondition, and the duplicate

**Every enemy-watch record path, from source (execution.ts):**

| Step | Where | Resulting `execution` |
|---|---|---|
| Issue | counterintel.ts applyEnemyDecision → state.ts issueDirectiveRecord | `null` (received `null`) |
| Receipt | transport.ts receiveFinal → initializeDirectiveReceipt:205-215 | refuse → `aborted`; defer → `deferred` (due = receipt+1 day); attempt → `pending` (due = actAt; for a watch received before the window: window start + 15) |
| Phase 1 due | markDirectiveDue:237-250 | same state, `dueAt = changedAt = tick` |
| Phase 4 attempt | attemptDirective:642-661 | refuse → `aborted`; defer/hold → `deferred` (next beat) or `aborted`; attempt → `attempted` with `workedDays: []` via startApplication enemy-watch arm:544-559, which is also the only place the watch override is installed |
| Phase 5 latch | settleDirectiveApplications:861-882 | today: any non-terminal state counts work when position/day/beat/window hold; proposed: `attempted` only |
| Expiry | expireDirectiveExecutions:792-808 / expireDirectiveActsBeforeCollection | `aborted` at `active.until` (see d2) |

**Is `attempted` the exact correct precondition?** Yes.
- `attempted` is written by the enemy-watch arm and nowhere else for this application; it is the
  only state in which the street override exists, so "execution has started" and "the guard
  stands the post by order" coincide.
- `adapted` is unreachable for an enemy-watch record: attemptDirective branches on
  `interpretedApplication` (654-661) and mutation.ts applyEnvelopeDelta only edits fields of an
  existing `application` (lines 111-136), never its kind, so an enemy-watch always takes the
  `startApplication` branch. Even the standard-path `adapted` is overwritten to `completed` in
  the same call for an observe method.
- `pending` and `deferred` never have the override installed; counting them credits a guard for
  coincidentally standing at a venue by their own schedule. The constraints file forbids it.
- `awaiting-answer` never occurs for a watch; `completed`/`aborted` are already skipped.
- Nothing legitimate is excluded: a late-attempted watch (existing pin enemy-orders.test.ts:438)
  is `attempted` at the attempt tick and counted from the next beat, exactly as today.

**Can pending/deferred work produce the observed duplicate independently of Task5A2 metadata?**
Yes, from source alone: the latch has no state check (861-867) and the enemy-watch arm resets
`workedDays` to `[]` (556-557). Sequence with R16 in place and a guard at the post venue by
schedule: 2400 `pending` → work day 1 + report #1; 2415 attempt → `attempted, workedDays: []`;
2430 → work day 1 again + report #2. The pre-R17 trace shows exactly this (`pending` with
`[1]` at 2401, `attempted` with `[]` at 2416, `[1]` at 2431, two `watch worked` outcomes at
2400 and 2430). The R17 base RED ("expected [...] to have a length of 1 but got 2") ran on a
virtual tree containing only execution.ts, evaluator.ts and the test — no Task5A2 code — so the
duplicate is production behaviour, not a recording artefact. The metadata proposal revealed it.

**Pre-R16 production also has the premature report, once per night at most:** at 2400 the record
is `pending` with `changedAt` = receipt tick, so it counts; from 2415 on, every deferral beat sets
`changedAt = tick`, so the `changedAt < tick` guard skips the latch. HQ therefore receives a
`watch worked` report for a watch that never started. R17 removes this too.

## Charge 3 — tests

**R16 (10 tests).** Non-vacuous: base RED 3/10 in root's log matches my derivation (table case
1 and the eight-dimensional equality fail on `hold` vs `observe`; the full-loop test fails at
`workedDays toContain(1)` because the deferral at 2415 replaces `execution` and drops
`workedDays`). The table cases test the real consumer (`evaluateReceivedBrief`) and the
full-loop test uses the real authored watch through `runUntil`, asserting the actual `outcome`
report policy (counterintel.ts:206) without editing it. The `hashWorld` equality is a
deterministic cloned-run check from identical post-setup state; the draft labels it correctly
and does not call it live≡replay. Purity check is real (`JSON.stringify` before/after).
- **Minor (a):** `expect(report).toBeDefined()` (draft test line 137) does not discriminate on
  the current base: the pre-R17 latch queues a `watch worked` report at 2400 while `pending`
  (bez is at `square` by ordinary schedule), so a report exists even when R16 is absent. The
  test as a whole is still RED on base via `workedDays`. Optional strengthening, no policy
  change: add `expect(record.execution?.state).toBe('attempted')` after `runUntil` — RED on
  base (`deferred`), GREEN with R16, and it states the repaired fact directly.
- **Minor (b):** the synthetic table brief uses `report: 'full'`. Method selection never reads
  report policy (evaluator.ts:146-175 use it only for `reportAt`; 217-225 only for disclosure),
  so outcomes are unaffected. Fidelity-only suggestion: `'outcome'` to mirror the authored
  watch; not required.

**R17 (4 tests).** Non-vacuous: base RED 3/4 on virtual R16 matches source reasoning (pending
and deferred both count on base; full loop yields two reports). The two table cases hand-set a
legitimate state shape (`deferOrAbort` produces exactly `{deferred, changedAt, dueAt: null,
waiting: null}`) and call the real latch. The attempted control relies on bez's ordinary
schedule rather than an installed override; acceptable for a latch unit test because the
full-loop case exercises the real override path with authored guidance and `outcome` policy,
and additionally pins `occurredAt > changedAt` (2430 > 2415). Staging is correct: RED must be
re-measured on the actual committed R16 base, as the draft requires.

**Existing suites (affected-path review, not a re-run):** legacy-dispatch (person `bez`,
recipient `ada`), handler-delivery (person `otto`, recipient `mira`), execution.test.ts:241
(person `bez`, recipient `ada`) and mutation.test.ts all use other-person rows: unaffected by
R16. red-herring, plan11-proof and enemy-integration attempt with the guard away from the post
venue: unaffected by both. enemy-orders is the one suite whose watch pin changes evidence path
(finding c). Root's virtual regressions (39/3 and 30/3) cover the three most exposed files.

## Charge 4 — licenses, order, counts, compilers, gates

- Files: R16 = evaluator.ts + new tests/directives/self-presence.test.ts; R17 = execution.ts +
  new tests/directives/watch-execution-stage.test.ts. No other paths. Root owns the index.
- Order: plan review → R16 → six gates → separate code review → R17 (on committed R16) → six
  gates → separate code review. The order is load-bearing (finding c), not advisory.
- Counts: R16 8+2 = 10 new tests, +1 file → expected 1790/115 from 1780/114. R17 2+2 = 4,
  +1 file relative to its actual predecessor. Regression arithmetic checks: 14+15+10 = 39 and
  11+15+4 = 30, matching the logs. Type diagnostics files for both tsconfigs are empty arrays;
  lint 0 per proof.json — root's runs, not mine.
- Types: `record.execution.state === 'attempted'` is a valid comparison on the narrowed union;
  `row.person` is narrowed by the preceding `row.kind === 'expected-presence'`.
- Gates: both drafts name npm test, lint, typecheck (both configs), app:build, soak, mc with
  independent exits and complete-report comparison. Soak (tests/world/soak.report.test.ts) is a
  town-generation validator with no tick loop and no enemy, so it cannot move for these
  corrections; MC (tests/harness) has enemy-active probes (procgen enemy-active,
  pressure-escalation, digest-cost) that can move if a digest posts a guard at their own venue.
  Compare complete blocks; do not pre-claim unchanged metrics. No constant, threshold, seed or
  physics retune is proposed or permitted.

## Charge 5 — bounds and deferred observations

Findings are bounded to the two clauses and their tests. Task5A2 metadata was used only as
evidence of the pre-R17 trace and is not part of this approval. Deferred, out of mandate:

- **(d1)** After a `cancel-watch` removes the override (execution.ts:578-591), the original watch
  record stays `attempted` until `active.until`. If the guard's ordinary schedule puts them at
  the post venue during 960–1140, the latch keeps queuing `watch worked` and reports.ts:142-169
  re-adds the post and district to HQ's ledger, undoing the cancellation in HQ's books.
  Pre-existing; R17 neither causes nor fixes it. An override-presence precondition (mirroring the
  posting arm at 847-853) would close it. Separate bounded proposal.
- **(d2)** expireDirectiveExecutions aborts a fully worked watch at `active.until` with a
  `refused` report ("the active window ended without an answer"); the trace shows it at 12659
  after eight worked nights. Already recorded under HTML R9 as the recording gap (Task5A2/5B).
- **(d3)** The latch reads the received brief's application while the attempt reads the
  interpreted one; a place-mutating trait could make override venue and latch venue disagree.
  Only reachable with non-literalist traits. Not in scope.

## Findings table

| # | Severity | Location | Failure scenario | Minimal correction |
|---|---|---|---|---|
| a | Minor | r16 draft test, `expect(report).toBeDefined()` | Passes on unfixed base because the pre-R17 latch queues a report at 2400 while `pending`; assertion carries no RED weight | Optional: also assert `record.execution?.state` is `'attempted'` after the run |
| b | Minor | r16 draft synthetic `brief.report: 'full'` | None (method ignores report policy) | Optional: use `'outcome'` for fidelity |
| c | Minor, execution note | R17 ordering; tests/directives/enemy-orders.test.ts:118-122 (`executeOrder('watch')`) | If R17 is applied to a tree without R16, the attempt at 2415 holds on the self row → `deferred`, the new state guard skips the latch, `workedDays` is `undefined` and this existing pin REDs. Today the pin passes only via the deferred-state work path; under R16 it passes via `attempted` | Keep the drafted order. Never weaken the pin. Record in the R16 implementation report that this pin's evidence path changed |
| — | none | R16 clause evaluator.ts:120 (inserted after 119) | — | Approved as drafted |
| — | none | R17 clause execution.ts:862 (inserted after 861) | — | Approved as drafted |

Plan-mandated defects: none found. Constraints vs stated intent: no conflict found for either
proposal.

## Optional probe for root (unchanged dc114da, no source edit)

Demonstrates finding (a) and the pre-R17 premature report on the current base. Place under a
scratch entry that the existing `vitest-proposal.config.mjs` pattern collects; do not commit.

```ts
import { expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { runUntil } from '../../src/sim/step';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../../tests/sim/helpers/minitown';

it('base: a pending watch already queues a watch-worked report at 2400, then the deferral erases the day', () => {
  const town = miniTown();
  town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) {
    npc.traits = ['literalist'];
    npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
  }
  const world = buildWorld(town, 'base-latch-probe', RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [],
    watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
  const record = world.network.directiveState!.records[0]!;
  const reports = () => world.network.directiveState!.messages.filter((m) =>
    m.payload.kind === 'directive-report' && m.payload.directiveId === record.id);
  runUntil(world, 2401, RULES);
  expect(record.execution).toMatchObject({ state: 'pending', workedDays: [1] });
  expect(reports()).toHaveLength(1);
  runUntil(world, 2581, RULES);
  expect(record.execution).toMatchObject({ state: 'deferred' });
  expect(record.execution!.workedDays).toBeUndefined();
  expect(reports()).toHaveLength(1);
});
```

Expected on the unchanged base: passes. Import paths assume the probe sits two directories
below the repo root; adjust the relative paths to wherever root places it.

## Riders for the implementer (both tasks)

1. Apply each diff by its anchor after confirming the anchor occurs once; never paste a
   whole-file copy over a later migration.
2. Re-measure RED on the actual base before the clause (R16 on committed production, R17 on
   committed R16), then GREEN, then the six gates, pasting native output and exits.
3. Compare complete soak and MC report blocks against the prior baseline. Soak is structurally
   independent of these clauses; any soak delta means something else changed and is BLOCKED.
   Explain any MC delta by locating a digest-issued watch whose guard is ordinarily at the post.
4. Land R17 promptly after R16's review: between the two commits a coincidental-venue guard
   emits two night-1 reports (2400 premature, 2430 real); HQ's ledger dedups by day, message
   traffic does not.
5. Do not touch WATCH, WATCH_ORDER_DAYS, beats, priorities, report policy or seeds to get green.

## Verdict

**Approved-for-implementation** — R16 then R17, as drafted, with Minor carries (a), (b), (c) and
deferred observations (d1)–(d3) recorded for later proposals. This is a file-only plan review:
I inspected proposal, code and root's evidence and could not execute tests, compilers, lint,
build, soak or MC. Root's gates are not my independent code approval; the implemented commits
still require full gates and a separate reviewer with native execution access.
