# Task 6/7B interactive browser gate — approval, with R36/R37

The interactive browser gate the plan owes after the Task 6/7B installed-code approval is
**closed as PASS**. The gate itself measured the installed terminal debrief UI at `01c043c`
(**PASS**, one material defect found beyond the enumerated criteria); the two corrections it
produced, R36 and R37, are installed at `f18afd3ee4b540495b7b97a766660c9e41d45b7c` and
independently reviewed (**Approved 0 Critical / 0 Important / 3 Minor**) with the browser
re-measured at that commit (**PASS**, both defects gone). Governing preparation:
`.superpowers/sdd/task-6-7b-browser-preparation-2026-09-13.md`.

**What the gate measured.** Headless Edge driven over CDP through the owned `cdp.mjs`
(`f5fc229d…4ab7`, unmodified), a task-local Vite harness importing the actual installed
modules, viewports 1280×900 and 390×844, explicit light and dark themes plus the automatic
preference path, every surface reached by pointer and by real keyboard events. Roving tabindex,
`aria-selected`, `aria-controls`/`aria-labelledby`, arrow wrap, Home/End, Space and Enter
activation, day-link scrolling, status text, glyph fallbacks, no horizontal page overflow, zero
console errors and the world hash unchanged across every navigation all conform. The carried
contrast Minor M2 is discharged by measurement on the rendered composed desk: 14.35 (light) and
12.27 (dark) for changed words and exact cells, the gilt live-board rule measurably overridden
inside the desk, and `.diff-cell` not rendered there. The real application at loopback renders no
terminal DOM on the running branch and loads its fonts from root-absolute paths.

**Findings and dispositions.**
- **F1, material** (WCAG 2.4.3): opening the debrief, Back and Escape all dropped focus to `<body>`.
  Fixed by **R36** in `app/src/panels/DebriefEnding.tsx`: the navigation reducer records
  `visited`; mount-time `autoFocus` lands on the selected tab when the desk opens and on the
  "Open the …" control after Back or Escape, never on the campaign's first terminal render. The
  reviewer read the installed React 19.2.7 commit path to confirm `autoFocus` fires exactly once
  per host mount, and measured every transition in all four viewport × theme combinations: focus
  lands on the selected tab (retained across reopen), returns to the opening control, keyboard
  transitions show `:focus-visible`, a scripted tab switch does not move focus, and the tablist is
  one Tab stop from the panel. It also notes R36 incidentally makes Escape work immediately after
  a keyboard open.
- **F2, minor**: `.debrief-card { overflow-wrap: anywhere }` defeated the ≤600px scrollable
  comparison table, so words broke mid-character. Fixed by **R37** in `app/src/theme.css`, inside
  the existing ≤600px block only: table cells restore `overflow-wrap: normal`. Measured at 390:
  all six comparison tables scroll, zero mid-word breaks, no page overflow; a positive control
  restoring the old inherited value reproduces the defect exactly (59 broken cells, no scroll); a
  200-character token is absorbed by the scroll container at both viewports; the >600px
  presentation is unchanged.
- **F3–F4, observations**: the gate fixture retains no received signals, artifacts or magic
  operations, so the Overlay status sentences and three of the four icon glyphs had no render
  site; their contrast is derived (5.13 / 5.29) not measured. Carried to Task 8, whose real
  terminal routes may reach them, and otherwise a post-plan measurement.
- **F5, observation**: `/favicon.ico` 404 on both the harness and the real app; `app/index.html`
  declares no icon. Post-plan item, unrelated to the debrief UI.
- **F6, observation**: the terminal-branch global Space guard was not exercised end-to-end; the
  running-branch listener was measured live and the terminal early return remains covered by the
  existing real-registered-handler unit evidence, as the preparation records.

**R36/R37 lineage and gates.** Root authored and installed both (disclosed): RED with the amended
tests against unchanged production, exit 1, 3 failed / 23 passed (26) for exactly the three
intended reasons; then GREEN 26/26, app suite 495/495, both compilers, scoped lint, and the six
repository gates: **2,481 tests across 148 files**, lint, typecheck, build (`index-BpAIYnf0.js`),
soak, Monte Carlo, certified comparator (`99B1F00F…`) against the R18 `01c043c` baselines: 10
report blocks / 230 deterministic lines, all equal, four controls. The reviewer re-ran the focused
files, `npm test` (2,481/148), typecheck, lint and build in its own snapshot with the same results.

**Minors, recorded and not charged.** **M1** the "Back" focus assertions sit after the open
assertion in the same test case, so RED never reached them; Back and Escape dispatch the identical
close action, the Escape case failed RED independently, and the pointer-driven Back path was
measured in the browser. **M2** one static-markup assertion in `tests/app/debrief-ui.test.tsx`
couples to JSX prop order; the load-bearing prop assertion beside it does not. **M3** the new
narrow-block law slices the media block with a single-line regex, correct for the present
stylesheet and loud (throws) if reformatted. Left as recorded to keep the reviewed commit
identical to the installed one.

Process notes: the reviewer's first themed run applied the theme attribute at document start
(before the root element existed) and measured the default palette; it is retained and superseded
by the themed run, whose focus and table results agree step for step. Both workers were native
Claude (Opus 5, fresh context, non-author); no local model; one Vite server and one headless
browser alive at a time, normal sandbox, fresh profiles, every owned process closed and recorded.

- Gate: `.superpowers/sdd/task-6-7b-browser-gate-2026-09-17.md` (SHA-256
  `AEAC057EB7174E6AEF87F0CE94AA0078698413714C97C16282444051ADF0AA22`), evidence
  `.superpowers/sdd/task-6-7b-browser-gate-validation-2026-09-17/` (76 screenshots).
- R36/R37 install: `.superpowers/sdd/r36-r37-implementation-validation/` (runner,
  `controller/native/` RED, GREEN, six gates, comparator).
- Review and re-measurement: `.superpowers/sdd/r36-r37-review-and-remeasure-2026-09-18.md`
  (SHA-256 `7F5412A408D8E870B81EC445444FC1A4653D0A9BFD3F06193E08D97E4DAD3B68`), evidence
  `.superpowers/sdd/r36-r37-review-and-remeasure-validation-2026-09-18/` (38 screenshots).

Proceed to Task 8 and the final whole-branch review.
