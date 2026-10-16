# R47: the Codex pairs by observation time; the evening report files by arrival (install, review, correction, approval)

Astra I11: `observedPairs` paired a telling with the latest addressed receive earlier in the ARRAY.
An informant's field report appends older observations after newer ones the avatar heard directly,
so a reception that happened later sat earlier in the log and became the "cause" of an earlier
telling; a truthful channel manufactured a minimizer corroboration against a literalist. Astra
I12: `eveningReport` scoped a day by `IntelEntry.tick`, which an informant's report rightly keeps
as observation time, so a day-0 observation handed over on day 1 was filed under day 0 and was
never "new" on the evening it reached the player.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `580c65f`: **Needs fixes**, 0 Critical / 1 Important / 4 Minor;
- the Important and three of the Minors are closed by R47-1 `8fc4d3a`; the fourth Minor (M1)
  is recorded in the code and carried;
- the combined R47-1/R48-1 re-check of `8fc4d3a`: **Approved**, 0 / 0 / 2 for R47-1; both
  Minors are closed by R47-2 `3361833` (below).

Root wrote and executed both commits.

## R47, `580c65f`

- `src/intel/codex.ts`: the pair is the latest receive by TICK before the tell (same tick: a
  receive logged before the tell), the hit keeping the log's own indexes; still a fold over the
  log alone.
- `src/intel/report.ts`: `eveningReport(log, day, learnedAt?)` takes an optional per-entry
  acquisition tick (`null` falls back to the entry's own tick, so a plain fold reads as before).
  `src/sim/debrief/knowledge.ts`: `learnedAtByEntry(world)`, the debrief's own receipt history
  (`counterKnowledge`) as one slot per board row; `app/src/main.tsx` hands it to the fold beside
  the log, so the fold never sees `WorldState`.
- Tests: `tests/intel/codex.test.ts`, `tests/intel/report.test.ts`, e2e ports of both Astra probes
  (`codex-arrival.e2e.test.ts`, `evening-arrival.e2e.test.ts`, the latter with a source pin on the
  `main.tsx` wiring). RED 7 failed / 21; GREEN 926 / 926.
- Gates: 2,570 tests / 156 files, lint, typecheck, build, soak, MC; comparator equal.

## Review: Needs fixes, 0 / 1 / 4

Report: `node_modules/hearsay-r47-review-20261016/REVIEW.md` (gitignored), probes under
`node_modules/r47-probes/` beside it. Both Astra probes reproduce at `087bdd3` and are fixed at
`580c65f`; fences hold; lint and both typechecks clean; focused 905 / 36; full suite serial
2,570 / 156.

- **I1.** The same-tick rule pairs a receive that cannot have caused the telling. Every utterance
  in a beat is chosen from beliefs held before the beat: speech is collected, logged by
  `captureIntel`, and only then does `ingest` run for every hearer; within a tick, log order is
  phase then actor id, not cause. Real-sim example (seed 70, direct hearing only): ada tells bez
  severity 4 and bez tells ada severity 3 in the same beat; bez, a literalist, retold exactly what
  he held, and the Codex awarded him a minimizer corroboration. Across 200 dense worlds 5.6 % of
  hits were same-tick pairs. R47's own same-tick test pinned the wrong rule. Not a regression
  (0 differences from the old pairing in 11,200 chronological comparisons).
- **M1.** `learnedAtByEntry` dates utterance, asking and presence rows only; informant-delivered
  `scene-presence` and `arcane-residue` rows get `null` and fall back to observation time, so the
  evening report still files them under the day they were seen. Effectively unreachable in play;
  the fallback is acceptable, but it contradicted the "never backdates" note on `CounterKnowledge`.
- **M2.** Pairing scanned the whole log for every telling, O(tellings x n), and `boardView` calls
  `suggestTraits` on every animation frame: 154 ms at 4,000 synthetic rows (45 ms before R47).
- **M3.** The `main.tsx` source pin is loose: it misses a wrong day (mutant survived), a matching
  call left in a comment or dead branch, and `log` re-bound to a filtered array. An App-level test
  is feasible with the `local-pass-wiring` pattern; the reviewer wrote and ran one.
- **M4.** Ties between same-tick receives went to the copy logged last, unpinned: a late informant
  copy of a receive the avatar also saw directly won over the avatar's own row (false hit on a
  literalist); the "earliest-logged wins" mutant survived.
- **Verified clean:** probes before and after; the brief's T-30 / T-10 example, also with the
  earlier receive arriving late; speakerless-magic skip and dedupe unchanged (the "not skipped"
  mutant is equivalent in practice); `learnedAtByEntry` length and rows equal `counterKnowledge`;
  `report.ts` and `codex.ts` still pure folds, only `main.tsx` calls the sim-side clock; no bot,
  harness or sim file imports codex, report or board (comparator unaffected). Mutation table of
  14: M1, M2a, M2d, M3 to M8, M10 killed; M2b (the I1 fix) fails only the same-tick test; M2c,
  M2e, M9 survived.
- **Not verified:** comparator, soak, MC and build were read from the controller's evidence; M2
  used a synthetic log (an idle session collects eight rows); M1 used rows built the way the
  field-report and residue code builds them, not a full night visit.

## Correction R47-1, `8fc4d3a`

