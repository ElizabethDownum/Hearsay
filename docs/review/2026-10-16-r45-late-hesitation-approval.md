# R45: an overdue hesitation still produces the later answer (install, review, correction, approval)

Astra I8: a candidate who asks for time composes the hesitation for the beat after they have
left, so the words wait in their hands until the two meet again. If that hand-over came after the
candidate's day to decide had run out in transit, `scheduleRecruitmentDecision` returned without
scheduling anything (its setup would have been due in the past), the approach stayed `waiting`
for ever and the later answer was never given.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `7d9ff28`: **Approved**, 0 Critical / 0 Important / 3 Minor (test coverage and the
  commit message, not behaviour);
- the Minors are closed by the test-only R45-1 `c648d7b`; the combined R45-1/R46-1 re-check:
  **Approved**, 0 / 0 / 0.

Root wrote and executed both commits.

## R45, `7d9ff28`

- `src/sim/network/recruitment.ts`, `scheduleRecruitmentDecision(world, approach, tick)`: when
  the deadline is at or before the receiving tick, the decision is marked due at the deadline the
  candidate kept (`markRecruitmentDecisionDue`) and nothing is scheduled; the candidate answers at
  the first beat they stand in a circle, the answer travelling physically as ever. The deadline is
  left as the truth; an in-time hesitation is scheduled exactly as before.
- Tests in `tests/network/sound-out.e2e.test.ts`: the late path (cass hears the approach at 15,
  leaves, returns on day 2; the held hesitation is handed over at `at(2,0)`, the real answer
  follows one beat later in the square, the approach closes and the record completes), the
  in-time path unchanged, and seed + log regrowth.
- Gates: 2,556 tests / 153 files, lint, typecheck, build, soak, MC; comparator equal.

## Review: Approved, 0 / 0 / 3

Report: `node_modules/hearsay-r45-review-20261016/REVIEW.md` (gitignored), probes under
`r45-review/`. `tests/network` 249 / 17, lint and both typechecks clean, full suite serial
2,556 / 153.

- **M1.** The `due === tick` boundary is handled correctly (`<=` is right: `prepareTick` lists the
  tick's setups before delivery, so a setup due NOW would never run) but untested: the `<` mutant
  left the approach waiting with a dead setup and passed the file. The reviewer's probe (cass
  returns at 1455, the deadline) closes with answers at 1455 and 1470.
- **M2.** The late-path test pinned neither "no leftover setup" nor the value of
  `decisionDueAt`: dropping the early return (mark AND schedule) leaked an unreachable setup into
  the save and the hash and passed; marking due at the receipt tick instead of the deadline
  behaved the same (nothing outside the module reads the value) and passed.
- **M3.** The commit message misdescribed the mechanism twice: the pre-fix code scheduled nothing
  (not "scheduled and never ran"), and the late hesitation is delivered as a network-forward act
  in phase 4, after that tick's answer intents were collected, so the answer comes at the next
  beat, which is the observed `at(2,0) + 15` either way. The code comment is accurate.
- **Verified clean:** the Astra probe reproduced before and after; the overdue path is reached
  only in `waiting`, writes only `decisionDueAt`, leaves `resolveAt`, pushes no setup and runs
  once; live == replay for the late and boundary cases (the shipped regrowth test compares replay
  with replay); no RNG or clock reads added; the single caller chain means direct hesitations get
  the same fix.
- **Not verified:** build, soak, MC and the comparator were read from the controller's evidence;
  a direct-recruitment world with a late hesitation was judged from the shared code. The reviewer
  disclosed having a behaviour-identical mutant applied for about two seconds while its full suite
  ran, with the file restored byte-identically; the focused run preceded any mutation.

## Correction R45-1, `c648d7b` (test-only)

- The late-path test stops one tick after the hand-over and pins: still `waiting`,
  `decisionDueAt === resolveAt`, no `recruitment-response` row in `scheduledSetup`; and no such
  row at the close.
- A boundary case: cass returns exactly on the deadline tick (1455); the hesitation is spoken on
  that tick, the decision is marked due at it with nothing scheduled, the real answer follows one
  beat later, the approach closes.
- The staging helper takes the return window; the commit message corrections are recorded here.
- Mutants: `<` for `<=`, mark due at the receipt tick, mark and schedule, each killed
  (`.superpowers/sdd/r45-1-implementation-validation/11-mutants.txt`).
- Gates: 2,593 tests / 157 files, lint, typecheck, build, soak, MC; comparator equal.

## Re-check: Approved, 0 / 0 / 0

Report: `node_modules/hearsay-r45-1-r46-1-review-20261016/REVIEW.md` (gitignored). A temporary
trace on `scheduleRecruitmentDecision` showed the three tests on their three branches: late
`{due 1455, tick 2880}` (`<`), boundary `{due 1455, tick 1455}` (`===`), in-time
`{due 1470, tick 120}` (future), so the M1 claim holds. Mutants `<` for `<=`, mark at the receipt
tick, mark and schedule, and always-overdue each killed by the named assertion. The pre-fix code
at `ff2f7dd` scheduled nothing, confirming the M3 record. Full suite serial 2,593 / 157; lint and
both typechecks clean. Not re-run: build, soak, MC, comparator.

## Carried

- Nothing.
