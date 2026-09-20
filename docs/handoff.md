# Hearsay — resumed, 19 September 2026

[Plan 9 final review and certification](review/2026-09-19-plan-9-final-review.md). [Task 8 approval and install](review/2026-09-19-task-8-code-approval.md). [Browser gate approval + R36/R37](review/2026-09-18-browser-gate-approval.md). [R18 code approval](review/2026-09-17-r18-code-approval.md). [Task6/7B + R32–R35 code approval](review/2026-09-17-task-6-7b-code-approval.md). [Task5B code approval](review/2026-09-17-task-5b-code-approval.md). [UI contrast correction approval](review/2026-09-17-ui-contrast-correction-approval.md). [Task5A2 code approval](review/2026-09-13-outcome-history-code-approval.md).

Latest, 19 September (later): **Plan 9 is certified complete.** An independent reviewer who had
touched nothing on the branch read all 77 commits since `2436a36` and returned Ready to certify
with no Critical or Important finding and four Minors. It traced every plan item to code, tests and
an approval, found no carried Minor that has become a problem and no weakened law, and reproduced
2,490 tests/150 files and every gate in its own snapshot. Root repaired the one flaky timeout it
charged (the ESLint-API case that failed once under load), added the missing R33–R37 docket
entries, declined one Minor on the evidence and recorded the last. The `meet` defect is ruled
pre-existing (18 July code, unchanged on this branch), outside every Plan 9 requirement, and a
separate post-plan unit with three conditions attached. Next: checkpoint push when Ellie
authorizes (origin/main 2436a36); then the `meet` rendezvous-window unit and Plan 10.

Latest, 19 September: Task 8, the Plan 9 integration proof, is installed at `67b74d0` as two new
test files and nothing else. The forger arc wins by paper alone: forge, one direct council showing,
a hand-over to a carrier, then the sim's own re-show to a second council member, two distinct
turns at 0.97, a real win on day 1, no tell in the log; a control and a real interrogation mirror
(exposure 0 to 1, causal) sit beside it. The canary lesson runs a seven-day campaign to a clock
loss in which the enemy names a source, four real debriefs break him, and the same story returns
8/5 from the loyal channel and doctored to 4/4 from the turned one; the installed debrief model and
panels render that divergence with no mocks. An independent reviewer **Approved** the proposal
(0C/0I/8M), reproduced both failing controls, and checked every player tell for guard earshot.
Root installed the reviewed bytes: 2,490 tests/150 files, all six gates, comparison equal to
`01c043c`. One finding is carried as its own unit: `meet` cannot enable `debrief` through the tick
loop (the rendezvous window opens one tick too late). Next: final whole-branch review. No push;
origin/main 2436a36.

Latest, 18 September (small hours): the interactive browser gate is **closed as PASS**. The
gate measured the installed debrief UI at `01c043c` over CDP (both viewports, both themes and the
automatic path, real keyboard and pointer events) and discharged the carried contrast Minor by
measurement (14.35 light / 12.27 dark inside the composed desk). It found one material defect:
focus dropped to `<body>` on open, Back and Escape. Root fixed it as R36 (mount-time focus on the
selected tab, return to the opening control) with R37 (the ≤600px comparison table now scrolls
instead of breaking words), installed at `f18afd3` with RED then GREEN, 2,481 tests/148 files and
all six gates, comparison equal to `01c043c`. An independent reviewer **Approved** the code
(0C/0I/3M, test-side only) and re-measured the browser at `f18afd3`: both defects gone in every
combination, with a positive control. Task 8 runner 006 passed 3/3 on the frozen probe host. Next:
Task 8 authoring (forger arc + canary lesson), final whole-branch review. No push; origin/main
2436a36.

Latest, 17 September (night): the R18 watch-cancellation correction is installed at
`01c043c` and independently **Approved** twice — the proposal (0C/0I/4M) and the installed
code (0C/0I/1M). One pure predicate ANDed onto the attempted-watch guards: a watch accrues a
night only while its own installed schedule row is still present, so cancellation cannot
re-latch and a later same-guard/district watch supersedes the original. Root installed from
the approved patch with RED (2 failed / 6 passed) then GREEN; root and reviewer each pass
2,480 tests/148 files and all six gates, and the certified comparison equals the cd0d441
baselines. The five Minors are recorded in the approval and carried. Next: the interactive
browser gate (brief `.superpowers/sdd/task-6-7b-browser-gate-brief-2026-09-17.md`), Task8
forger probe runner 006, final whole-branch review. No push; origin/main 2436a36.

