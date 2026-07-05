# Hearsay — Game Design Document

**Status: APPROVED (2026-07-03).** All four brainstorm parts approved in discussion; Ellie's end-to-end review complete with two amendments folded in (Counter-Sketch board; explicit multi-hop propagation) — see the resolutions log.
**Date started:** 2026-07-03 · **Designers:** Ellie + Claude
**Stack decision:** TypeScript (pure deterministic sim core) + canvas town view + React UI panels; browser during dev; Electron + steamworks.js for eventual Steam release. Controller support is a future requirement — input abstraction layer and focus-navigable UI conventions from day one.
**Parked sibling concept:** Warden-Cartographer (Vale × Terra Incognita fusion) — see `docs/game-ideas/2026-07-03-warden-cartographer-concept.md`. Shares ~60% engine skeleton.

## One-line pitch

The telephone game as a weapon: a low-APM, real-time-with-pause spymaster sim where rumors mutate deterministically as they pass through minds, and information is the only power in the game.

## Design pillars

1. **The world keeps score.** Variance comes from accumulating consequences, not dice. Deterministic-but-illegible state produces surprise that is always explainable in hindsight. Mastery = making the ledger legible.
2. **Open final door** (Outer Wilds/Noita property). The campaign objective is achievable from the first days by a player who reads the town fast enough; capability-building only makes the path cheaper, safer, wider. Speedrun and completionist are the two poles of one dial.
3. **Low-APM, zero reflexes.** The town runs in real time (pausable, 1×/2×/4×); all deliberate actions happen in pause or slow time. Tactics, strategy, planning — never execution skill.
4. **Manual ↔ automation as identity.** Personal fieldwork = manual tier; the informant network = automation. Speedrunners stay small and surgical; completionists build infrastructure.
5. **Anti-gimmick / fair-cop law.** No stealth-cone weirdness. Few, universal, stated rules; no scripted exceptions. Every failure must read as "I see what I did wrong," never "the cone saw me through a wall." Cheese/shortcuts must be exploits of real mechanics — internally consistent by construction.
6. **Epistemic honesty — the UI never leaks a mind.** The game surfaces only observations and player-authored inferences; ground truth about ANY mind (including the enemy's) is never shown during play. "Did the misinformation take?" is answered only via proxy channels and consequences.
7. **Story via state-triggered vignettes** (the Dave the Diver trick): scenario hooks fired by simulation state, not scripted acts. No "number go up" as the only driver.
8. **Dev-time AI, no runtime AI.** Claude co-authors at superhuman scale during development (trait/predicate ontologies, vignette webs, text rendering variants, generator validation invariants). The shipped game is deterministic and self-contained. Classical procgen/agent AI in-game is fine.

*(The sections from here through "Tech & architecture commitments" constitute Part 1, approved.)*

## Overview & fantasy

- **Genre:** social-strategy simulation; information warfare in a living town.
- **Setting:** invented low-fantasy Renaissance city-state (placeholder name *Vesperin*). Guilds, cathedral, palazzo, docks, printing quarter. Magic exists but is rare, transactional, and priced like sin — every arcane verb (scrying = expensive wiretap; séance = one interview with a dead witness) has a cheaper, slower mundane counterpart.
- **Player role:** the spymaster/boss of a fledgling network, living under a cover identity. Informants do the walking; you allocate them. You may go into the field personally — highest capability in the game and the only unfiltered information channel — but if you are caught in the act it is **immediate game over** (high risk, high reward). The slower loss — the enemy's sketch converging on your identity — instead transforms the endgame into escape-or-turn-the-tables.
- **Campaign shape:** one campaign = one procgen city + one objective (topple the usurper, exonerate the condemned, avert/incite a war, wed feuding dynasties). 4–8 hour first clear, built for replay. Every campaign has a natural doom clock (the coronation in 40 days, the trial in 25) — bounds the campaign, creates pacing pressure without artificial timers, makes the speedrun door legible.
- **Loss states:** clock expires; objective becomes impossible (the innocent hangs); personal capture in the act (immediate); or the enemy's investigation converges on your identity — which transforms the endgame into escape-or-turn-the-tables, with capture there as the final failure.

## Core loop

- **Moment-to-moment:** schedule-driven town (market at noon, tavern at dusk, mass on rest days). Coverage = positioning informants (or yourself) where words flow. Proximity yields **overheard lines** (raw intel). **Chat** = structured dialogue extraction (reveals beliefs + leaks trait hints). **Inject** = tell a rumor, hand a forged letter, stage a scene.
- **The signature move — diffing.** Hear the same story from two mouths; the differences fingerprint every mind it passed through. Works in reverse: inject a distinctive **tracer rumor** and watch where/how-mutated it surfaces — traceroute for gossip. Every injection is a thread the enemy can pull.
- **Day loop:** morning planning (schedule intel) → day execution → evening **rumor report** (what the network sampled; codex updates; visible behavior shifts — prices, snubs, arrests — reveal what the town now believes).
- **Campaign arc:** reconnaissance → trait deduction (codex) → capability building (coin, informants, couriers, station-hosted venue, press) → engineered cascades toward the objective under escalating counterintelligence heat.
- **Three skill layers:** reading the town (where information flows), deducing traits, routing payloads (choosing carriers for their *downstream schedules*, not standing in the right spot — see multi-hop, Part 2). All deepen with player knowledge, not character stats.

## The informant network

- **Reports are filtered through informant traits.** Informants are NPCs with bias traits like everyone else; an exaggerator on your payroll doubles numbers in reports TO you. Cross-verification (two informants covering one event) fingerprints your own people. A turncoat is an NPC whose doctored reports stop matching reality — catchable by the same diffing skill used on the town. One mechanic, everywhere, including inward.
- **Compartmentalization is mechanical.** A captured informant gives up under interrogation exactly what they actually know (recruiter, dead drops, operations). Cell structure and need-to-know are how you firewall heat: tight networks are safe but slow; loose ones fast but fragile.
- **Turncoat/exposure risks compound over time if assets are misused** (Ellie: informants "could reveal your identity over time if misused").

## Heat: the ghost sketch

The enemy spymaster investigates a *ghost*, not a meter. Every traced operation adds a feature to his sketch ("works through the docks", "recruits from tanners", "left-handed forger"). Thresholds escalate countermeasures (district watches, asset arrests, honeytraps). You lose when the sketch uniquely identifies your cover — or a captured informant who knows your face breaks. The sketch is:

- **Legible and incremental** — a converging investigation, not a surprise.
- **Disruptable** — feed it false features; misdirection is just a rumor whose subject is you.
- **Observable in principle** — infiltrate his organization to see the sketch's progress (information physics applies recursively). Your accumulated read on it lives on the **Counter-Sketch board** (see below).
- **Symmetric** — the enemy knows only what his network actually sampled. No omniscience, no rubber-banding, ever.

## The Evidence Board (accessibility = core feature, not difficulty mode)

Principle: **automate perception, keep cognition.**

- Auto-collects everything legitimately obtained; auto-clusters versions of the same rumor (same structured object under the hood); renders side-by-side diffs with changed spans highlighted. Spotting changed words is perception (game's job); explaining them is inference (player's job).
- Trait deduction uses Obra Dinn's confirm trick: hypothesize from a trait glossary; **locks as confirmed at three corroborating observations**.
- **Enemy belief state appears only as player-authored hypothesis cards** with player-set confidence. The game clusters evidence under them but never grades them (pillar 6). Cards concerning the enemy spymaster's investigation of YOU are promoted to a dedicated sibling surface — the Counter-Sketch board (next section).
- **Assist levels** (settings, switchable anytime, nothing gated): 0 = raw notes only · 1 = clustering + diff highlights (default) · 2 = + candidate-trait suggestions · 3 = + partial route reconstruction.
- **Boundary:** settings assist cognition; progression automates action. Accessibility is never bought with in-game resources; automation never solves the puzzle.

## The Counter-Sketch board — your sketch of his sketch (Ellie's review amendment, 2026-07-03)

**Origin (Ellie, near-verbatim):** it's reasonable for you to be a *paranoid spymaster* — track what the enemy has pieced together about you, both to convey urgency AND as a way to spread misinformation about yourself to throw them off your trail. Like the Evidence Board, the info here is what you've been told or heard/seen for yourself; it does **NOT** necessarily represent omniscient truth.

**Named principle: counter-intelligence is just intelligence whose subject is your own ghost.** No new physics, no special cases — the Counter-Sketch is the Evidence Board pointed at the man hunting you.

- **A sibling board to the Evidence Board** (same clustering/provenance/diff machinery), holding everything you've learned about the enemy's investigation — and only that. Feeds: informant reports of questioning ("guards were asking around the tanners' quarter"); **countermeasures as observations** (a district watch appearing at the docks means a dock feature landed); arrest patterns; discovered honeytraps; the infiltration deep-read ("observable in principle," above). It shows **what you knew he knew, as of when you learned it** — lagging, incomplete, possibly wrong.
- **Available day 0, content-gated (resolved):** the panel exists from the start — empty. The blank silhouette IS the paranoia. What fills it is gated by what you actually learn; the day-0 dossier may seed a partial read on some seeds. Boards are cognition and are never progression-gated; progression gates SOURCES (coverage, infiltration), never surfaces.
- **Counter-intel reports pass through informant trait physics like all reports** — an exaggerator on your payroll makes the enemy look two features closer than he is (panic); a minimizer breeds complacency. You can't fully trust your own fear. One mechanic, everywhere — inward and upward.
- **Honeytraps are the enemy's version of your self-smear:** false entries planted on your Counter-Sketch. The duel is symmetric — two ghost sketches, each hunting the other. (Deliberate enemy disinformation campaigns beyond honeytraps = v1.1 tuning knob.)
- **The misinformation staging ground:** the cover-story trick ("a cover story is a rumor about yourself," Part 3) and the decoy play — *give the ghost someone else's face* — are planned from here. Uptake is verified only via proxy channels and consequences: did the watches move? did he arrest the decoy? (Pillar 6 holds; the board never grades your read.)
- **Fair-cop on the slow loss:** sketch convergence is now legible by default, not only to players who thought to infiltrate. Watching the sketch close in makes the escape-or-turn-the-tables endgame an informed decision instead of an ambush.

## The debrief — the intuition engine

At campaign end (win, loss, escape), the curtain lifts on ground truth:

- **Thread view:** every operation traced end-to-end — actual routes, every mutation with the mind that caused it, what landed, what died, what mutated into evidence against you.
- **Sketch timeline:** the enemy's investigation replayed over the calendar — what he knew when ("he was two features from your name on day 12").
- **Counter-sketch overlay:** your Counter-Sketch board laid over his actual sketch on the same calendar — where your read lagged, where an informant's trait warped it, where a honeytrap planted a phantom ("you thought he was two features away; he was five"). Nearly free atop the causal recording substrate; ships with the sketch timeline.
- **Near-misses and unfired threads:** the uncaught turncoat; the plant that took but you never trusted.
- **Purpose (Ellie, verbatim intent):** because every seed differs, the debrief teaches *what can happen, not what will happen* — intuition that transfers, not an answer key.
- **Staging:** thread view + sketch timeline ship **in v1** (the debrief is the learning loop; without it players learn only by guesswork). Near-miss/unfired-thread panels = **first v1.1 item** (Ellie's priority). Counterfactual replays ("re-simulate from day 20 without the forged letter") = post-v1 stretch; determinism keeps the door open.
- **Hard requirement:** the causal-chain recording substrate ships in v1 and is proven by test suites even where a UI panel is deferred — data always captured, some views arrive later.

## Procgen & seeds

- **Randomized per seed:** town layout (districts, venues, adjacencies), social graph, NPC traits and schedules, guard/counterintel quality and placement, faction alignments, scenario cast. Sometimes the juiciest tavern sits next to a guard post — that's the game.
- **Fixed grammar:** institutional archetypes (taverns, cathedral, market, guard posts), required scenario cast roles, and the information physics never change. Players learn physics and archetypes, never an answer key.
- **Generator + validator:** every scenario must pass solvability invariants before serving (objective achievable; keystone NPCs reachable via ≥2 independent social routes; no critical role isolated). Fail → repair or reroll. Authoring/stress-testing invariants across thousands of seeds = dev-time AI work.
- **One seed string determines the whole world.** Same seed + same actions = same campaign. Side effects for free: shareable seeds, daily-seed runs, per-seed speedrun categories.
- Difficulty variance across seeds is embraced, bounded by the validator, not flattened.

## Tech & architecture commitments (detail in Part 4)

- **Pure TS sim core**, zero DOM dependencies, deterministic, headlessly unit-testable; canvas/React strictly render state. Keeps bugs seed-reproducible and any future engine port possible (Vampire Survivors path).
- Fixed-timestep sim ticks under the hood; real-time speeds are playback rates.
- Input abstraction (actions, not raw events) + focus-navigable UI from day one for eventual controller/Steam Deck support.
- Steam path: Electron + steamworks.js (precedents: shapez, CrossCode, Vampire Survivors 1.0).

## Part 2 — The rumor system (approved)

### Rumors are data; text is rendering
A rumor is a structured claim, never a string: **subject** (entity) · **predicate** (finite designed ontology, ~24 in v1: is-having-an-affair-with, stole, plans-to, is-bankrupt, met-secretly-with, is-the-true-heir-of, poisoned…) · **object/arguments** · **qualifiers** (time, place) · **attribution** (who the story says it came from — itself mutable, and the key to tracing) · **per-field specificity**. Prose is a projection via dev-time-authored rendering templates (per predicate, per speaker voice). Mutation operates on fields, never text → mechanical, testable; the board's diffing is exact under the hood while the player experiences changed words in prose.

### Traits are transforms with fingerprints
A bias trait = deterministic field-transform + trigger condition; each NPC has 2–4 in fixed application order; composition over hops = ordered function composition. v1 glossary ~12–16, e.g.: **Exaggerator** (numbers→storyteller-scale, severity+1), **Attributor** (fills vague subjects/attributions with a specific name drawn deterministically from their own circle and grudges — traits hook the relationship graph), **Moralizer** (predicates→sin/virtue register), **Partisan** (blame→rival faction, softens own; fires only on faction-relevant claims), **Skeptic** (transforms nothing; won't retell without corroboration — gatekeeper node where rumors die), **Literalist** (passes unchanged; rare routing infrastructure).
**Ontology law (build-time validated): no two traits produce identical field-change signatures** — every observed diff has a discoverable explanation; codex three-confirm can always converge.

### Propagation: contact × tellability, no dice
A tells B iff (1) **contact**: schedules overlap at a venue AND a relationship edge exists; venue earshot seeds bystanders by the same overhear physics the player uses; and (2) **tellability** clears threshold: juiciness × relevance-to-B × A's confidence × freshness. Juicy rumors race, boring ones die, stale news isn't retold without new corroboration or fresh mutation. No dice at decision points; tie-breaks are seeded at world-gen, never re-rolled per action (no save-scum rerolls; speedrun-fair).

### Multi-hop is the mechanic: the story travels on its carriers' schedules (Ellie's review amendment #2, 2026-07-03)
**Origin (Ellie, near-verbatim):** it's easy to stand in the right spot and say the right thing — but that's not how info propagates. You say it to the bartender; the bartender says it to their patrons; those patrons say it to their circles — until everyone knows *some version* of the story. Informants may only be in one place at once, but as the story grows, the people you've told and what you've told them move across the city on **those people's** schedules: told at 8am in the market as they were getting food, by evening they've told their family, the bartender where they drink, their work buddies.

**Named principle: you speak once; the town does the walking.**

- **You own hop zero; the town owns the rest.** An injection chooses the first carrier, the venue, and the time — nothing after. No recall, no steering mid-flight. This is *why* margins and redundancy are the mastery skill (butterfly contract): everything past hop zero is autonomous physics.
- **Store-and-forward on carrier mobility.** There is no global "spread" step in the sim; a rumor moves ONLY when teller and hearer share a conversation circle. It crosses the city hop by hop, riding each carrier's schedule.
- **Injection targeting = downstream-schedule reading.** The real choice isn't the spot — it's the carrier's next twelve hours, and their hearers' next twelve after that. A morning market injection buys a full day of hops; a dusk whisper sleeps overnight and may die stale (freshness decay).
- **Latency and geography are real.** Information takes days to reach districts it has no path into. Communities that share no venues are natural **firebreaks**; rumors cross only via **bridge NPCs** who frequent both worlds — strategic terrain: mappable, cultivable, watchable (by the enemy too). Ties to stations: the noble and lowlife circuits touch at few bridges, and your station decides which side you stand on.
- **The endgame of a juicy rumor is a family of versions.** Fan-out × per-hop trait transforms = "everyone knows some version of the story." Diffing distant versions triangulates paths at town scale — the signature move, working on the whole city. (The causal-chain substrate records every hop; the debrief thread view replays them.)

### Belief & credibility
Credence = **source trust** (relationship + teller's accuracy reputation) × **plausibility** (fit with existing beliefs — **confirmation bias is a mechanic**: claims against people B dislikes land soft; seed dislike first) × **evidence** (artifacts/witnessed ≫ hearsay). Corroboration weighted by *apparent* independence (B only knows what attribution survived) → **manufactured corroboration**: route one claim down multiple paths so it arrives looking independent — the system's signature advanced technique. Belief thresholds drive behavior: dismiss → repeat → believe → **act**, with acting thresholds scaled to action cost (snub cheap; arrest needs conviction + authority). **Artifacts** (forged letters, staged scenes): high evidence weight, don't mutate (documents fixed; interpretations aren't), but physical → forensically traceable (feeds the sketch). **Contradiction** triggers visible corroboration-seeking — a proxy channel for reading minds without reading minds.

### Self-rumors are bait: reactions, not silence (Ellie's amendment #3, 2026-07-04)
**Origin (Ellie, near-verbatim):** an NPC who hears an unfavorable rumor about themselves may use it to their own gain — they may be (1) **baited into asking about it** (who started it, who's keeping it going), (2) **baited into turning it into a favorable rumor**, (3) any other real-life action you'd take on finding out a rumor was spreading about you, based on the type of rumor.

**Named principle: a rumor about you is bait — it pulls actions, not retellings.** Self-rumors are the third face of one mechanic: a civilian investigating gossip about themselves, the enemy spymaster investigating his ghost sketch, and the player managing a cover story are the same behavior at different scales.

- **Reaction menu keyed by predicate valence + belief stance** (this is the `act` tier for self-subject claims): damaging → *investigate* (visible corroboration-seeking — asking their circles who told them, itself a tellable, observable event) or *counter-spin* (author a favorable or muddying counter-claim — an NPC self-inject; the NPC version of the player's cover story, pure rumor physics); flattering → *amplify or bask* (retell, trait-flavored — people do spread their own flattery); neutral → shrug.
- **Player exploit (intended): rumors about X are bait for X.** Inject a story about a suspected enemy informant and watch who asks about it — a tracer aimed at a person instead of a route. Baiting the enemy's assets into visible investigation is legitimate counterintelligence, and their investigation feeds your Counter-Sketch reads.
- **Investigation is observable by construction:** asking-around happens in conversation circles under the same physics as all gossip — bait pulls people to venues and questions your informants can sample.
- **Staging:** the full reaction system lands with the enemy AI (they share the investigation machinery); reaction richness (confrontation, flight, duels) arrives via vignettes. Interim kernel behavior is a resolutions-log decision.

### Why deterministic ≠ clockwork — the butterfly contract
Unpredictability comes from **chaos** (schedule interactions and threshold crossings are hypersensitive to initial conditions — traffic, not dice) and **ignorance** (unmapped traits/edges/beliefs). Ellie's framing, adopted: *the butterfly effect at a smaller, traceable scale* — Day-1 misinformation started in the tavern instead of the market (same words!) forks every subsequent day; even standing elsewhere in the tavern changes who overhears; only the exact same actions in the exact same order at the same times reproduce the same campaign.
**Welded to the fair-cop law: chaos in the weeds, causality in the plan.** Trajectories diverge freely, but a well-built operation succeeds across small perturbations because its author built margins (fan-out routing, manufactured corroboration, fallback injection points). The butterfly effect is why redundancy-building is the mastery skill, not memorizing golden paths; a plan that only worked from the right spot was a bad plan, and the debrief shows why. Per-seed speedrunning = routing at the edge of reliability, on purpose.
**Win philosophy (Ellie, near-verbatim):** a win must feel earned because you correctly read the signs and took mitigating actions and contingencies — never because you lucked into the right spot at the right time (unless replaying a known seed). It's what you do with your luck or unluck that determines success or failure. Individual seeds may be easier or harder; every playthrough contains lessons.
Player-facing mental model (manual, verbatim): *rumors are packets; people are routers with firmware quirks; venues are switches; belief is a checksum against priors — and you own the traceroute tools.* Delivery is **store-and-forward**: packets move only when routers meet — you transmit once, and the network does the walking.
Scale targets: ~24 predicates, ~12–16 traits, 60–120 NPCs per town (v1 ships at the lower end: ~14 traits, 60–90 NPCs).

## Part 3 — Town sim & content (approved)

### The town: venues, people, buried truth
**Venues:** schedule of regulars; earshot model = conversation circles + bystander radius (one rule for NPCs, informants, player, and enemy alike); access levels: public (tavern, market) / invitational (salon, guild hall) / private (palazzo interiors — via informant standing, engineered invitation, or risky personal outing).
**NPCs:** home, occupation, weekly schedule (feast-day variations), typed directional relationship edges (kin/friend/colleague/rival/lover/debtor), faction, 2–4 traits, belief store, **secrets**. The seed generates a *true hidden history* (real affairs, real embezzlement, the usurper's real backers) — ground truth exists under the gossip.
**Central strategic axis — investigation vs. fabrication:** true dirt is self-corroborating (witnesses/documents exist; the world backs you up) but must be found and is what it is; fabrications are fully controllable but fragile (world may contradict; traced authorship = sketch material). Most campaigns braid both. The seed decides which is cheap this time.
**Day-0 dossier:** seed-generated starting intelligence — pre-filled Evidence Board entries WITH provenance, possibly including partial reads on enemy informants. Varies blind→well-briefed per seed; deterministic; **validator-capped** (never a complete route to the objective, bounded fraction of confirmable traits). Dossier shape follows station (noble: court-sighted, dock-blind; inverse for lowlife).

### Stations (seed variance; replaces "cover identity" question)
Player's societal station is dealt by the seed — e.g., **noble / middling / lowlife**. Station defines: personal venue access without suspicion; **hosting affordance** (nobles: salon; lowlifes: tavern back rooms, underground networks); recruitment affinities; **visibility profile** — each station is traceable its own way (noble recognized everywhere, conspicuous anywhere low; beggar invisible in gutters, glaring in the palazzo). Buffs/debuffs, all information-physical.

### Economy & progression ladder
Coin kept simple v1: patron stipend + optional **intelligence brokerage** (sell gathered info for income at heat+time cost). Money prices choices; it is not a second game.
Ladder (each rung a different capability *shape*): 1) informants (coverage) · 2) couriers & dead drops (injection reach + compartmentalization) · 3) safehouses (meeting security, heat decay, escape) · 4) station-hosted venue (salon / back room: sampling + injection in a controlled room) · 5) printing press (endgame broadcast).
**Recruitment = MICE with priced failure modes, not dice:** Money buys fast, leaks to higher bidders; Ideology is loyal but refuses convictions-violating ops; Coercion is powerful and most turncoat-prone; Ego flatters easily and exaggerates chronically (their trait filters their reports).
**Print vs whisper:** print = perfect fidelity (no mutation), forces institutional response, but low intimacy-trust and forensically loud (licensed presses, fingerprintable typefaces). Whisper = mutating, slow, intimate, deniable, believed.

### Magic, priced like sin
Magic never breaks information physics; it buys narrow exceptions at steep, visible, traceable cost. Info/communication access ONLY — no charming, no mind-control; minds move only via rumor physics. Ritual list may grow beyond v1's scrying (one remote scene; rare materials; arcane residue detectable by inquisitors → distinctive sketch feature) and séance (one short literal interview with a dead witness; requires grave access — a caper). Economics force sparing use: magic *spends* deduction already done, never replaces it.

### Scenarios & vignettes
Scenario = objective(s) issued Day 0 + required cast roles + doom clock + win conditions as **institutional actions produced by the sim** (council vote, arrest, flight…) — outcomes discovered only when they happen, unscripted, reachable via different strategies. Personal stake = cold-open vignette.
**Vignettes** = hundreds of micro-scenes (duels, betrothals, bankruptcies, trials) with declarative preconditions over sim state and consequences written back into it — opportunities, not rewards (a duel → grieving family → coercion lever + recruit + gossip vein). Largest dev-time-AI content surface; validator proves trigger reachability + consistency.
**Engine/content split (architectural commitment):** scenarios/vignettes are data on the Hearsay engine; infinitely many can be authored without touching systems. V1 ships one polished scenario ("The Coronation" — topple the usurper, 40 days) on endless seeds + daily seed.

### Symmetric observability — the player is in the simulation
Your avatar and informants are agents under the same perception physics; **out-of-pattern behavior is juicy by the same tellability math as all gossip** — no special player-detection code. A noble entering a beggar's hovel is a tellable event: bystanders gossip; enemy coverage that samples it feeds the sketch (if they weren't suspicious, they may start; if they were, the beggar may now be suspected). Anomaly types: frequency (loitering 100% at one spot), station (venue inconsistent with persona), graph (repeated co-location of your assets → inferred edges → network mapping). **Contact tracing:** a burned informant taints everyone they're observed meeting — suspicion cascades like rumor. Dead drops beat face meetings *because they break observable co-location* (second mechanical meaning of compartmentalization).
**Named trick — a cover story is a rumor about yourself:** pre-seed a false-but-tellable explanation for your own anomaly ("the Contessa has a gambling vice") so observers reach for your explanation instead of the truth. Self-smear as counterintelligence; pure rumor physics, zero special cases.

