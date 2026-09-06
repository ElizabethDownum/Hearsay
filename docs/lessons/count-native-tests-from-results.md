---
name: count-native-tests-from-results
description: Reconcile test growth from executed file counts instead of registry or source estimates
type: procedure
confidence: confirmed-once
first-recorded: 2026-09-06
last-confirmed: 2026-09-06
sources: [session-2026-09-06-hearsay-close]
---

# Reconcile test growth from native results

Registry entries, source assertions and runtime test cases have different counts.
Use the executed per-file results to explain every change from the certified
baseline. Preserve all old file identities and explain a decrease per test; do not
silently replace a measured count with an estimate.

Hearsay Task 3 added 79 authored cases and six generated cases, moving the suite
from 1,783/114 files to 1,868/121. Three new term registrations generated one
verb-mapping case because aggregate assertions checked the other entries. Five
later literal term uses generated five more cases. The earlier estimate of 1,870
overcounted by two. Worker, controller and reviewer native results agree on 1,868.
See the [implementation validation](../review/2026-09-05-scrying-implementation-validation.md)
and [independent approval](../review/2026-09-05-scrying-code-approval.md).

The original report remains frozen; current status and the ledger explicitly
correct its arithmetic. A historical error is preserved as history, without
letting it become the next task's baseline.

Recommended classification: durable verification procedure. Proposed orchestration
improvement: require runtime per-file reconciliation for generated test growth,
alongside the existing no-silent-deletion rule. This candidate is saved locally;
no shared skill or memory was changed.
