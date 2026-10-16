# R49: the sound-out meeting window is capped like a rendezvous (install, review, approval)

R40 review carry: the meeting a sound-out asks for has the rendezvous window's shape and had no
cap. On acceptance transport writes whole-day schedule rows for the INVITEE, who is not the
player's asset (a council member or a guard could be held in the safehouse for a week, including
03:00). The R40 approval accepted it as this unit: the same two caps at issue.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `5ac5058`: **Approved**, 0 Critical / 0 Important / 0 Minor (one wording nit, two
  observations, neither a defect).

Root wrote and executed the commit.

## R49, `5ac5058`

- `src/sim/actions.ts`, `applyDirectiveWithCause`, sound-out validation: a meeting window longer
  than `RENDEZVOUS_MAX_SPAN` (four hours) or opening more than `RENDEZVOUS_MAX_LEAD` (one day)
  after the issuing tick is refused, strict `>`, before any allocation, so a refusal leaves zero
  residue.
- `app/src/panels/DayPlanner.tsx`: the composer mirrors both notes inline under the panels fence
  ("the meeting window can run at most four hours", "the meeting must open within a day"),
  measured from the offered beat.
- Tests: `tests/network/sound-out.e2e.test.ts` (one beat over either cap refused with an unchanged
  hash; exactly-at-cap windows accepted and kept as authored; issued on day 2, the lead runs from
  the issuing tick); `tests/app/panels.test.ts` (a second parity sweep binds the composer's copy to
  the engine's constants at tick 0 and at a day-2 offered beat). RED 4 failed / 135; GREEN 602 / 602.
- Gates: 2,581 tests / 157 files, lint, typecheck, build, soak, MC; comparator equal.

## Review: Approved, 0 / 0 / 0

Report: `node_modules/hearsay-r49-review-20261016/REVIEW.md` (gitignored). Focused 135 / 135;
`tests/network` + `tests/app` 763 / 33; `eslint .` clean; both typechecks clean; full suite serial
2,581 / 157.

- **Verified clean:** every path that can author a sound-out meeting goes through
  `applyDirectiveWithCause`; the invitee's schedule rows match the window to the minute and the
  hold at exactly the span cap is 240 ticks in three cases (same day, across midnight, near the
  lead cap); zero residue measured across `directiveState`, `scheduledSetup`, `scheduleOverrides`,
  `invitations` and `messages` on a refused brief, and the hash assertion is real (moving the caps
  after `issueDirectiveRecord` fails all three refusal tests); only the composer authors meetings,
  no preset, bot, harness, MC, soak or enemy path does, and `seedWindow` sits inside both caps; the
  parity sweep imports the engine's constants and is killed by drift, copy-text and note-removal
  mutants, and its "clear" cases really assert empty. Mutation table: 16 of 17 killed; the survivor
  (lead measured from `world.tick` rather than the action tick) is equivalent, because replay
  applies an action only when the log tick equals the world tick.
- **Nit (not counted):** the commit message's "RED 4 failed / 131" reads like a total; it was
  4 failed, 131 passed, 135 in all (corrected above).
- **Observations:** the meeting caps fire before the active-range and reportBy checks, where the
  R40 rendezvous caps fire after them; every earlier check only reads state, so zero residue holds,
  and the composer shows all its notes at once. A saved log with a now-refused meeting throws on
  replay: the same latent hazard R40 carried to Plan 10 Task 7, nothing new (nothing persists
  saves; no tracked log contains a sound-out; relay mutation never changes the window).
- **Not verified:** build, soak, MC and the comparator were read from the controller's evidence;
  the composer was checked through `directiveIssues`, not a browser; probes ran in the recruit-town
  fixture only.

## Carried

- Nothing new. The replay hazard remains with R40's carry (Plan 10 Task 7).
