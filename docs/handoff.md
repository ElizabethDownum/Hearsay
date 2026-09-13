# Hearsay — resumed, 13 September 2026

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
   Implement separately verified5A2 and full5B model completion. Prose78-case,
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
   Task6/7B UI continues in a separate isolated checkout against the provisional
   interface; final certification
   must consume the independently approved correction.
   [Latest composition review](review/2026-09-13-composition-contract-review.md).
   The completed premise check supports existing semantic attention readers plus
   calendar/terminal composition; player hypothesis cards remain ungraded notes.
   Plan 10 is outside this run. Adopted A7 explicitly assigns ritual purchase
   composers to Plan 10; Tasks 6/7B/8 must preserve that boundary.

One production writer; root owns Git index and scoped commits. Preserve current
provenance/physical unions when reconciling older virtual overlays. Capture native
bytes/exits before formatting; PowerShell7 and `python -X utf8`. Snapshots start
inside owned excluded `node_modules`, never collectible scratch `.test.ts` paths.
The current measured full-suite count is 2,055/130 at `36d090c`. Existing successful gates need no repetition without a change
or a stated checkpoint requirement.

All deferred questions and PROVISIONAL local rulings, including R24/R25 receipt
uncertainty, remain in [the HTML review](review.html). Lesson promotion and shared
skill changes are candidates only, under R19; shared memory was not edited.

## Recent episodes

- [6 September — scrying closure and séance checkpoint](episodes/2026-09-06-scrying-closure-and-seance-checkpoint.md)
- [5 September — independent reviews and debrief](episodes/2026-09-05-independent-review-and-debrief.md)
- [5 September — recovery and plan audit](episodes/2026-09-05-recovery-and-plan-audit.md)

All episodes and local lesson candidates are indexed in [the session index](episodes/README.md).
