# Task 6/7B terminal debrief UI and R32–R35 — code approval

Independent installed-code review is **Approved, 0 Critical / 0 Important /
4 Minor**, at `cd0d4410856ed29132353e11fe0d7f1f4cb00b78` (range `875daba..cd0d441`).
Tasks 6 and 7B are installed and closed; corrections R32, R33, R34 and R35 are
independently closed. The 18 UI targets were installed in three serial commits
(d20eba9 registry, 59cd261 panels, d68efad gate) byte-exact from the independently
approved 654-case chunk map, with one disclosed test-only amendment (R33) in
`tests/app/debrief-gate.test.tsx`; the reviewer re-hashed all three chunk maps and
17 of 18 targets byte-identical, the 18th equal to the recorded R33 amended hash.
Range diff: 23 files, +1335/−31.

Root and reviewer each pass **2,476 tests across 147 files**, lint, both compilers
and build (`index-BKBHsstY.js`, asset hashes byte-identical across the two runs).
Root's soak, Monte Carlo and certified comparator at cd0d441 match the approved
Task 5B baseline 875daba: 10 report blocks / 230 deterministic lines, all equal,
four comparator controls. No gameplay change across the range.

**R32** (witnessed presence receipt): `reportedKey` returns null for a witnessed
presence item, mirroring the engine's `scene-presence` write; +45-line regression.
**R33** (effect capture): the byte-exact gate body fails under the repository vitest
config (`Cannot spy on export "useEffect"`) because the author/reviewer harnesses ran
with `server.deps.inline`; the amendment captures effects through `vi.mock('react')`.
Reviewer re-measured RED (exit 1, 1/7) and GREEN (7/7) and proved by mutation that
the sink observes the real registered keyboard handler: deleting the terminal guard
from main.tsx fails exactly the keyboard assertion. **R34** (view law exemption):
five pinned debrief panels relaxed against exactly the three terminal-payload prongs
(`sketch`, `messages`, `beliefs`); pre-state 3 failed / 151, post 152/152; four
captured probes each reject a violation (a `decision` read, a `session.world` alias,
a sixth Debrief file, a fourth claimed prong). Runtime backstop confirmed: panels take
only `view`/`names`/`art`; the sole `debriefView(world)` call sits in the non-running
branch; the AST law proves one guarded fold and one guarded consumer. **R35**
(`.superpowers/**` excluded from vitest and eslint): the only collected file was a
3-test reviewer probe and the only lint failures were three generated reviewer
`.mjs` artifacts; count law 2,475 − 3 + 3 (R32) + 1 (R34) = 2,476 exact.

All binding UI behaviours verify on the installed code: props-only panels through
the type-only `townview.ts` seam with both eslint fences still firing on a probe;
four terminal statuses enforced by type; presentation-only navigation with world-hash
invariance; every record class retained in Threads; calendar clocks and overlay
separation honest; hypothesis cards ungraded; exactly 17 terms and four null asset
slots; accessible text for mutation/lag/uncertainty; contrast 14.35 light / 12.27
dark recomputed from the shipped tokens. The live evidence board's 2.46:1 cell
remains the carried post-plan item.

Minors, recorded and not charged: **M-1** the R34 exemption is union-level across
the five panels rather than per-file-per-prong (all receive the same `DebriefView`);
**M-2** unknown-name fallback to IDs is correct by construction and reviewer-probed
but has no direct assertion in the new tests; **M-3** `debriefView(world)` is
recomputed unmemoized on each terminal render of `App` (pure, rarely re-rendered);
**M-4** if Plan 10 ever resolves the null `texture.paper.debrief` slot, the
contrast case in `debrief-laws.test.ts` would no longer describe the rendered result.

Process notes: R32, R34 and R35 were root-executed and disclosed; root's first
comparator attempt at cd0d441 failed on a wrong baseline path in the derived runner
and is preserved beside the valid `compare-b` capture. The reviewer was a native
Claude worker (Opus 5, fresh context, non-author); no local model was used.

- Review: `.superpowers/sdd/task-6-7b-code-review-2026-09-17.md`
  (SHA-256 `021F24ED2F57B68A989B4726E9B476A0BE5B2ECBD038FA7155A94B586E231927`).
- Evidence: `.superpowers/sdd/task-6-7b-code-review-validation-2026-09-17/`
  (19 native captures: R33 RED/GREEN/mutant, four R34 probes, full suite, lint,
  compilers, build, R35 no-ignore lint, fence probe, extra probes).
- Root gates: `.superpowers/sdd/task-6-7b-implementation-validation/controller-final-2/native/`.
- Brief: `.superpowers/sdd/task-6-7b-code-review-brief-2026-09-17.md`.

Proceed to the R18 proposal review and install, the browser gate, Task 8 and the
final whole-branch review.
