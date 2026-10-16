# Plan 10 Task 1C: the scry composer on the Day Planner (install, review, correction, approval)

Unit 1C is `scry`: a priced desk verb on a known venue, for a window on the NEXT day. The engine
(`applyScry`) refuses a window that is not 15-aligned, longer than 60 minutes or outside the day,
a day other than tomorrow, an unknown venue, and coin below the price. The composer makes the
window valid by construction (the start list is cut by the chosen length and the start is
validated against the current list), so the only mirror is the price.

The unit was independently reviewed by a native Claude Opus worker who wrote none of it:
- review of `e76e879`: **Needs fixes (test-only)**, 0 Critical / 1 Important / 1 Minor. Most of
  the Important is closed by the test-only T1A-2 `5d1d9e3`; the remainder and the Minor are owed
  as T1C-2.

Root wrote and executed the commits.

## T1C, `e76e879`

- `app/src/panels/DayPlanner.tsx`: `ScryComposer` after the forge composer: venue select, start
  select in 15-minute steps (shown as a clock), length select 15/30/45/60 (default 60), the "day N"
  note for tomorrow, the price from `economy.scrying`, the treasury note; `submit scry` sends
  `{ kind: 'scry', venue, day, from, to }` through `onVerb`; greyed while the sim runs or a moment
  is pending; a note instead of a form when no venue is known.
- Tests: `tests/app/panels.test.ts` (markup, the day note at 23:45, 93 starts ending 23:00, the
  treasury note, price parity vs `applyScry`, a window sweep over every offered start plus the
  withheld 23:15), `tests/app/forge-composer.test.tsx` (the real button pressed),
  `tests/app/local-pass-wiring.test.tsx` (a scry through `onVerb`: `s0` next day, coin debited,
  chronicle row). RED 6 / 128 (`.superpowers/sdd/t1c-implementation-validation/10-red.txt`);
  mutants M1-M8 killed, M9 (the picked venue) survived under the pass-through click harness
  (`11-mutants.txt`).
- Gates: 2,628 tests / 160 files, lint, typecheck, build (`index-RSYMjw_M.js`), soak, MC;
  comparator equal.

## Review: Needs fixes, 0 / 1 / 1

Report: `node_modules/hearsay-t1c-review-20261016/REVIEW.md` (gitignored). The reviewer's
exhaustive probe (5 ticks, every length state including junk, every 15-aligned start, through the
real composer and `applyScry`) found 3,750 accepted and 90 withheld with no mismatch: every offered
start is accepted and every withheld start is refused, lists 96/95/94/93 long. "Tomorrow" holds
because the paused shell renders `playerView(world)` on every frame and `submit` stamps the world
tick; a composer-built midnight-edge window replayed byte-identically after 1,471 ticks. Terms and
the toast label resolve. Full suite serial 2,628 / 160; lint and typecheck clean.

- **I-1. The window-safety guards and the picked venue were unpinned.** Every committed scry test
  ran at the default length with no start chosen, so four mutants survived: the start list
  ignoring the chosen length (MA), the start not validated against the current list (MB: 23:45 at
  15 then 60 submits 1425..1485, which the engine refuses), the picked venue dropped at the source
  (ME) and in `onVerb` (MC = root's M9). Largely closed by T1A-2 `5d1d9e3`: the picked venue
  reaches `onVerb`, the list at 30 minutes has 95 starts, and 23:45 at 15 then 60 falls back to a
  window the engine accepts (killing MB, MC, ME and the length-30 half of MA). Owed as T1C-2: the
  lists at 15 and 45 (96 and 94 entries, last 23:45 and 23:15).
- **M-1. A start that no longer fits snaps silently to 00:00.** Lengthening the window moves the
  start about 23 hours from the player's choice; the control shows it and the engine accepts it,
  but the player pays for a window they may not have meant. Owed as T1C-2: clamp
  (`Math.min(Number(start), starts.at(-1)!)`, giving 23:00) and pin it.
- Observation, not counted: the player's own `safehouse` is scry-able by the engine but not
  offered, because `venueIds(view)` reads the street map and `attachPlayer` adds the safehouse
  after it. Narrower than the engine, never looser; the same as every other venue picker. Whether
  it should be offered is a design question for Ellie.

## Carried

- T1C-2 (test-only plus the clamp): the lists at 15/45 pinned; the clamp instead of the midnight
  snap.
- Whether the safehouse belongs in the scry venue list (Ellie).
- Queued spend on the same tick is not seen by the price mirror (T1A review M4, shared).
