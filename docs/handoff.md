# Hearsay — restart handoff, 5 September 2026

Ellie requested a safe stopping point to restart the computer. This is the
project-local continuation pointer; shared AI memory remains at its older state
because Ellie asked that all writes stay inside Hearsay.

**Resumed after restart:** Ellie asked to continue. Repository/index were clean
at 0241fc8b82a633856a47c625d2b807753e9fa138; repeated boot checks passed 1713/113,
lint, typechecks and build. The bounded R12/R13 correction and completion of the
scrying author draft resumed. H2 is committed at 2fe440f and H1 at a53551d.
Full controller gates and simulation comparison pass. Independent review closed
R13 but found two binding-stability false greens in the scanner (R15). Codex
workers then hit their usage limit. Byte-preserved plans/reports and raw review
evidence remain local. Claude completed the scrying draft recovery, then the
scanner author and séance reviewer hit a new session limit (reset reported as
15:20 CDT / 20:20 UTC on 5 September). No worker remains active. Root verified
the recovered draft's 79 authored cases and complete-block syntax; these are
not executed gameplay tests. Root owns all Git
index/commits; the implementation worker returns unstaged changes. The detailed
current ledger is `../.superpowers/sdd/progress.md`. The wind-down section below describes the
previous checkpoint, not current worker activity.

## Current state

- Repository: `C:/Users/eliza/Desktop/ClaudeFiles/hearsay`, branch `main`.
- Last implementation commit: `a53551d6e47fc575f7c306f43f9fa0ff836250cc`.
  H2 `2fe440f` adds the atomic enrollment/empty-id guards; H1 `a53551d` corrects
  the scanner's bound, retention, forwarding and outcome-recording proofs.
  G2 recovery `a458cd2`, G3 venue/NPC id collision rejection `55a45ae`, and G4
  avatar re-show replay `caa5a38` are committed. F1–F5 and G1 were already
  committed; do not repeat or discard them.
- Controller gate at that implementation commit: 1,737 tests in 113 files,
  lint, both typechecks and production build passed. JavaScript bundle
  `index-lvG-BgOB.js`: 489.96 kB / 145.09 kB gzip.
- Soak and MC passed. All 10 complete stdout report blocks, 230 deterministic
  lines, match `bd930cc`. Full raw logs and comparison result are in
  `../.superpowers/sdd/p9-t1-final-correction-controller/`.
- The earlier independent review found one Critical and one Important issue.
  Both corrections are committed and gated, with real RED/GREEN evidence.
  Independent review over `ae1d5ac..a53551d` delivered Needs-fixes: two further
  binding-stability false greens, with R13 closed and R14 otherwise conformant.
  The final reviewer report was lost to quota, so root wrote explicitly labeled
  [recovery notes](review/2026-09-05-binding-stability-findings.md) from the
  delivered findings and actual raw logs. Task 1 remains open.
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

That pause has elapsed. Ellie then explicitly authorized transmitting these
Hearsay project plans/context/source to Anthropic after automatic approval review
initially rejected the dispatch. Subsequent restricted dispatches were approved;
do not request that authorization again. Unrelated personal/shared memory stays
excluded. Workers have no shell, agents, hooks, MCP or session persistence and can
edit only their named plan/report files. Root supplies tests and commits.

## Resume order

1. Read this handoff, the [session episode](episodes/2026-09-05-recovery-and-plan-audit.md),
   [current plan](plans/plan-9-current.md), and [review document](review.html).
   Inspect Git status/log and the latest ignored per-task reports before editing.
   A documentation commit may follow `a53551d`; that does not mean new game code.
2. Complete the binding-stability correction before Task 2. Current author brief:
   `../.superpowers/sdd/task-1-binding-stability-author-brief.md`; outputs are
   `task-1-binding-stability-plan.md` and `task-1-binding-stability-author-report.md`.
   Root must inspect/probe the authored correction, then separately implement
   tests-first, gate and review its actual committed result. Prior review brief:
   `../.superpowers/sdd/task-1-final-correction-review-brief.md`; implementation
   report: `task-1-final-correction-implementation-report.md` in that directory.
   The earlier completed
   [independent review](review/2026-09-05-artifact-recovery-review.md) is saved
   in tracked documentation is the reason for the committed correction, not its
   current verdict. Approved correction plan and controller adjudication are
   `task-1-final-correction-plan.md` and `task-1-final-correction-controller-adjudication.md`
   under the same work directory. Preserve their explicit static-analysis boundary;
   do not restart an unbounded hardening cycle.
3. After approval, resolve the actual committed HEAD and update
   `../.superpowers/sdd/task-2-brief.md`'s `<FILL AT DISPATCH>` plus obsolete Opus
   seat text in a resolved dispatch note. Current floor is 1,737 tests /113
   files. Use the complete-report comparator and raw baseline named above.
   Implement marker → perception → direct/delayed report → pure forensics fold,
   then independent review. The amended perception projection license is required.
4. Review and complete the corrected Task 3/4 author drafts before dispatching
   either. Drafts need real Task 2/3 predecessor hashes and source re-verification.
   Follow the corrected dependency order in the current plan for prose, debrief
   models/UI and integration tests.
   Task 3's first plan review found missing nested-reference identity and copy
   isolation consumers. Both corrections and the marker-collision controls are
   now fully authored, awaiting focused independent re-review. The initial review is preserved
   at [scrying plan review](review/2026-09-05-scrying-plan-review.md). Task 7A has a
   prepared author brief but has not been dispatched.

All three Claude CLI sessions have ended: scrying recovery `43360` completed
with exit 0; scanner author `92900` and séance reviewer `23943` ended with exit 1,
API 429, session-limit reset at 15:20 CDT / 20:20 UTC. Do not poll these closed
sessions or treat their IN PROGRESS reports as deliverables. The scanner plan
was never written; the séance review has no findings/verdict saved. Native
collaboration workers also exhausted quota. Preserve the raw logs; retry only
when capacity is available. Cross-model authorization remains valid.

The [draft snapshot index](plans/drafts/README.md) identifies the latest completed
Task 3/4 proposals separately from the historical partial restart snapshots.
Task 3's corrected draft SHA-256 is
`EBACFF982443BA604006D33CE62F5AD9AA11D95FE08E4C3DA70DB523A91176ED`.
Root's count/syntax output and lint result are under
`../.superpowers/sdd/task-3-validation/`; all four earlier quota snapshots were
hash-verified unchanged. Focused re-review is prepared but not dispatched.

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

## Historical pre-restart wind-down disposition

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
