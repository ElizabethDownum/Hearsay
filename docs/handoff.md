# Hearsay — restart handoff, 5 September 2026

Ellie requested a safe stopping point to restart the computer. This is the
project-local continuation pointer; shared AI memory remains at its older state
because Ellie asked that all writes stay inside Hearsay.

**Resumed after restart:** Ellie asked to continue. Repository/index were clean
at 0241fc8b82a633856a47c625d2b807753e9fa138; repeated boot checks passed 1713/113,
lint, typechecks and build. The bounded R12/R13 correction and completion of the
scrying author draft are active. The wind-down section below describes the
previous checkpoint, not current worker activity.

## Current state

- Repository: `C:/Users/eliza/Desktop/ClaudeFiles/hearsay`, branch `main`.
- Last implementation commit: `caa5a38fa6470082c2171024028bbe7a1a8556a7`.
  G2 recovery `a458cd2`, G3 venue/NPC id collision rejection `55a45ae`, and G4
  avatar re-show replay `caa5a38` are committed. F1–F5 and G1 were already
  committed; do not repeat or discard them.
- Controller gate at that implementation commit: 1,713 tests in 113 files,
  lint, both typechecks and production build passed. JavaScript bundle
  `index-Bx1rX8Le.js`: 489.86 kB / 145.07 kB gzip.
- Soak and MC passed. All 10 complete stdout report blocks, 230 deterministic
  lines, match `bd930cc`. Full raw logs and comparison result are in
  `../.superpowers/sdd/p9-t1-controller-2026-09-05/`.
- Independent review is complete: **Needs-fixes, one Critical and one Important**.
  The scanner incorrectly treats potentially anchored credence reads as bounded;
  avatar enrollment can recreate venue/NPC id collisions, with an additional
  falsy empty-id gap in initial collision guards. Controller accepts both as
  defects inside the existing mandate. Task 1 remains open.
- Task 2 forensics has an audited brief but has NOT been dispatched. Tasks 3/4
  have draft authoring artifacts only. No magic implementation has landed.

## Persistent instructions

Ellie authorized: audit/read the existing plan, then continue implementation;
the previous Claude Hearsay session had stopped editing; keep all files/changes
inside the Hearsay folder in ClaudeFiles; take recommended defaults and put all
questions/issues in the HTML review document for later reading.

No Claude dispatch before **2026-09-05 12:24:11 UTC / 07:24:11 CDT** (conservative
expiry for the requested 2 hours 15 minutes starting at the later "starting now"
message). Native Codex workers were used. Implementation and independent review
were separate threads from the same provider. No push occurred.

## Resume order

1. Read this handoff, the [session episode](episodes/2026-09-05-recovery-and-plan-audit.md),
   [current plan](plans/plan-9-current.md), and [review document](review.html).
   Inspect Git status/log and the latest ignored per-task reports before editing.
   A documentation commit may follow `caa5a38`; that does not mean new game code.
2. Correct and close the independent Task 1 recovery findings before Task 2. Review
   brief: `../.superpowers/sdd/task-1-fix2-review-2026-09-05.md`; implementation
   report: `task-1-fix2-report.md` in that same directory. The completed
   [independent review](review/2026-09-05-artifact-recovery-review.md) is saved
   in tracked documentation. Author a bounded correction for R12/R13 and test
   same-belief monotone retention as well as rejecting cross-belief anchor copies.
   Verify enrollment rejects default/custom/empty id collisions atomically. The review
   range is `bd930cc..caa5a38`; its mandate and accepted static-analysis residual
   are explicit in the brief. Do not restart an unbounded hardening cycle.
3. After approval, resolve the actual committed HEAD and update
   `../.superpowers/sdd/task-2-brief.md`'s `<FILL AT DISPATCH>` plus obsolete Opus
   seat text in a resolved dispatch note. Floor is at least 1,713 tests /113
   files. Use the complete-report comparator and raw baseline named above.
   Implement marker → perception → direct/delayed report → pure forensics fold,
   then independent review. The amended perception projection license is required.
4. Review and complete the corrected Task 3/4 author drafts before dispatching
   either. Drafts need real Task 2/3 predecessor hashes and source re-verification.
   Follow the corrected dependency order in the current plan for prose, debrief
   models/UI and integration tests.

## Artifact map

- `../.superpowers/sdd/progress.md` — controller ledger; current session notes at top.
- `../.superpowers/sdd/task-1-progress.md` — recovery implementation commit units.
- `../.superpowers/sdd/resume-2026-09-05-g2-snapshot/` — byte copies, hashes and diff
  of the inherited unfinished G2 edits before this session touched them.
- `../.superpowers/sdd/p9-resume-premises-2026-09-05-report.md` — recovery audit.
- `../.superpowers/sdd/p9-plan-audit-2026-09-05-report.md` — remaining-plan audit,
  including its corrected receipt-history premise.
- `../.superpowers/sdd/compare-report-blocks-2026-09-05.mjs` — complete-report
  comparator, with known-good/changed/extra/missing controls. The older worker
  selection-based comparator can overlook extra output and is superseded.
- `../.superpowers/sdd/task-3-author-{draft,report}.md` — scrying proposal/status.
- `../.superpowers/sdd/task-4-author-{draft,report}.md` — séance proposal/status.
- [Committed partial draft snapshots](plans/drafts/README.md) — both authors'
  saved code proposals and explicit unfinished-work reports.
- [Remaining-plan audit](review/2026-09-05-plan-audit.md) and
  [recovery review](review/2026-09-05-artifact-recovery-review.md) — preserved reports.
- [HTML review source](review/current.md), [historical docket](review/prior-decisions.md),
  [builder](review/build_review.py). Rebuild with `python docs/review/build_review.py`.

`.superpowers/sdd` is ignored but persists on this machine across a restart.
Nothing there should be mistaken for committed code merely because a file exists.
The test/build loader may hit sandbox path access denial in esbuild before tests
start. Exact test/build escalation succeeded; no tool configuration was changed.

## Final wind-down disposition

All session workers have completed their wind-down. The reviewer reports no
active process/session. Both authors saved PARTIAL, NOT DISPATCH-READY work and
made no production/test/index edits. No new implementation or review is running.

The independent reviewer repeated focused tests (125/125), the full suite
(1,713/113), typechecks and build. It found a lint-only unused variable in the
controller's ignored complete-report comparator. The controller removed it,
reran literal `npm run lint` successfully (log `handoff-2026-09-05-lint.log`), and
reran the complete-report comparison with all four controls successfully.
The two substantive review findings remain intentionally unfixed at this safe
stopping point; do not mistake passing tests for review approval.

All session-created documentation and the partial plan/report snapshots are
included in a scoped local checkpoint commit. Implementation HEAD remains
`caa5a38`; use `git log` to resolve the subsequent documentation commit. No push.
