---
name: powershell-utf8-review-capture
description: Preserve native Unicode output across PowerShell script boundaries before comparing reports
type: procedure
confidence: confirmed-once
first-recorded: 2026-09-05
last-confirmed: 2026-09-06
sources: [session-2026-09-05-hearsay-review-recovery, session-2026-09-06-hearsay-close]
---

# Preserve native output before comparing reports

On this Windows machine, npm resolves to a PowerShell shim. Its nested Node process
emits UTF-8, while the inherited console decoder can be CP437. Saving the resulting
text as UTF-8 preserves the corruption; it does not repair the decoding step.

For this runner, temporarily setting `Console.OutputEncoding` to UTF-8 around npm,
then restoring it, captures the original characters correctly. Verify with a small
known Unicode emitter before trusting a simulation comparison. Preserve failed logs
and the comparator; do not remove non-ASCII text to obtain equality.

Hearsay's controlled emitter reproduced the failure. The old soak/MC captures were
recovered by an exact reversible decode, and both recovered and freshly rerun logs
passed the unchanged comparator: ten complete blocks and230 deterministic lines.
See [the recovery record](../review/2026-09-05-independent-review-recovery.md).

Recommended scope: durable Windows tooling procedure. It remains project-local
under Ellie's instruction to confine writes to Hearsay. Before future promotion,
check for an existing shared encoding procedure and update that rather than duplicate it.

## Later native capture evidence

The Task 3 closure used Python subprocess binary stdout/stderr capture and saved
the child exit code and exact arguments before decoding output for display. Use
PowerShell 7 and `python -X utf8`; a Windows PowerShell 5 redirection path produced
UTF-16 logs in an earlier controller run. Keep those originals and prove any
conversion round-trips before comparing it.

Create the output directory before the first probe. The independent Task 3
reviewer's initial focused enforcement run had only a contemporaneous transcript
because raw capture began later. The report states that limitation; the already
required full suite subsequently captured those cases. No absent buffer was
reconstructed and no successful test was repeated just to invent missing evidence.
See the [final code review](../review/2026-09-05-scrying-code-approval.md).

Proposed orchestration improvement: native capture paths and child-exit persistence
must exist before the first review gate. This extends the existing local encoding
candidate; it is not a shared-skill edit.
