# R46: a watch episode is the district plus its start day (install, review, correction, approval)

Astra I7: the enemy's action ledger recorded a watch by `orderKey` (`watch:<district>`) alone. A
tail drop stands posts down by district AND schedule start day, but a `watch-worked` receipt found
its row by key only, so a second watch on the same district after a stand-down appended its nights
and posts to the stood-down watch's row and inherited that row's subject, lead and start day; the
digest then read one long episode with a mixed identity.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `087bdd3`: **Approved**, 0 Critical / 0 Important / 2 Minor;
- the two Minors are closed by R46-1 `bcc5fe1` (a one-condition hardening plus tests); the
  combined R45-1/R46-1 re-check: **Approved**, 0 / 0 / 0, two nits (below).

Root wrote and executed both commits.

## R46, `087bdd3`

- `src/sim/directives/reports.ts`, `settleEnemyOrderReport`, `watch-worked`: the row is found by
  `(orderKey, scheduleStartDay)`; a missing row is created with the receipt's own subject, lead and
  start day. `orderKey` itself is unchanged, so pending-order reservations, correlations and
  sourceRefs still read `watch:<district>`.
- Tests: new `tests/directives/watch-episodes.test.ts`, an e2e port of the Astra probe (watch
  alpha from day 1, tail drop, watch beta from day 3: two rows, each with its own identity) and
  unit cases through `settleEnemyOrderReport` (a late first-episode night lands on the first row;
  a first-episode night whose row does not yet exist opens its own row after the second's; a
  stand-down removes only its episode's post while the district stays watched).
- RED 4 failed / 4; GREEN focused 374 / 374. Gates: 2,560 tests / 154 files, lint, typecheck,
  build, soak, MC; comparator equal.

## Review: Approved, 0 / 0 / 2

Report: `node_modules/hearsay-r46-review-20261016/REVIEW.md` (gitignored), probes P1 to P8 beside
it. Brief set 823 / 37, wider ledger-consumer set 977 / 42, lint and both typechecks clean.

- **M1.** The `watch-cancelled` branch tries a by-orderKey lookup first. In production it never
  matches (a cancel order's key is `cancel:watch:<district>:<guard>`, and no ledger row carries
  it), so the real path is the district/startDay fallback, which is correct. But the shipped
  stand-down test settled the cancel through the WATCH record and so exercised only the dead path,
  passing because episode 1 was first in array order; the reviewer's P5 cancelled episode 2 that
  way and episode 1 lost its post. Mutants "fallback ignores start day" and "first lookup removed"
  survived the shipped tests.
- **M2.** No shipped test pinned the orderKey half of the new identity: a row keyed by start day
  alone passed everything, although two districts watched on the same night share a start day
  (the digest issues both for day + 1 under `WATCH_CAP`), so d1's receipt would merge into d0's
  row. The reviewer's P7 (two districts, one start day) kills it.
- **Verified clean:** the Astra probe reproduced before and after; stand-down of the SECOND
  episode end to end through a real cancel order (under the RED, `cancelSpecs` found no day-3 row
  and the guard kept its override); every consumer of `actionLedger` (the digest groups by lead
  and reads each row's own posts and subject; `cancelSpecs` already keys by start day; the
  debrief copies rows verbatim); the interrogation branch's orderKey-only key is consistent (the
  digest refuses to reissue an interrogated key); reservations (any report in a group clears the
  group's reservation, so the `delete pendingOrders` shortcut masks nothing); determinism (two
  identical runs give byte-identical enemy state). Nit: a test comment says a reservation
  "lapsed" where it was cleared by the first report.
- **Not verified:** a fully digest-driven two-episode cycle (the runaround was hand-supplied);
  whether a worked receipt can physically arrive after its own episode's cancel receipt (P6 shows
  it would re-add the post; pre-existing, outside R46).

## Correction R46-1, `bcc5fe1`

- **M1.** The by-orderKey lookup in the `watch-cancelled` branch now also requires the spoken
  action's start day; the fallback is unchanged. The stand-down test is replaced by cases that
  issue the real tail-drop order (`applyEnemyDecision({ tailDrops })`) and settle through the
  cancel record, for episode 1 and for episode 2, plus the watch-keyed case that was wrong before
  (RED: 1 failed / 7 on the unchanged source).
- **M2.** A two-district, same-start-day case holds both rows apart.
- Mutants: start-day-only worked lookup, fallback ignoring start day, key-only first lookup, each
  killed by exactly the named case (`.superpowers/sdd/r46-1-implementation-validation/11-mutants.txt`).
- Gates: 2,592 tests / 157 files, lint, typecheck, build, soak, MC; comparator equal.

## Re-check: Approved, 0 / 0 / 0 (two nits)

Report: `node_modules/hearsay-r45-1-r46-1-review-20261016/REVIEW.md` (gitignored), probes in
`tests/review-r45-1-r46-1/` beside it. P5 and P7 now correct; P2/P3 stand down episode 2 end to
end; P6 unchanged (carried); P8 determinism byte-identical; every other `actionLedger` lookup
consistent with the two-part identity (interrogation keys already carry target and topic;
`cancelSpecs` uses both halves; the digest groups by lead; the debrief copies rows). Mutants M2,
M4, M6 killed by exactly the named case; RED confirmed as 1 / 7 on the pre-fix source. Focused
1,039 / 41; full suite serial 2,593 / 157.
- **N1.** The tightened first lookup is redundant: with it removed entirely every test passes, and
  a trace over 1,848 tests found it reached only by the watch-keyed unit case; when a receipt's key
  and district agree it finds the row the fallback finds, and no code produces the disagreeing
  input. Kept as shipped: harmless, and it kills the key-only regression that mattered.
- **N2.** The `cancelOrder` helper checks only `application.kind`; the start day on the settling
  report is passed by hand. The reviewer's P9 confirmed the issued record's application carries
  the right `startDay` for both episodes. Optional hardening (assert it in the helper) is left for
  the next touch of the file.
- Out of scope, noted: issuing episode 2 while episode 1 still stands leaves only episode 2's
  override on the guard, and episode 1's stand-down then aborts; unreachable, since the digest never
  watches a district already watched.

## Carried

- A `watch-worked` receipt that arrives after its own episode's `watch-cancelled` receipt re-adds
  the post and re-marks the district watched (review P6). Whether message ordering can produce it
  is not established; noted for Plan 10 Task 4 (enemy reachability), where the watch cycle is next
  touched.
- The "lapsed" wording in the two-episode test comment (nit); the `cancelOrder` helper's
  `startDay` assertion (re-check N2).
