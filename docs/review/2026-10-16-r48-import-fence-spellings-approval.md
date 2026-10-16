# R48: the intel and enemy import fences fire on the `.js` spelling (install, review, correction, approval)

Astra M3: the no-omniscience fences in `eslint.config.js` (`src/sim/enemy/**` and `src/intel/**`
must never import a WorldState module: `types`, `world`, `step`, `agents`, `campaign`) listed
extensionless specifiers only. The `ignore`-style groups match the specifier literally, so the
ordinary TypeScript spelling `../sim/world.js`, which `moduleResolution` maps to `src/sim/world.ts`,
crossed both boundaries with zero errors. No production import used the gap.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `424b718`: **Approved**, 0 Critical / 0 Important / 1 Minor (pre-existing, latent);
- the Minor is closed by the test-only R48-1 `2c5646b`;
- the combined R47-1/R48-1 re-check of `2c5646b`: **Approved**, 0 / 0 / 1 for R48-1; the Minor
  is closed by the test-only R48-2 `e4ebc98`.

Root wrote and executed both commits.

## R48, `424b718`

- `eslint.config.js`: both fence blocks list the `.js` spelling of every banned module in both its
  relative and `**/sim/` forms. The panels fence (`**/sim/**`) already covered the extension and is
  the positive control.
- `tests/lint/import-fence-spellings.test.ts`: pulls the computed config for a real intel file and a
  real enemy file and verifies, for every banned module, that both spellings in both forms fire,
  that an allowed module (`rules`) is clear under both spellings, and that the panels fence catches
  the extension. RED 2 failed / 1; GREEN `tests/lint` 179 / 179.
- Gates: 2,573 tests / 157 files, lint, typecheck, build, soak, MC; comparator equal.

## Review: Approved, 0 / 0 / 1

Report: `node_modules/hearsay-r48-review-20261016/REVIEW.md` (gitignored), probes under
`.superpowers/r48-review/` beside it (`probe.cjs`, `spellings.cjs`, `parity.cjs`, `mutate.py`).
`tests/lint` 179 / 3, `eslint .` 292 files clean, both typechecks clean. RED reproduced against the
pre-R48 config (2 failed / 1).

- **M-1 (pre-existing, latent).** The enemy fence's relative entries match from one directory deep
  only: `'../types'` is anchored at the start of the specifier and `'**/sim/types'` needs a literal
  `sim/` segment, so `../../types(.js)` from a future `src/sim/enemy/<sub>/` module, and the odd
  spellings `./../world` and `../enemy/../world.js`, lint clean, typecheck clean and resolve to the
  banned module. The intel fence is immune (every intel specifier contains `sim/`). Fix direction
  taken: a resolver-backed scan test (below).
- **Notes, not counted.** N-1: the intel block's relative entries are inert (`**/sim/X` already
  matches `../sim/X`); dropping them is an equivalent mutant. N-2: the test's `violations()` counts
  every message, not only the rule's, guarded by the `toBe(0)` cases on allowed modules (48 cases,
  no parse errors). N-3: the rule does not see dynamic `import()`; `src/` has none.
- **Verified clean:** all five Astra probe cases give one error each; `.ts`, `.mjs`/`.cjs`, alias,
  `/index` and case-variant spellings are stopped by the typechecker or the rule; the flat-config
  replacement trap is not re-tripped (both fenced files still carry three pattern groups); a bare
  `Linter` and a full `ESLint.lintText` agree on all 48 cases; mutants M2 to M5 killed by the
  named specifier, M1/M6 equivalent (N-1); the diff is the config and the test only.
- **Not verified:** build, soak, MC and the comparator were read from the controller's evidence;
  indirect reachability of `WorldState` through modules the fence allows (no re-export found).

## Correction R48-1, `2c5646b` (test-only)

- `tests/lint/no-omniscience-resolution.test.ts`: walks every `.ts`/`.tsx` file under
  `src/sim/enemy/**` and `src/intel/**`, collects every module specifier (static imports,
  re-exports, `import =`, dynamic `import()`), resolves each with `ts.resolveModuleName` under the
  real `tsconfig.json`, and asserts that none lands on a WorldState module. The lint fence stays
  as the fast, message-bearing guard; the resolver is the law behind it, blind to spelling and
  depth.
- Positive control: six in-memory sources in the spellings the lint patterns miss (deep `../../`,
  `./../`, `../enemy/../`, `../sim/./`, dynamic `import()`, `import type`) are each reported with
  the module they reach; an allowed module under the same spellings is not.
- Mutants (a temporary file written under a fenced subtree, then removed): enemy subdirectory
  `../../types.js`, enemy `./../world`, intel dynamic `import('../sim/campaign.js')`. Each gives
  zero `no-restricted-imports` hits from the live lint config and is killed by the scan test
  (`.superpowers/sdd/r48-1-implementation-validation/11-mutants.txt`).
- Gates: 2,596 tests / 158 files, lint, typecheck, build, soak, MC; comparator equal.

## Re-check of R48-1: Approved, 0 / 0 / 1

Report: `node_modules/hearsay-r47-1-r48-1-review-20261016/REVIEW.md` (gitignored). Forty
temporary files inside the snapshot: the scan flags all five M-1 spellings, `./../world.js`,
dynamic `import()`, `../sim/./`, `../sim//`, a nested `sub/sub2`, `.d.ts` and `.tsx`, while lint
stays silent on the M-1 cases; unresolvable spellings are tsc errors. The test is independent of
the working directory, included by both typechecks, and its describe-time `expect` fails the file
at collection on a wrong tsconfig path. The positive control depends on the real resolver
(naive joining and no resolver are killed; basename and string matchers pass the control but fail
the real-tree tests on false positives). Eight mutants killed; `import =` dropped survives as
equivalent (TS1202). Full suite serial 2,598 / 159.

- **Minor.** The collector has no `ts.isImportTypeNode` branch: `export type W =
  import('../sim/types.js').WorldState;` under `src/intel` is lint clean, tsc clean, resolves to
  the banned module, and the scan misses it. Latent (`src` has no `import(` at all), but
  `import type` is explicitly fenced, so it is an exception to "every spelling".
- Notes, not counted: a non-recursive walk and a `.ts`-only walk survive because no fenced
  subdirectory or `.tsx` file exists yet (the real walk recurses: the reviewer's `sub/sub2` was
  flagged); `.mts`/`.cts` and `require()` are missed by lint and scan alike (none exist).

## Correction R48-2, `e4ebc98` (test-only)

- The collector gains the `ImportTypeNode` branch and the positive control a seventh case
  (`import('…').T`); RED 1 / 3 with the case alone on the old collector; a temp-file mutant under
  `src/intel` (0 lint hits) is flagged by the scan
  (`.superpowers/sdd/r48-2-implementation-validation/11-mutants.txt`). Gates: 2,617 tests / 160
  files, lint, typecheck, build, soak, MC; comparator equal.

## Carried

- The intel block's inert relative entries (N-1) are left in place: harmless, and the scan test
  now binds the intent regardless of the pattern list.
- The walk's recursion and `.tsx` coverage are untested until a fenced subdirectory or `.tsx`
  file exists (re-check note); `.mts`/`.cts`/`require()` are outside both lint and scan.
