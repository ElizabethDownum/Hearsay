# Current review — 5 September 2026

Ellie's current instructions: audit the existing plan before continuing implementation; keep every change inside the Hearsay project folder; take the recommended behavior and hold questions/issues in this HTML document for later review.

Status at session start: Plan 9 Task 1, fix wave two. HEAD 49cc3e7 contains the first five fixes and G1. Two unfinished G2 test edits were preserved in a project-local recovery snapshot. The inherited working tree passes 1,710 tests in 113 files, lint, both typechecks and the production build. The JavaScript bundle remains 489.63 kB (145.02 kB gzip). Remaining fixes and independent review are in progress. This is a recovery baseline, not Task 1 completion.

Restart checkpoint: G2–G4 are committed through caa5a38. The controller's full gate passes 1,713 tests in 113 files, lint, both typechecks and the production build (489.86 kB JavaScript, 145.07 kB gzip). All 10 simulation report blocks, comprising 230 deterministic lines, match the prior baseline. Independent review returned Needs-fixes: one Critical and one Important, recorded as R12/R13 below. Task 1 remains open; Task 2 has not started. Corrected scrying and séance drafts are saved for continuation. Work is stopping for Ellie's requested computer restart; see docs/handoff.md.

Resumed after restart: repository/index were clean at 0241fc8. The fresh boot gate again passes 1,713 tests, lint, both typechecks and build. A bounded R12/R13 correction is being authored, while the scrying draft is being completed in a separate Codex thread. Claude's dispatch pause continues until the recorded expiry.

## Current decisions and issues

### R1 — Recover the interrupted G2 work in place
- **Recommended action:** keep correct inherited work, complete or repair only what the existing G2 brief requires, then finish G3 and G4 and obtain independent review.
- **Why:** Git and the per-task progress file show F1–F5 and G1 already committed; repeating them would erase useful progress. Ellie confirmed the old session has stopped editing even though the work is incomplete.
- **Protection:** byte copies, SHA-256 hashes and the original diff are preserved in C:\Users\eliza\Desktop\ClaudeFiles\hearsay\.superpowers\sdd\resume-2026-09-05-g2-snapshot.
- **To reverse:** compare any recovery edit against the stored snapshot and fix forward; preserve the original files as evidence.
- **Status:** recovery commits a458cd2, 55a45ae and caa5a38 are complete. Review found two further defects inside the declared mandate, R12/R13; completion is withheld.

### R2 — Keep the working plan and review record inside Hearsay
- **Ruling:** all new plans, amendments, review records and snapshots live inside C:\Users\eliza\Desktop\ClaudeFiles\hearsay. The external plan and earlier docket are read-only historical sources.
- **Why:** Ellie's explicit project-boundary instruction on 5 September 2026.
- **Review format:** this HTML document is the reading surface; the archived source is retained so no earlier decision is lost. Historical phrases such as 'shipped' are statements from their original sessions, not current verification.
- **Status:** applied; no shared-memory writes.

### R3 — Use available Codex seats for recovery and independent review
- **Recommended action:** use the native frontier implementation and review roles for the compiler-analysis recovery, in separate threads; use the premise verifier for the recovery audit and a mechanical worker for this HTML conversion.
- **Why:** this session exposes those enforceable roles directly. The inherited Opus implementation preference is preserved as history; this dispatch uses the available Codex implementation lane and discloses that both implementation and review use the same provider.
- **To reverse:** re-seat a future bounded task on an available Opus worker, retaining the same file brief and independent review requirement.
- **Status:** recovery implementer dispatched after the independent premise check.
- **Temporary dispatch constraint:** Ellie requested no Claude dispatches for 2 hours 15 minutes starting now on 5 September. Conservative expiry: 12:24:11 UTC / 07:24:11 CDT. Current workers are Codex agents and continue normally.

### R4 — Carry the document marker through every observation boundary
- **Issue:** the staged Task 2 brief adds a marker to an answer, but its perception-file license permits only the answer type. The observation projector reconstructs a separate object and would drop the marker.
- **Recommended action:** license and implement the optional marker on both answer and observation types, conditionally project it, and preserve it through raw reports, trait-projected reports and received evidence. Ordinary speech keeps no marker key.
- **Why:** C:\Users\eliza\Desktop\ClaudeFiles\hearsay\src\sim\perception.ts lines 5–14, 38–45 and 69–75; the independent audit confirmed the gap. The existing P9-5 decision already requires this information to travel with what was actually said.
- **To reverse:** remove the paper-forensics feature as a whole; omitting only an intermediate projection would silently break it.
- **Status:** brief correction adopted; implementation follows Task 1's completed review.

