# R41: a pending local moment can be let pass (install, review, correction, approval)

Astra I1: a requested or offered local moment blocks time and travel until something consumes it,
and the empty day-zero safehouse circle offers nothing to choose. The session already had
`cancelLocalInteraction`; no control called it, so the campaign stranded at that tick. Astra M4:
the session was built with a `useRef` argument evaluated and discarded on every render.

The unit was independently reviewed twice, by native Claude Opus workers who wrote none of it:
- first review of `48667d4`: **Needs fixes**, 0 Critical / 1 Important / 3 Minor (test-only; the
  production change was judged correct);
- re-check of the correction `a002dd9`: **Approved**, 0 / 0 / 3 (test-side), for the correction and for the whole unit; the three Minors are closed by the test-only R41-2 `7e7f6f6`;
- the combined R41-2/R42-2 re-check of `7e7f6f6`: **Approved**, 0 / 0 / 0 for R41-2.

Root wrote and executed both commits.

## R41, `48667d4`

- `app/src/panels/DayPlanner.tsx`: a required `onCancelLocal` prop and a "let the moment pass"
  button in the planner body, enabled whenever a moment is pending (requested or offered). The
  button sits outside `LocalMoment`, so it covers the requested state, before any offer exists.
- `app/src/main.tsx`: `passLocal` cancels through the session, clears the shell's requested latch
  and toasts a plain literal. Offers are never logged (they are written only inside `finishTick`),
  so passing touches no save and the beat plays as an ordinary tick.
- M4: the session is built once through a lazy `useState` initialiser.
- Tests: the panel walks the element tree to prove the button calls `onCancelLocal` in both
  pending states and is disabled with nothing pending; a session regression stages the empty
  safehouse offer (stuck, pass, travel accepted, time advances, save unchanged, live == replay).
- Gates: 2,512 tests / 150 files, lint, typecheck, build; soak/MC comparator equal.

## Review 1: Needs fixes, 0 / 1 / 3

