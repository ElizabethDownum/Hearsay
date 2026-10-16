# R42: a sale speaks what reached you, and its persuasion is a floor (install, review, correction, approval)

Astra I2: `applySell` priced the sale on the player's best received version, but the resolution
transmitted `world.claims[claimId]`, the underlying original, which the channel may have
transformed or filtered. Astra I3: the resolution overwrote the buyer's belief at credence 0.85
unconditionally, dropping a 0.97 document anchor and erasing its history, bypassing ingestion.

The unit was independently reviewed twice, by native Claude Opus workers who wrote none of it:
- first review of `ef43e1a`: **Approved**, 0 Critical / 0 Important / 4 Minor and one nit;
- re-check of the correction `3056644`: **Approved**, 0 / 0 / 2 and a nit for the correction, 0 / 0 / 3 and two nits for the whole unit; the two new Minors and the nit are closed by R42-2 `8c72516`.

Root wrote and executed both commits.

## R42, `ef43e1a`

- I2: `pendingSell` carries the received `reported` content. Resolution reuses the underlying
  claim only when every `CLAIM_FIELD` matches; otherwise it mints the received version as a child
  of the same family with the underlying claim as parent, registered before the utterance, belief
  or chronicle row references it.
- I3: the hop-zero entry is written only for a buyer new to the family; a mind that already holds
  it hears the sale through the same utterance's ordinary ingest (first version sticks, monotone
  corroboration, the P9-3 law).
- Tests in `tests/network/sell.test.ts`: a transformed received version is spoken and believed
  (child claim, original untouched); an anchored buyer keeps 0.97, version and history while the
  sale still pays; the live == replay test steps live frame by frame over a transformed version
  instead of running `runLogOn` twice over a fixture that masked I2.
- Gates: 2,515 tests / 150 files, lint, typecheck, build; soak/MC comparator equal (no harness
  bot sells).

## Review 1: Approved, 0 / 0 / 4 + nit

Report: `node_modules/hearsay-r42-review-20260927/REVIEW.md` (gitignored). Suite in the snapshot
2,515 / 150; lint and typecheck clean. Four mutants (I2 reverted, I3 reverted, the credence
literal raised inside the new branch, a `Math.random` inside it) each failed the intended tests,
including the evidence-hierarchy and determinism AST laws.

- **M1 (design ruling).** With the hop-zero entry gone for existing holders, a sale to a buyer
  who already held the family gave only ordinary corroboration: a holder at 0.30 ended at 0.45,
  below the retell threshold, and a holder who had first heard it from the player got nothing but
  a count, while the player was paid either way. Plan 8 Task 10 says the buyer now retells it, and
  the result was non-monotone (knowing a little made a buyer less persuaded than knowing nothing).
  The reviewer proposed a floor: keep the claim and history, never lower, and set
  `credence = max(held, 0.85)`.
- **M2 (pre-existing, more reachable after R42).** A fresh buyer took the hand-written 0.85 entry
  AND ingested the sale utterance, so one sale counted twice, and a named attribution
  corroborated itself to 0.95.
- **M3.** The terminal debrief attributes the minted child's diff against the underlying claim to
  the avatar, so an informant's exaggeration applied inside `reportThrough` reads as "you changed
  count 2 to 4". The cause shown is wrong; no test pins it either way.
- **M4.** The "stepped live" test re-implemented `runLogOn`'s loop rather than driving the app
  session; the assertion that actually binds I2 is the `toMatchObject` on the received version.
- **Nit.** Each sale of the same transformed version mints a new content-identical child.
- **Verified clean:** every intel producer (self-heard, scrying, séance reuse the underlying
  claim; informant, debrief and field reports go through `reportThrough` and may mint); nothing
  downstream assumes the sold claim is the underlying one; the mint advances `claimCounter`
  inside `step` on both live and replay paths; no bot or harness sells.

## Correction R42-1, `3056644`

- **M2.** The buyer hears the sale exactly once, through ordinary ingest (first version sticks,
  apparent source by the hearsay rule, never lowered).