- **I1.** `observedPairs` pairs a telling only with a receive STRICTLY before it by tick; the
  same-tick test is inverted (no pair in either log order) and `suggestTraits` is pinned clear.
- **M4.** Decision: ties between same-tick receives go to the row logged FIRST, the copy the player
  saw first (the avatar's own hearing precedes an informant's later copy of the same physical
  receive, whose content that informant may have filtered). Pinned by a direct/copy pair in both
  log orders.
- **M2.** The addressed claimful receives are indexed once per call by (family, addressee); each
  telling scans only its bucket. Live-tree timing on a synthetic six-npc log: 4,000 rows in 4.2 ms per four-family `suggestTraits` (the reviewer measured 154 ms at `580c65f` on its own synthetic log).
- **M3.** `tests/app/report-wiring.test.tsx`, an App-level test from the reviewer's feasibility
  probe, extended with the day pin: the report panel is replaced by a prop-capturing stub, the
  session factory seeds a day-0 observation an informant hands over at tick 1500, the panel state
  starts on `report`, and the captured report must equal the fold over the log, today
  (`dayOf(world.tick)`) and `learnedAtByEntry(world)`, and differ from the plain fold. The source
  regex stays as a second, cheaper pin.
- **M1.** Recorded on `learnedAtByEntry`: an informant's presence or residue row carries no receipt
  there, so the report files it under the day it was SEEN, never later than its true arrival;
  dating those rows is owed when they become reachable in play.
- Mutants, each killed (`.superpowers/sdd/r47-1-implementation-validation/11-mutants.txt`): same
  tick pairs again (`>` for `>=`); tie to the latest-logged row; index or lookup ignoring the
  addressee; `main.tsx` wrong day; dropped clock; sliced clock.
- RED 2 failed / 19 (the inverted same-tick test, the tie rule; the App-level test passes as a
  pin); GREEN intel + app + debrief 910 / 37.
- Gates: 2,598 tests / 159 files, lint, typecheck, build, soak, MC; comparator equal.

## Re-check of R47-1: Approved, 0 / 0 / 2

Report: `node_modules/hearsay-r47-1-r48-1-review-20261016/REVIEW.md` (gitignored), probes under
`.superpowers/rr/` beside it. I1, M3 and M4 are closed as claimed: the literalist same-tick probe
gives no hit at `8fc4d3a` and still reproduces at `580c65f`; a reference implementation of "latest
strictly earlier receive, ties to the first-logged row" matches every hit across 37,800
comparisons; the differential against `580c65f` (11,200 comparisons, 121 differing) is wholly
explained by dropped same-tick pairs, strictly-earlier replacements and tie changes. The
App-level test's `useState` mock does not leak (`tests/app` serial in one worker, report-wiring
first: 510 / 17). Mutants: `<=`, ties to last-logged, key by family only, earliest-by-tick, and
the five report-wiring mutants all killed; the two guard drops survive as equivalent. Full suite
serial 2,598 / 159; lint and both typechecks clean. Not rerun: build, soak, MC, comparator.

- **A. M2 is closed only for few families.** `boardView` calls `suggestTraits` once per family and
  each call rebuilds the receive index over the WHOLE log (the family filter is applied to the
  tells, not the index), so the board is still O(families x n): at 4,000 rows and 200 families the
  all-family `suggestTraits` takes 129.8 ms at `8fc4d3a` against 132.9 ms at `580c65f` and
  27.9 ms before R47; `boardView` 147 ms against the first review's 154 ms. The commit's "4.2 ms"
  is a four-family, six-npc log, not comparable with the 154 ms. With few families the fix is
  real (100.4 ms -> 3.8 ms). Fix direction: skip rows of other families while indexing when a
  family filter is given (19.7 ms in the reviewer's scratch copy).
- **B. The M1 comment is inaccurate** (`knowledge.ts`). Ordinary `presence` rows ARE dated; the
  undated kinds are `scene-presence` and `arcane-residue`, which `counterKnowledge` skips
  entirely, so "unrecorded" is the wrong word too. And they are reachable today: replaying the
  night-visits scenario through `runLogOn` yields a guard-delivered `scene-presence` row with
  `learnedAt: null` that the avatar hears at tick 45. The `CounterKnowledge.timing` doc ("never
  backdates into a calendar") and this comment do not point at each other.

## Correction R47-2, `3361833`

- `observedPairs` indexes only the
  filtered family when a family filter is given (behaviour-identical; pinned by equality with the
  unfiltered result restricted to that family, and benched); the `learnedAtByEntry` comment names
  the real kinds (`scene-presence`, `arcane-residue`), says the debrief skips them and that an
  informant can deliver one today, and points at the `timing` doc.
- Bench at 4,000 rows / 200 families: `boardView(3)` 160.6 -> 32.2 ms, all-family `suggestTraits`
  140.9 -> 18.2 ms. Mutants: inverted filter and filter-on-speaker killed. Gates: 2,618 tests /
  160 files, lint, typecheck, build, soak, MC, comparator equal.

## Carried

- Dating informant-delivered `scene-presence` and `arcane-residue` rows in `learnedAtByEntry`
  (review M1, re-check B): reachable in play through a guard's field report; the evening report
  files such a row under the day it was seen, never later than its arrival.
