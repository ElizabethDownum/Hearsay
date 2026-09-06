# Task 4A worker report

## 1. Summary

Implemented Task 4A's isolated historical witness on documentation HEAD `89149f785b497e3af8951cf2ff68f432ff7b9160`, whose production/test source equals the independently approved Task 3 endpoint `60506d9a582db60c60c627d6b42ec83f62ed709e`.

- Added deterministic departed-witness generation on the independent `gen:departed` stream after all existing generation and scenario-retargeting work.
- Added report-style `departed-sane` validation and the same fail-fast boundary at `worldFromTown`.
- Retained a valid witness as detached runtime metadata bound to the already-minted secret claim, without adding a dead NPC, belief store, claim, genesis record, or living witness.
- Added the future séance/night-visit record types while leaving `buildWorld` free of `departed` and `seanceUsed` initialization.
- Kept family-thread membership truthful and narrowed campaign reach metrics explicitly to injections and tellings.
- Added the exact shared séance fixture and 14-case departed suite. The exact focused selection passes 59 cases in four files: 14 new cases plus 45 existing world controls.

No Task 4B/4C work, action integration, terms, price, physical sightings, digest changes, package/configuration changes, full gates, index write, commit, or push was performed.

## 2. Gate output

### Final focused gate

Command:

```text
node node_modules/vitest/vitest.mjs run tests/world/departed.test.ts tests/world/validate.test.ts tests/world/secrets.test.ts tests/world/dossier.test.ts
```

Native exit: `0`

```text
 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ✓ tests/world/validate.test.ts (27 tests) 40ms
 ✓ tests/world/departed.test.ts (14 tests) 152ms
 ✓ tests/world/secrets.test.ts (4 tests) 816ms
   ✓ worldFromTown > enemy-attached worlds replay hash-identical (live ≡ replay)  655ms
 ✓ tests/world/dossier.test.ts (14 tests) 1848ms
   ✓ day-0 dossier — truthful, capped starting intelligence > worldFromTown + attachPlayer + a 4-verb log replays hash-identical on a fresh world  1811ms

 Test Files  4 passed (4)
      Tests  59 passed (59)
   Start at  00:06:23
   Duration  3.04s (transform 600ms, setup 0ms, collect 2.22s, tests 2.86s, environment 1ms, prepare 461ms)
```

Raw evidence:

- `.superpowers/sdd/task-4-implementation-validation/4a/final-green.stdout.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-green.stderr.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-green.exit.txt`

The first GREEN before a formatting-only exact-body correction also passed 59/59 and is retained as `green.stdout.log`, `green.stderr.log`, and `green.exit.txt`. The final run above is the authoritative final-body result.

### Both TypeScript configurations

Command:

```text
npm.cmd run typecheck
```

Native exit: `0`

```text
> hearsay@0.0.1 typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.app.json
```

Raw final-body evidence:

- `.superpowers/sdd/task-4-implementation-validation/4a/final-typecheck.stdout.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-typecheck.stderr.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-typecheck.exit.txt`

The pre-formatting pass is preserved separately as `typecheck.stdout.log`, `typecheck.stderr.log`, and `typecheck.exit.txt`.

### Scoped ESLint

Command:

```text
node node_modules/eslint/bin/eslint.js src/sim/magic-types.ts src/world/departed.ts tests/sim/helpers/seance-town.ts tests/world/departed.test.ts src/world/types.ts src/world/gen.ts src/world/validate.ts src/world/attach.ts src/sim/types.ts src/sim/chronicle.ts src/harness/metrics.ts
```

Native exit: `0`. Native stdout and stderr were empty.

Raw final-body evidence:

- `.superpowers/sdd/task-4-implementation-validation/4a/final-lint.stdout.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-lint.stderr.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-lint.exit.txt`

The pre-formatting pass is preserved separately as `lint.stdout.log`, `lint.stderr.log`, and `lint.exit.txt`.