Latest, 17 September (later): all 18 Task6/7B UI targets are installed (d20eba9, 59cd261,
d68efad), R32 (8f9b728), R34 (1ae3362) and R35 (cd0d441) are committed, and the installed
code plus all four corrections are independently **Approved 0C/0I/4M** at `cd0d441`. Root
and reviewer each pass 2,476 tests/147 files, lint, both compilers and build; root's soak,
Monte Carlo and certified comparison equal the approved 5B baseline (10 blocks/230 lines).
R34 exempts exactly the five debrief panels from exactly the three terminal-payload prongs
in the view law test; R35 excludes `.superpowers/**` from vitest and eslint. The R18
watch-cancellation proposal review is dispatched on a native Claude worker under the
refreshed brief (`.superpowers/sdd/r18-watch-correction-review-brief-2026-09-17b.md`,
patch re-checked clean at cd0d441). Next: R18 install, browser gate, Task8, final review.
No push; origin/main 2436a36. No local model this session (GPU in use).

Latest, 17 September: the complete Task5B debrief model is installed through `875daba`
(five serial byte-exact commits over docs-only 5e84e08) and independently Approved
0C/0I/1M; root and reviewer pass 2,399 tests/143 files, all six gates and the equal
10-block comparison. The Minor (witnessed presence receipt backdating an ordinary row)
is bounded correction R32. The UI contrast correction is independently Approved 0C/0I/4M
with the Important defect closed inside the desk; the live evidence board's 2.46:1 cell is
a carried post-plan item. Next: install the 18 UI targets in three units, R18 proposal
review and install, R32, Task8 forger route and canary, final whole-branch review. No
push. Codex reviewers are quota-blocked until 20 September; reviews sit on native Claude
workers.

Ellie clarified on 13 September that the 6 September stop was “just for that one
session”. Continue implementation according to the current plan, applying
recommended defaults and saving non-blocking judgments/issues in `docs/review.html`
for later review. Task 4C2 is committed at `152f2a0`; all six Task 4 gates and
the full deterministic comparison pass. Independent accumulated code review is
**Approved with zero findings**. Task 4 is closed. Corrected 7A1 and desk prose 7A2
are committed through `3020688`; worker and controller each pass the full
**2,028 tests / 128 files**, lint, both compilers and browser build. Independent
accumulated 7A code review is **Approved with zero findings**, with the same gates
passing independently. Task5A1 causal recording is committed at `252a481`.
Worker and controller pass2,045 tests/129 files and all six gates; all10 report
blocks/230 deterministic lines remain equal. Independent5A1 code review is Approved
with zero findings and the same gates/comparison passing. Root verified832 review
evidence entries. R16 guard self-presence is committed at `36d090c`; worker and
controller pass2,055 tests/130 files and all six gates with unchanged complete
simulation reports. Independent R16 code review is Approved with zero findings and
the same gates independently passing. Root verified75 review entries. R17 is now
committed at `bc409d3`; worker/controller pass2,059 tests/131 files and all six gates
with unchanged complete simulation reports. Independent R17 code review is Approved
with zero findings and the same gates passing; root verified77 review entries.
[R17 approval](review/2026-09-13-r17-code-approval.md).
[R16 approval](review/2026-09-13-r16-code-approval.md).
[Recording approval](review/2026-09-13-recording-code-approval.md).

Latest: Task5A2 is committed at78ff1c2, with worker/controller2,078 tests/132 files, all six gates and unchanged complete simulation reports. Root verified12 full world pairs with81 outcomes/54 packet links and221 predecessor archive files. Independent code review is Approved with zero findings; root verified104 review entries. The649-case UI proposal has one Important contrast finding; its654-case correction is in independent re-review. R18 normal-phase cancellation/HQ restoration is confirmed and has its own scoped correction author. [UI review](review/2026-09-13-ui-proposal-review.md). [R18 dispositions](review/2026-09-13-r18-measured-dispositions.md).

This project-local handoff supersedes older shared AI memory. All writes remain
inside Hearsay; no push is authorized by this resumption. The saved checkpoint and
frozen artifact identities are in the [6 September episode](episodes/2026-09-06-scrying-closure-and-seance-checkpoint.md).

## Verified checkpoint

- Task 4 source is **152f2a0d788d7166150ba31b25090f3aa21d199c**. Controller full
  suite: **1,950 tests across 125 files**; lint, both compilers, build, soak and
  Monte Carlo pass. All **10 report blocks / 230 deterministic lines** match the
  approved Task 3 baseline, with four comparator controls. Build JS is
  507.93 kB / 150.39 kB gzip; the existing size warning persists. Independent
  accumulated review is Approved, zero Critical/Important/Minor, with the same
  gates/comparison independently passing. [Approval](review/2026-09-13-task-4-code-approval.md).
  [Validation record](review/2026-09-13-seance-and-night-visits-validation.md).
- Night-visit digest/auditor Task 4C2: worker/controller **127 focused tests in
  six files**, both compilers and scoped lint/diff pass. Five source hashes and
  45 evidence hashes verified; the full frozen tests and three T4-A1 controls
  are retained. Actual growth is 18 cases.

- Night-visit reporting Task 4C1: **c7bc36368f9d3005647be0c96725b33a187ff59d**.
  Worker/controller **30 focused tests in three files**, both compilers, and
  scoped lint/diff pass. Eight source paths and 41 evidence hashes verified.