### R5 — Residue must be found and reported
- **Issue:** the original scrying task inserts enemy evidence even when nobody witnessed the residue. Its proposed district-activity rule only processes suspicious spoken stories and cannot consume the suggested residue row.
- **Recommended action:** a valid paid scry leaves a persistent physical trace at the target venue when the window begins. An actual observer must encounter it; a remote observer must then report it through the physical network. The enemy learns only the observed venue and trace, never the player's identity. Use a dedicated evidence rule with resolvable provenance.
- **Why:** the Plan 11 remote-observation and spoken-content laws; enemy/digest.ts's existing district rule requires story families and speakers.
- **To reverse:** change the trace's expiry/discovery rules in a later tuning pass, with measured tests. Invalid actions remain mutation-free; valid but uninformative scrying still leaves residue.
- **Status:** recommended design selected for Task 3 authoring; no magic code shipped yet.
- **Authored defaults adopted:** keep each physical trace for the campaign; track discovery/reporting separately. A failed or omitted report can retry only after that observer encounters the trace again. One residue feature per venue prevents repeated casts from multiplying the same location lead. Any locally present actor can see the trace; existing principal/observer rosters determine who records or reports it.

### R6 — Give magic an explicit observation source
- **Issue:** impersonating an NPC named 'scrying' would either see no conversation or require fabricated circle membership. Plain source strings also make current UI consumers mistake a spell for an informant.
- **Recommended action:** add an explicit live venue sensor over the same tick events used by ordinary perception. Model magic provenance distinctly from informant identities, and update grouping, badges and corroboration consumers together. Magic does not count as a separate informant for channel corroboration.
- **Why:** perception.ts's observer/circle checks, intel/entry.ts's string source, and intel/web.ts's carrier grouping are different responsibilities and must stay coherent.
- **To reverse:** change spell presentation or the explicit corroboration rule without changing ordinary NPC observation.
- **Status:** recommended direction selected; exact interfaces require Task 3 authoring.
- **Authored defaults adopted:** retain the original three sensor channels (speech, questions, presence). Use an optional typed magic provenance field, so an NPC named 'scrying' remains an NPC. Ordinary scene presence gets a separate intel kind because existing presence rows mean watch activity. A spell and a human seeing the same telling count once for deductions; magic adds no independent informant corroboration.

### R7 — The departed is historical data, not a living NPC
- **Issue:** adding a dead witness to a secret's living witness list fails validation and crashes world attachment; a generation-only field also disappears before a séance action can read it.
- **Recommended action:** generate a separate historical witness record, copy it into optional runtime state, and retain the living-only secret witness invariant. Select one real subject relationship as the grounded clue at generation time. Do not remove anyone from the generated living cast. A séance validates its offered local venue and night window.
- **Why:** world/validate.ts's secret-witness checks and world/attach.ts's belief seeding both require actual living NPCs.
- **To reverse:** change how historical witnesses are selected without deleting live graph nodes or altering existing secret attachment.
- **Status:** recommended design selected for Task 4 authoring.
- **Further source finding:** the original claim that guards already report a nighttime avatar sighting is false. Enemy capture excludes presence, and received presence has no dedicated enemy evidence arm. The draft will define a narrow chapel-night observation and carry the actual sighting in a physically spoken report. Eligibility must depend on visible location/time, not hidden spell state. The direct spymaster case and the sighting's actual gameplay consequence still need a concrete design; no implementation is certified by this note.
- **Selected consequence for the draft:** direct local sighting or actual received speech supplies a fair-cop evidence reference. A dedicated night-visit feature, deduped by kind/subject, adds one ordinary exposure point without automatic carrier-profile identification. Keep this in the existing evidence substrate rather than a redundant nightVisits ledger. Exact code and tests still require authoring/review.

### R8 — The debrief must distinguish what happened from when it became known
- **Issue:** delivered intel/evidence rows currently retain the observation tick. A naive 'through day N' fold would backdate knowledge to before a report arrived. Artifact rows also lack an explicit minted-claim reference, and claim ancestry alone omits the turncoat's altered report copy.
- **Recommended action:** derive receipt timing and final report divergence from the existing final field-report speech in the chronicle. Add only stable per-item root associations for intermediate report mutations and explicit artifact-to-minted-claim links. Build typed story, artifact, network/report and magic threads under one terminal-only debrief view.
- **Why:** the follow-up audit corrected its initial overstatement: final speech rows already retain receipt tick, message identity and the full reported copy. The remaining gaps are identity across changing or omitted report items and artifact claims, not missing receipt history. The design requires every operation and mutation to be explainable without guessing from identical content.
- **To reverse:** simplify the displayed thread types while retaining the causal record. Do not silently shrink 'every operation' to ordinary gossip.
- **Status:** focused follow-up complete; narrow metadata repair selected for Task 5 authoring. No redundant receivedAt fields will be added merely because destination logs use observation time.

### R9 — Match the counter-sketch to actual attention and outcomes
- **Issue:** player signal keys and enemy feature ids are unrelated namespaces. Comparing them directly cannot say whether a fear was real.
- **Recommended action:** define matching per signal kind. Compare questioning/watch signals to actual issued or performed attention; compare compelled-answer signals to their evidence and resulting features. Distinguish 'attention was real' from 'a feature landed', and deduplicate repeated observations of one action.
- **Why:** intel/countersketch.ts derives semantic keys, while enemy features receive opaque sfN identifiers. A watch can be real without creating a feature.
- **To reverse:** revise the matching/display rules with explicit examples and tests; retained source observations remain unchanged.
- **Status:** recommended direction selected for the debrief model brief.