### Scoped diff check

Command:

```text
git diff --check -- src/sim/magic-types.ts src/world/departed.ts tests/sim/helpers/seance-town.ts tests/world/departed.test.ts src/world/types.ts src/world/gen.ts src/world/validate.ts src/world/attach.ts src/sim/types.ts src/sim/chronicle.ts src/harness/metrics.ts
```

Native exit: `0`. Stdout was empty. Stderr contains only Git's working-copy LF-to-CRLF notices for the seven tracked modified files.

Raw final-body evidence:

- `.superpowers/sdd/task-4-implementation-validation/4a/final-diff-check.stdout.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-diff-check.stderr.log`
- `.superpowers/sdd/task-4-implementation-validation/4a/final-diff-check.exit.txt`

## 3. TDD evidence

The exact helper and 14-case test file were created before production code. The initial focused run demonstrated the expected missing-module import RED, exit `1`, while all 45 collected existing cases passed:

```text
 FAIL  tests/world/departed.test.ts [ tests/world/departed.test.ts ]
Error: Cannot find module '../../src/world/departed'

 Test Files  1 failed | 3 passed (4)
      Tests  45 passed (45)
```

Raw evidence: `import-red.stdout.log`, `import-red.stderr.log`, and `import-red.exit.txt`.

Because a missing import alone is not behavioral proof, I then added the final types, generator, runtime-copy, chronicle-comment, and metrics changes with a temporary `departedProblems` stub returning no problems. This allowed valid generation and attachment to execute while deliberately withholding only `departed-sane` validation and attachment enforcement. The identical focused command produced the meaningful RED, exit `1`:

```text
 ❯ tests/world/departed.test.ts (14 tests | 8 failed) 167ms
   ✓ selects truth and a real subject edge without removing or mutating living data
   ✓ is deterministic under reordered input and picks unused content names
   ✓ falls back stably when every content name is used and avoids both namespaces
   × returns null rather than inventing a secret-edge pair; null fails attachment and validation
     → expected [ 'speakable' ] to include 'departed-sane'
   × rejects id corruption while the valid twin passes
   × rejects name corruption while the valid twin passes
   × rejects secret corruption while the valid twin passes
   × rejects testimony corruption while the valid twin passes
   × rejects edge corruption while the valid twin passes
     → expected [] to include 'departed-sane'
   ✓ keeps living-only witness validation firing and omitted hand-built metadata absent
   × rejects present undefined metadata instead of admitting a non-JSON absence
     → expected [] to deeply equal [ 'present departed metadata must not be undefined' ]
   ✓ binds the existing minted claim and owns nested copies across sessions and JSON
   ✓ generated towns always carry the key and valid served witnesses resolve
   × exhausted serve reports departed failure rather than creating a zero-secret witness

 Test Files  1 failed | 3 passed (4)
      Tests  8 failed | 51 passed (59)
```

Raw evidence: `behavior-red.stdout.log`, `behavior-red.stderr.log`, and `behavior-red.exit.txt`.

Replacing the stub with the exact validator and adding only the exact `validateTown` and `worldFromTown` enforcement hooks made the identical selection pass 59/59. This retains all valid-twin, living-only witness, deterministic-generation, detached-copy, replay, dossier, and existing validation controls. The final GREEN is pasted in the gate section.

The focused delta is exactly 14 tests and one file: the three existing selected files contain 27 + 4 + 14 = 45 cases, and `tests/world/departed.test.ts` adds 14. No registry-generated case is involved in Task 4A.

## 4. Deviations and judgment calls

