# Plan 10 — current execution plan (ship-shape)

Written 2026-09-27 at `6ff4bd0` (R40). **Not started.** This document reconciles the original plan,
[`2026-07-05-plan-10.md`](archive/2026-07-05-plan-10.md) (also at
`ClaudeFiles/docs/superpowers/plans/2026-07-05-hearsay-plan-10-ship-shape.md`), with the game as it
now exists after Plan 11 (directive network) and Plan 9 (artifacts, magic, debrief). Where the two
disagree, **this document governs**; the original remains the source for task detail not restated
here (Task 2's vignette table, Task 8's wrap spec, the deferred-scope list).

The original was authored before Plans 11 and 9 were executed. A premise audit on 2026-09-27 checked
every concrete claim against the code (audit summary below). Most of Tasks 2, 6, 7, 8 hold; Task 1's
foundations moved entirely; three owner decisions reshaped the order.

## Owner decisions of record (2026-09-27)

1. **R39 Important 2 → R40, cap at issue.** A composed rendezvous may run at most 16 beats (4 h) and
   must open within one day of issue (`RENDEZVOUS_MAX_SPAN` / `_LEAD`, `src/sim/actions.ts`).
   Committed `6ff4bd0`; independent review in progress.
2. **Fast wins: measure first.** The original band "0 seeds won by day 3" stays a *hypothesis*. The
   Plan 9 forger arc wins on day 1 by paper alone (hand-built town), and today's probe bots turn the
   council by days 1–3 on most generated towns, but those bots read ground truth. The honest battery
   measures day-of-win on generated towns; Ellie rules on the band with those tables in hand. No
   task may tune toward or away from early wins before that ruling.
3. **Enemy pressure: a precondition task.** Pressure never engaged in the current probe (0 of 100
   enemy-nights, `tests/harness/pressure-escalation.report.test.ts`), so `lost-exposed` is near zero
   and the loss-mix band would be decided by clock losses alone. A dedicated reachability task runs
   before the balance pass.
4. **A7 composers before the bot fleet.** The player gets forge / plant / show / scry / séance
   composers first, so the battery measures the game as shipped (same reasoning that put the
   vignettes before the battery).
5. **Independent review in parallel.** A Codex Astra (`gpt-6-astra`, max) full-system review of
   `58a9214` started 2026-09-27 alongside this work. Its confirmed findings become R41+ fix units,
   scheduled ahead of the task they would otherwise contaminate (a replay-divergence or knowledge
   leak blocks the battery; a UI defect can wait for Task 8).

## Global constraints (amended)

- **All Plan 6–9 constraints, and Plan 11's**, carry forward: speech is the only knowledge channel
  (`.superpowers/sdd/plan11-constraints.md`); the five-phase tick law; no command bus; directors act
  at a distance through directives; the enemy is instrument-blind; frozen-frame locality for every
  local verb. Bots are held to exactly the player's laws.
- **The sim never reads the clock** (unchanged). Daily seeds derive from the local date in app code.
- **Target bands (hypotheses; Ellie moves them):**
  - Competent-play win rate (canny archetype, 40 days): 40–70 % over 200 seeds.
  - Early wins: **measured, not pinned** (decision 2). Report day-of-win distributions per archetype.
  - Loss mix: no single status among `lost-clock` / `lost-exposed` / `lost-caught` exceeds 70 % of
    losses, *evaluated only after* the reachability task makes exposure reachable.
  - Soak ≥ 90 % first-try (now 94.0 %); full suite ≤ 90 s (now 33.6 s parallel; parallel runs time
    out under CPU load, see Task 9).
  - Nightly cost: the harness measures a per-night wall sample plus a median-of-50 digest, not a p95.
    The band is restated as **day-40 nightly wall ≤ 25 ms, measured with `DIGEST_DAYS=40`** (current
    conservative extrapolation 6.8 ms; windowing very likely stays unneeded).
