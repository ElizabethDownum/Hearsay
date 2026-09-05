# Hearsay — Ellie's review docket (running)

> **What this is:** every decision point taken under your 2026-08-23 standing
> autonomy grant ("take your default ruling and proceed, log it, keep it
> changeable"), plus the pre-existing provisional queue, in one place. Updated
> by the controller at every new decision. Deep evidence lives in the ledger:
> `C:\Users\eliza\Desktop\ClaudeFiles\hearsay\.superpowers\sdd\progress.md`.
> Nothing here blocks execution — everything shipped with the default applied.
> Last updated: 2026-09-03 — Plan 9 Task 1 (artifacts) is landed locally
> (`b512aad..35383c6`, unpushed) and in its first fix wave, re-seated this session.
> **NEW for your review: P9-3, P9-4 and P9-5** (section A) — P9-3 is a one-line mechanism repair so a paper
> anchor at 0.97 survives hearing its own story echoed back; found by the fix seat
> while reading, adjudicated on citations, reversible in one line. Previous update:
> 2026-08-30 — **PLAN 11 COMPLETE AND PUSHED** (`0452959..2436a36`,
> 19 commits; suite 1608/1608 in 111 files; final review verdict: Approved, zero
> findings, the schedule fence's static class closed at its declared boundary;
> soak/MC deterministic pins byte-identical throughout). New for your review:
> A6 flipped to BIND (below) and P11-19 (fence inversion, section C). Plan 9 is
> next under your standing grant.

Legend per entry: **Ruling** (what shipped) · **Why** · **To reverse** (the
concrete cost if you rule differently).

---

## A. Design rulings made THIS RUN under standing autonomy (highest review value)

### A1 · P11-18 — Eight verbs execute against the frozen offered frame ⭐ biggest call
- **Ruling:** `tell/ask/sell/debrief/courier/host/meet/directive` all validate
  against the frozen `PreparedTick` frame (as `recruit` already does), not live
  same-tick state.
- **Why:** the spec's own offered-state law (design-spec.md Part 5: the action
  executes against the state in which it was offered); the whole-branch
  reviewer's analysis recommended it; the alternative (make recruit live too)
  would reverse a defect Task 11 already fixed.
- **Consequence you should know:** synthetic/legacy logs with multiple actions
  in one tick now validate against frozen state. No shipped saves exist, so no
  player impact.
- **To reverse:** one line per verb (unbind the frame) — cheap, per-verb
  independently.

### A2 · P11-17 — Routed-directive fence fixed to "the person in your hand"
- **Ruling:** the session fence for a relayed directive checks the FIRST RELAY
  (who you physically hand the brief to), not the final recipient. Was a real
  production bug (a dead field behind a type cast); the crown e2e inherited it.
- **Why:** the engine and the composer UI already both used
  `outboundVia[0] ?? recipient`; the session was the only disagreeing copy.
  No coherent alternative — fencing on someone not in the room contradicts
  physical handoff.
- **To reverse:** one line, but I'd argue against; flag if you see a design I
  don't.

### A3 · PROVINGFORD fixture permitted for the crown e2e
- **Ruling:** E2E A runs on a hand-authored test world (real production APIs,
  no force hooks) instead of the brief's named Testford/Watchford helpers.
- **Why:** rebuilding a working, reviewer-verified scenario on different
  fixtures = churn with zero proof value; the operative discipline pins all
  hold.
- **To reverse:** re-stage E2E A on Watchford (est. a focused seat-day; no
  production impact).

### A4 · Mandate-line boundaries reaffirmed for the two rebuilt fences
- **Ruling:** the speech-only receipt scan and determinism fence are being
  rebuilt as AST/binding-aware classifiers (fix wave 2), but the cross-module
  data-flow residual class stays ACCEPTED (same boundary you'll ratify in
  P11-13/P11-16) rather than building a whole-program analyzer into tests.