- The brief requires a meaningful invalid-metadata RED after enough type/generator scaffolding. I used a temporary `departedProblems` implementation returning `[]`, while landing the remaining final 4A behavior, so the eight failures exercised the missing validation/attachment mechanism rather than compilation. The stub was completely replaced before GREEN.
- The brief specifies the meaning, but not exact replacement bytes, of the `threadOf` comment. I changed only that comment to name tellings, injects, and séances and to state that family membership does not imply a human `heardBy` list.
- The first mechanical comparison found one extra blank line in `src/world/departed.ts`. I removed only that blank line, then reran the focused, typecheck, lint, and diff gates into new final-body artifacts. All four complete new file bodies now equal the frozen brief after newline normalization.
- Evidence timestamps after midnight use the actual local date 2026-09-06; the frozen brief and task filenames retain their original 2026-09-05 names.
- No other departure from the literal Task 4A brief.

## 5. Concerns

- Root must stage only the eleven licensed paths below plus the new Task 4A report/evidence. Root's concurrent handoff/current-plan/review changes are visible and were preserved. The index remains empty.
- Full suite, app build, soak, Monte Carlo, generation-baseline comparison, and accumulated independent review remain intentionally deferred to Task 4D. The new `departed-sane` rule may change which generated attempt is served; the brief requires any such actual seed/attempt delta to be measured and adjudicated during that later comparison, without changing the validator budget or generation streams.
- Review should focus on value/null/omission separation, exact seven-field testimony truth, real outgoing subject-edge validation, namespace collision handling, the placement of the isolated RNG call after old generation work, and detached runtime copies bound to the existing claim.

## Exact file inventory and hashes

- `src/sim/magic-types.ts` — `C1AF7210C9A265C0E18F5AB5558BF299463508C7A45A80814924CB0F8C6215E5`
- `src/world/departed.ts` — `D4030B7877EB8D3B209FF21ACE4A49A40D750F2000BE7BF15E7DAA0F51C5FFF4`
- `tests/sim/helpers/seance-town.ts` — `E1660AA85D8266A95A2B6CAFDB80FEE0589F33A0DE3CFF74D11968C9C427CC09`
- `tests/world/departed.test.ts` — `D8E98FFCB21E3044E90742F4600D8B636A1201EFADEC60C9E8E5B02D0CD7FA59`
- `src/world/types.ts` — `86675063BF7F6B96DF486BEE0DC84B4E247A80F46DA0504D1E17CFA19C815B86`
- `src/world/gen.ts` — `F48E9B8DCDE5EE40D29825D342A36722C9500D7B1F7630B38CFAA66F7D62C029`
- `src/world/validate.ts` — `A96967545EEFDD80EDBA714E87959DBB146A452390A895FE937C23EC9A2653E0`
- `src/world/attach.ts` — `473391B5708570B3D495B59E739AAAD2BD096736C2FB5E590555393F323EC116`
- `src/sim/types.ts` — `B7EB0E106495A0BF25D66283B0697ACF96D507AE9AA222957B232A9635E3CD2D`
- `src/sim/chronicle.ts` — `305EC7A10C51F386936AC3B1AA6DBFCC29AD7644F043DA1F07275D87B637406A`
- `src/harness/metrics.ts` — `134AE0F6031D4CBD0DE11936D870AA24B802BB18BD904E8AC4656EE5B2812111`

Mechanical and scope evidence:

- `.superpowers/sdd/task-4-implementation-validation/4a/mechanical-proof.txt` records exact equality for all four complete new file bodies and the 14/45 focused count split.
- `.superpowers/sdd/task-4-implementation-validation/4a/consumer-inventory.txt` records every current source/test consumer of the new metadata/record names and `threadOf`.
- `.superpowers/sdd/task-4-implementation-validation/4a/final-inspection.txt` records HEAD, empty index, exactly eleven licensed source/test changes, no unexpected source path, no `buildWorld` optional-key initialization, the single `gen:departed` stream occurrence, and every final file hash.
- `.superpowers/sdd/task-4-implementation-validation/4a/checksums.sha256` records hashes for all raw evidence and this report, omitting only itself to avoid recursion.

Task 4A is complete. I explicitly release the production-writer assignment and all Task 4 source authority for root's independent checkpoint. Task 4B has not started.
