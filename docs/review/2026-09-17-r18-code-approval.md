# R18 watch-cancellation correction — code approval

The R18 correction is installed at `01c043caffa30388fa20461c6b75843292204287` and
independently reviewed twice: the proposal at `cd0d441` (**Approved 0 Critical / 0 Important /
4 Minor**) and the installed code over `7499f58..01c043c` (**Approved 0 Critical / 0 Important /
1 Minor**). R18 is closed. Governing requirement: `2026-09-13-r18-measured-dispositions.md`.

**What changed.** One pure helper, `watchInstalledFor`, ANDed onto the existing attempted-watch
settlement guards in `src/sim/directives/execution.ts` (+26): an attempted enemy watch accrues a
worked night only while the schedule row its own execution installed is still present at the
current tick, matched on source, order reference, effective start day, authored end day, the
960–1140 window and the post venue. A cancelled watch can no longer re-latch work, outcomes,
reports or HQ state through ordinary post presence, and a later same-guard/district watch with a
distinct authored end day supersedes the original. No state is written; cancellation, expiry,
report, HQ, RNG, threshold, seed, schedule, trait, schema, config, UI and wording are untouched.
Tests: new `tests/directives/watch-cancellation-identity.test.ts` (cancellation re-latch,
supersession, surviving-active control, physical-absence control) and the R17 attempted-stage case
now reaching its precondition through the real due/attempt path with its name and every assertion
preserved. Path set exactly three; the commit diff is byte-identical per file to the frozen patch
(12,343 bytes, `A51D8792…ADC6FEAE`).

**Lineage.** Root installed the tests first: RED exit 1, 2 failed / 6 passed, the two failures
being exactly the diagnosed assertions (`[1,2,3]` vs `[1,2]`; `[1,3]` vs `[1]`), then the production
hunk: GREEN 8/8, 66/66 directive gate, 476/476 broadened 24-file control, both compilers, scoped
lint. Both reviewers reproduced RED and GREEN in their own snapshots with the test files
byte-identical across the two runs, so the delta is the production hunk alone.

**Gates at `01c043c`.** Root and the installed-code reviewer each pass **2,480 tests across 148
files** (2,476 + 4), lint, both compilers and build (`index-C3jFYRgu.js`). Root's soak, Monte Carlo
and certified comparator against the cd0d441 baselines: 10 report blocks / 230 deterministic lines,
all equal, four controls, comparator `99B1F00F…`, repository configs unmodified.

**Minors, recorded and not charged.** From the proposal review: **M1** the amended R17 case measures
ticks 2415 / 2430 / 2445 instead of the hand-set 2385 / 2400 / 2415; the reviewer showed minute 960
is still exercised on days 2–5 of the real loop, so no boundary is lost. **M2** two watches with the
same authored start day produce value-identical rows and both accrue; pre-existing, byte-identical
patched and unpatched, and shown unreachable through the enemy planner (start day is always
emission day + 1, one district issue per eleven-day cadence, three independent suppressions).
Carried limit. **M3** the effective start day is reconstructed from `changedAt`, which is frozen
after install by `dueAt: null` and the duplicate-setup throw; a future hardening of
`markDirectiveDue`'s early-return list is optional and out of scope. **M4** the author's
validation-only vitest config did not follow the patch into production. From the installed-code
review: **M5** root's install captures hash raw mixed-line-ending bytes, so the lineage is
verifiable by hash only with the author hosts at hand; future captures should record an LF digest
alongside the raw one, as the proposal reviewer's captures do.

Process notes: root executed the install from the approved patch and disclosed it; the first runner
launch never started (a shell redirect targeted a directory the runner creates) and left no capture.
Both reviewers were native Claude workers (Opus 5, fresh context, non-author); no local model.

- Proposal review: `.superpowers/sdd/r18-watch-correction-review-2026-09-17.md`
  (SHA-256 `1780E1EB925CDAF15DDE9330F8A21FEBD964675ECCA28F8942F32D54BEB1B84F`), evidence
  `.superpowers/sdd/r18-watch-correction-review-validation-2026-09-17/`.
- Install: `.superpowers/sdd/r18-implementation-validation/` (runner, install note,
  `controller/native/` RED/GREEN/six gates/comparator).
- Installed-code review: `.superpowers/sdd/r18-installed-code-review-2026-09-17.md`
  (SHA-256 `7CBC57C51467A9A591D58033B47AFB1AC50196CA628A7C7350E091F59598B539`), evidence
  `.superpowers/sdd/r18-installed-code-review-validation-2026-09-17/`.

Proceed to the browser gate, Task 8 and the final whole-branch review.
