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
  is recorded in the code and carried; the combined R47-1/R48-1 re-check covers the correction.

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

## Carried

- Dating informant-delivered presence and residue rows in `learnedAtByEntry` (review M1), if they
  become reachable in play.