- **M1, decided: the floor.** After ingest, the sale applies `credence = max(held, 0.85)`: a 0.97
  anchor is untouched, version and history are kept, a fresh buyer lands at exactly 0.85 (fresh
  hearsay tops out at 0.80), a weak holder is lifted rather than left below the retell threshold.
  The floor is declared in the evidence-hierarchy law's exact retention inventory
  (`recordAndIngest` in `src/sim/phases.ts`).
- **M4.** A session-level sell live == replay test (offer, choose, advance through the app
  session; transformed intel so the sale mints a child mid-step), replayed on an identically
  staged twin.
- RED: 5 tests failed for the intended reasons. Gates: 2,533 tests / 152 files (one first-run
  timeout under three concurrent reviewer suites; the file passes alone and the full rerun is
  clean), lint, typecheck, build, soak, MC; comparator equal.

## Re-check of R42-1

Report: `node_modules/hearsay-r42-1-review-20260927/REVIEW.md` (gitignored), re-dispatched on
2026-10-16 after the 27 September run was stopped mid-way (its stale copy of the first review was
replaced).

**Approved, 0 / 0 / 2 + nit.** M2 and M4 are closed completely; M1 is closed for credence (a 0.30
holder and a holder who first heard the story from the player both land at 0.85, a 0.97 anchor
stays, nothing is lowered; a 99-case P9-3 matrix over starting credences, source sets and
attributions showed no violation). The evidence-hierarchy law binds the write (raising the literal,
moving the write into a helper or into `resolvePlayerSpeech`, or overwriting instead of flooring,
each fails the law; a floor of 0.95 passes the law and is pinned only by the sell tests). The
session-level test drives the real app path and its hash and log assertions are both live. The
floor is applied on the live, replay and `step` paths alike, and no bot or harness sells. Sixteen
mutants, all killed by the named tests. Focused 224 / 4, lint and both typechecks clean; the full
suite, build, soak, MC and the comparator were read from the controller's evidence, not rerun.

- **m1 (residual of M1).** Ordinary ingest refreshes `heardAt` only for a NEW apparent source, so a
  holder whose belief was three days stale, sold a version naming a source they had already
  credited, was floored to 0.85 and still never retold (freshness 0 fails the retell gate). The
  pre-R42 hop-zero entry had set `heardAt`; R42 dropped it and R42-1 restored only the credence. The
  comment "retellable whether or not they had heard it" was false for that population.
- **m2.** `reactToSelfRumor` ran before the floor, so a buyer who is the story's subject and weakly
  held it reacted to the pre-floor 0.45 (no counter-spin) and then held a corroborated, believed
  self-rumor with no reaction, a state ordinary hearsay never produces.
- **n1.** The commit message's "a fresh buyer lands at exactly 0.85" is false for a trusting buyer
  who dislikes the subject (hearsay physics give 0.89375 and the floor keeps it); the code comment
  said "at least" and was right.

**Decided and fixed, R42-2 `8c72516`.** A paid telling is a telling at that tick: when the floor
applies, `heardAt` becomes the sale tick, so a stale story a buyer pays for is revived (Plan 8
Task 10: the buyer now retells it). The floor lands immediately after the buyer's own hearing of the
sale, before any reaction, still inside `recordAndIngest` so the law inventory is unchanged; the
subject of a sold self-rumor therefore reacts to what they now hold. Tests: the stale repeat-source
holder is revived and retells; the subject-buyer counter-spins; a trusting rival-of-the-subject buyer
lands above the floor and keeps it ("at least", pinned). RED 2 failed / 24 (the third test pins
existing behaviour); GREEN sell, session and lint 232 / 5.

## Carried

- **M3**: the terminal debrief credits the channel's distortion to the player. Its own small
  unit, once the debrief's lineage view is next touched (Plan 10 Task 1 is the player surface).
- **Nit**: content-identical sibling children per sale. Harmless; reuse an existing same-family
  child whose fields match if it ever matters to the debrief.
