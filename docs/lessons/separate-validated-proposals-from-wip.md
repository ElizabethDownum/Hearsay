---
name: separate-validated-proposals-from-wip
description: Bind authoring evidence to exact virtual sources and keep subsequent untested variants separate
type: procedure
confidence: confirmed-once
first-recorded: 2026-09-05
last-confirmed: 2026-09-05
sources: [session-2026-09-05-hearsay-debrief-authoring]
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
