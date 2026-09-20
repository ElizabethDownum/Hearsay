# R38 — the `meet` rendezvous window: install, independent review, correction, approval

The defect the Plan 9 final review carried as its own unit is repaired and independently
**Approved** at `83d91e8`: over the whole unit `b1e0314..83d91e8`, 0 Critical / 0 Important /
1 Minor (carried); over the correction alone, 0 / 0 / 0. Two root-authored, root-executed commits
(disclosed in each message); the reviewer was a native Claude worker (Opus, fresh context) that
authored nothing here.

**The defect.** `meet` could never enable `debrief`. The rendezvous application runs *during* the
tick of its first beat, after that tick's frame froze, so the schedule override first moves the
asset one tick later. `debrief` validates only on a beat, against the frozen frame. Under a
one-beat window no beat frame ever held the asset. The reviewer reproduced this tick by tick: row
first present at tick 16, the frozen frame holds asset and avatar together at beat 30 only, a
logged `debrief` succeeds at 30 and refuses at 15, 45 and 60.

**R38, `950fb16`.** One line in `src/sim/directives/execution.ts` (`case 'rendezvous'`): the window
is two conversation beats. The final review's three conditions:
- a new case in `tests/network/hosting.test.ts` drives `goTo` / `meet` / `goTo` / `debrief` through
  `runLogOn` and the real tick loop; the debrief succeeds at beat 30, is refused at beat 45, and is
  refused at 30 without the meet (control);
- the three meet cases that asked `circlesAt` / `positionOf` after the fact now ask live at each
  beat (they had been passing against a circle no frame ever contained);
- the false comment at `tests/network/debrief.test.ts:65` is corrected.

RED against unchanged production: exit 1, 4 failed / 30 passed, the new case failing with
`debrief: 'ann' is not with you at the safehouse this beat`. GREEN: 2,491 tests / 150 files, all
six gates, comparison equal.

**First review: Needs-fixes, 0 / 1 / 2.** Mechanism confirmed, conditions met, scope exact.
- *Important 1, accepted.* A schedule override is a (day range × minute-of-day range) row, never a
  tick interval. The two-beat window wrapped `to` to 0 for a meet whose first beat is 23:30, a row
  that matches no minute: the asset never moves, the invitation closes `missed`, nothing tells the
  player. That meet worked under one beat, so R38 regressed it. The 23:45 meet, whose window
  straddles midnight, was dead before and after.
- *Minor 2, accepted.* R38's comment said attendance latches at the first beat. It latches at
  whichever beat of the window both first stand in the room; with two beats a player who arrives
  only for the second is recorded then. The behaviour is sound; the comment was false.
- *Minor 3, carried.* `applyMeet` still authors a one-beat `until`, and the scheduled window is now
  two. Execution never reads a rendezvous application's authored `from` / `until` at all, though the
  day planner offers both as levers.

**R38b, `83d91e8`.** The rows are built from the real tick interval: inside one day, one row closing
at its last minute + 1 (midnight is `TICKS_PER_DAY`, never 0); across midnight, one row per day.
Minor 2's comment is corrected; a comment on `applyMeet` states that execution does not read the
authored window. Two new live cases (first beat 23:30; first beat 23:45) pin the rows, `met-asset`
at the first beat, the invitation `attended`, the debrief answer at the second beat, and the asset
home again afterwards. RED against unchanged `950fb16`: exit 1, 2 failed / 34 passed, same message.
GREEN: focused 36/36; **2,493 tests / 150 files**; both compilers, lint, build
(`index-COvn27HZ.js`), soak and Monte Carlo clean; certified comparator (`99B1F00F…`) against the
`01c043c` baselines, 10 blocks / 230 deterministic lines all equal, four controls. Equal is forced,
not lucky: the soak is a worldgen validator and every Monte Carlo bot emits only `inject`, so no
policy can reach the changed line.

**Re-review: Approved.** Every one of the 96 beat-aligned starts in a day, driven through a real
meet and compared tick by tick with `[from, from+30)` through the real `venueAt`: zero mismatches,
95 one-row and 1 two-row; 94 rows byte-identical to R38's, one repaired, one split. All 1,440 minute
starts × 5 day bases (7,200 cases, including day 3 and the rest day): zero mismatches, zero
degenerate rows. Nothing in `src/`, `app/` or `tests/` finds, removes or counts `rendezvous:` rows,
so nothing assumes one row. One-row and two-row worlds hash, round-trip and replay identically.
With `execution.ts` reverted to `950fb16` in its host, the two new cases fail and the other 15 pass.
It reproduced 1,698 tests / 103 files and both compilers in its own snapshot.

**Carried, each its own unit** (all pre-existing except where noted; none fixed here):
1. *The same wrap-to-zero arithmetic at the other override site*, `src/sim/directives/transport.ts`
   (accepting a `hosting` or `sound-out` invitation). Hosting is safe (fixed evening block); a
   composed sound-out meeting authored to end at or across midnight gets a dead row and silently
   misses. Root confirmed the formula in source; the reviewer measured it against `venueAt`.
2. *A preset `meet` reports `refused` for a meeting that happened.* `applyMeet` authors
   `active: {nextBeat, nextBeat}`, so the directive record aborts "the active window ended without
   an answer" at the first beat, while the invitation goes on to close `attended`; the
   `rendezvous attended` / `missed` settlement never fires for `meet`. Root verified the abort in
   the reviewer's trace.
3. *A meet planned off a beat never happens*, with no signal.
4. *Minor 3:* execution should honour the authored rendezvous window, and `applyMeet` should then
   author two beats. Until then the day planner's two rendezvous levers are decorative.
5. Nothing ever prunes a spent rendezvous row (harmless; unbounded growth in a long save).

- Review and re-review: `.superpowers/sdd/r38-installed-code-review-2026-09-19.md` (SHA-256
  `39BFAA72BEF8BA95FA1F3B65DCF8A994E77D2531D4F4AA37EFB41DE330CA9E4D`), evidence
  `.superpowers/sdd/r38-installed-code-review-validation-2026-09-19/`, brief
  `.superpowers/sdd/r38-installed-code-review-brief-2026-09-19.md`.
- Root's captures: `.superpowers/sdd/r38-implementation-validation/controller/native/` and
  `.superpowers/sdd/r38b-implementation-validation/controller/native/`.