Report: `node_modules/hearsay-r41-review-20260927/REVIEW.md` (gitignored). Full serial suite in
the snapshot 2,513 / 151 (the controller's count plus one probe file).

- **I1.** The composition root, where the defect actually lived, had no test. The panel test
  spied its own prop and the session test called the session directly, so three `main.tsx`
  miswirings passed every app test: pass wired to request, pass without the session cancel, and
  pass without clearing the shell latch. The third re-stranded the player in the UI while the
  session was free. SSR cannot observe the latch (state set after render is a no-op), so the
  reviewer proposed deriving pending-ness from the session and deleting the duplicate latch.
- **M1.** Cancelling a requested moment that has not been reached was untested (a cancel that
  cleared only the offer survived).
- **M2.** Pass stays enabled after a local act is chosen; clicking it discards the chosen act,
  unlogged, and a re-request re-offers the same beat under a new token. Replay-safe and leak-free,
  but an unstated "withdraw a choice" capability under a "let the moment pass" label. The reviewer
  asked for a decision: disable, or document and pin.
- **M3.** The M4 pattern survived one line below (`useRef(makeClock())`), and M4 itself rests on
  code reading, since SSR cannot tell lazy from eager.
- **Verified clean:** `prepareTick` is read-only on the world, so dropping a prepared frame and
  re-preparing the same tick is identical; offers and choices are logged only in `finishTick`;
  the button is correctly not gated on the clock; the toast policy and the UI jargon law still
  bind; `DayPlanner` imports no sim value.

## Correction R41-1, `a002dd9`

- **I1.** The shell latch is gone. `Session.localPending()` is the only source of the fact "a
  moment is requested, offered or chosen and its beat has not played", and the planner reads it
  directly, so the shell cannot disagree with the session. `tests/app/local-pass-wiring.test.tsx`
  mounts `App` with a prop-capturing planner stub and drives the exact callbacks `App` hands it
  against the exact session `App` owns.
- **M1.** A requested moment not yet reached can be let pass (session test: request, advance,
  cancel, save unchanged, advance to completion, live == replay).
- **M2, decided: document and pin, not disable.** Passing after a choice withdraws it unlogged,
  and a re-request re-offers the same beat under a new token. Nothing leaks (no engine work runs
  in `chooseLocal`) and one act per offer still holds, so the player may change their mind before
  the beat plays. Pinned in the session tests.
- **M3.** The clock is lazily initialised like the session.
- RED: the latch test failed on behaviour (the shell latch ignored the session); three tests
  failed on the missing API. Mutants killed in `tests/app`: pass wired to request; pass skipping
  the session cancel; pending hard-wired to the offer; cancel clearing only the offer;
  `localPending` ignoring requests; request wired to pass.
- Gates: 2,538 tests / 153 files, lint, typecheck, build, soak, MC; comparator equal.

## Re-check of R41-1

Report: `node_modules/hearsay-r41-1-review-20260927/REVIEW.md` (gitignored), re-dispatched on
2026-10-16 after the 27 September run was stopped mid-way; the stopped run had left one mutant
applied in the snapshot, which the reviewer restored from a fresh archive before measuring.

**Approved, 0 / 0 / 3.** Every finding of the first review is closed: the six commit mutants plus
the reviewer's D and E die; the new session test kills G; the withdraw path is documented and
pinned; the clock nit is correct by reading. The reviewer's probe recomputed the old latch formula
beside `session.localPending()` in every state the brief lists (requested while paused or running,
offered, chosen, after the beat plays, after cancel, refused request) and found one divergence: a
second request while one is pending, where the old latch went false and the session correctly stays
pending; the request button is disabled whenever a moment is pending, so the UI cannot reach it.
Live == replay after cancel held in every state. RED reproduced (4 failed / 35 with the fix
reverted). `tests/app` 504 / 16, lint and both typechecks clean; the full suite, soak, MC, the
comparator and the build were not rerun (machine load), so the controller's 2,538 / 153 stands.

- **M1.** The offered, not-yet-chosen state of `localPending()`, the exact state R41 was about, was
  never asserted: a pending-ness counting only requests and choices passed `tests/app`.
- **M2.** Re-introducing the original shell latch, OR-ed onto the session's answer, passed every
  app test, because a server render cannot see state set after it; test 3's name claimed more than
  it proved.
- **M3.** The commit message and two test comments label the first review's findings M-2/M-3/M-4
  where the review numbered them M1/M2/M3.

**R41-2, `7e7f6f6` (test-only).** The wiring test mounts `App` with the session primed to an open
offer in the empty safehouse circle and asserts the planner receives `localPending` true; a
source-scan pin requires the planner's pending-ness to be exactly `session.localPending()` with no
latch or boolean combination beside it; the comment labels follow the review's numbering.

## Re-check of R41-2: Approved, 0 / 0 / 0

Report: `node_modules/hearsay-r41-2-r42-2-review-20261016/REVIEW.md` (gitignored; shared with the
R42-2 re-check). Both reviewer mutants die on exactly their pin (`M1_pending_ignores_open_offer`
on the offered-state wiring case, `M2_shell_latch_ored` on the source scan), matching
`11-mutants.txt`; the brief's own example of a renamed latch constant is also killed by the
positive pin. Two shapes still slip the text scan: a latch spread onto the planner element after
the prop, and a latch inside `DayPlanner` itself (killed only incidentally, since `panels.test.ts`
calls the planner as a plain function and a top-level hook throws). The reviewer judged both
deliberate re-architectures rather than slips and did not count them; agreed. `git show --stat`
confirms the commit touches only the two test files and the relabels are correct. `tests/app`
509 / 16; full suite serial 2,589 / 157; lint and both typechecks clean. Not rerun: build, soak,
MC, comparator.

## Carried

- Nothing from this unit. The replay hazard for logged actions a later rule refuses is R40's
  M-1, already carried to Plan 10 Task 7; passing logs nothing, so it does not add to it.