- **Bounded lever list (extended).** Economy prices (now incl. forgery 6, séance 20, scrying 15);
  pressure tiers and caps; watch / interrogation windows and `WATCH_ORDER_DAYS`; quorum; artifact
  cost / lead / credence; the assignment window (now directive *guidance*, so its effect passes
  through the evaluator); guard vigilance range (**must first move from `src/world/gen.ts:194` into
  gen content**); trait-pool weights; runaround pins (`RUNAROUND_WASTED_NIGHTS`, `COOLDOWN_DAYS`);
  evaluator commitment points (incl. the office/compel +2 "balance watch"); rendezvous caps;
  hosting cap vs circle size (docket B3); courier expiry; flip disposition; strike-bar penalty.
  Juiciness and stance thresholds still move only with Ellie's sign-off; formulas and pillar
  mechanics never.
- One lever per pass, before/after on the same seed batteries, bands written before measuring.
- Every task: full gates (`npm test`, `lint`, `typecheck`, `app:build`, `soak`, `mc`) plus the
  soak/MC comparison, and an independent review before the next task starts.

## Task order

Dependencies: 1 → 2 → 3 → 4 → 5 → 6 → (7, 8 parallel-safe in design, serial in the tree) → 9 → 10 → 11 → 12.

### Task 1 (new): A7 purchase composers — forge, plant, show, scry, séance

Plan 9 shipped these verbs engine-first (docket A7). `forge`/`scry` are non-local (session
`submit`); `plant`/`show`/`seance` are local (`chooseLocal` over the frozen offer). The day planner
today emits none of them (`app/src/panels/DayPlanner.tsx:341-711`).
- Composers in the planner / local-offer surface, using the same public-fact validation posture as
  `directiveIssues` (no hidden state; greying mirrors engine refusals, bound by parity pins).
- Decide carry (w): whether "your paper came back to you" earns its own intel kind/panel, or stays a
  `hint` row. Default: stays a `hint` row unless Ellie rules otherwise.
- Price display from `economy`; the render-verification idiom (markup-level, no jsdom).
- The browser gate's unmeasured surfaces (F3/F4: artifact section, overlay glyphs) get measured
  here, since these composers finally produce the data to render them.
- Astra I5: dossier trait / edge / hint facts are unreadable in every live view; surface them.
- Astra I13: no app path authors Codex hypotheses or Counter-Sketch cards; add the authoring
  surfaces (both engine APIs exist).

### Task 2: Substory pass (original Task 2, with corrections)

The original spec stands (vignettes 3 → 13, gen §15 `'gen:vignettes'` stream is free, the unions
and hooks exist). Corrections:
- `watched-district` reads `world.enemy.watchedDistricts`, which since Plan 11 is written only when a
  watch *report physically arrives* (`src/sim/directives/reports.ts:178-197`). Re-word the def as
  "the enemy has recorded a watch on the district", not "a guard is posted".
- Confirm `mint-claim`'s direct witnessed-belief write (`vignettes/engine.ts:81-101`) against the
  speech-only law before adding consequences; record the ruling.
- `broken-betrothal` never fires in current probes (0 over 5 seeds × 6 days): diagnose while here.
- Astra planning note: standard generation creates no lover/debtor edges, so relationship-gated
  substories lack ordinary prerequisites. Decide whether gen supplies them or the defs change.

### Task 3: The honest bot fleet and outcome battery (original Task 1, rebuilt)

Every foundation of the original moved:
- Today's bots (`src/bots/archetypes.ts`) receive `WorldState` and plan once per day; the harness
  bots also read `world.scenario.cast`. **New bot input**: the player's view only (`playerView`,
  intel log, board/web/network views), with a ground-truth perturbation test proving it (the P4
  pillar test pointed at our own tools).
- **Per-beat, offer-driven runner.** Local verbs validate against the frozen per-beat circle, so a
  bot cannot plan a day in advance. The runner requests a local moment and chooses from the offer,
  exactly as the app does (`requestLocalInteraction` → `localOffer` → `chooseLocal`).
