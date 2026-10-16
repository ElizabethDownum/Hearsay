# Plan 10 Task 1B: show and plant from the offered moment (install, review, approval)

Unit 1B gives the player `show` and `plant` inside the offered moment: a picker over the papers the
avatar holds, an audience from the frozen circle for `show`, and `plant` either here (the offered
venue) or into a circle-mate's hands. The engine's reachable refusal is "still wet" (a paper
forged today), mirrored at the OFFERED beat with the engine's own words; every other refusal in
`applyShow` / `applyPlant` is unreachable from a frozen offer.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `74e288a`: **Approved**, 0 Critical / 0 Important / 4 Minor. M1 is closed by the
  test-only T1A-2 `5d1d9e3`; M2 and M3 are owed as T1B-2 (test-only); M4 is carried.

Root wrote and executed the commits.

## T1B, `74e288a`

- `src/sim/fieldwork.ts`: `PlayerView.documents` lists the player's own papers (id, spec,
  `forgedTick`, derived `usableFromDay`); no other holder, no `plantedAt`.
- `app/src/panels/DayPlanner.tsx`: `PaperComposer` in `LocalMoment` after the sale: the paper
  picker, the show audience, the plant target (here or a circle-mate), the drying note measured
  at `offer.tick`; `submit show` sends `{ kind: 'show', artifact, to }`, `submit plant` sends
  `{ kind: 'plant', artifact, venue: offer.venue, to: null }` or `{ …, venue: null, to }`.
- Tests: `tests/sim/player-view.test.ts`, `tests/app/panels.test.ts` (markup; parity vs
  `applyShow` / `applyPlant` on day 1 and day 2), `tests/app/forge-composer.test.tsx` (the real
  buttons pressed), `tests/app/local-pass-wiring.test.tsx` (a plant through `onLocal` lands on the
  beat). RED 7 failed (`.superpowers/sdd/t1b-implementation-validation/10-red.txt`); seven mutants
  killed (`11-mutants.txt`).
- Gates: 2,617 tests / 160 files, lint, typecheck, build (`index-CU_4HnRh.js`), soak, MC;
  comparator equal.

## Review: Approved, 0 / 0 / 4

Report: `node_modules/hearsay-t1b-review-20261016/REVIEW.md` (gitignored). The reviewer traced
every refusal in both verbs to a mirror or to an unreachable state (an offer requires a placed
avatar; the world cannot change while an offer is pending; the composer lists only the frozen
circle; a venue plant is always at the avatar's venue). A midnight probe (forged 23:45 day 0,
offer at 00:00 day 1) found the composer and the engine agreeing because the composer reads
`offer.tick`. A show and a hand-over plant through the session, then 120 more ticks including a
re-show by the recipient, replayed byte-identically. Full suite serial 2,617 / 160; lint and
typecheck clean. The bundle hash differed from root's (`index-hEhb8wh3.js`) only because of the
build location under `node_modules/`, shown by rebuilding the base there too.

- **M1.** The hand-over plant, the paper picker and the audience select were never exercised: the
  click harness's pass-through `useState` pinned only the defaults, so four mutants survived
  (hand-over sending both `venue` and `to`, hand-over ignoring the target, picker ignored, audience
  ignored). Closed by T1A-2 `5d1d9e3`: the harness's `useState` works, and the test picks the
  second paper, another audience and a circle-mate target.
- **M2.** No shipped test pins "drying measured at the OFFERED beat": every test had
  `view.tick === offer.tick`, so a mutant measuring at the view tick survived. Equivalent in the
  live app (the tick cannot differ while an offer is pending), but the doc comment's central
  claim is unpinned. Owed as T1B-2: a panel case with the view at 23:45 and the offer at 00:00.
- **M3.** `tests/sim/player-view.test.ts` hygiene: the new test sits between the P6 source-guard
  comment and the test it documents; a tautological `dayOf` assertion; a duplicate `core/time`
  import. Owed as T1B-2.
- **M4.** `fieldwork -> artifacts` closes a value-import cycle `{actions, artifacts, fieldwork}`;
  benign (no top-level read of a cycle member; all three import orders pass) and `playerView`
  respells `dayOf(forgedTick) + FORGERY_LEAD_DAYS` beside `isUsable`. A leaf module holding the
  constant and a `usableFromDay` helper would remove both. Carried as optional.
- Not counted: the picker lists wet papers and greys them with the engine's words (the brief's
  table said "forged before today"); "here" can be the private safehouse, where the engine lets a
  planted paper wait indefinitely.

## Carried

- T1B-2 (test-only): the midnight drying case (M2) and the player-view test hygiene (M3).
- The benign import cycle and the respelled lead-day arithmetic (M4), optional.
- Whether a paper may be planted at the player's own safehouse (review, not counted).
