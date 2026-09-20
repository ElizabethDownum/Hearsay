# R39 — the five rendezvous and invitation defects R38 carried: install, review, correction, approval

The five defects [R38's approval](2026-09-19-r38-meet-window-approval.md) carried are fixed, on the
owner's instruction, before Plan 10, and independently **Approved** at `7b6df80`: over the whole
unit `0747460..7b6df80`, 0 Critical / 1 Important (carried, a design question) / 11 Minor; over the
correction alone, 0 / 0 / 4. Two root-authored, root-executed commits (disclosed in each message).
Both reviews were native Claude workers (Opus, fresh context, non-author); the second had no memory
of the first and read its report from disk.

## R39, `dbca0e1`

1. **Sound-out and hosting meetings near midnight.** `transport.ts` wrote one schedule row with
   `to: until % 1440`. A meeting ending exactly at midnight matched no minute; one straddling
   midnight ran backwards. The candidate never moved and the invitation silently closed `missed`.
   Both writers (this one and R38b's rendezvous rows) now share a pure helper,
   `overrideRowsForWindow` in `src/sim/agents.ts`: rows built from the real tick interval, one per
   shape across midnight, whole middle days included.
2. **A preset meet reported `refused`, attended or not.** `applyMeet` authors
   `active: {beat, beat}`; the window expiry aborted the record in the same phase 5 that accepted
   the rendezvous, so the later attended/missed settle found it already terminal. An accepted
   rendezvous invitation now owns its record's ending: both expiries skip it.
3. **An off-beat meet silently never happened.** A directive handed off the beat is never heard.
   `applyMeet` now refuses off the beat, before any mutation, as `tell`, `ask`, `recruit` and
   `debrief` do. The app already queues a meet on the next beat.
4. **Execution ignored the authored rendezvous window** (the day planner's two levers). It keeps it
   now: never before the asset acts; at least two beats when it opens on the beat she acts (R38),
   one otherwise. `requested` records what was authored, `scheduled` what is kept. The preset
   authors the two beats it gets.
5. **Spent `rendezvous:<id>` rows stayed on the schedule forever.** They leave when the invitation
   closes; an emptied list deletes its key. Writes stay assign and delete only, as the
   legacy-dispatch law requires.

RED against unchanged production: exit 1, 11 failed / 134 passed, each for the intended reason.
GREEN: 2,503 tests / 150 files, all six gates, comparison equal.

**First review: Approved, 0 / 2 / 7.** The reviewer reproduced defects 1, 2 and 5 at the parent and
confirmed each gone. The helper covers exactly `[from, until)` through the real `venueAt` over
9,508 swept windows and is byte-identical to both earlier writers wherever they were right, so
hosting and within-day meets replay unchanged. No consumer assumes one row per `sourceRef`. The
off-beat refusal leaves hash and full serialization untouched. Scope exact.
- *Important 1, accepted, fixed in R39b.* The attended record settled only when the window closed,
  which is the tick the asset walks out. Word that the meeting happened could never be handed over
  at the meeting: better than R38's confident `refused`, not yet a working loop.
- *Important 2, carried.* A composed window is unbounded and unrelated to the brief's `active`.
  See "Open".
- *Minor 1, carried.* The preset's authored deadline is its first beat, so the ledger clock reads
  `overdue` through the meeting. Pre-existing; the wider window doubles its span.
- *Minor 5, answered.* The comparison's baseline run records `7499f58`, the dispatch says
  `01c043c`: the first is the second's parent, captured on the tree before it was committed.
- *Minors 2, 3, 4, 6, 7, carried as noted:* the per-tick invitation scans grow with history;
  hosting and sound-out rows are never pruned; the soak/MC comparison being equal is predicted and
  says nothing about a rendezvous change, since neither harness ever issues one; the
  legacy-dispatch law binds the prune's spelling, not its presence; `rendezvous attended` is new
  player-visible copy rendered raw, like every other outcome.

## R39b, `7b6df80`

`settleDirectiveApplications` latches "when the requested physical reality occurs", and the posting
branch beside it completes on first occupation, not when the posting ends. The rendezvous branch
now completes when attendance latches. A player in the room for the first beat is handed the report
on the second, in the room. The rows must not leave at settlement, or the second-beat debrief R38
exists for dies: the prune moved to its own pass, keyed to the invitation closing this tick,
independent of the record.

RED against unchanged `dbca0e1`: 2 failed / 144 passed. GREEN: directories 1,709 / 103, both
compilers, lint, build, soak, MC, comparison equal. **Full suite, disclosed:** two parallel
`npm test` runs hit 5,000 ms timeouts in unrelated tests (the session replay; scenario-referee
(f); the second run only the latter) while the owner's game held the CPU. Both files pass serially
in isolation ((f) in 2.2 s); the full suite passes serially, 2,504 tests / 150 files. Every
attempt is retained. The re-review judged the account supported by failure mode, non-determinism
and the serial passes, and noted the first failed run is retained under two names.

**Re-review: Approved, 0 / 0 / 4.** Reverting only `execution.ts` in the reviewer's snapshot fails
root's two new tests and five of its own seven probes. Settled exactly once over 200 ticks; missed
still aborts at the close only; rows outlive the terminal record and leave with the invitation,
both halves of a midnight-crossing window included; a second concurrent rendezvous on the same
asset and foreign rows survive; `resolveInvitations` is a rendezvous invitation's only closer, and
it runs immediately before the prune. R38's go, meet, go, debrief still lands at 30, alongside the
report.
- *Minor 8.* The in-room report depends on the brief's `reportBy`: the preset authors the latch
  tick, but the day planner's default draft reports by two days out, so a composed rendezvous
  still cannot hand the word over in the room. Same root as Minor 1.
- *Minor 9.* The prune is a third per-tick scan of the invitation array (with Minor 2).
- *Minor 10.* Attendance latches live in phase 5, so a first-beat attendance settles at a tick
  whose frozen frame never held the two together. Pre-existing mechanism (`attendedAt` and the
  `met-asset` fact were already there); R39b makes that tick the record's.
- *Minor 11, accepted: root's error.* Root carried Important 2 on the ground that a standing
  posting already pins an asset open-endedly. False. No production writer emits `toDay: null`;
  a posting row is bounded by the brief's `active.until` and covers 16:00 to 20:00 only. Root had
  taken the shape from a fixture row in its own test. `7b6df80`'s message repeats the claim and is
  not rewritten; this paragraph is the correction. The carry stands, the reason does not.

Second-beat arrival is accepted as is: it latches at 30, the report's first deliverable beat is
45, and by then she has left. The player receives it wherever they next meet.

## Open

**Important 2 is the owner's decision.** Since R39 honours the authored window, a player can type a
rendezvous window of weeks into the day planner's two number fields and remove an asset from the
town for all of it, after attendance latched, with the record of an unattended far-future meeting
held `attempted` throughout. Before R39 the fields did nothing. Options: (a) cap the window's
length at issue (`applyDirectiveWithCause` already validates shape) and say so in the planner's
notes; (b) require the window to sit inside the brief's `active` range, which means the preset must
author a real `active` and takes Minors 1 and 8 with it, at the cost of moving evaluator behaviour
under scrutiny and deferral (`active.until` feeds refusal at `evaluator.ts:150-167`); (c) release
the asset some beats after attendance. Root recommends (a) now, as its own small unit, and (b) only
with a deliberate look at the evaluator.

Carried, each small: Minors 1 and 8 (the preset's and the planner's report clock), 2 and 9
(invitation scans; prune the array or index it), 3 (prune hosting and sound-out rows at their
close), 7 (outcome vocabulary). A missed meet's player-visible outcome is still the generic
`refused`, with `rendezvous window missed` as its reason: true of every abort, unchanged.

## Evidence (gitignored, under `.superpowers/sdd/`)

- `r39-implementation-validation/`, `r39b-implementation-validation/`: runners and native captures
  (RED `10`, GREEN `30`–`35`, gates `40`–`45`, comparison `50`; R39b's `40-tests-attempt1-timeouts`,
  `46-tests-rerun`, `47-timeout-files-serial`, `48-tests-full-serial`).
- `r39-installed-code-review-brief-2026-09-19.md`, `r39b-re-review-brief-2026-09-20.md`.
- `r39-installed-code-review-2026-09-19.md` (re-review appended), SHA-256
  `33903D4E34057F52F35574ABBFF47729B1C0EB2199118DCF50A98382863621DC`; evidence
  `r39-installed-code-review-validation-2026-09-19/` (`p1`–`p6`, `r1`–`r6`).
- Comparator `task-3-implementation-validation/compare-reports.mjs`, SHA-256
  `99B1F00F7EDFA2824D8F9650C439E11A3D577D0DE264EB7A4A2CE48FE969C334`; baselines at `01c043c`.
