---
name: incremental-review-handoff
description: Persist each completed review charge and native result before a worker can lose quota
type: procedure
confidence: confirmed-once
first-recorded: 2026-09-05
last-confirmed: 2026-09-05
sources: [session-2026-09-05-hearsay-review-recovery]
---

# Save review substance incrementally

A progress header alone is insufficient for a long review. Save a disposition or
finding after each completed charge and update the evidence table after each native
gate. Keep actual command, source endpoint, exit and raw artifact path together.

The interrupted Hearsay reviewer ran1780 tests and further checks, but its report
still listed most gates as pending when quota ended. Root recovered actual execution
from runner files; no independent verdict could be recovered because none was written.
A final probe edit also postdated the last passing run, so the latest probe could
not truthfully inherit that pass.

Distinguish previous-worker evidence, root reconciliation and a new reviewer's own
runs. A capacity failure is not approval and does not revoke the user's persistent
authorization. See [the recovery record](../review/2026-09-05-independent-review-recovery.md).

Recommended scope: durable agent-review procedure. Proposed shared-skill amendment:
add per-charge/per-gate persistence to the orchestration review brief template.
This is a proposal only; no shared skill or memory file was edited.
