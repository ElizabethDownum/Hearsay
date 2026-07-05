# Hearsay — Post-v1 Backlog (the one list)

**Status:** DRAFT PRIORITY ORDER (Fable, 2026-07-05) — Ellie reorders at will; the ORDER here is
a proposal, the MEMBERSHIP is the ratified union of every deferred-scope item from Plans 4–10.
Per Ellie's 2026-07-05 ruling there is no v1.1/post-v1 split: one prioritized backlog, worked
top-down after the v1 tag. Plan 10's ship gate reconciles every plan's deferred list against
this file — nothing ships orphaned.

Items marked ⏸ have staging pending a clarification Ellie hasn't answered yet.

| # | Item | What it is | Seams already in place |
|---|------|-----------|------------------------|
| 1 | **Near-miss & unfired-thread debrief panels** | The uncaught turncoat, the plant that took but you never trusted — Ellie's standing first post-v1 priority | `threads()` already computes `died`; panel is the missing piece |
| 2 | **Turn-the-tables endgame verbs** | Replaces the vetoed escape endgame: counterintel/blackmail/assassinate the enemy spymaster, or assassinate the coronee ("some other action") | Embodied spymaster (P8) + artifacts/leverage (P8/P9) + institution records (P6) |
| 3 | ⏸ **Trespass & disguise package** | Caught somewhere odd → immediately trespassed from the vicinity, possibly permanently ("guards will watch for their face now"); disguises + search risk as the stealth counterplay (Ellie's A2 design, 2026-07-05) | Access law (P8), presence capture, ScheduleOverride machinery; staging pending clarification |
| 4 | ⏸ **Vignette content width** (3 → ~15+, dev-time-AI pass) | More state-triggered micro-scenes on the P6 engine (+2–3 new condition shapes if needed) | Engine + validator probes ship in P6; could be pulled INTO v1 as a Plan 10 task — pending clarification |
| 5 | **Enemy contact-tracing cascade** | A burned informant taints everyone they were observed meeting — suspicion spreads like rumor (enemy-side; the player already does this by hand via tags/ledger, as Ellie noted) | `met-asset` compartment facts record everything needed |
| 6 | **Arrests & asset seizure** | The enemy REMOVES identified assets instead of only turning/draining them | Identification + pressure tiers (P8); institution records (P6) |
| 7 | **Enemy honeytrap artifacts** | False entries planted on your Counter-Sketch — his version of your self-smear (spec v1.1 knob) | `Artifact.author` union (P9) |
| 8 | **Printing press** (ladder rung 5) | Perfect-fidelity broadcast; forces institutional response; forensically loud | Predicate/render/artifact substrate |
| 9 | **Middling station** | The third station (spec staged it out of v1 deliberately) | Station machinery (P8) is n-ary already |
| 10 | **Enemy counter-offers / live bidding** | "Money leaks to higher bidders" as an ACTIVE auction on your Money recruits | MICE records + enemy coin abstraction |
| 11 | **Engineered invitations** | Private-venue access via play (the access-law error message already names it) | Access law (P8) |
| 12 | **Double agents / walk-in negotiation** | Walk-ins become a relationship, not a weekly drip; feeding a known turncoat false material | Turncoat machinery both directions (P8) |
| 13 | **Keybinding + controller remap UI** | KEYMAP/padmap are data already; this is the editing surface | P7 input abstraction; P10 gamepad map |
| 14 | **Additional gamemodes** | Exonerate-the-condemned, avert/incite-a-war, wed-feuding-dynasties — pure content on the WinCondition seam | `WinCondition` union + `objectiveTerm` (P6) |
| 15 | **Staged-scene artifacts** | The third artifact kind ("stage a scene") beyond forge/plant | Artifact machinery (P9) |
| 16 | **Speaker-voice prose variants** | Per-NPC voice on the render templates | `render.ts` one-voice baseline (P9) |
| 17 | **Ritual growth** | Siblings for scrying/séance, each priced like sin | Magic verb pattern (P9) |
| 18 | **Counterfactual replays** | "Re-simulate from day 20 without the forged letter" — determinism keeps the door open | Save = seed + log |
| 19 | **Steam achievements + cloud saves** | Behind the existing STEAM flag | P10 wrap seam |
| 20 | **mac target** | Needs signing infrastructure | electron-builder config |
| 21 | **Localization** | TERMS + render.ts already centralize every player string; the work is the translation pipeline | P6/P9 seams |
| 22 | **Persistent seeded campaign** (big concept, parked) | A longer-running set of missions on one identity — where FLEEING to cut your losses becomes meaningful (Ellie's framing at the endgame ruling) | Everything; this is a sequel-scale idea kept on the record |
| 23 | **Auditing-enemy spymaster archetype** | The enemy that canaries its own instruments — difficulty knob (standing ruling: never v1) | Amendment-#4 machinery exists player-side |
| 24 | **Cutout recruiters / deeper cells** | `recruited-by` someone other than you; interrogation chains lengthen | CompartmentFact schema carries it |
| 25 | **DOM component test rig** | Only if debrief-UI regressions actually bite (Ellie: skip for now, 2026-07-05) | — |