- Séance Task 4B: **aaaa57bd6bea2ce11414440f8c702173b53fb4b4**. Worker and controller
  passed **281 focused tests in five files** and both TypeScript configurations;
  scoped lint/diff passed. Eleven source paths and four exact frozen new bodies
  verified. Full Task4 gates and independent review now pass.

- Prior historical-witness source: **336b51b1fc77669084cead621d87ef8fd8736f09**,
  Task 4A. The September 6 handoff commit was documentation only; Task 4B above
  and Task 4C2 above are newer implementation checkpoints.
- Scrying Task3 is independently Approved with zero findings at60506d9. Worker,
  controller and reviewer each passed six gates: **1,868 tests/121 files**, lint,
  both compilers, build, soak and Monte Carlo. Ten complete report blocks/230
  deterministic lines match with four comparator controls. Build500.56/148.06kB
  gzip; its size warning remains. [Independent approval](review/2026-09-05-scrying-code-approval.md).
- Historical-witness Task4A is committed: worker/controller **59 focused tests in
  four files and both compilers pass**; scoped lint passes. Four exact new bodies
  and eleven file hashes verified. Full Task4 gates and code review are now complete.
  [Implementation report](review/2026-09-06-historical-witness-implementation.md).
- At the September 6 pause, Task 4B stopped after preflight; two owned test files were removed
  without running. That historical pause was superseded by the completed
  September 13 implementation above. [Pause report](review/2026-09-06-seance-action-paused.md).

## Resume order

1. Read [current Plan9](plans/plan-9-current.md), the latest episode, Git status and
   `.superpowers/sdd/progress.md` plus `task-4-implementation-progress.md`.
2. Task 7A is closed at committed `3020688`, with all applicable controller and
   independent gates passing. [Approval](review/2026-09-13-prose-code-approval.md).
   Preserve the exact [T4-A1/A2 amendment](plans/drafts/2026-09-05-task-4-base-reconciliation.md).
3. Task5A1 is closed at `252a481`, R16 at `36d090c`, and R17 at `bc409d3`.
   Task5A2 is closed at78ff1c2. Install full5B model completion. Prose78-case,
   outcome-history239-case and ordinary feature-link147-case proposals have
   independent approvals; they are not production implementations.
4. Physical/magic/story links, calendar/terminal model,6/7B UI and8 integration/
   final review remain. The198-case physical-model proposal is independently
   Approved-for-base-reconciliation, zero findings.
   [Proposal approval](review/2026-09-13-physical-links-proposal-approval.md).
   The magic alias-identity defect is closed by the independently approved241-case
   correction. [Approval](review/2026-09-13-magic-identity-proposal-approval.md).
   Complete pure composition has278 passing cases but independent review found
   two Important issues: future operation records and unresolved ending evidence.
   The versioned correction passes 313 cases (278 preserved plus 35). Its review
   closes ending validation but retains one mixed-time receipt finding. A new
   bounded correction passes321 cases, preserving313 and adding the exact reviewer
   regression plus seven controls. Independent replacement review is Approved,
   zero findings; R30/R31 are closed. Root verified532 author and452 review entries,
   each including all356 archived files. Only proposed threads.ts and additive
   composition tests change. [Approval](review/2026-09-13-receipt-partition-proposal-approval.md).
   Task6/7B UI is frozen on the approved321 model:649 cases pass, with41 new UI
   cases and287 existing app/registry cases. Both compilers,46-body lint and native
   rendered surfaces pass; root verified1,004 author entries, including365 archived
   files and18 exact targets. Independent UI review found one contrast defect; its
   separate654-case correction is in independent re-review. Actual
   installation and interactive browser checks remain.
   [Latest composition review](review/2026-09-13-composition-contract-review.md).
   The completed premise check supports existing semantic attention readers plus
   calendar/terminal composition; player hypothesis cards remain ungraded notes.
   Plan 10 is outside this run. Adopted A7 explicitly assigns ritual purchase
   composers to Plan 10; Tasks 6/7B/8 must preserve that boundary.

One production writer; root owns Git index and scoped commits. Preserve current
provenance/physical unions when reconciling older virtual overlays. Capture native
bytes/exits before formatting; PowerShell7 and `python -X utf8`. Snapshots start
inside owned excluded `node_modules`, never collectible scratch `.test.ts` paths.
The current measured full-suite count is 2,078/132 at `78ff1c2`. Existing successful gates need no repetition without a change
or a stated checkpoint requirement.

All deferred questions and PROVISIONAL local rulings, including R24/R25 receipt
uncertainty, remain in [the HTML review](review.html). Lesson promotion and shared
skill changes are candidates only, under R19; shared memory was not edited.

## Recent episodes

- [6 September — scrying closure and séance checkpoint](episodes/2026-09-06-scrying-closure-and-seance-checkpoint.md)
- [5 September — independent reviews and debrief](episodes/2026-09-05-independent-review-and-debrief.md)
- [5 September — recovery and plan audit](episodes/2026-09-05-recovery-and-plan-audit.md)

All episodes and local lesson candidates are indexed in [the session index](episodes/README.md).