## Part 4 — Architecture & v1 slice (approved)

### Module boundaries & two structural laws
Pure-TS sim core; the pillars are enforced by interfaces, not discipline:

- **`core/rng`** — seeded PRNG with per-subsystem streams (world-gen, tie-breaks…) so adding a feature never reshuffles another system's draws.
- **`core/time`** — fixed-timestep scheduler (1 tick = 1 sim-minute; 1440/day) + event queue; real-time speeds are playback rates.
- **`world/gen`** — generator + validator (town, cast, secrets, dossier), fully separate from runtime sim.
- **`sim/agents`** — schedules, movement. **Structural law #1: space is discrete.** Town = graph of venues; within a venue, conversation circles. Same circle = hear; same venue = see presence — the entire perception geometry. Kills stealth-cone gimmickry architecturally while preserving the butterfly (circle choice changes who overhears). Canvas renders the graph as a living town; the sim never knows pixels.
- **`sim/perception`** — the single module through which ANY actor (civilian, your informant, the enemy's, you) observes anything; one `ObservationFeed` type for all. Symmetry is structural.
- **`sim/rumors`** — claims, transforms, propagation, belief stores.
- **`sim/enemy`** — sketch model, anomaly analysis, countermeasures. **Structural law #2: the enemy interface receives an `ObservationFeed`, never `WorldState`.** No-omniscience is a type signature, not a promise.
- **`sim/network`** — roster, assignments, compartment knowledge model (what each asset factually knows — what interrogation reads).
- **`sim/vignettes`** — declarative trigger engine (preconditions over state → consequences as events).
- **`content/`** — pure data: predicates, traits, rendering templates, vignettes, scenarios, stations. Engine/content split; makes modding/workshop nearly free later.
- **`app/`** — React panels, canvas renderer, input-action abstraction, save/load. Renders state; zero game rules.

Determinism enforced mechanically: lint rule bans `Date.now`/`Math.random` in sim core; all entropy via `core/rng`; all state serializable.

### Saves & replays
Save = **seed + action log** (+ periodic snapshots purely for fast loading). Buys: perfect-fidelity debrief reconstruction; "send me your save" = perfectly reproducible bug reports; counterfactual stretch goal; speedrun verification. (Ellie: the structure itself proves the deterministic nature of a playthrough — ideal for our own debugging and troubleshooting.)

### Testing — the pillars as test suites
- **Determinism:** property test — same seed + action log ⇒ identical state hash, thousands of runs.
- **No-omniscience:** perturb hidden state the enemy never observed ⇒ enemy decisions bit-identical.
- **No-omniscience, mirror direction:** perturb the enemy's actual sketch in ways the player never observed ⇒ the Counter-Sketch board render is bit-identical. Epistemic honesty enforced structurally in both directions.
- **Fingerprint uniqueness:** property test across the trait ontology (no two traits produce identical field-change signatures).
- **Fair-cop audit:** every sketch feature carries a causal observation chain; every campaign loss is debrief-explainable.
- **Validator soak:** solvability invariants across thousands of generated seeds, nightly.
- **Balance harness:** headless Monte Carlo campaigns via scripted bot archetypes (patient investigator, aggressive fabricator, reckless speedrunner); tune pacing from outcome distributions per seed batch. Major dev-time-AI role: writing bots, reading distributions, proposing tuning.
- **Debrief substrate proof (Ellie's condition):** causal-chain recording ships in v1 and is proven by these suites even where a UI panel is deferred.

### The v1 slice (resolved)
**V1 ships:** "The Coronation" (topple the usurper, 40 days) on endless seeds + daily seed · **two stations: noble & lowlife** (maximal contrast; middling = v1.1) · ~24 predicates, ~14 traits, 60–90 NPCs · ladder rungs 1–4 (informants, couriers/dead drops, safehouse, station-hosted venue) · scrying + séance · Evidence Board assists 0–3 · **Counter-Sketch board (day 0, content-gated; minimal v1 feeds: countermeasure observations + informant counter-intel reports + infiltration deep-read)** · **debrief: thread view + sketch timeline + counter-sketch overlay** · seed determinism + action-log saves.

**Deferred:** printing press → **v1.1** (drags institutional-response systems; loop proves itself without broadcast) · near-miss/unfired-thread debrief panels → **first v1.1 item** (players must learn from playthroughs, not guesswork) · counterfactual replays → post-v1 · additional scenarios/stations = pure content · gamepad bindings at Steam-wrap time (input abstraction ships in v1) · Electron/Steam wrap after the browser build proves the game is fun.

**Build order:** sim core + rumor physics headless first, proven by tests and bot campaigns before any real UI (substrate-first) → Evidence Board → town view → content width.

## Resolutions log (formerly open questions)

- **Personal exposure severity — resolved:** caught in the act personally = immediate game over; sketch convergence (the slow loss) = endgame transformation into escape-or-turn-the-tables.
- **Counter-Sketch board (Ellie's review amendment #1, 2026-07-03) — resolved:** ships in v1; available day 0, content-gated (blank at start; sources gated, surface never). Enemy-investigation hypothesis cards promoted from the Evidence Board to this surface; debrief gains the counter-sketch overlay; testing gains the mirror-direction no-omniscience property test.
- **Multi-hop propagation made explicit (Ellie's review amendment #2, 2026-07-03) — resolved:** the story travels on its carriers' schedules ("you speak once; the town does the walking"). Sim commitment: no global spread step — rumors move only via co-presence, hop by hop. Gameplay commitment: injection targeting = downstream-schedule reading; bridge NPCs and district firebreaks are strategic terrain.
- **Stations for v1 — resolved:** two (noble, lowlife); middling arrives v1.1.
- **Printing press — resolved:** v1.1.
- **Self-rumor reactions (Ellie's amendment #3, 2026-07-04) — design resolved:** a rumor about you is bait — it pulls actions (investigate / counter-spin / amplify, by valence + stance), not retellings; full system ships with the enemy AI. Interim damaging-valence gate shipped in Plan 3; the full reaction system (investigate / counter-spin / amplify, one machinery with the enemy AI) shipped in Plan 4 (2026-07-04). The retell gate remains — reactions replace silence with action, never parroting.
- **Codex via-mixing (2026-07-05) — resolved: intel is corruptible by design.** A receive the avatar saw raw can pair with a tell seen through a trait-filtered informant, conflating the target's transform with the informant's distortion — an exaggerator on payroll can fabricate a false trait lock on an innocent. Ellie's ruling: keep it; your deductions are only as good as the eyes that fed them. Standing UI obligation (Plans 7/8): every corroborating pair displays its `via` — provenance visible turns the trap into a readable deduction ("this lock rests entirely on gale's reports"), never a silent bug.
- **Network audit loop (Ellie's amendment #4, 2026-07-05) — design resolved; ships across Plans 7–8:** her question: "is there any way (other than deduction) for us, or the enemy spymaster, to identify what kind of slant a person has?" Three player mechanics, all existing machinery re-aimed: (a) **canary traps** — "give a suspected transform informant information you know will leak back to you"; *a canary is a rumor whose ground truth you own* (corroboration with a player-authored receive — a one-hop report-back isolates the informant's `reportThrough` slant; the town-echo reads their outbound telling distortion); emergent once Plan 7's tell verb lands, zero new physics. (b) **Debrief under pressure** — the compulsion machinery pointed inward, at trust cost; the trust≥0.7 confide threshold already prices heavy-handedness (an informant pushed below it stops volunteering). (c) **Your actions drive informant disposition** — trust-edge physics with the player as a node; *your network is townspeople on payroll.* Symmetrically, **anti-spymaster ops**: "create rumors about them that can propagate through their network and make them less effective, or cause turncoats in their ranks to give you vital information" = amendment #3 pointed at the enemy — *the spymaster is someone the town can talk about*; effectiveness loss = nightly countermeasure budget spent reacting to their own scandal; turncoats = trust erosion crossing the confide threshold from the other side. Retune note: the 0.7 confide constant now does triple duty (civilian secrets, informant candor, enemy leaks).
- **Boards as views, margin notes, and the language of the game (Ellie's amendment #5, 2026-07-05) — design resolved; ships across Plans 7–10:** (a) **"The most important part of the codex/info board is to show the web — both the highlights AND the details."** Views are projections over the one intel log — no new physics: an **informant ledger** ("everything an informant has ever said, with links to other informants to have reported on the same situation or information"); a **web view** — "information (and who said it) around your main target... so you can see how close you're getting to your goal" — subject-parameterized: the coronation in this gamemode ("in other gamemodes, who knows..."), any NPC, or the enemy spymaster — which folds the enemy-informants view in rather than building it separately. Named principle: *every board is one lens pointed at a different subject* (Evidence Board → the town; Counter-Sketch → your hunter; web view → your goal, or their network). (b) **Player tags** on information or informants — "things you suspect or have deduced that you want to track"; "UI only, and allowed to be fallible"; eases the cognitive burden of tracking it all in your head. Law: tags are *margin notes, not evidence* — the sim NEVER reads them; they ride the action log as verbs (codex/card precedent) so save+replay covers them; the game never grades them. (c) **Keyword highlighting + tooltips + a codex of terms** — "a simple highlighted word → player hovers → they see the exact description possibly with an expanded entry in a codex of terms → they're never in the dark about labels, or game mechanics"; hand-in-hand with the tutorial and game codex. Structural law for every UI plan: **no unregistered jargon** — each player-facing label must resolve in the term registry (test-enforced), and every plan that ships a player-facing mechanic registers its terms in the same task.
- **Enemy instrument-audit symmetry (2026-07-05) — resolved: v1 enemy is instrument-blind; the auditing enemy is post-v1.** Ellie: in v1 "that's our edge. We can identify holes in our own informant rings" — the audit loop (canaries, debriefs, provenance reading) is player-only, the earnable advantage. "An enemy that *does* audit its own instruments and informants would be fun/nice to add" post-v1 — staged as a spymaster-archetype/difficulty knob. Plan 8 authors the enemy network accordingly.
- **Still open (non-blocking):** working title "Hearsay" and city name "Vesperin" are placeholders; naming pass before any public release.
