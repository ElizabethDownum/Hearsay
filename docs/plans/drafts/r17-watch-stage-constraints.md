# R17 watch-stage recording — constraints

- Count watch work only after execution has started, at the actual received post and
  within the unchanged authored window/beat. Never count pending or deferred orders.
- Preserve every existing physical-position, day, beat and same-day duplicate guard.
- Do not change prices, time constants, authority, thresholds, seeds or report policy.
- Files: execution.ts and new watch-execution-stage.test.ts only. No other suite edits.
- All writes inside Hearsay; root owns the index; no push or shared-memory/config writes.
- Separate plan review → implementation → full six gates → separate code review.
- Emergent assertions are hypotheses. Failure → report; never weaken mechanics to
  pass. An untraceable existing-suite failure is BLOCKED.