- **Injected staging.** `src/bots`/`src/harness` are lint-barred from content and app, and the
  session's `stageWorld` is app-private. The battery receives rules, gen content and scenario by
  injection and reproduces generateValidTown → worldFromTown → attachPlayer → attachScenario.
- Archetypes re-expressed over today's verbs: `directive` (learn / shape / sound-out) is the core
  remote verb; `assignInformant` and `courier` are directive-shaped and may be refused or deferred;
  debrief needs `meet`; the fabricator uses `forge` and `shape spread` as well as couriers.
- Battery output adds day-of-win distributions (decision 2) and directive refusal rates.
- **Live ≡ replay for bot runs**: a bot's saved log must replay to the identical world. Astra I4
  (confirmed): `runBotCampaignOn` keeps ticking past an ending and logs a day's actions before
  executing them. The new runner must stop at the terminal and log only executed actions.

### Task 4 (new): Enemy reachability — make exposure a real threat

Precondition for balance (decision 3). Measure with the honest fleet why the enemy never builds a case
against the player (pressure 0 / 100 nights): is the avatar never observed, are observations
filtered away, are the digest's heuristics unreachable at v1 density? Report the causal chain with
tables, then propose levers (from the bounded list) for Ellie. No retune lands without her ruling.
- Astra I6 (confirmed) is a leading candidate: in generated towns the interrogation venue is the
  first sorted invitational venue (`back-room-d*`, no regulars; `src/sim/enemy/digest.ts:502-505`)
  and nothing summons the target, so questioning cannot happen. How a target is lawfully brought
  in is a design ruling for Ellie; measure first, then propose.
- Correct the two over-claiming tests Astra named: `tests/sim/enemy-pressure.test.ts:233`
  (perturbs nothing) and `tests/sim/enemy-schedule-application.test.ts:98` (never reaches
  questioning).

### Task 5: Balance pass (original Task 3)

As written, with: bands per decision 2 and the amended loss-mix rule; "expected first findings" now
lead with paper-win speed, directive refusal rates and exposure reachability, not quorum feel alone.

### Task 6: Economy and heat (original Task 4)

As written. The fabricator-vs-investigator comparison is now possible (bots can forge). Magic prices
join the lever list.

### Task 7: Daily seed, seed entry, saves (original Task 5, corrected)

`Session.save()` returns `{seed, log}` with **no version and no tick**, and `loadSession` needs an
`untilTick` the save does not carry (`app/src/loop/session.ts:259-273`). The save format gains
`version` and the current tick; decide (and test) what happens to a pending local offer at save
time. Seed is hard-coded `'cor-1'` today (`app/src/main.tsx`). R39 Minor 3 (hosting / sound-out
rows never pruned) matters for long saves: fix here or in Task 9.

### Task 8: Settings, persistence, accessibility (original Task 6, plus carries)

As written; extend the existing contrast harness (`tests/app/debrief-laws.test.ts`) rather than
building a new one. Carries: the live evidence board `.diff-cell` at 2.46:1 (a known fail to fix);
favicon 404 (F5); terminal Space-guard coverage (F6); carry (n) usability watches (duplicated
`BEAT`, single greying fixture, inert sound-out meeting inputs); R39 Minor 7 outcome vocabulary.

### Task 9: Performance at campaign scale (original Task 7, plus carries)

As written, with the restated nightly band. Carries: invitation-array scans (R39 Minors 2/9), row
pruning (R39 Minor 3, if not done in Task 7), Plan 11 (a) 1.85× residual and (i) runaround cost
shape, build size (583.93 kB / 172.21 kB gzip, over the 500 kB warning; set a budget), and the
full-suite timeout flakiness under CPU load.

### Task 10: Electron and Steamworks wrap (original Task 8)

As written. Storage seam in the save module from Task 7.

### Task 11: Controller path (original Task 9, amended)

