# Full independent review at `58a9214` (Codex Astra), with controller triage

On the owner's instruction (2026-09-27), a Codex worker on `gpt-6-astra` at maximum reasoning reviewed
the whole system at `58a9214` (origin/main after Plan 9 and R38/R39), in parallel with R40. It is the
first review scoped to the entire codebase rather than a task or branch range. It ran read-only
against a `git archive` snapshot under the excluded `node_modules` (writes confined there), survived
one controller crash by resuming the same thread, and returned **0 Critical / 13 Important / 4
Minor**, each with a retained probe or an application-path trace.

Its gates in the snapshot: 2,504 tests / 150 files (serial, after supplying the checkout's `react-jsx`
setting explicitly; the snapshot location otherwise hides it: 85 `React is not defined`, a harness
artefact, not a defect), lint, both typechecks, build (583.56 / 172.04 kB gzip), soak 94.0 %, MC 15/8.

**Controller verification.** Root re-ran all 13 probes: each reproduces as described. Root also read
the code behind I2, I3, I6 and I9 (`src/sim/phases.ts:414-423` transmits `world.claims[claimId]`
and overwrites the buyer's belief at 0.85 unconditionally; `src/sim/enemy/digest.ts:502-505` picks the
alphabetically first invitational venue, `back-room-d*`, which by design has no regulars
(`src/content/gen/standard.ts:25-29`); the composed courier branch `src/sim/actions.ts:186-193`
never debits, the preset does at `:472`). **All 13 Important findings are accepted.**

Full report and probes: `.superpowers/sdd/astra-full-review-2026-09-27.md` (gitignored), probes under
`node_modules/hearsay-astra-full-review-20260927/node_modules/astra-review/`.

## Findings and dispositions

| # | Finding | Disposition |
|---|---|---|
| I1 | An empty local offer traps the player at the tick; the app never calls `cancelLocalInteraction` | **R41** (with M4) |
| I2 | Selling filtered intel transmits the underlying claim the player never received | **R42** |
| I3 | A sale overwrites the buyer's belief (0.97 paper anchor → 0.85), bypassing ingestion | **R42** (new evidence against the P9-2/P9-3 persistent-anchor ruling's completeness) |
| I4 | Bot runner keeps ticking after an ending; its save replays to a different world | **Plan 10 Task 3** (the new runner is terminal-correct; the Coronation harness loop too) |
| I5 | Dossier trait/edge/hint facts are unreadable in every live view | **Plan 10 Task 1** (player surface) |
| I6 | Generated-town interrogations send the guard to an empty back-room; nothing brings the target | **Plan 10 Task 4** (enemy reachability; how a target is summoned is a design call for Ellie) |
| I7 | Successive watches in a district collapse into the first watch's identity | **R46** |
| I8 | A hesitation reply delivered after its decision deadline never schedules the later answer | **R45** |
| I9 | Composed courier directives skip the courier price | **R43** (with M1, M2) |
| I10 | Relayed reports carry enclosed claims untransformed by the relay's traits | **R44** |
| I11 | Codex pairs by array order, so delayed reports create backwards causal pairs | **R47** (with I12) |
| I12 | Evening report files newly received intel under the observation day | **R47** |
| I13 | No app path authors Codex hypotheses or Counter-Sketch cards | **Plan 10 Task 1** (player surface) |
| M1 | Composed postings omit the requested-post record | R43 |
| M2 | Venue-audience shaping completes literally in another venue | R43 |
| M3 | `.js` import specifiers bypass the intel/enemy lint fences | **R48** |
| M4 | `useRef(newSession(SEED))` builds a discarded world every render | R41 |

**Test-integrity corrections** (claims exceed assertions): `tests/network/sell.test.ts:259` (live ≡
replay runs `runLogOn` twice; fixtures mask I2) → R42; `tests/sim/enemy-pressure.test.ts:233`
(perturbation test perturbs nothing) and `tests/sim/enemy-schedule-application.test.ts:98`
("both targets interrogated" never reaches questioning) → Task 4.

**Planning concern accepted:** standard generation supplies no lover/debtor edges, so
relationship-dependent substories have no ordinary prerequisites → Plan 10 Task 2.

## Order

R41 → R48 serially, each with RED/GREEN, six gates, the soak/MC comparison and an independent
review, before Plan 10 Task 1. They correct simulation and intel behaviour that every later
measurement would otherwise inherit. Tasks 1, 3 and 4 absorb the rest as above.
