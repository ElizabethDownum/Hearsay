# R43: composed directives are the same act as their presets (install, review, correction, approval)

Astra I9 found that only the courier preset validated and debited `economy.courierRun`; a fully
composed courier directive got the same service free. Astra M1 and M2 were the same pattern: only
the posting preset appended `requestedPosts`, and a venue-audience telling completed wherever the
asset stood. The owner's ruling at triage was one unit, R43, covering the three.

The unit was independently **Approved** at `ff2f7dd`:
- first review of `d0c9d59` (`368af16..d0c9d59`): Needs fixes, 0 Critical / 2 Important / 2 Minor;
- re-check of the R43-1 correction (`c52c465..ff2f7dd`), plus the whole unit: Approved, 0 / 0 / 1.

Both reviews were native Claude workers (Opus, non-author) on a `git archive` snapshot. Root wrote
and executed both commits.

## R43, `d0c9d59`

- I9: common issuance (`applyDirectiveWithCause`) validates affordability before any allocation
  and debits once for every courier application. `applyDirective` takes an optional trailing
  `rules`; a courier application without rules throws, as the preset already did. The preset's
  face path no longer debits itself; its dead-drop path (which issues no directive at placement)
  still does, and drop pickup is not charged again.
- M1: common issuance records the authored posting mark for every posting, preserving the preset's
  ordering. The relayed-posting panel test had pinned the bug (`requestedVenue` null) against its
  own comment; it now asserts the mark shows.
- M2: literal execution of a venue-audience telling requires the named venue; adaptive execution
  may work the room it is in and is marked `adapted`.
- Tests: `tests/network/directive-application-parity.test.ts`. Gates: 2,525 tests / 151 files,
  lint, typecheck, build, soak, MC, comparator equal.

## Review 1: Needs fixes, 0 / 2 / 2

- **I-1 (introduced).** The composer neither showed nor gated the price composed couriers now
  pay. With too little coin the draft submitted, the engine threw inside `session.advance`, and
  the offered moment was consumed; the preset button greyed on the same fact. Probe: a coin-0
  courier draft raised no composer note.
- **I-2 (pre-existing, same class).** The ideology refusal lived only in the courier preset
  (`applyCourier`). A composed courier with the same asset, claim and target had no check at
  issue and was now charged 3 coin, then carried the smear the preset refuses.
- **m-1.** The adaptive venue-audience branch was untested: replacing it with `return null`
  survived the suite.
- **m-2.** Parity gaps: a relayed composed courier's charge, a rules-less `applyAction` courier,
  and the preset's unaffordable-refusal residue hash.
- Verified clean: each sim fix charges or records exactly once, validates before it mutates, is
  hash-neutral for preset replays, and its test fails when the fix is reverted.

## Correction R43-1, `ff2f7dd`

- I-1: `ComposerSources` carries the treasury and the price list (both already desk props and
  public facts under the panels law). `directiveIssues` reports `a courier run costs N coin; you
  hold M` for an unaffordable courier draft, which greys submit as the preset greys. The price is
  shown beside the application select, always, because the SSR render cannot drive state.
- I-2: `refuseIdeologySmear` is a pure validator shared by `applyCourier` (both handoffs, before
  any bookkeeping) and by common issuance's courier block (before the price check, so a refused
  composed courier is uncharged). Factions are not a public fact, so the composer cannot judge it;
  the refusal is the engine's and the moment is consumed, pinned as the same act on both paths.
- m-1: a guided purpose asset at the backroom with low scrutiny works the room it is in.
- m-2: the preset's unaffordable hash, a relayed composed courier charged once at issue, a
  rules-less call refused with zero residue, and the ideology refusal on both paths with a
  `money` control that carries and pays.
- RED 3 failed / 114 (exactly the composed-ideology refusal, the composer note and the price
  span); GREEN 117/117. Gates: 2,553 tests / 153 files, lint, typecheck, build
  (`index-VyAF8zYV.js` 585.70 kB / 172.73 kB gz), soak, MC, comparator equal.

## Re-check: Approved, 0 / 0 / 1 (R43-1 and the whole unit)

The reviewer reproduced the coin-0 probe (now `["a courier run costs 3 coin; you hold 0"]`, the
engine still refusing), swept coin 0 to 5 (noted at 0 to 2, clear from 3), confirmed standard,
posting and rendezvous drafts are never priced, and ran a 60-case parity matrix (5 mice, two
faction relations, damaging or flattering, three subjects): preset and composed match in every
case, every refusal leaves zero residue, and only ideology + own faction + damaging refuses. A
relayed composed courier is charged exactly once (7 to 7 over a full run). Twelve mutants were
run against 1,167 tests; every fix mutant was killed, and the panels fence mutant was caught by
ESLint. Full suite serial 2,553 / 153, lint and typecheck clean in the snapshot.

- **M-1 (Minor, test gap, not a defect).** No test pins the dead-drop handoff's ideology
  refusal: a mutant that refuses only on the face handoff survives the full suite. The behaviour
  is correct (the reviewer's drop probe refuses with zero residue; a `money` control carries and
  debits). **Fix accepted as a test-only follow-up** in `tests/network/couriers.test.ts`.
- Notes, not counted: `applyDebrief` keeps a third inline copy of the ideology law; the parity
  test pins identical zero-residue throws, not moment consumption itself (both intents take one
  path in `session.ts`); the always-visible price span is a static price-list label, consistent
  with the preset's note, and the "SSR convenience" rationale in the commit is a smell but the
  result stands on its own.

Evidence: `.superpowers/sdd/r43-implementation-validation/` and
`r43-1-implementation-validation/`. Reports: `node_modules/hearsay-r43-review-20260927/REVIEW.md`
and `node_modules/hearsay-r43-1-review-20261016/REVIEW.md` (gitignored).
