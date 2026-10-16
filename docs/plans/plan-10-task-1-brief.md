# Plan 10 Task 1 brief: A7 purchase composers, dossier facts, Codex and Counter-Sketch authoring

Written 2026-10-16 at `8fc4d3a` (docs `705af84`), after R41 to R49. Scope is Plan 10 Task 1 as
ruled on 2026-09-27 (`plan-10-current.md`, "Task 1 (new)"); this brief re-verifies its premises
against the code and fixes the unit order and the verification posture. Each unit is serial, TDD,
the six gates and the soak/MC comparator (`allBlocksEqual`), then an independent review.

## Premise re-verification (16 October)

Confirmed:
- The five verbs are engine-complete: `applyForge` / `applyShow` / `applyPlant`
  (`src/sim/artifacts.ts`), `applyScry` (`src/sim/magic.ts`), `applySeance` (`src/sim/seance.ts`),
  each in the `ActionIntent` union and the campaign reducer. `show`, `plant`, `seance` are LOCAL
  (`LOCAL_KINDS`, `app/src/loop/session.ts`): chosen over the frozen offer by `chooseLocal`.
  `forge` and `scry` are non-local: `session.submit` via `submitVerb` (`app/src/main.tsx`).
- The planner emits none of them: its emitted kinds are ask, avoid-*, courier, debrief, directive,
  expected-presence, host, learn, meet, not-*, note, person, posting, recruit, rendezvous, sell,
  shape, sound-out, standard, story, tell, venue (`app/src/panels/DayPlanner.tsx`, now 1,107
  lines; the plan's `:341-711` range is stale).
- Prices: `rules.economy` (`EconomyDef`, `src/sim/rules.ts`; `STANDARD_ECONOMY`,
  `src/content/economy.ts`): forgery 6, scrying 15, seance 20. The Treasury panel already lists
  them; the composers must show the price beside the control.
- Astra I13 confirmed: `codex` (propose / retract) and `card` (add / update / remove) actions exist
  in the engine (`applyCodex`, `applyCard`, `src/sim/actions.ts`); no app path emits either (the
  Codex and Counter-Sketch panels are read-only views; the planner emits neither kind).
- Astra I5 confirmed: `trait-read`, `edge-read` and `hint` rows carry `npc`/`trait`,
  `edgeFrom`/`edgeTo`/`edgeKind`, `hintAbout`/`hintWitness`, and no panel reads those fields
  (grep over `app/src` is empty); the Evidence Board prints only the kind word.
- F3/F4: the browser gate (2026-09-18) could not measure the Overlay status sentences and three
  icon glyphs because no fixture produced artifacts or magic operations; the plan moves that
  measurement here, where the composers produce the data.

Corrected / to verify in the unit:
- `seance` needs a sacred venue, a time before 04:00, a known departed witness (`world.departed`),
  one use per campaign and the price. Whether "a departed witness is known" is a PUBLIC fact the
  composer may read (it is dossier-born) is settled in 1D by reading `attach.ts`; if not public,
  the composer greys on venue, time and price only and the engine refuses the rest.
- `scry` is next-day only, a 15-aligned window of at most 60 minutes inside the day.

## Decisions (routine, root's; Ellie may overrule)

1. Carry (w): "your paper came back to you" stays a `hint` row (the plan's default).
2. Composer posture is `directiveIssues`': validation only on the draft and public views (coin,
   what you hold and when it was forged, who stands in front of you, the current venue, the
   clock), greying mirrors the engine's refusal text, and every mirror is bound by a parity pin
   against the engine (the Plan 11 (k) carry: first-hop and the R40/R49 caps are pinned, the rest
   is not; each new composer adds its sweep).
3. Local verbs appear in the local-offer surface the planner already renders for `tell`; non-local
   verbs appear in the planner's verb column with their price.
4. Authoring surfaces live on their own panels: propose / retract on the Codex, add / update /
   remove on the Counter-Sketch, both through `submitVerb`.
5. Dossier facts become readable on the Evidence Board rows themselves (the row names its trait,
   edge or hint), plus a "from the dossier" filter; no new panel.
6. F3/F4 is measured last, with the browser-gate idiom; if it needs a live browser session root
   cannot drive, the measurement is recorded as owed with the fixture that now produces the data.

## Units, in order

| Unit | Surface | Mirrors (public facts only) |
|---|---|---|
| 1A forge | planner, non-local, reuses the `tell` spec builder | coin >= forgery |
| 1B show / plant | local offer; artifact picker (held, forged before today) | holding; usable; `show` to a circle-mate; `plant` to exactly one of the current venue or a circle-mate |
| 1C scry | planner, non-local | venue exists; next day; 15-aligned window <= 60 min; coin >= scrying |
| 1D seance | local offer | sacred venue; before 04:00; coin >= seance; (departed known, once: see above) |
| 1E codex / cards | Codex and Counter-Sketch panels | npc known; trait in `rules.traits`; card id unique; confidence in [0, 1]; known id on update / remove |
| 1F dossier facts | Evidence Board rows + filter | none (render only) |
| 1G F3/F4 | browser gate measurement | none |

Each unit: RED (panel render test, composition-root wiring test in the `local-pass-wiring` idiom,
parity sweep against the engine where a mirror exists) -> implementation -> GREEN -> gates ->
commit -> independent Opus review on a `git archive` snapshot -> corrections with their own mutant
table -> approval record under `docs/review/`.

## Out of scope

Balance of prices, new verbs, Electron, the save format (Task 7), bot usage of the composers
(Task 3). The `dossier` term and the Network panel's dossier marker stay as they are.
