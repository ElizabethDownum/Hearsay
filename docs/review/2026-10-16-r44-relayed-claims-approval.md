# R44: relayed directive reports retell their enclosed claims (install, review, correction, approval)

Astra I10 found that `projectDirectiveReport` projected only the synthetic envelope (source,
uncertainty, evidence count), so a claim enclosed in a relayed report reached the player exactly as
the originating asset saw it, whatever the relay's traits or candor.

The unit was independently **Approved** at `c52c465`:
- first review of `9c319d2`: Needs fixes, 0 Critical / 2 Important / 3 Minor;
- re-check of the R44-1 correction (`cec2cd6..c52c465`), plus the whole unit: Approved, 0 / 0 / 3.

Both reviews were native Claude workers (Opus, non-author) on a `git archive` snapshot. Root wrote
and executed both commits.

## R44, `9c319d2`

- Each enclosed claim now passes through the same expressed chain as the envelope (doctored candor
  adds the minimizer) with the relay's own trait context; the association `claimId` is kept. A
  required `familyOf` input lets family-keyed transforms (attributor) key as they do in gossip;
  both callers (transport hop projection, field-report network speech) resolve it from
  `world.claims`.
- Tests: unit (exaggerator, literalist verbatim, doctored minimizer, attributor family) and an
  end-to-end relay (literal ada, exaggerating bez, player). Gates: 2,530 tests / 152 files, lint,
  typecheck, build, soak, MC, comparator equal.

## Review 1: Needs fixes, 0 / 2 / 3

- **I1.** A partisan relay diverged from its own gossip. The claim transform used the speaker's
  restricted brief view, whose `factionOf` knows only the speaker and its rivals, so a partisan
  relay passed an enclosed claim about any other subject through unchanged (severity 3) while its
  gossip about the same claim moved it (severity 2). The same field report was internally
  inconsistent: an overheard utterance used the world-roster context, an enclosed claim the
  restricted one.
- **I2.** The field-report caller and `familyOf` were untested: mutants M3, M9, M10 and M11
  (ignore `familyOf`, replace it with the id in either caller, undo the field-report transform)
  survived. The attributor unit test used one rival, so `grudgePick` could not discriminate.
- **M1.** Scrutiny filtering and candor boundaries on claims were not pinned (M4, M5 survived).
- **M2.** No ego overlay on relayed claims: a design question, to record.
- **M3.** The RED evidence omitted the e2e test (the reviewer confirmed it RED independently).

## Correction R44-1, `c52c465`

- I1: `projectDirectiveReport` takes a `claimContext`, the speaker's ordinary
  `traitContextOf(npc, world)`, for enclosed claims only; the envelope keeps the restricted view.
  Both callers pass it.
- I2: the objectifier and partisan unit cases re-derive the gossip from the same context with four
  rivals, where the claim id and its real family pick different grudge names (three collide under
  FNV-1a); an objectifying relay and a field-reported directive report both pin the real family
  against the id. M1: scrutiny and omissive candor on the enclosed claim are asserted.
- RED 3 failed / 33 (both partisan cases and the objectifier unit case); GREEN 36/36. Gates:
  2,544 tests / 153 files, lint, typecheck, build (`index-ByXvhhzX.js`), soak, MC, comparator
  equal.

## Re-check: Approved, 0 / 0 / 3 (R44-1 and the whole unit)

The reviewer compared all 452 tracked files of the snapshot to `c52c465` (only the esbuild line
differs), reproduced the partisan probe (bez's hop now severity 2, equal to bez's gossip), checked
the `src/sim/directives` diff is exactly one line in `mutation.ts` plus the interface field and one
argument per caller (no envelope field changes value; `lawfulRecipient` untouched), verified the
FNV-1a collision rationale independently in Python, and ran 15 mutants against 704 tests: M1, M3,
M4, M5, M9, M10, M11 and the reviewer's own R1, R2, R4, R5, R6, R8 all killed. Full suite serial
2,544 / 153, lint and typecheck clean in the snapshot.

- **m1 (Minor, test gap).** The field-report caller's context is unpinned for the partisan half:
  mutant R3 (field-report `factionOf` restricted to reporter and rivals) survives, because the
  only field-report test is an objectifier, which reads no factions. The code is correct (the
  reviewer's probe gives `[{utterance:2},{enclosed:2}]`). **Fix accepted as a test-only
  follow-up**: a partisan field-report case.
- **m2 (Minor, fixture gap).** Every partisan fixture gives the relay faction `none`, so the side
  (soften own, sharpen rival) is never discriminated; mutant R7 (`faction := 'none'`) survives.
  **Fix accepted as a test-only follow-up**: a same-faction partisan unit case.
- **m3 (Minor; R44 M2 carried, now decided).** **Decision: no ego overlay on enclosed claims.**
  Gossip has no ego overlay, and R44's target is "the relay retells as its gossip does", so the
  enclosed claim takes the relay's trait chain and candor only. The envelope never had the overlay
  either. **The split this leaves, recorded explicitly:** an ego-recruited asset's field report
  inflates the utterances it overheard (via `reportThrough`, `isEgoAsset` adds `exaggerator`) but
  not the claims enclosed in a directive report it overheard; the reviewer's probe measured
  `[{utterance:4},{enclosed:3}]` for an ego literalist at severity 3. The field-report consistency
  R44-1 claims therefore holds for traits and candor, not for the ego overlay. Revisit only if the
  "reports inflate" rule is extended to the envelope and the claims together.
- Nit, not counted: `projectDirectiveReport` takes `speaker` and `claimContext` separately and
  the two can disagree in a hand-built fixture; in production both come from one NPC.

Evidence: `.superpowers/sdd/r44-implementation-validation/` and
`r44-1-implementation-validation/`. Reports: `node_modules/hearsay-r44-review-20260927/REVIEW.md`
and `node_modules/hearsay-r44-1-review-20261016/REVIEW.md` (gitignored).