- **To reverse:** commission the data-flow analyzer as a Plan-10+ hardening
  task (reviewer's directions are preserved verbatim in the review reports).

### A6 · assignInformant BINDS to the frozen frame — 2026-08-26 frameless default REVERSED on citation (2026-08-29)
- **Ruling (current):** `assignInformant` now binds to the frozen offered frame
  like the eight P11-18 verbs and recruit (shipped in fix wave 3, `47cfe56`;
  its nested `applyDirectiveWithCause` is frame-threaded too, with a divergence
  pin in `tests/sim/offered-state.test.ts`).
- **Why the flip:** the re-reviewing Sol seat showed this was never a free
  design fork — the certified constraints already decide it (lines 64–67: the
  token freezes local venue/circle and only an action composed from that token
  executes there; lines 68–71: `assignInformant` begins in a witnessed local
  handoff). P11-18's eight-name list captured the prior reviewer's findings,
  not an exception for a ninth local verb. The 2026-08-26 frameless default
  was made on enumeration-conservatism; the citation outranks it.
- **History preserved:** the original frameless ruling + its reasoning live in
  the ledger (resume-#10 session end, deviation #2) if you want to compare.
- **To reverse (back to frameless):** drop the `offered` argument at the
  `campaign.ts` call + the two threadings in `applyAssignInformant`, retire the
  one pin — still small, but the constraints text above would then need your
  amendment too, since the shipped default now matches its letter.

### A7 · Plan 9 ships engine-first; forge/plant/show composers land in Plan 10 (2026-08-30)
- **Ruling:** Plan 9's new player verbs (forge, plant, show — later scry, séance)
  are implemented and fully proven at the engine/session layer; the player-facing
  UI composers for them are scheduled into Plan 10's ship-shape scope rather
  than invented mid-Plan-9.
- **Why:** the plan was authored 2026-07-05, before the offer-gated composer
  architecture existed (Task 4's request button, Task 13's directive desk) — no
  Plan-9 task authors composer UI for these verbs, so adding it now would be
  undispatched scope. The Task-8 e2es drive the real session path, so the
  mechanics are proven player-reachable in code before any UI lands.
- **To reverse:** promote a composer task into Plan 9 at any point — purely
  additive; nothing in the engine work forecloses any composer design.

### P9-1 · Every viewing of a document mints a fresh claim family (2026-08-30)
- **Ruling:** Plan 9 Task 1 shipped the plan's literal wording — show, hand-over,
  pickup, and re-show each ingest the document's fixed text as a NEW claim
  family at 0.97 for that viewer.
- **Consequence you should know:** two readers of the same letter hold beliefs
  in different families, so they never corroborate each other's copy through
  `apparentSources`; "re-anchors the new viewer" means "anchors again," not
  "overwrites an existing belief." The paper's power is its 0.97 weight, not
  network corroboration.
- **Why:** the plan pins `Artifact` at six fields and says "fresh-family claim"
  verbatim; the one-family-per-document alternative requires a seventh field
  (a stored family handle) plus a re-anchor branch in the ingestion contract —
  a plan amendment, not an interpretation.
- **To reverse:** contained but not trivial — add the family handle to
  `Artifact`, a re-anchor branch to `ingestEvidence`, and make `documentBelief`
  an exact lookup (the implementer's report §6.1 sizes it). Reviewer weighed in
  before this went to you.

### P9-2 · "Only while held" governs the minting of 0.97 anchors, not their lifetime (2026-08-30)
- **Ruling:** the plan's global clause ("an artifact IN HAND anchors at 0.97 …
  only while the holder physically holds it") is read as constraining WHICH
  events may mint a 0.97 belief — physical paper-present viewings (show,
  hand-over, pickup, re-show) — not as demoting past anchors when the paper
  moves on. A shown belief persists at 0.97 after the page leaves the room.
- **Why:** the plan contradicts itself (its exact SHOW physics anchors a
  NON-holder at 0.97 while "the artifact stays with the shower"), and its own
  Task-8 victory condition ("council member anchored ≥ 0.97" reached through
  circulation) is unsatisfiable under a demote-on-release reading. The review
  caught that the implementation had taken this reading silently; it now
  carries the adjudication and a positive pin (planting the page elsewhere
  does not demote a shown belief).
- **To reverse:** a demotion mechanic ("memories fade without the proof in
  hand") is a coherent richer design — it needs a decay rule the plan doesn't
  provide, so it would be a Plan-10+ design pass, not a flip.

### P9-3 · Hearsay corroboration never lowers a belief — a paper anchor survives its own echo (2026-09-03)
- **Ruling:** the corroboration step in ordinary rumor ingestion (a belief you already
  hold gains a NEW apparent source → credence rises by up to 0.15, capped at the 0.95
  hearsay ceiling) is now monotone: it never moves a credence DOWN. Before this, a 0.97
  paper anchor hearing its own story come back from a second mouth was clamped to 0.95 —
  the letter demoted by gossip about the letter. Reachable in ordinary play: the viewer
  retells the page, a hearer retells it back, and any unnamed or misattributed telling
  counts as a new source.
- **Why:** the formula predates Plan 9 and was monotone by accident — every credence in
  the game was ≤ 0.95 until `ARTIFACT_CREDENCE` arrived, so `min(0.95, c + 0.15)` could
  never lower anything. The plan's evidence-hierarchy law says the ceiling caps HEARSAY
  and that paper outranks every mouth; P9-2 says nothing demotes; Task 8's victory
  condition (council member anchored ≥ 0.97) would otherwise be flippable by an echo on
  the check tick. Found by the fix seat while reading, flagged rather than fixed silently;
  the controller traced reachability in source before ruling.
- **To reverse:** one line (drop the outer `Math.max`) plus one pin. The richer
  alternative ("gossip muddies proof") is a decay design for Plan 10+, the same door
  P9-2's reversal opens.
- **Side note logged, not a ruling:** when a convinced holder's best-trusted edge is YOU,
  the re-show now reaches you as an intel row of the existing `hint` kind (the paper came
  back to its forger, and you learn it circulated). Whether that event earns its own intel
  kind and panel is Plan 10 surface work (carry (w)).

### P9-4 · The evidence-hierarchy scan is closed at a declared boundary; opaque data-flow is the accepted residual (2026-09-04)
- **Ruling:** the structural test that enforces "0.97 is the only number above the
  0.95 hearsay ceiling" is being rebuilt (Task 1 fix wave 2) the same way Plan 11's
  fences were: a credence write is recognized by its property NAME in every write
  position (every assignment operator by the compiler's own list, increments,
  destructuring, shorthand and computed keys), API-mediated writes (`Object.assign`,
  `defineProperty`, `Reflect.set`) are caught by asking the TypeScript checker whether
  the target carries a `credence`, values are proven bounded or exactly-the-anchor
  compositionally and everything else is reported, and the anchor's single minting
  site and its four callers are proven by binding rather than by spelling. What
  remains outside — a value reaching a credence through a holder the checker cannot
  connect to a belief (an `any`-typed alias) — is accepted as the residual, the same
  class every other shipped scan carries (P11-13, P11-16, P11-19).
- **Why:** two review rounds on this scanner produced the regenerating pattern the
  durable heuristics predict (syntax forms first, then more syntax forms, then
  semantics). The convergent move is the inversion plus a declared boundary; chasing
  data-flow forms never terminates. Backstops for the residual: the strict typecheck,
  the behavioural campaign pin (every belief above the ceiling is exactly 0.97 and
  explains itself through an artifact record), live≡replay, and zero such forms in
  production today.
- **To reverse:** widen the boundary later (a type-flow pass is a real option) — purely
  additive; or accept a narrower scan — delete tests, nothing in production moves.
- **Also in this wave, not rulings:** venue ids and NPC ids become disjoint by
  construction (validator + world builder both refuse a collision); the reviewer showed
  a collision would silently change beliefs, so the assumption is now enforced rather
  than assumed. Plan-10 carry (x) is closed by it.

### P9-5 · Forensics (Task 2) v1 scope repair — what the enemy can learn about a forged letter, and how (2026-09-04)
The plan's Task 2 was written before Plan 11 rebuilt the enemy's senses. A read-only
premise check found four of its load-bearing sentences false against today's code, so
the task was re-shaped on these defaults (each reversible on its own):
- **(a) The letter is named in speech, never seen by the digest.** The enemy's nightly
  digest is a pure fold over what its people HEARD; it cannot read artifact records.
  So a questioned holder's answer now carries one extra spoken fact — "this came to me
  as paper" — derived from the evidence-hierarchy law itself (only a paper-present
  viewing can put a belief above the hearsay ceiling). That marker rides the ordinary
  answer utterance into enemy evidence, lazily (absent unless true). Reverse: drop the
  marker and the feature can never fire; nothing else changes.
- **(b) The quill points at the hand that gave THEM the page — including yours.** The
  subject is whoever the holder names as the hand (already what a compelled answer
  discloses, and already trait-mutated, so the enemy can be lied to). The plan said
  "never the player directly" because it believed a hand-over in guard sight already
  triggered caught-in-the-act; it does not — artifact acts emit nothing a guard can
  capture — so that rule would make handing pages out yourself perfectly safe. Default:
  if the holder says you handed it over, the sketch gains a feature on you (score
  rises; unmasking stays carrier-profile-only, unchanged). Reverse: one filter line,
  and direct hand-overs become untraceable until Plan 10+ gives guards eyes for paper.
- **(c) One hop per interrogation, and planted pages stay anonymous.** A holder names
  only who gave it to them; the enemy walks a chain by questioning the next name
  (emergent, not automatic — the contact-tracing cascade stays a Plan 10+ item). A
  venue-pickup finder is their own source and names nobody: leaving a page on a table
  is the slow, anonymous path; handing it over is the fast, traceable one. That trade
  is now a real player choice rather than an accident.
- **(d) "Watched holder" clause deferred; dedupe per person, not per artifact.** Watching
  a holder pick up or show a page needs a new observation kind, a new evidence arm,
  and a wider fair-cop audit — physics, not a heuristic — so it is out of v1 (Plan 10+
  docket). "Once per artifact" has no handle to key on (every viewing is its own
  story to the enemy); the feature dedupes the way carrier-profile does, per (kind,
  subject). Fair-cop references point at the compelled-answer evidence rows, which the
  existing audit already resolves — the audit stays untouched, as the plan demanded.
- **Why defaults rather than a stop:** every one is additive and one-line reversible,
  none touches a certified Plan 11 law (speech-only, no-omniscience and the five-phase
  order are all preserved by construction), and Task 8's forger's-arc e2e is the
  reachability test for the whole chain — if the enemy never actually interrogates a
  holder in real play, that e2e STOPs and the question comes back to you.

### A5 · Whole-branch carry triage adopted wholesale
- **Ruling:** the final reviewer's fix-now/carry table applied as written —
  fix-now: late-watch cancellation honesty, eight-verb binding, both fence
  rebuilds, first-hop helper hoist, typed participant switch, compat
  schedule-write scan; carry→Plan 10: suite wall-time, runaround cost shape,
  directiveIssues parity test, category-list structural bind, comment-only
  parse false-red, usability watches, build-size budget.
- **To reverse:** promote/demote any row; carries land in Plan 10's scope
  gates so nothing is lost.

---

## B. The five standing design questions — defaults taken, all keep-as-implemented

### B1 · Cooldown immunity (from T12)
- **Question:** a runaround-burnt subject is out of LEAD selection for 2 days —
  should they also be immune to fresh-evidence interrogation?
- **Default: NO — cooldown stays lead-selection-only.** Fresh evidence is new
  information; immunizing interrogation would let you BUY 2 days of immunity
  with a cheap decoy (an anti-gimmick violation — probing must stay priced).
- **To reverse:** one-line additive filter.

### B2 · Oldest-lead-wins (from T12)
- **Question:** a fresh decoy loses lead-binding to any older same-district
  feature — the red-herring aiming lever only works in unprofiled districts.
- **Default: KEEP.** It rewards reading the enemy's file before aiming, and
  it's deterministic and explainable in hindsight. Real constraint on the
  marquee mechanic — flag if it plays badly.
- **To reverse:** change the (day,id) sort key — one line, but re-pins
  measured probes.

### B3 · Hosting cap 6 vs CIRCLE_SIZE 4 (from T9)
- **Question:** nominal invite cap is 6 but physics admits 3 invitees.
- **Default: KEEP BOTH.** The circle law is the honest physical bound ("the
  room is only so big"); tests pin both edges. UI legibility of the effective
  bound is tracked as a Plan-10 usability watch.
- **To reverse:** lower cap to 4 (cosmetic, cheap) or raise CIRCLE_SIZE
  (expensive — moves world physics everywhere).

### B4 · Lead-feature first-match selection (from T9)
- **Default: KEEP** the deterministic first-matching-feature rule (the plan
  named no selector). No observed misbehavior.
- **To reverse:** swap the selector (newest / highest-severity) — one line.

### B5 · Cold-money-stranger (from T11)
- **Question:** under the pinned formula, a cold MONEY offer to a stranger can
  only hesitate-then-refuse.
- **Default: KEEP — it's the intended game.** It prices relationships into
  tradecraft ("the asset who can't be bought is someone else's" energy);
  consistent with probing-is-priced.
- **To reverse:** formula-constant tweak; Plan 10's balance battery will give
  you real data to decide against.

---

## C. Pre-existing PROVISIONAL queue (P11-1..16, from prior sessions — unchanged, still yours)

One-liners; full evidence in the ledger's provisional block (`progress.md`,
Plan 11 section).

- **P11-19** (NEW 2026-08-30) — the compat schedule-write fence structurally
  INVERTED after three review rounds each found a new static escape in its
  per-node-kind arms: every ledger reference must now justify itself
  (unrecognized-by-default), name-as-data classified by enclosing operation
  with no operation list, binding silences justified by the scanner's own
  resolver. Final reviewer verdict: static class CLOSED at the declared
  boundary; dynamic-name/opaque-value-flow residuals join the P11-13/16
  mandate line. Test-only — any posture change is cheap to reverse.
- **P11-16** — T13's hidden-name scans rebuilt as TypeScript-AST classifiers;
  data-flow residual accepted at the mandate line.
- **P11-15** — leadless enemy orders omit optional keys (serialization law
  over the plan's "keep null" wording).
- **P11-14** — unreachable cancel-receipt correlation repaired via additive
  fallback (plan-pinned key kept).
- **P11-13** — three semantic-class scan counterexamples accepted as
  residuals (recruitment scans are fail-closed AST otherwise).
- **P11-12** — late handler delivery turns an earlier acceptance (the later
  clause wins; matches your subversion design).
- **P11-11** — coronation MC re-baseline 9/9→7/2 at day-12 horizon ("the
  enemy's questions were doing the player's work").
- **P11-10 / P11-7** — sketch-feature re-baselines (19.3→12.7→6.0): the
  designed cost of physical routing; Plan 10 measures compensation.
- **P11-9** — nightly scrutiny prune call site moved to the transaction
  (plan's literal placement predated the restructure).
- **P11-8** — T10's queue/dedupe/cursor substrate recognized as already
  landed by T6.
- **P11-6 / P11-4** — two test-vehicle amendments (structurally unreachable
  probes corrected to reachable forms).
- **P11-5 / P11-2** — two plan-mandated hot-loop full-world clones removed
  (the clone-defect class).
- **P11-3** — step()-only trusted-frame easement.
- **P11-1** — input fence upgraded regex→AST (the plan's regex false-greened
  ASI code).

## D. Process rulings on the record (yours, already ratified by you)

- **Chunked delivery protocol** (your 2026-08-23 ruling): commit-sized chunks
  + per-task progress file; standing for all remaining execution. Proved its
  worth immediately (caught a 6-day green-but-broken WIP state via per-chunk
  typecheck).
- **Standing autonomy scope:** design-level forks get controller defaults,
  logged here + ledger, reversibility-biased; multi-plan session authorized
  through "a version of the game"; Fable orchestrates only — Opus implements,
  Sol reviews.
- **This docket is the review surface** (your ruling, 2026-08-23: "keep it
  updated so we can review later") — every new decision point is appended at
  the moment it's ruled, never reconstructed after the fact.

## E. Coming up (will be appended as they arise)

- Plan 9 dispatch-time premise re-verifications (plan predates Plan 11).
- **Review-pack format (your ruling, 2026-09-04):** when all the review is in for the
  entire game, this docket and its companion review surfaces get converted from
  markdown into a well-formatted HTML document for your actual read-through. Not
  before then — markdown stays the working format while controllers append to it.
- Plan 10: balance-band misses beyond 4 lever passes (plan says STOP-to-Ellie →
  will become logged defaults + tables for your review); the **naming gate**
  ("Hearsay" / "Vesperin" — plan marks it HUMAN; default will be: ship
  placeholders from the one constants file, your rename is a one-line change);
  Electron/steamworks devDep installs (plan-authorized; permission prompts
  will surface them).
