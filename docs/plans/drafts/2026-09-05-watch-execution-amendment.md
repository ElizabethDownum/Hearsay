# Watch correction execution notes from independent plan review

Root Codex, 5 September 2026. No production change in this document.
Applies to the frozen R16 and R17 proposals reviewed in
`watch-corrections-plan-review.md` (Approved-for-implementation, zero C/I).

Keep the required order: R16, full six gates, separate code review, then R17 on the
actual committed R16 base, full six gates, separate code review. R16 changes the
behavior of player-authored self-presence guidance as well as enemy watch guidance.
The existing enemy-orders watch assertion currently passes through premature work;
after both corrections it must pass through an actual attempted watch. Preserve it.

Adopt the reviewer's optional strengthening in R16's full-loop test: after
`runUntil`, when `record` is in scope, add:

```ts
expect(record.execution?.state).toBe('attempted');
```

Keep the existing report and workedDays assertions. Measure RED on the actual
uncorrected base and GREEN with R16; the assertion must not pass merely because
the pre-R17 latch emitted a premature report. This adds no test case, changes no
report policy and does not alter the 10-case R16 count. The reviewer's optional
synthetic report-policy edit is unnecessary; retain that fixture as authored.

Expected floors from dc114da: R16 adds10/1 to1790/115; R17 adds4/1 to1794/116.
Reconcile intervening legitimate changes at dispatch rather than treating these as
unconditional future measurements. All simulation report blocks must be compared;
soak is generation-only and cannot change from either clause. Explain any MC delta
through actual watch execution. Never retune constants, thresholds or seeds.

Deferred observations are preserved in HTML R18: cancellation can leave an attempted
watch eligible for later work, expiry emits a refusal after successful nights, and
interpreted-versus-received application venues can diverge. These are not covered
by approval of the two clauses. Do not silently expand R16/R17 to fix them.

While the independent review provider is quota-limited, leave these production
changes queued so the two fixes can receive the required consecutive reviews.