### R10 — Build prose before the debrief panels
- **Issue:** Task 6 consumes Task 7's render function before it exists. It also asks to add a debrief import ban already covered by the broader panel fence.
- **Recommended action:** split out the prose foundation before the UI. Keep the existing fence and prove it rejects a debrief import. Compute debrief data at one terminal-only composition point, with a behavior test proving no fold runs during a live campaign.
- **Why:** the original dependency order is inconsistent; eslint.config.js already bans panel imports from all sim modules.
- **To reverse:** task numbering can change; the actual build dependencies and hidden-information boundary still need to hold.
- **Status:** execution order amended in the project-local plan.

### R11 — Prove the forger's arc against the real quorum
- **Issue:** the original test expects one anchored council member to win, while the Coronation requires two. The old canary test demonstrates report doctoring but never reaches an ending.
- **Recommended action:** stage a legal route reaching two distinct council members, using one council recipient who can re-show to another or another explicitly logged paper action. Prove both council turns before victory. Add a separate terminal scenario demonstrating the doctored report in the debrief. Ban only player tells in guard earshot; NPC retellings remain ordinary physics.
- **Why:** content/scenarios/coronation.ts sets quorum 2; the existing canary test calls capture/report helpers directly rather than completing a campaign.
- **To reverse:** choose a different legal test route. Do not lower quorum, widen enemy gates, or fabricate evidence to satisfy the test.
- **Status:** acceptance amendment adopted for Task 8; reachability remains a measured hypothesis.

### R12 — A belief read can carry the paper anchor
- **Issue:** the independent recovery review found that the scanner treats every .credence read as ceiling-bounded. A visible assignment from one belief to another could therefore copy 0.97 outside the authorized paper-viewing sink without being reported.
- **Recommended action:** correct the value proof within the existing static boundary. Distinguish a possibly anchored read from a ceiling-bounded value, and allow a same-belief monotone update only with a target-aware proof. Add firing tests for cross-belief transfer and preserve the existing no-demotion behavior.
- **Why:** task-1-fix2-review-2026-09-05-report.md, Critical finding at tests/lint/evidence-hierarchy-law.test.ts:638–655. Both operands are checker-visible; this is not the accepted opaque-holder limitation.
- **Status:** controller accepts the finding. Save a bounded correction for the next session; Task 1 cannot close until independently verified.

### R13 — Avatar enrollment must preserve the namespace invariant
- **Issue:** buildWorld and the generator validator reject ordinary venue/NPC collisions, but enrollPlayer can add an avatar with a venue's id afterward. The new guards also use a truthiness check that misses an empty shared id. The artifact viewing latch relies on the disjoint namespaces.
- **Recommended action:** check venue ids during enrollment before any mutation, use an explicit undefined comparison for collision detection, and test default/custom avatar collisions plus the empty-id case. Verify repeated avatar viewing remains correctly recognized.
- **Why:** independent review, Important finding at src/sim/world.ts:84–98 and the two new sharedId guards.
- **Status:** controller accepts the finding inside the existing invariant; correction resumes after restart.

### R14 — Record an existing conviction without creating a belief
- **Issue:** correcting the false bounded-read assumption also flags councilTurns, which copies a belief's credence into an outcome record. That record can legitimately contain 0.97 and does not teach anyone a new belief.
- **Recommended action:** give this copy a separate recorded-value verdict. Accept only a direct governed credence read in an object property context bound by the checker to the existing TurnEvidence declaration. Keep the site visible to the audit; anonymous objects, belief destinations, arithmetic, new literals and casts do not gain this exception. A later copy from outcome data into a belief must still fail.
- **Why:** src/sim/scenario/referee.ts:52 and scenario/types.ts:23. Renaming the recorded field would unnecessarily change existing saved output. A generic exemption for metadata would weaken the declared guard.
- **Related proof correction:** direct forwarding of an already-audited credence parameter needs a forwarded verdict, not a bounded one, because it can carry the paper anchor. Neither forwarded nor recorded values may pretend to cap a Math.min. Numeric bound declarations must be resolved by binding so a shadowed name cannot fake a ceiling.
- **Status:** narrow controller amendment selected for the correction plan; exact code and firing tests are being authored. New metadata sinks require separate review.

## Verification note

The reviewer also found one unused variable in the controller's ignored report-comparison script. It was removed and the literal npm run lint command passed again before handoff. The comparator checks complete report blocks and has changed, added and missing-output controls. Some historical worker RED stdout buffers were unavailable; the report discloses this, while current controller/reviewer full-suite output is retained. No missing evidence was reconstructed or invented.
