# Plan 10 Task 1A: the forge composer on the Day Planner (install, review, correction, approval)

Plan 10 Task 1 gives the player the five engine-complete verbs the planner never emitted. Unit 1A
is `forge`: a frameless, priced desk verb (no circle, no venue, no moment) that writes a paper
with a claim built by the same fields the tell composer uses. The engine's only refusals are "no
avatar" (never in the app) and "coin below the forgery price"; the composer mirrors the price.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `9de33a3`: **Needs fixes**, 0 Critical / 1 Important / 4 Minor; the Important and
  three Minors are test-side and are closed by the test-only T1A-2 `5d1d9e3` (below); the fourth Minor is a
  recorded posture.

Root wrote and executed both commits.

## T1A, `9de33a3`

- `app/src/panels/DayPlanner.tsx`: `ClaimDraft`, `blankClaimDraft`, `claimSpecOf` and the
  `ClaimFields` component lifted out of `TellComposer` (its markup unchanged); `ForgeComposer`
  after the dead-drop composer, with the seven claim fields under the `forge` prefix, the price
  from `economy.forgery`, the treasury note, and a `submit forge` button that sends
  `{ kind: 'forge', spec }` through `onVerb`; fields and button grey while the sim runs or a
  moment is pending.
- Tests: `tests/app/panels.test.ts` (markup, treasury note at price - 1, parity sweep at
  price - 1 / price / price + 1 against `applyForge` on `newSession` worlds),
  `tests/app/forge-composer.test.tsx` (new: the planner's composers called as functions under a
  substitute `useState`, the real button pressed), `tests/app/local-pass-wiring.test.tsx` (a forge
  through `onVerb` lands on the next advance: one artifact, the price debited).
- Gates: 2,605 tests / 160 files, lint, typecheck, build (`index-ZO-EeRux.js`), soak, MC;
  comparator equal.

## Review: Needs fixes, 0 / 1 / 4

Report: `node_modules/hearsay-t1a-review-20261016/REVIEW.md` (gitignored). The reviewer found the
product code correct: `applyForge` refuses only on no avatar or on coin; the session's one extra
refusal (a pending moment) is mirrored; nothing changes coin before the player phase, so the
price sweep is meaningful. The `TellComposer` refactor is byte-identical in three renders from
both trees, the option lists and the blank and edited tell intents are identical, and the forge
form's state is separate from the tell form's. The wiring test fails if the intent is dropped or
re-priced. A forge composed in the planner is logged and replays identically at tick 1 and after
1,500 more ticks. `verb-forge` and `treasury` exist; `VERB_TERM` maps forge; the diff adds no
imports. Full suite serial 2,605 / 160; lint and typecheck clean.

- **I1. What the player types never reaches a test.** The click harness's substitute `useState`
  had a no-op setter, so the form always held its blank starting values: the test could not tell
  submitting the current entries from submitting a blank, stale or unwired form, and no test
  anywhere edited a tell or forge field, so the lifted `set` logic was moved unpinned. Five
  mutants survived all 517 `tests/app` tests: the button submitting the blank draft (R1), the forge
  fields' `onChange` dropped (R2), `set` rebuilding from the blank draft (R4), `count: null` (R7),
  `place: null` (R9). A probe with a working `useState` killed R1, R2, R4 and R7.
- **M1.** Only `forge subject` was checked for greying; a predicate select that never greys (R3)
  survived, and the negative check depended on attribute order.
- **M2.** "Renders with or without an offer" was tested without one only; hiding the composer
  under an offer (R8) survived.
- **M3.** The commit's "RED 3 failed / 112" does not reproduce: the three committed test files
  against `705af84` give 4 failed / 110 passed (114), and no RED log was kept.
- **M4 (posture).** The price mirror does not see spend already queued on the same tick: with
  20 coin, four presses while paused queued four forges; the engine refused the fourth at advance
  ("6 needed, 2 held"), leaving 3 documents and 2 coin, and the replay matched. This is
  `DropComposer`'s behaviour and the panel's stated law (the engine is the real gate; its refusal
  is a toast). The parity comment claimed more than the sweep pins.
- Not counted, for a design ruling: `applyForge`, like `applyTell`, accepts any spec, including
  the blank one-click document ("someone blessed-the-harvest", no source), a missing object for a
  predicate that needs one, and negative or fractional counts. Outside 1A, but it is now a paid,
  permanent document.

## Correction T1A-2, `5d1d9e3` (test-only)

- Gates: 2,633 tests / 160 files, lint, typecheck, build, soak, MC; comparator equal.
- `tests/app/forge-composer.test.tsx`: the substitute `useState` works. Each `instance` owns its
  hook slots in call order; a setter writes its own slot (captured at the hook call, so a later
  render of another component cannot redirect it); the next render of that instance reads what was
  set. New cases: every forge field edited one at a time through its real `onChange` (each edit
  keeping the earlier ones, the control showing what was set), then pressed, giving exactly that
  claim; an edited tell to a chosen addressee (the fields are shared); the second paper, another
  audience and a circle-mate target for show and plant (1B); another venue, a half hour from 10:00
  for scry, and the start falling back to 00:00 when a longer length can no longer hold it (1C).
- `tests/app/panels.test.ts`: all seven forge fields are checked greyed while running and live
  while paused, by an order-independent pattern (M1); the composer renders under an offer, greyed
  while the moment is pending (M2); the parity comment says the mirror holds per submission and
  why (M4).
- M3 is recorded as stated: the RED count in the 1A commit message was wrong (4 failed / 114, not
  3 / 112) and no RED log was kept for 1A. From 1B on, RED logs are kept under
  `.superpowers/sdd/<unit>-implementation-validation/10-red.txt`.
- Mutants (`.superpowers/sdd/t1a-2-implementation-validation/11-mutants.txt`): R1, R2, R3, R4,
  R7, R8, R9 from the review, plus the scry venue and start ignoring the pick and the paper
  picker and show audience ignoring the pick: all eleven KILLED; the file restored
  byte-identically after each.

## Carried

- A design ruling on what `applyForge` should accept: the blank one-click document, a predicate
  that needs an object without one, negative or fractional counts (review, not counted).
- The priced non-local composers (`DropComposer`, `ForgeComposer`, `ScryComposer`) grey on the
  view's coin, not on coin less spend already queued on the same tick; the engine refuses the
  excess as a toast (review M4). Mirroring queued spend would need the session to expose its queue
  to the planner.
