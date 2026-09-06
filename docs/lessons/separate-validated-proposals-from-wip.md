---
name: separate-validated-proposals-from-wip
description: Bind authoring evidence to exact virtual sources and keep subsequent untested variants separate
type: procedure
confidence: confirmed-once
first-recorded: 2026-09-05
last-confirmed: 2026-09-06
sources: [session-2026-09-05-hearsay-debrief-authoring, session-2026-09-06-hearsay-close]
---

# Keep validated proposals separate from later drafts

A passing virtual-source test run validates the exact source map it loaded. It
does not validate a later edit to a similarly named proposal file, nor establish
that the proposed feature is implemented in the application.

Retain the loaded sources, logs and hashes; verify published fragments against that
map. Put a later untested variant in a separate file before handing work off. Label
missing tests and unexecuted builders explicitly.

Hearsay's eight-module debrief proposal passed96 isolated cases, both compiler
configurations and lint. A later feature-link draft changed the shared evidence
fragment without a new test run. At the restart stop, root preserved those bytes
in a separate WIP variant and restored the shared fragment from the verified map.
The [WIP snapshot](../plans/drafts/2026-09-05-task-5b-feature-link-wip.md) records the
missing tests and checks. Production remains unchanged.

Recommended scope: durable authoring/verification procedure. Any future author-skill
update should require evidence to name the exact loaded proposal version. No shared
skill or memory edit is made under the current project-only scope.

## Later proposal and predecessor evidence

The ordinary feature-link proposal now preserves all 96 earlier cases, 48 feature
cases and three independent receipt-boundary cases, for 147. Its independent
approval binds the corrected exact source map. The old 144-case version and its
failing missing-receipt counterexample remain immutable evidence. See the
[focused approval](../review/2026-09-05-feature-links-receipt-correction-approval.md).

That host uses explicitly listed future recording/watch overlays over committed
source. It does not prove integration with the actual Task 3/4 physical evidence
unions or the complete debrief model. Before implementation, reconcile every
overlapping field against the actual predecessor; an old speech-only whole-file
overlay must not erase new physical branches. A source inventory is discovery
evidence, and a complete code proposal still requires independent review and
actual-base verification.

Proposed authoring improvement: list each virtual prerequisite and its consumer
migrations, with exact hashes, separately from implemented predecessor facts.
