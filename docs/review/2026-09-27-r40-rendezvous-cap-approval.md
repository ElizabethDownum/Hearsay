# R40: the composed rendezvous window is capped at issue (install, review, correction, approval)

R39 left one open design question: execution now honours the authored rendezvous window, so the day
planner's two number fields could pin an asset for weeks, or hold a far-future meeting's record
`attempted`. The owner chose option (a) on 2026-09-27: cap the window at issue. The owner also
accepted the numbers root proposed: at most 16 beats (4 h) long, and opening at most one day
(1,440 ticks) after the issuing tick.

The unit was independently **Approved** at `368af16`:
- first review of `6ff4bd0`: 0 Critical / 1 Important / 1 Minor;
- re-check of the test-only correction: 0 / 0 / 0.

Both reviews were done by the same native Claude worker (Opus, non-author). Root wrote and executed
both commits.

## R40, `6ff4bd0`

- `src/sim/actions.ts` exports `RENDEZVOUS_MAX_SPAN = 16 * CONVERSATION_BEAT` and
  `RENDEZVOUS_MAX_LEAD = TICKS_PER_DAY`. `applyDirectiveWithCause` refuses a rendezvous application
  longer than the span, or opening more than the lead after the issuing tick. Both checks use strict
  `>` and run before any allocation, so a refusal leaves no residue.
- The composer (`app/src/panels/DayPlanner.tsx`, `directiveIssues`) mirrors both inline, measured
  from the offered beat, because the panels fence forbids importing the sim. The copy is bound by a
  parity sweep in `tests/app/panels.test.ts`.
- RED needed a second pass. The first RED only failed on undefined constants; with the constants
  exported, 3 tests failed for the intended reasons. GREEN: 2,510 tests / 150 files, all six gates
  pass, and soak/MC deterministic output is unchanged.

## Review 1: Needs fixes, 0 / 1 / 1

- **I-1 (test integrity).** Every new test issued at tick 0, where "measured from issue" and
  "measured from zero" agree. The sweep also derived its reference tick from the composer's own
  `offer ?? view` choice. Mutants measuring the lead from zero, in either copy, survived the suite.
  The code itself was correct: the reviewer's day-2 probe accepted T+15 and T+1440 and refused
  T+1455 with an unchanged hash.
- **M-1 (latent).** A saved log holding a now-refused window throws on replay, because `runLogOn`
  and `loadSession` have no catch. This has no impact today, since the app persists no saves.
  **Carried to Plan 10 Task 7** (save versioning).
- **Verified clean:**
  - boundaries (`>=` mutants fail exactly the at-cap tests);
  - no legitimate producer is refused (preset `meet` authors `nextBeat .. +30`; no bot, harness or
    enemy authors a rendezvous);
  - R39's two-beat widening cannot exceed the span cap;
  - composer mirror non-vacuous on span and comparison drift;
  - RED reproduced.

## Correction, `368af16` (test-only)

- `tests/network/hosting.test.ts` adds three cases issued on day 2: lead 15 and lead == cap are
  accepted, and cap + 15 is refused with zero residue. All three use one seed and assert that the
  handoff is co-located.
- The parity sweep runs at offered tick 0 and at an explicit day-2 offered beat while the view
  stays at 0. Its expected value comes from the hard-coded lead.

**Re-check: Approved, 0 / 0 / 0.** The reviewer used a fresh snapshot and ran six mutants serially;
all were killed:

| Mutant | Tests failed |
|---|---|
| engine measures from zero | 2 |
| composer measures from zero | 1 |
| composer measures from view tick | 1 |
| engine lead check uses `>=` | 2 |
| composer lead check uses `>=` | 1 |
| engine lead check removed | 2 |

Touched files 135/135; lint and typecheck clean. Evidence is in
`.superpowers/sdd/r40-implementation-validation/` and `r40-1-validation/`. The reviewer's reports
are in `node_modules/hearsay-r40-review-20260927/REVIEW.md` (gitignored).

## Carried out of scope: the sound-out meeting window (Important, accepted)

The sound-out `meeting` window has the same shape and no cap (`actions.ts`, sound-out validation;
composer shape-only). On acceptance, `transport.ts` writes whole-day schedule rows for the
**invitee**: the candidate, who is not the player's asset. The reviewer's probe held a non-asset in
the safehouse for a week, including 03:00. The "record held `attempted`" half of R39's defect does
not apply, because the record completes at the answer. The pinning half applies, and to people the
player does not own: council members and guards. **Accepted as a new fix unit, R49**: the same caps
on `meeting`, with the same composer mirror and parity pin.