The UIAction union cannot express "request a local moment", "choose from an offer" or focus
navigation (`app/src/input/actions.ts:14-49`; the shell dispatches through `submitVerb` /
`requestLocal` / `chooseLocal`). **Amended law:** the gamepad task may extend the UIAction union
and the composition root; panels still take zero edits beyond consuming the extended union.

### Task 12: The ship gate (original Task 10, amended)

As written, plus: a naming constants file (none exists; "Hearsay" is literal in `app/index.html`);
`docs/backlog.md` is stale (Plan 11 rows #26/#27/#29/#30 shipped; #12/#18/#19 cite P10 seams) and
must absorb A5, B-series, P9-1..5 "Plan 10+" doors and every carry below; the provisional queue
(A1–A7, B1–B5, P9-1..5, P11-1..19) must reach zero unratified.

## Carry register (open items assigned here)

| Carry | Task |
|---|---|
| A7 purchase composers; carry (w) paper-came-back | 1 |
| F3/F4 unmeasured artifact / overlay render | 1 |
| Plan 11 (k) `directiveIssues` ↔ engine parity (first-hop and R40 caps are pinned; the rest is not) | 1 |
| `watched-district` wording; mint-claim law check; broken-betrothal never fires | 2 |
| Astra I5, I13 (dossier facts unreadable; no Codex/Counter-Sketch authoring) | 1 |
| Astra: no lover/debtor edges in standard gen | 2 |
| Astra I4 bot runner past terminal / live ≡ replay | 3 |
| Astra I6 unreachable interrogation; two over-claiming enemy tests | 4 |
| Office/compel +2 evaluator balance watch; Plan 11 (h) late-attempt watch `fromDay` seam | 5 |
| R39 Minors 1/8 (preset and planner report clock) | 5 (evaluator touch) |
| Save version + tick + pending offer | 7 |
| `.diff-cell` 2.46:1; F5 favicon; F6 Space guard; (n) usability watches; R39 Minor 7 vocabulary | 8 |
| R39 Minors 2/3/9; Plan 11 (a), (i), (o) build size; suite flakiness | 9 |
| Task 8 M-2, M-6; N-4 unused `FORGERY_LEAD_DAYS` export; Plan 11 (t), (u), (v), (l), (m) | 12 (housekeeping, or whenever those files are next touched) |
| P9-5(d) watched-holder / contact-tracing cascade (backlog #4) | post-v1 unless Ellie promotes it |
| Sound-out `meeting` window uncapped (R40 scope note; see its review) | pending R40 review |

## Premise audit summary (2026-09-27)

Confirmed: vignette unions and hooks; gen §15 free; `economy.ts`; pressure tiers; quorum 2-of-3;
40-day Coronation; soak 94 %; suite 33.6 s; no electron; licenses gate; theme tokens both themes.
Corrected: bots read ground truth and plan per day; Session is app-private and cannot host the
battery; `assignInformant` is a directive wrapper; forge is engine- and session-issuable but has no
composer; saves lack version and tick; UIAction lacks offer flow; vigilance hard-coded in gen;
lever list incomplete; loss literals are `lost-*`; build 583.93 kB; no naming constants file;
backlog stale. Unverifiable as stated: the p95 band (harness measures no p95).

## Resume order

1. Collect the R40 independent review → approval doc → push on Ellie's word.
2. ~~Collect the Astra full review~~ Done: 0 C / 13 I / 4 M, all confirmed; triage in
   `docs/review/2026-09-27-astra-full-review.md`.
3. Fix units R41–R48, serial, each TDD + six gates + comparator + independent review:
   R41 I1 empty-offer trap + M4; R42 I2/I3 sale transmits received claim through ingestion + sell
   test; R43 I9 courier price + M1/M2; R44 I10 relay traits; R45 I8 late hesitation follow-up;
   R46 I7 watch identity; R47 I11/I12 Codex and evening-report arrival time; R48 M3 lint fence.
4. Task 1, with a fresh premise re-verification in its brief.
