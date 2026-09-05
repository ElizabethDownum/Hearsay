# Plan 9 author snapshots â€” 5 September 2026

## Latest recovered proposals

These byte-preserved drafts are complete author proposals, not implemented or
approved gameplay. The real Task 2/3 predecessor commits must still be reconciled.

- [Task 3 corrected scrying draft](2026-09-05-task-3-scrying-recovered.md) and
  [completed author report](2026-09-05-task-3-author-report-recovered.md): all 79
  authored cases present; root verified the count and complete-block syntax.
  Focused independent re-review remains pending. Draft SHA-256:
  `EBACFF982443BA604006D33CE62F5AD9AA11D95FE08E4C3DA70DB523A91176ED`.
- [Task 4 completed sÃ©ance draft](2026-09-05-task-4-seance-complete.md) and
  [completed author report](2026-09-05-task-4-author-report-complete.md): review
  stopped at quota before a verdict. Draft SHA-256:
  `14ABA1730FF43696C17D0D81D293C6B96E2065F7B2DE83BD91F1515C4D8EE005`.
- [Controller verification and interruption record](../../review/2026-09-05-claude-recovery-checkpoint.md)
  distinguishes actual local checks from authored expectations and lost work.

## Prose foundation proposal

- [Task 7A prose and public-label draft](2026-09-05-task-7a-prose.md) and
  [author report](2026-09-05-task-7a-author-report.md): complete proposal with
  24 predicate templates and 44 authored tests passing against virtual source.
  Both compiler configurations and lint pass for all 11 proposed files; a virtual
  new predicate produces the expected missing-template diagnostic. Production
  remains at 1780 tests. Independent plan review, reconciliation with the future
  Task 4 predecessor, implementation and independent code review remain open.
  Draft SHA-256:
  `4E75A99545ACCC5269E5BA9CB23E8C02F0EE8EA48687F2ABE5B8A60C5E6AA0A7`.

## Debrief recording proposal

- [Task 5A exact recording repair](2026-09-05-task-5a-recording.md),
  [constraints](task-5a-constraints.md) and
  [author report](2026-09-05-task-5a-author-report.md): six production files,
  16 new cases, two exact schema expectation updates. The virtual proposal passes
  99 affected cases, both compiler configurations and lint. Nine full-world pairs
  preserve all pre-existing state. Independent review, future predecessor
  reconciliation and implementation remain; Task 5B models are not included.
  Draft SHA-256:
  `955DD09A77CB763A76D222E8D66FF99509E58128068A6C1452542FC2674B0A62`.

## Watch corrections and execution history proposals

- [R16 self-presence correction](2026-09-05-r16-self-presence.md),
  [constraints](r16-constraints.md), [author report](2026-09-05-r16-author-report.md):
  one clause, ten new tests,39 affected passing cases.
- [R17 watch-stage correction](2026-09-05-r17-watch-stage.md),
  [constraints](r17-watch-stage-constraints.md), [author report](2026-09-05-r17-watch-stage-author-report.md):
  one clause, four new tests,30 affected passing cases.
- [Task5A2 private outcome history](2026-09-05-task-5a2-outcome-history.md),
  [constraints](task-5a2-outcome-history-constraints.md),
  [author report](2026-09-05-task-5a2-outcome-history-author-report.md):
  19 additions,239 affected passing cases, twelve full-world pairs equal after
  stripping only new outcome history (81 rows). Probes use common virtual R16/R17.
- [Partial Task5B model evidence](../../review/2026-09-05-debrief-model-preflight.md):
  six partial modules with62 native cases, both compiler configurations and lint clean;
  [exact partial fragments](2026-09-05-task-5b-fragments.md). Complete models remain unfinished.

All are proposals, not independently approved or implemented. Full production
gates must assess the behavioral watch repairs; the recording change is separately
required to preserve every pre-existing field. No source/test path was edited.

## Historical restart snapshots

These are byte-preserved snapshots of the native Codex authors' partial work.
They are **not dispatch-ready** and none of their proposed code has been run.
Read each report before using its draft. Resume working copies are under
`../../../.superpowers/sdd/`; validate real predecessor commits before execution.

- [Task 3 scrying draft](2026-09-05-task-3-scrying.md) and
  [author report](2026-09-05-task-3-author-report.md): fair-cop code/tests,
  app-session replay, coherent chunk/file licenses and self-review remain.
- [Task 4 sÃ©ance draft](2026-09-05-task-4-seance.md) and
  [author report](2026-09-05-task-4-author-report.md): exact generation/runtime
  patches, night-visit mechanism, test bodies and self-review remain.

Current decisions are in [the review document](../../review.html), and the
execution order is in [the current plan](../plan-9-current.md). Task 1 corrections
and Task 2 forensics are now implemented and locally gated at dc114da, with
independent code approval still pending. Task 3 must reconcile that actual source
and consolidate the temporary forensics auditor before execution.
