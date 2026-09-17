# Task6/7B UI contrast correction — proposal re-review approval

The 654-case contrast correction of the final Task6/7B UI proposal is independently
**Approved, 0 Critical / 0 Important / 4 Minor**, reviewed against the frozen author
host at `252a4813e1efffd15a5f08936bd3d64e2343af67` with HEAD `875daba` unchanged. The
correction is one CSS rule (`theme.css:316`, `.debrief-change, .debrief-desk .diff-cell`
on ink over paper) plus five style cases appended as a pure suffix to the existing law
test; the markup is untouched (all five SSR captures byte-identical to the 649 receipt,
world hash 1734303072).

The reviewer re-derived the WCAG arithmetic from the stylesheet without the author's
numbers: the reviewed Important defect (dark inline 1.54:1, light exact 2.46:1) closes
at 14.35:1 light and 12.27:1 dark for both presentations; the override wins on both
specificity and source order with no `!important` on colour. Native: the frozen 649 map
649/649, the correction on old CSS 652/2 with exactly the two predicted failures, on
new CSS 654/654; both compilers zero; 46-body lint zero; all 649 inherited case
identities and multiplicities preserved. Seven adversarial control maps show the new
cases are causally sensitive (dropping the desk override fails only the light exact
case; short hex, named and `rgb()` colours fail loudly). The 25 model bodies in the
map are byte-exact at HEAD; the four legacy directive overlays differ by line endings
only; the three install units are disjoint and equal the 18 UI targets.

Minors, adjudicated: **M1** the live evidence board's `.diff-cell` outside the desk
keeps 2.46:1 in the light theme. Pre-existing, out of scope, pinned by the fifth new
case; carried as a post-Plan9 accessibility item. **M2** the desk-ancestor relation the
exact-value half depends on is proved by source reading (main → DebriefEnding →
panels → DebriefReading), not by a test or capture; carried to the installed-code
browser checks, which render the composed desk. **M3/M4** resolver specificity by dot
count, dark palette by ordinal, and a subset guard: exact for the current stylesheet,
noted.

Process note: the Codex reviewer remains quota-blocked until 20 September; this review
was seated on a native Claude worker (Opus5, fresh context, non-author).

- Review: `.superpowers/sdd/task-6-7b-contrast-native-review-2026-09-17.md`
  (SHA-256 83246d13ee44ffd33f27a1a5d7151f60a6c1a5f97aad0389d1fde5d65a275a16).
- Evidence: `.superpowers/sdd/task-6-7b-contrast-review-validation-2026-09-17/`
  (14 native invocations, 7 control maps, cascade scan, reachability, case identity).

Install the 18 UI targets in units 7b-registry, 6a-panels, 6b-gate, byte-exact from the
approved chunk maps, with scoped and accumulated gates, then installed-code review and
the interactive browser gate.
