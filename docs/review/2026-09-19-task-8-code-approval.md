# Task 8 — forger arc and terminal canary lesson: approval and install

Plan 9's integration proof is installed at `67b74d0` as two new test files and nothing else:
`tests/scenario/forger-arc.e2e.test.ts` (3 tests) and
`tests/network/canary-lesson.e2e.test.tsx` (6 tests). The proposal was independently reviewed
before install (**Approved 0 Critical / 0 Important / 8 Minor**) and the installed bytes are the
reviewed bytes (committed blobs hash to the reviewed LF SHA-256 values `3947CB8B…A1B2` and
`C8A36C56…4D39`). Installed-code verification is folded into the final whole-branch review that
follows. Acceptance is the amended **R11**: two distinct council turns, the ban limited to player
tells in guard earshot, no lowered quorum, widened gate or fabricated evidence.

**The forger arc.** On a declared non-outcome setup (the shipped `miniTown()` with the usurper
kept home so avatar, carrier and two council members share one circle), three logged verbs —
`forge`, `show` to one council member, `plant` to the carrier — are followed by the sim's own
`reshow` from the carrier to her highest-trust edge, the second council member. Two distinct
council turns at `ARTIFACT_CREDENCE` (0.97) meet the shipped quorum, the referee resolves `won`
on day 1 with the denounce institution row, replay hashes are equal and the log contains no
`tell`. The test first asserts the initial world holds no artifact, row, turn or resolution. The
**control** shows the forgery twice without handing it over: it also wins (R11 permits it) but
fails the carrier predicate. The **mirror** sends a real enemy interrogation order through
`applyEnemyDecision` and only reads what follows: the asking, the carrier's `document: true`
answer, the field report, the `forged-document` sketch feature citing that exact report, and
exposure 0 → 1, with the counterfactual computed by removing that one feature. Non-vacuity:
deleting the `plant` line fails exactly the plant/reshow expectation (1 failed / 2 passed),
reproduced by author and reviewer.

**The canary lesson.** A declared seven-day campaign with one guard. The player baits a question
whose vaguened answer the guard overhears from an NPC (ordinary physics under R11), so the enemy's
own digest names the source (`origin-vague`); four real `debrief` actions at posted safehouse beats
take the source's disposition to 0.35, below the 0.4 flip line; the nightly turncoat pass latches;
on day 5 the same first-hand story comes back through a loyal channel as count 8 / severity 5 and
through the turned channel doctored to 4 / 4, both as chronicle `network-speech` with
`reportRoots`; the clock ends the campaign (`lost-clock`, tick halted at 10080 though the log ran
to 11520); save and replay are identical and the terminal world is a fixed point. The installed
`debriefView`, `DebriefThreads` and `DebriefEnding` then render the lesson through
`renderToStaticMarkup` with no mock of any kind: the turned source's card reads "the count given
is 4" beside a root that still records 8, the loyal card reads 8, and the ending card shows the
clock ending as consistent. The in-file control withholds only the four debriefs: the source is
still named, never turns, and both channels report 8 / 5. Non-vacuity: withholding erosion under
the full assertions fails exactly the strikes, doctored-copy and rendered-text expectations
(3 failed / 3 passed), reproduced by author and reviewer. **Earshot:** the reviewer checked all
three player tells against the full hearing circle and the guard's position at that tick; the
guard is in another venue each time.

**Gates.** Root install through a capture runner: frozen patch identity (38,878 bytes,
`7432EC67…0D7E`), apply, file hashes and the untouched `canary-turncoat.e2e.test.ts` verified;
focused 9/9; scenario/network/app 33 files / 709; both compilers and scoped lint clean;
**2,490 tests across 150 files**; typecheck, lint, build (`index-BpAIYnf0.js`, unchanged), soak
and Monte Carlo clean; certified comparator (`99B1F00F…`) against the `01c043c` baselines, 10
blocks / 230 deterministic lines all equal, four controls. The first directory run is retained as
a failure: one pre-existing ESLint-API case in `tests/app/debrief-laws.test.ts` exceeded vitest's
5-second default under machine load (5.8 s), the class carried since Plan 3; it passed in the same
run's full suite and on the re-run. The reviewer measured the same counts in its own snapshot.

**Minors, recorded and not charged** (no byte changed after review): **M-1** the author's
explanation of the `meet` finding was half right (see below); **M-2** a `<= 1` day assertion where
the value is exact; **M-3** five canary cases share one memoised run (safe because the debrief
model is read-only); **M-4** the mirror forges a claim about a character it removed from the cast;
**M-5** one logged schedule is rebuilt rather than read from the measured world; **M-6** the canary
proves its non-outcome start through the control rather than an in-file initial-state block;
**M-7** the mirror assigns enemy roles directly rather than through a generated town; **M-8** one
serialized-substring assertion. M-2 and M-6 are the two worth taking if these files are next touched.

**Finding carried as its own unit: `meet` cannot enable `debrief`.** The rendezvous override in
`src/sim/directives/execution.ts` is one conversation beat wide and lands at tick 496, one tick
after the only frame that window covers, so the asset is never visible at the safehouse on the
promised beat; the reviewer measured eleven arrival orderings, all failing. Neither Task 8 test
uses `meet` (the canary uses the posting route, whose window is multi-beat). Widening the window
to two beats is the candidate repair and must be proved by a real `debrief` succeeding through the
tick loop; it changes sim behaviour, so it carries its own RED/GREEN, comparison and review, and
whether it must precede certification is put to the final whole-branch review. Also carried: the
forger route produces artifact records and a `forged-document` feature that reach the debrief's
artifact section, but no test renders that section (browser-gate observations F3/F4 remain a
post-plan measurement); neither route is a `newSession` frozen-offers campaign (addendum option 1),
which the addendum makes a preference, not a requirement.

Process notes: author and reviewer were native Claude (Opus, fresh context; reviewer non-author);
no local model. The reviewer's session was interrupted after its twelfth capture and resumed from
its own transcript, reusing captures 01–12 and finishing 13–20.

- Author report: `.superpowers/sdd/task-8-author-report-2026-09-18.md`
  (SHA-256 `C0D9A7F4045CD5B89052A6949E646D9EAF57AD162F26AE0C276DA1764C64C079`), evidence
  `.superpowers/sdd/task-8-author-validation-2026-09-18/`, frozen patch
  `.superpowers/sdd/task-8-author-complete-2026-09-18.patch`.
- Proposal review: `.superpowers/sdd/task-8-proposal-review-2026-09-19.md`
  (SHA-256 `01C5CB89BA8944C69FE3BC2713A290FBFC0D94879E6C352DB8FC17BC08691174`), evidence
  `.superpowers/sdd/task-8-proposal-review-validation-2026-09-19/`.
- Install: `.superpowers/sdd/task-8-implementation-validation/` (runners, `controller/native/`
  apply, GREEN, retained failed step 31 and re-run 32, six gates, comparator).

Proceed to the final whole-branch review.
