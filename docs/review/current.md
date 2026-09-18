# Current review — 17 September 2026

[R18 code approval](2026-09-17-r18-code-approval.md). [Task6/7B + R32–R35 code approval](2026-09-17-task-6-7b-code-approval.md). [Task5B code approval](2026-09-17-task-5b-code-approval.md). [UI contrast correction approval](2026-09-17-ui-contrast-correction-approval.md). [Task5A2 code approval](2026-09-13-outcome-history-code-approval.md).

**17 September, night.** R18 is installed at `01c043c` and independently **Approved**
at both stages: proposal 0 Critical / 0 Important / 4 Minor, installed code 0 / 0 / 1. The
change is one pure helper and one added conjunct in `src/sim/directives/execution.ts` plus a
four-case identity test and a real-path R17 precondition; RED/GREEN lineage reproduced by
both reviewers. Root and reviewer each pass 2,480 tests/148 files and all six gates; the
comparison equals cd0d441. Minors (R17 tick shift, same-start-day value identity shown
planner-unreachable, frozen `changedAt`, validation-only config kept out, raw-hash capture
legibility) are recorded in the approval, none charged. Browser gate, Task8 and the final
whole-branch review follow.

**17 September, later.** The 18 Task6/7B UI targets are installed in three commits
(d20eba9, 59cd261, d68efad) and, with R32, R33, R34 and R35, independently **Approved,
0 Critical / 0 Important / 4 Minor** at `cd0d441`. Root and reviewer each pass 2,476
tests/147 files and all six gates; the certified comparison equals approved 5B. The four
Minors are recorded in the approval (union-level R34 exemption, an ID-fallback coverage gap,
an unmemoized terminal fold, and a Plan10 asset-slot caveat); none is charged. R18 proposal
review is in progress; browser gate, Task8 and the final whole-branch review follow.

**17 September.** The complete Task5B debrief model is installed in five serial
commits through `875daba` (25 new files, no existing file changed) and independently
**Approved, 0 Critical / 0 Important / 1 Minor**. Root and reviewer each pass 2,399
tests/143 files and all six gates; the 10-block/230-line comparison equals approved
5A2 with four controls. The Minor is a witnessed presence receipt that can backdate an
ordinary presence row (terminal reader only, no engine route shown); it is carried as
bounded correction R32. The 654-case UI contrast correction is independently
**Approved, 0/0/4 Minor**: the reviewed Important contrast defect closes at 14.35:1
light / 12.27:1 dark inside the desk, markup byte-identical, all 649 inherited cases
preserved. The live evidence board's own changed-value cell keeps 2.46:1 light and is
carried as a post-plan accessibility item. Installation of the 18 UI targets proceeds
in three units, then R18, R32, Task8 and the final review. Codex reviews are reseated
on native Claude workers until the provider quota resets on 20 September.

**Implementation resumed.** Ellie clarified that the 6 September stop applied only
to that session. Continue the plan and save non-blocking judgments/issues here for
later review. Task 4C2 is committed at `152f2a0`. All six gates pass, including
1,950 tests/125 files; all 10 report blocks/230 deterministic lines match the
approved baseline with four comparator controls. Independent accumulated code
review is **Approved with zero findings**, with the same full gates independently
passing. [Task4 approval](review/2026-09-13-task-4-code-approval.md). Task4 is closed;
complete prose 7A1/7A2 is committed through `3020688` and independently Approved
with zero findings. Worker, controller and reviewer each pass 2,028 tests/128 files,
lint, both compilers and build. Task5A1 recording is committed at252a481, with
worker/controller2,045 tests/129 files and all six gates passing, unchanged complete
simulation reports and nine-world metadata-only compatibility. Independent code
review is Approved with zero findings and the same gates independently passing.
R16 guard self-presence is committed at `36d090c`; worker/controller2,055 tests/130
files and all six gates pass with unchanged simulation reports. Independent R16
code review is Approved with zero findings and the same gates independently passing.
[R16 approval](2026-09-13-r16-code-approval.md). [Recording approval](2026-09-13-recording-code-approval.md).
R17 watch execution stage is committed at `bc409d3` and independently Approved with
zero findings. Worker/controller/reviewer each pass2,059 tests/131 files and all
six gates with unchanged complete simulation reports. Root verified77 review
entries. [R17 approval](2026-09-13-r17-code-approval.md).
The complete321-case debrief proposal is independently Approved with zero findings.
R30's mixed-time receipt correction is closed and R31 ending validation remains
closed. Root verified452 review entries, including all356 archived files. The
approved replacement now supplies final UI proposal validation and later actual
model installation. [Approval](2026-09-13-receipt-partition-proposal-approval.md).
The final Task6/7B UI proposal passes649 cases (321 model,41 new UI and287 existing
app/registry cases), both compilers,46-body lint and its rendered three-surface
lesson. Independent UI review found one Important contrast defect; a separate
correction now passes654 cases (all649 retained plusfive actual-style checks) and
is in independent re-review. All other requirements pass. Root verified1,004 author
and464 reviewer entries, including their365-file archives. No UI is installed and
interactive browser verification remains. [Review](2026-09-13-ui-proposal-review.md).
Task5A2 is committed at78ff1c2: worker/controller2,078 tests/132 files and all six
gates pass, with10 report blocks/230 lines/four controls equal. Twelve complete
world pairs differ only by the new outcomes; root verified221 predecessor files
and81 outcomes/54 packet links. Independent code review is Approved with zero findings; root verified104 review entries.
[Prose approval](2026-09-13-prose-code-approval.md). [Current handoff](handoff.md).

Ellie's current instructions: audit the existing plan before continuing implementation; keep every change inside the Hearsay project folder; take the recommended behavior and hold questions/issues in this HTML document for later review.

Earlier checkpoint: the received-report correction is committed at09e5458. All1,783
tests in114 files and all six implementation gates pass; the ten deterministic
simulation report blocks remain unchanged. Independent focused review Approved
with zero findings; controller gates also pass at that commit.
R15 passed within its declared boundary. Scrying is committed through 3D at
60506d9. Worker and controller now pass allsixfullgates:1868 tests/121files,
lint, both typechecks, build500.56kB/148.06gzip, soak and MC. All10blocks/230lines
match with four comparator controls. The earlier1870 estimate overcounted3B's
generated cases; no test disappeared. The build's over500kB warning is retained.
The shared auditor preserves the original assertions; existing panels distinguish
magic from human channels. [Validation report](review/2026-09-05-scrying-implementation-validation.md).
Independent accumulated [code review](review/2026-09-05-scrying-code-approval.md)
is Approved with zero findings, allsixgates/comparison independently passed.
Task 3 is closed. Task 4A is committed at 336b51b (59 focused tests and both typechecks pass independently). Task 4B is committed at aaaa57b (281 focused tests in five files and both typechecks pass independently; scoped lint/diff pass). Task 4C1/C2 and full controller verification are now complete as recorded above; independent Task4 code review is Approved with zero findings. The Task 3 approval covers engine/session and rendered
panel behavior; a purchase composer, manual layout audit and many-seed magic balance
remain outside this stage.
Séance's conditional plan amendment is saved. The corrected 78-case prose proposal
has fresh independent approval. Recording review's séance-family correction is
adopted under R23. Task5A2 private outcome recording had independent proposal
approval with zero findings: 239 affected cases and twelve complete-world pairs
pass ([review](review/2026-09-05-outcome-history-plan-approval.md)). The actual implementation is now committed and independently Approved, as
recorded above. The ninth partial debrief module, ordinary feature linkage, now has an independently approved147-case correction (96 earlier,48 feature and3 receipt-boundary cases), zerofindings. R25 retains the provisional local decision and native approval evidence. The following recovery
paragraphs are historical checkpoints.

Status at session start: Plan 9 Task 1, fix wave two. HEAD 49cc3e7 contains the first five fixes and G1. Two unfinished G2 test edits were preserved in a project-local recovery snapshot. The inherited working tree passes 1,710 tests in 113 files, lint, both typechecks and the production build. The JavaScript bundle remains 489.63 kB (145.02 kB gzip). Remaining fixes and independent review are in progress. This is a recovery baseline, not Task 1 completion.

Restart checkpoint: G2–G4 are committed through caa5a38. The controller's full gate passes 1,713 tests in 113 files, lint, both typechecks and the production build (489.86 kB JavaScript, 145.07 kB gzip). All 10 simulation report blocks, comprising 230 deterministic lines, match the prior baseline. Independent review returned Needs-fixes: one Critical and one Important, recorded as R12/R13 below. Task 1 remains open; Task 2 has not started. Corrected scrying and séance drafts were saved when work stopped for Ellie's requested computer restart; see docs/handoff.md.

Resumed after restart: H2's namespace fix is committed at 2fe440f and H1's scanner correction at a53551d. The controller's gate at that exact commit passes 1,737 tests in 113 files, lint, both typechecks, build, soak and MC. All 10 simulation blocks / 230 deterministic lines remain equal. Independent review closed the namespace issue but found two binding-stability gaps in the scanner. After Codex workers exhausted quota, Claude completed the scrying correction draft before hitting a new session limit. The scanner author and séance reviewer stopped without completed deliverables. No worker is running; the reported Claude reset is 15:20 CDT / 20:20 UTC on 5 September. Task 1 remains open.

Earlier restart stop (superseded below): Ellie requested a complete stop for a computer restart. No workers
remain active. The96-case checkpoint is saved; the newly started feature-link
proposal is separately marked UNTESTED, with no authored tests or native checks.
Its evidence extension cannot replace the verified shared proposal accidentally.
No gameplay source changed, and no background continuation is scheduled.

Evening continuation: Ellie resumed with "please continue". Native frontier seats
are available and independently reviewing R15/Task 2 code and the Task 4 plan.
The source at documentation HEAD c3e86d5 still equals dc114da. Fresh controller
tests pass 1780/114, lint and both typechecks pass; approval remains pending.
The saved external Claude launchers retain their midnight quota guard. The build
also passed with unchanged index-hHcrttYf.js (490.61 kB /145.28 kB gzip).
Independent review has reproduced one Important forensics reference defect in
a two-hop report, recorded as R20. The registered suite passes; the new reviewer
probe fails. Task 2 closure is withheld while the bounded correction is prepared.

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
- **Earlier quota checkpoint:** Codex workers completed the recovery implementation and delivered further review findings before exhausting their usage allowance. Claude Fable 5.1 completed the scrying author correction, then also exhausted its session allowance. The other two workers saved only IN PROGRESS headers; there is no scanner correction plan or séance review verdict. Their API 429 reset message names 15:20 CDT / 20:20 UTC on 5 September. Preserve the outputs and restart bounded work when capacity returns; do not repeatedly dispatch into the same limit.
- **Temporary dispatch constraint:** Ellie requested no Claude dispatches for 2 hours 15 minutes on 5 September. Conservative expiry: 12:24:11 UTC / 07:24:11 CDT. The constraint is now expired.
- **Expiry and explicit data authorization:** the pause expired before the 15:22 UTC clock check. Automatic approval review initially rejected sending project context to Anthropic; Ellie then specifically authorized transmitting these plans/context/source materials across models. Subsequent scoped Claude dispatches were approved. Unrelated personal/shared memory is excluded. This authorization persists and does not need to be requested again.
- **Direct continuation / provisional sequencing:** after being told the quota/role restriction, Ellie said, "understood, you are clear to continue work then," and later, "you can continue working as you were." Root implemented R15 directly; commit 7d5608f passes all 1,764 tests and the full gate with unchanged simulation reports. Under that go-ahead and the standing recommended-default instruction, root continues the already-scoped forensics work on the green foundation while independent review is pending. This changes when review occurs, not its requirement: neither task is certified complete until a separate reviewer approves the actual committed result. No push or release is authorized by this process amendment.

- **Historical 20:20 UTC automatic approval block (resolved below):** no Claude process launched. Automatic approval rejected the implemented-code review twice, including a retry supplying Ellie's exact quoted authorization, because it interpreted “these plans” as excluding source-derived material/context and the Claude destination. Root has not changed execution routes or bypassed the rejection. The pending confirmation is: “Do you authorize sending Hearsay’s source code, source-derived material, project context, and plans to the external Claude/Anthropic service for this game’s implementation and independent review?” Existing authorization is preserved; the new question is solely to clear the automatic review's narrower interpretation. Local work continues. All external dispatches remain unstarted while the question is pending.

- **Explicit confirmation and successful dispatch:** Ellie replied “please continue, yes, confirmed” to the exact request to send Hearsay source code, context, and plans to Claude/Anthropic. Automatic approval accepted the prepared review scripts. Three bounded Fable 5.1 reviews have launched: implemented R15/Task2, recovered scrying plan, and proposed watch corrections. This supersedes the pending-confirmation status above. No independent verdict is claimed yet; source remains frozen at dc114da.

- **Latest results and quota:** all four dispatches are closed. Scrying plan review approved base reconciliation with A1; R16/R17 plan review approved implementation in the required sequence. Task2/R15 code review and séance plan review stopped without verdicts at the next session limit, which resets6 September00:00 CDT /05:00 UTC. The code reviewer actually ran1780/114 and the other native gates; its encoding-affected comparison was recovered losslessly and rerun by root with fresh UTF-8 logs, all10 blocks/230 lines equal. Approval is still pending. Explicit transmission authorization remains valid. [Full recovery record](2026-09-05-independent-review-recovery.md).

### R4 — Carry the document marker through every observation boundary
- **Issue:** the staged Task 2 brief adds a marker to an answer, but its perception-file license permits only the answer type. The observation projector reconstructs a separate object and would drop the marker.
- **Recommended action:** license and implement the optional marker on both answer and observation types, conditionally project it, and preserve it through raw reports, trait-projected reports and received evidence. Ordinary speech keeps no marker key.
- **Why:** C:\Users\eliza\Desktop\ClaudeFiles\hearsay\src\sim\perception.ts lines 5–14, 38–45 and 69–75; the independent audit confirmed the gap. The existing P9-5 decision already requires this information to travel with what was actually said.
- **To reverse:** remove the paper-forensics feature as a whole; omitting only an intermediate projection would silently break it.
- **Status:** forensics is implemented through dc114da. All 1,780 tests, lint, both typechecks, build, soak and Monte Carlo pass. All 10 complete simulation report blocks /230 deterministic lines are unchanged; 12 complete no-forgery snapshots match the pre-change code byte for byte. Native tests exercise real order delivery, compelled testimony, delayed and relayed reporting, exposure, anonymous pickup, one-hop disclosure and replay. Separate independent approval remains open for forensics and Task 1 under R3. Full evidence: docs/review/2026-09-05-forensics-implementation.md.
- **Local implementation choices:** the existing carrier-profile rule retains its first supporting answer rather than accumulating later refs; forensics follows that exact deduplication behavior. A hand absent from the public directory gets no invented district. The name-dropper trait supplies the lying-holder test because attributor only fills an unnamed source. The private fair-cop auditor was copied unchanged into a temporary test helper to keep the original pillar untouched; Task 3's planned shared-auditor extraction will consolidate both callers.
- **Fixture corrections:** a planted page is picked up on a later beat, and a re-show creates a new paper-backed family alongside earlier hearsay. Tests now wait for that beat and select the actual paper-viewing family. No timing rule, confidence value or interrogation gate changed.

### R5 — Residue must be found and reported
- **Issue:** the original scrying task inserts enemy evidence even when nobody witnessed the residue. Its proposed district-activity rule only processes suspicious spoken stories and cannot consume the suggested residue row.
- **Recommended action:** a valid paid scry leaves a persistent physical trace at the target venue when the window begins. An actual observer must encounter it; a remote observer must then report it through the physical network. The enemy learns only the observed venue and trace, never the player's identity. Use a dedicated evidence rule with resolvable provenance.
- **Why:** the Plan 11 remote-observation and spoken-content laws; enemy/digest.ts's existing district rule requires story families and speakers.
- **To reverse:** change the trace's expiry/discovery rules in a later tuning pass, with measured tests. Invalid actions remain mutation-free; valid but uninformative scrying still leaves residue.
- **Status:** implemented through60506d9, including physical trace identity, nested reference copies and the completed A1 shared-auditor migration. Worker and controller each pass all six gates,1868 tests/121 files, and the complete10-block/230-line simulation comparison. Independent accumulated code review Approved with zero findings; Task3 is closed.
- **Authored defaults adopted:** keep each physical trace for the campaign; track discovery/reporting separately. A failed or omitted report can retry only after that observer encounters the trace again. One residue feature per venue prevents repeated casts from multiplying the same location lead. Any locally present actor can see the trace; existing principal/observer rosters determine who records or reports it.

### R6 — Give magic an explicit observation source
- **Issue:** impersonating an NPC named 'scrying' would either see no conversation or require fabricated circle membership. Plain source strings also make current UI consumers mistake a spell for an informant.
- **Recommended action:** add an explicit live venue sensor over the same tick events used by ordinary perception. Model magic provenance distinctly from informant identities, and update grouping, badges and corroboration consumers together. Magic does not count as a separate informant for channel corroboration.
- **Why:** perception.ts's observer/circle checks, intel/entry.ts's string source, and intel/web.ts's carrier grouping are different responsibilities and must stay coherent.
- **To reverse:** change spell presentation or the explicit corroboration rule without changing ordinary NPC observation.
- **Status:** implemented and natively validated at60506d9. All79 authored cases and six generated jargon cases are present, including the colliding-question and stripped-marker controls. Existing panels distinguish magic from human channels. Independent accumulated code review Approved with zero findings; Task3 is closed.
- **Held seam for Task 4 review:** Task 3 emits null-subject residue features. A later subjectful derived feature carrying a physical ref needs its own audit provenance checked; removing its nested marker must not turn it into an ordinary question. The saved Task 4 draft already has a direct night-visit feature marker precondition, so do not report that guard as missing without checking the actual code. This is a focused reviewer question, not permission to broaden the scanner or invent a new mechanic.
- **Authored defaults adopted:** retain the original three sensor channels (speech, questions, presence). Use an optional typed magic provenance field, so an NPC named 'scrying' remains an NPC. Ordinary scene presence gets a separate intel kind because existing presence rows mean watch activity. A spell and a human seeing the same telling count once for deductions; magic adds no independent informant corroboration.

### R7 — The departed is historical data, not a living NPC
- **Issue:** adding a dead witness to a secret's living witness list fails validation and crashes world attachment; a generation-only field also disappears before a séance action can read it.
- **Recommended action:** generate a separate historical witness record, copy it into optional runtime state, and retain the living-only secret witness invariant. Select one real subject relationship as the grounded clue at generation time. Do not remove anyone from the generated living cast. A séance validates its offered local venue and night window.
- **Why:** world/validate.ts's secret-witness checks and world/attach.ts's belief seeding both require actual living NPCs.
- **To reverse:** change how historical witnesses are selected without deleting live graph nodes or altering existing secret attachment.
- **Status:** the complete draft has conditional native plan approval with the adopted T4-A1/A2 amendment under R21. That amendment adds three auditor controls and separate4C1/4C2 accounting. Actual60506d9 predecessor seams have been checked; implementation waits for Task3 code approval.
- **Further source finding:** the original claim that guards already report a nighttime avatar sighting is false. Enemy capture excludes presence, and received presence has no dedicated enemy evidence arm. The draft will define a narrow chapel-night observation and carry the actual sighting in a physically spoken report. Eligibility must depend on visible location/time, not hidden spell state. The direct spymaster case and the sighting's actual gameplay consequence still need a concrete design; no implementation is certified by this note.
- **Selected consequence for the draft:** direct local sighting or actual received speech supplies a fair-cop evidence reference. A dedicated night-visit feature, deduped by kind/subject, adds one ordinary exposure point without automatic carrier-profile identification. Keep this in the existing evidence substrate rather than a redundant nightVisits ledger. Exact code and tests still require authoring/review.
- **Consumer correction found during author review:** keep the séance record in its truthful claim-family history, while campaign metrics count ordinary heardBy lists only on telling records. The new ritual record must not be mistaken for speech. Exact code and a metrics-preservation assertion are in the draft; production remains untouched.

### R8 — The debrief must distinguish what happened from when it became known
- **Issue:** delivered intel/evidence rows currently retain the observation tick. A naive 'through day N' fold would backdate knowledge to before a report arrived. Artifact rows also lack an explicit minted-claim reference, and claim ancestry alone omits the turncoat's altered report copy.
- **Recommended action:** derive receipt timing and final report divergence from the existing final field-report speech in the chronicle. Add only stable per-item root associations for intermediate report mutations and explicit artifact-to-minted-claim links. Build typed story, artifact, network/report and magic threads under one terminal-only debrief view.
- **Why:** the follow-up audit corrected its initial overstatement: final speech rows already retain receipt tick, message identity and the full reported copy. The remaining gaps are identity across changing or omitted report items and artifact claims, not missing receipt history. The design requires every operation and mutation to be explainable without guessing from identical content.
- **To reverse:** simplify the displayed thread types while retaining the causal record. Do not silently shrink 'every operation' to ordinary gossip.
- **Status:** Task 5A now has a complete recording proposal: 16 new cases and 99 total affected cases pass with the exact changes loaded in memory. Nine full-world pairs match after removing only the proposed metadata. Production is unchanged; independent plan review and the actual magic/prose predecessor remain open. Task5B now has eight partial modules and96 passing isolated cases, including actual two-hop reports, directive histories, nightly digests, ordinary enemy evidence arrival and semantic attention. Both compiler configurations and lint pass. Exact partial code/tests are preserved in docs/plans/drafts/2026-09-05-task-5b-fragments.md; complete typed models and terminal integration remain unfinished. No redundant receivedAt fields are proposed merely because destination logs use observation time.
- **Consumer correction:** the new optional artifact claimId requires the existing story-only helper to narrow by event kind. Belief explanations will use an explicit claim link when present; older records retain their documented content fallback. Two exact artifact record assertions gain the minted claim id while retaining every prior field and strict equality. Details: docs/plans/drafts/2026-09-05-task-5a-recording.md and its author report.

### R9 — Match the counter-sketch to actual attention and outcomes
- **Issue:** player signal keys and enemy feature ids are unrelated namespaces. Comparing them directly cannot say whether a fear was real.
- **Recommended action:** define matching per signal kind. Compare questioning/watch signals to actual issued or performed attention; compare compelled-answer signals to their evidence and resulting features. Distinguish 'attention was real' from 'a feature landed', and deduplicate repeated observations of one action.
- **Why:** intel/countersketch.ts derives semantic keys, while enemy features receive opaque sfN identifiers. A watch can be real without creating a feature.
- **To reverse:** revise the matching/display rules with explicit examples and tests; retained source observations remain unchanged.
- **Status:** the partial semantic attention model passes18 cases, including a real no-report watch through expiry. Combined debrief fragments pass96 cases. Original log indexes survive receipt filtering; repeated views do not multiply actions. Full feature linkage, magic physical receipt support and the complete model plan remain unfinished. No production implementation or independent approval is claimed.
- **Compulsion distinction:** inquiry.ts requires authority at an invitational venue to compel an answer. The live counter-sketch can infer compulsion more broadly. The debrief now proposes corroborating it only against an actual same-beat authority question/answer pair at an invitational venue. This preserves existing mechanics and the player's fallible inference.
- **Timeline correction:** exposureStatus identifies the avatar when a carrier-profile names them; there is no numerical feature-count threshold for identification. Replace the old “N features from your name” countdown with actual distinct evidence keys and the recorded identification date. Keep exposure pressure and identification separate; no gameplay formula changes.
- **Attention evidence:** enemy.actionLedger is updated from returned reports, so it records what headquarters was told. The terminal overlay must distinguish that reported history from actual asking records and the physical watch execution latch. It must not relabel headquarters bookkeeping as ground truth.
- **Additional recording gap, measured:** directive expiry replaces execution state and drops workedDays. A full tick-loop probe with a staged no-report watch confirms real work followed by loss of that history, with no report containing the result. The first vehicle deferred on self-presence guidance (R16); the recording probe omitted that advisory so the existing watch could execute. Recommend a separate narrow recording supplement retaining raw directive outcomes before report omission/projection. The Task 5A1 association proposal remains valid. Task 5A2 now separately proposes private outcome snapshots and exact report packet association: 19 new cases including four generated enforcement checks, 239 affected cases passing, both compilers/lint clean. Twelve complete world pairs retain every old field, with 81 added outcomes. Both sides use the same R16/R17 proposals; none of these proposals is implemented or independently approved.

### R10 — Build prose before the debrief panels
- **Issue:** Task 6 consumes Task 7's render function before it exists. It also asks to add a debrief import ban already covered by the broader panel fence.
- **Recommended action:** split out the prose foundation before the UI. Keep the existing fence and prove it rejects a debrief import. Compute debrief data at one terminal-only composition point, with a behavior test proving no fold runs during a live campaign.
- **Why:** the original dependency order is inconsistent; eslint.config.js already bans panel imports from all sim modules.
- **To reverse:** task numbering can change; the actual build dependencies and hidden-information boundary still need to hold.
- **Status:** execution order amended; root has drafted the prose renderer, public-label view and panel adoption while independent worker capacity is unavailable. The 24-template renderer has a compiler-enforced registry check. Forty-four authored tests pass against the exact proposals loaded in memory; these are planning probes, not implemented gameplay or independent approval.
- **Public-name gap and recommended repair:** current panel views carry person IDs but no display-name lookup. Add a transient selector that reads stored names only for the existing public street directory, then pass its label function from the composition root. Keep panels props-only and add no serialized world/map field. Venues have no separate stored names, so retain their public labels with typographic spacing. The proposed twin-world and purity checks cover this boundary.
- **Prose defaults:** severity changes narrative emphasis without asserting confidence; preserve counts without inventing units and state the place actually named even when the received account contradicts itself. Keep exact fields inspectable beneath the prose. An unsupported predicate gets an explicit unfamiliar-tale line and retains its raw field in the detail. Current content has all 24 templates; no predicate or mechanic is added.

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
- **Status:** committed at a53551d, with seven real failing controls followed by 66 passing scanner tests and a full 1,737/113 controller gate. Independent review then found the two binding-stability defects in R15. Task 1 remains open.

### R13 — Avatar enrollment must preserve the namespace invariant
- **Issue:** buildWorld and the generator validator reject ordinary venue/NPC collisions, but enrollPlayer can add an avatar with a venue's id afterward. The new guards also use a truthiness check that misses an empty shared id. The artifact viewing latch relies on the disjoint namespaces.
- **Recommended action:** check venue ids during enrollment before any mutation, use an explicit undefined comparison for collision detection, and test default/custom avatar collisions plus the empty-id case. Verify repeated avatar viewing remains correctly recognized.
- **Why:** independent review, Important finding at src/sim/world.ts:84–98 and the two new sharedId guards.
- **Status:** closed by the independent review's delivered findings. The committed guards passed five real pre-fix failures, 92 focused checks and the combined 1,737-test gate. Raw review evidence is retained; its final report was interrupted by the usage limit.

### R14 — Record an existing conviction without creating a belief
- **Issue:** correcting the false bounded-read assumption also flags councilTurns, which copies a belief's credence into an outcome record. That record can legitimately contain 0.97 and does not teach anyone a new belief.
- **Recommended action:** give this copy a separate recorded-value verdict. Accept only a direct governed credence read in an object property context bound by the checker to the existing TurnEvidence declaration. Keep the site visible to the audit; anonymous objects, belief destinations, arithmetic, new literals and casts do not gain this exception. A later copy from outcome data into a belief must still fail.
- **Why:** src/sim/scenario/referee.ts:52 and scenario/types.ts:23. Renaming the recorded field would unnecessarily change existing saved output. A generic exemption for metadata would weaken the declared guard.
- **Related proof correction:** direct forwarding of an already-audited credence parameter needs a forwarded verdict, not a bounded one, because it can carry the paper anchor. Neither forwarded nor recorded values may pretend to cap a Math.min. Numeric bound declarations must be resolved by binding so a shadowed name cannot fake a ceiling.
- **Status:** the independent reviewer found the narrow recorded-value implementation conformant. A separate forwarding stability defect remains under R15. New metadata sinks require separate review.

### R15 — A binding must still hold the value the scanner proved
- **Issue:** a declared sink parameter can be reassigned before being called forwarded; a mutable alias initially pointing to Math.min can be reassigned to Math.max and still be called a ceiling bound. Both concrete probes pass the scanner incorrectly and produce 0.97.
- **Recommended action:** prove immutable callee aliases and invalidate forwarding when checker-visible writes change the parameter. Apply the correction at the shared binding mechanism, preserve lawful const aliases and harmless shadowed locals, and retain the declared limit on opaque data flow.
- **Why:** the independent review's saved probe code, audit results and runtime outputs in task-1-final-correction-review-logs. These are visible binding changes inside the existing P9-4 mandate, rather than a new demand for whole-program analysis.
- **Status:** root implemented the bounded correction at 7d5608f after Ellie's direct-continuation go-ahead. Twenty-four new rejecting assertions failed before the helper changes; all 93 scanner cases pass afterward, including three positive-control tests. Full suite 1,764/113, lint, both typechecks, build, soak and MC pass; all ten complete report blocks /230 deterministic lines match. A shared const-declaration predicate also rejects mutable anchor initializers, and the stricter safe-value proof preserves conservative API-write detection. Independent approval remains pending; no self-review is represented as independent approval.

### R16 — A guard knows where they are standing
- **Current execution:** closed at `36d090c`, from approved `252a481`. Native RED3 failures/7 controls; focused39 pass. Worker/controller/reviewer each pass2,055 tests/130 files and all six gates; all10 simulation blocks/230 deterministic lines/four controls remain equal. Independent review Approved with zero findings, plus seven adversarial controls. [Approval](2026-09-13-r16-code-approval.md).
- **Issue:** an enemy watch's standard advisory expects the guard at their own post. The evaluator searches a feed that deliberately excludes its observer, so the guard keeps deferring.
- **Recommended action:** satisfy self-presence from the recipient's existing local venue. Preserve observation requirements for others and all avoid/time guidance. No new self observation or changed game constants.
- **Why:** evaluator.ts expected-presence check, execution.ts localFeed and counterintel.ts authored advisory. A full-loop control with the actual unchanged outcome-report policy defers with the advisory and works after removing only that advisory. The earlier “standard full-report” wording described a staged policy incorrectly; the new default-policy control supersedes it.
- **Status:** exact one-clause proposal and ten tests saved. Native RED 3 failures/7 controls; virtual affected GREEN 39/3; both compiler configurations and lint pass. Independent plan review approved implementation with zero C/I; production implementation, full gates and separate code review remain open. The exact execution amendment strengthens the attempted-state assertion and preserves the existing pin. See docs/plans/drafts/2026-09-05-r16-self-presence.md.

### R17 — A pending watch has not started work
- **Issue:** the work latch accepts pending or deferred execution. A normal tick loop records work at 2400 before the attempt at 2415, then records the same night again at 2430 after the attempt resets the latch.
- **Recommended action:** require the existing attempted execution state before recording watch work. Preserve all physical location, window, beat and duplicate-night checks. Keep this behavioral correction separate from the new history metadata.
- **Why:** execution.ts:settleDirectiveApplications and the retained pre-R17 trace in .superpowers/sdd/task-5a2-validation/pre-r17-watch-history.json. The private recording proposal preserved all old state, revealing rather than creating the premature completion.
- **Status:** exact one-clause proposal plus four tests: native RED 3 failures/1 control; virtual affected GREEN 30/3, both compiler configurations and lint pass. Independent plan review approved implementation after R16 and its separate code review. Full production gates and independent code approval remain open. See docs/plans/drafts/2026-09-05-r17-watch-stage.md.
- **Independent implementation closure, 13 September:** committed `bc409d3`, zero Critical/Important/Minor findings. Worker/controller/reviewer each pass2,059 tests/131 files and all six gates; all10 report blocks/230 deterministic lines/four controls match. Eight additional reviewer boundary cases pass. Root verified77 review entries. [Approval](2026-09-13-r17-code-approval.md).

### R18 — Preserve further watch-history observations outside R16/R17

- **Issue:** the independent plan review identified three existing seams: cancellation removes the override while leaving the original record attempted, expiry can report refusal after successful watch nights, and the work latch reads the received application while the attempt may use an interpreted venue.
- **Recommended action:** keep the two approved clauses bounded. Preserve raw local outcomes and returned claims separately in the debrief. Queue separate mechanism probes/proposals for cancellation, expiry reporting and interpreted-venue consistency before declaring final watch/debrief closeout.
- **Evidence and limits:** watch-plan-review observations d1–d3 trace the current source; expiry after actual work is also in the retained native history probe. Cancellation and venue-mutation consequences are source-derived hypotheses until a bounded native reproduction is saved. Do not call them new passing tests or silently repair them under R17.
- **Status:** held for later bounded work; no new gameplay rule or threshold selected. [Independent source review](2026-09-05-watch-plan-review.md).
- **Closeout clarification, 13 September:** the independent premise audit confirms these do not block R16/R17 and are not automatically authorized repairs. Before final Plan9 certification, run and retain bounded post-R17 cancellation, expiry and interpreted-venue probes, then record a disposition for each result. A reproduced defect needs its own scoped proposal/review or an explicit later-plan disposition compatible with debrief truthfulness; it must not silently enter either approved watch patch. Audit: `.superpowers/sdd/r18-closeout-premise-audit-2026-09-13.md`, SHA-256 `3F9CD0F5137D6F26F3EA398D4CCEE3B2B4913ADAEAC7931D183C25E3AB36FFCE`.
- **Measured disposition, 13 September:** normal-phase probes confirm cancellation followed by ordinary-presence work and HQ restoration. A separate identity-preserving correction proposal is commissioned at78ff1c2. Eight worked reports precede expiry refusal;5A2 preserves private outcomes. Relocator changes guidance only, with no venue divergence. The home-0 control never receives the order. Root verified39 handoff entries/38 final inputs; provenance limitations and every scope are in the [measured disposition](2026-09-13-r18-measured-dispositions.md). No R18 repair is part of R17 or5A2.

### R19 — Handoff learning candidates stay project-local

- **Recommended classification:** durable procedures for preserving UTF-8 across PowerShell script boundaries, saving each review charge/gate incrementally, and binding proposal verification to exact frozen source maps.
- **Scope:** the handoff skill normally promotes lessons into shared memory and asks for classifications interactively. Ellie's standing project-only write instruction and HTML question queue take precedence. The three lessons and an immutable session episode are saved under Hearsay, indexed in docs/episodes/README.md; no shared wiki, memory or skill was changed.
- **Proposed skill improvements:** future orchestration review briefs should require substantive progress after each charge and gate; authoring briefs should distinguish validated snapshots from newer WIP. These proposals are recorded in the local lesson pages and are not silently applied to shared skills.
- **Latest handoff:** 6 September, stopped at Ellie's explicit request. The latest immutable episode preserves the full checkpoint and former rolling record. No worker restart or shared-memory promotion is authorized by this recordkeeping.
- **Three current candidates for later classification:** native per-file test-count reconciliation; raw output/exit capture before formatting; exact proposal inputs and actual-predecessor union reconciliation. Recommended classification is durable for all three; the earlier incremental-review lesson remains indexed.
- **Additional proposed skill improvements:** count generated tests from executed results, prepare native capture before the first gate, and identify every virtual prerequisite separately from implemented source. [Local lesson index](episodes/README.md).

### R20 — A relayed document report must cite the speech that arrived

- **Issue:** after bez reports an answer through ada to cyn, the received inner
  row names ada as observer but retains the answer's original tick and claim.
  Ada did not hear that original answer. H10 creates a feature whose reference
  fails the unchanged fair-cop auditor. The real two-hop reviewer probe has
  nine passing controls and this one failure; the existing 1,780 tests still pass.
- **Recommended correction (PROVISIONAL local plan amendment):** fold the actual
  received network field-report row in evidence order. Read its post-trait spoken
  document-answer items and cite the network speech that reached the listener.
  Later inner copies deduplicate; directly observed answers keep their claim refs.
  This uses existing evidence and adds no hidden witness lookup or state field.
- **Why:** the Plan 11 speech-only and physical-delivery laws, Task 2's explicit
  second-relay requirement, and the unchanged heard-event evidence contract.
  P9-5(d)'s all-answer-ref prescription assumed direct observation and needs this
  local correction for delivered reports.
- **Status:** the focused correction is committed at09e5458, with three new tests,
  1,783 total passing cases and all six implementation gates green. The original
  received-interrogation expectation now cites its real network delivery. New
  fixtures run normal phases and the unchanged auditor. Independent focused
  re-review is Approved, zero Critical/Important/Minor; its own six gates and full
  report comparison pass. R15 passed within its declared boundary.
- **Closure:** [Focused relay-fix approval](2026-09-05-forensics-relay-approval.md).
- **Saved verdict:** [Native forensics review](2026-09-05-native-forensics-review.md).
- **Review evidence:** .superpowers/sdd/task-2-native-review-resume-2026-09-05-report.md
  and review-native-utf8/t2/probe.probe.ts with raw native output.

### R21 — Copied physical evidence must retain its observation marker

- **Issue:** the séance proposal checks a night-visit feature's marker, but a later
  runaround copies that evidence under a different feature kind. Removing the
  copied marker could let it pass the auditor as an unrelated asking at the same
  tick. This is a defect in the proposed proof; no séance code is implemented.
- **Adopted amendment (PROVISIONAL local):** check both physical feature kinds
  before either physical-value branch, and require a physical marker on a
  runaround whose two speech IDs are null. Preserve ordinary asking references.
  Three exact new tests cover the real copied consumer and both crossed markers.
- **Evidence/status:** [Native séance plan review](2026-09-05-native-seance-plan-review.md)
  is Approved-for-base-reconciliation conditional on the
  [binding amendment](../plans/drafts/2026-09-05-task-4-base-reconciliation.md), now
  preserved. Its three proposed cases remain unexecuted. Actual predecessor,
  native gates and separate implemented-code review remain required.
- **Execution clarification:** the existing 4C work is two serial units, 4C1 and
  4C2. The external Claude quota guard does not gate native implementation.

### R22 — Prose must preserve the predicate when another person is named

- **Issue:** an object-only rumor mutation makes the prose drop facts: “bribed
  the council” becomes “bribed Benedict.” The drowning-child and alms-to-the-poor
  templates have the same defect. The predicate itself did not change.
- **Recommended correction:** retain the predicate's fixed clause and append the
  neutral statement that the extra person is named in the account. Also correct
  the real avatar's subject and attribution grammar (“you has” is currently produced).
- **Evidence:** the [native prose plan review](2026-09-05-native-prose-plan-review.md)
  reproduced three semantic failures with three passing controls, and one avatar
  agreement failure. Its original 44-case virtual suite and compiler/lint checks
  pass, showing why the added regressions are needed.
- **Status:** the separately versioned correction is complete with78 virtual cases,
  retaining all44 original cases plus34 additions. A new independent review is
  Approved-for-base-reconciliation, zero Critical/Important/Minor. Its own78-case
  GREEN,27-failure RED, five original-regression controls, compilers, registry
  firing and40 extra grammar/relational controls pass as expected. Original
  artifacts remain unchanged. Prose 7A1/7A2 is now committed through `3020688`;
  worker/controller each pass 2,028 tests/128 files, lint, both compilers and build.
  Independent installed-code review is Approved with zero findings and the same
  full gates passing. [Code approval](2026-09-13-prose-code-approval.md).
- **Closure:** [Independent prose correction approval](2026-09-05-prose-correction-approval.md).
  Actual Task 4 reconciliation and implemented-code review are now complete.

### R23 — Recording repairs must preserve séance family membership

- **Issue:** Task4 deliberately includes a real séance in its story family while
  keeping living reach metrics restricted to injections/tellings. Task5A's proposed
  two-kind guard would silently remove that séance when recording links are added.
- **Adopted amendment (PROVISIONAL local):** retain injection, telling and séance
  family members; optional document claim links remain separate. Preserve Task4's
  metrics narrowing and add one real-ritual regression to the original16 cases.
- **Evidence:** the [independent recording review](2026-09-05-recording-plan-review.md)
  reproduced one failure with17 controls, then18 passing cases with the exact guard
  correction. Its unchanged102-case proposal suite, both compilers, lint and nine
  complete-world comparisons passed. The future ritual regression is proposed,
  with no implemented-magic result claimed.
- **Status:** root adopted the [exact binding amendment](../plans/drafts/2026-09-05-task-5a-base-reconciliation.md).
  Proposal approval is conditional on that amendment and actual Task4/7A-base
  reconciliation; implementation and independent code review remain required.

## Verification note

The reviewer also found one unused variable in the controller's ignored report-comparison script. It was removed and the literal npm run lint command passed again before handoff. The comparator checks complete report blocks and has changed, added and missing-output controls. Some historical worker RED stdout buffers were unavailable; the report discloses this, while current controller/reviewer full-suite output is retained. No missing evidence was reconstructed or invented.

The recovered Task 3 draft's exact counting script reports 79 cases and no syntax diagnostics for complete TypeScript blocks. Its first root extraction stopped at backticks inside a JavaScript regular expression and failed before execution; root corrected only the fence extraction, retained that failed log, and reran the unchanged authored script successfully. Scoped ESLint also passes. All four earlier quota snapshots remain byte-identical. The completed Task 3/4 drafts and reports are preserved under docs/plans/drafts; no new gameplay gate is claimed for this documentation checkpoint.

The orchestration skill's role contract says, "You do not implement, deep-review, or research — workers do" (C:/Users/eliza/Desktop/ClaudeFiles/ai/skills/orchestrate/SKILL.md). After this limit was explained, Ellie replied, "understood, you are clear to continue work then." Root treats that go-ahead as authorization to perform the bounded R15 planning and implementation directly while workers remain unavailable. This is a disclosed interpretation of the user's instruction, not a claim that the skill normally allows it. Independent review remains required before Task 1 closure; root will not approve its own implementation. Cross-model transmission authorization also remains valid.

### R24 — Keep incomplete report arrivals unknown
- **Status:** PROVISIONAL local rule; the147-case corrected proposal has independent approval under R25. Production implementation remains pending.
- **Finding:** a real one-hop report with one retained child missing caused the surviving child to be dated as direct evidence at tick1980 because the relay heard the original. Original observation does not prove headquarters arrival.
- **Adopted correction:** in a corroborated but incomplete report batch, keep matching possible child rows unrecorded within the exact maximum append span. Distinguishable direct observations remain direct; an identical direct/report candidate remains unknown. Complete batches keep their exact receipt links.
- **Basis:** Task5B completion brief38–54; committed09e counterintel66–82 and field-reports371–420; raw author-pass1 failure. The [local adjudication](plans/drafts/2026-09-05-task-5b-incomplete-batch-amendment.md) records the bounded algorithm and required controls.
- **Author proof:** final WIP122 pass/22 fail → corrected144/144, both compilers/lint clean. Distinguishable direct observations remain direct, indistinguishable candidates remain unknown, and reservation stops at the bounded span.
- **Independent result:** R24 controls pass. R25 closes the adjacent missing-receipt defect with147-case proposal approval; all original96 and later144 cases stay intact.

### R25 — A missing receipt cannot become an earlier direct arrival

- **Status:** PROVISIONAL local rule; the corrected proposal is independently Approved-for-base-reconciliation, zerofindings. No production change.
- **Finding:** deleting only the real1995 report receipt record leaves its child falsely dated direct at1980, when the relay heard the original. Headquarters did not hear that original answer.
- **Adopted correction:** extend R24's bounded possible-child reservation to uncorroborated wrappers. Matching candidates remain unrecorded/null; distinct direct observations, complete receipts and span bounds retain their behavior.
- **Evidence:** [independent review](review/2026-09-05-feature-links-plan-review.md), 144 authored cases pass; reviewer acceptance146pass/1fail. The [binding amendment](plans/drafts/2026-09-05-task-5b-missing-receipt-amendment.md) cites the acquisition contract and preserves all147 acceptance cases.
- **Author correction:** [complete version](plans/drafts/2026-09-05-task-5b-feature-links-receipt-corrected.md) preserves all144 cases plus three reviewer controls. NativeRED146/1 becomesGREEN147/147; both compilers/lint and actual rule-firing pass. Only the supporting evidence fold changes.
- **Independent approval:** [focused native review](review/2026-09-05-feature-links-receipt-correction-approval.md), zerofindings. RED146/1 → GREEN147, bothcompilers/lint/firing and a separate exact-key diagnostic pass. Actual-predecessor reconciliation, fullmagic/calendar composition and eventual production code review remain.


### R26 — Count physical report slots without backdating ordinary evidence
- **Status:** adopted PROVISIONAL pure-model correction; the198-case physical proposal has independent approval with zero findings. Production integration remains pending. [Approval](review/2026-09-13-physical-links-proposal-approval.md).
- **Issue:** in an actual report containing network, night-visit and asking rows, the ordinary receipt fold skipped the physical append slot. It could then treat the received asking row as the guard's earlier direct observation at tick 15 instead of its actual arrival at tick 45.
- **Recommended action:** count proved physical append/dedupe slots when reconstructing ordinary report receipt. Preserve R24/R25 uncertainty for missing or ambiguous receipts and enforce the maximum possible append span, including when duplicate physical rows appear.
- **Evidence:** all 147 inherited cases remain byte-for-byte unchanged; 51 additions give 198 total. Complete RED is 160 pass / 38 fail and GREEN is 198 pass. A separate preserved failure proves that duplicate physical rows must not extend the association by one row. Both compilers, scoped lint, firing checks and input integrity pass in the isolated author host.
- **Boundary:** this changes a proposed debrief fold only. It records no new gameplay state and infers neither a caster from residue nor a ritual from chapel presence. Missing evidence remains unknown. Independent proposal review now passes; actual-predecessor implementation and code review remain required.
- **To reverse:** revise the pure receipt mapping with explicit replacement controls; retain the original receipt chronicle, all historical failed/passing evidence, and uncertainty boundaries. No permission question blocks the existing plan.


### R27 — Keep missing magic history explicit in the debrief
- **Status:** adopted PROVISIONAL reader defaults. The original240-case proposal's identity finding is closed by the independently approved241-case correction (R29). No production debrief code is installed.
- **Recommended action:** identify a retained operation by spell plus operation ID; keep operation intent, actual captures, physical reporting and enemy acquisition separate. Historical price is unrecorded because the current operation records do not store it. Do not substitute the current economy price as history.
- **Story rule:** a séance is later receipt of its retained historical claim and edge. It adds no new version, origin or human mutation. Claim-root identity and completeness of the two received intel rows are separate facts; missing or inconsistent references remain unresolved and visible.
- **Orphan rule:** keep a raw held physical report even if its operation/trace history is missing. It proves retained held content only. A chapel visit does not prove ritual causation, and residue does not identify a caster.
- **Evidence:** all198 inherited cases remain unchanged;42 additions give240 total. Complete RED is202pass/38fail, final GREEN240, with both compilers,29-file scoped lint and four rule-firing diagnostics per changed model path. Retained failures cover orphan report loss and an inconsistent ritual claim reference.
- **Boundary and reversal:** these are pure debrief-reader choices over existing records. A future decision to record historical prices or additional causal links needs a separately scoped recording change; do not guess missing values or rewrite the frozen evidence. Independent proposal review and later actual-code verification remain required.


### R28 — Keep player hypothesis cards as ungraded terminal notes
- **Status:** adopted PROVISIONAL composition default; the remaining pure debrief composition is being authored. No terminal UI or new gameplay state is installed.
- **Finding:** existing proposed attention and feature-link readers already supply semantic Counter-Sketch correspondence. Physical sightings/acquisition remain separate; no extra inferred questioning/watch mechanism is needed. What remains is composition of those sections and their receipt/digest calendar.
- **Recommended action:** expose the player's retained hypothesis cards as detached current annotations at the terminal debrief. Do not grade them against unrelated feature IDs, call them proven or phantom, or backdate their current content into earlier days; their edit history is not retained.
- **Boundary:** observed Counter-Sketch signals still receive the existing causal attention/feature comparison. Calendar entries use actual receipt/digest/attention dates and retain gaps/unknowns. A typed set of existing thread sections supplies reachability without a new universal causal index.
- **Evidence and reversal:** an independent premise check traced the frozen240-case proposal and identified this remaining annotation contract. A later grading/history feature would need explicit semantic rules and recording; it is not inferred into the current plan. Independent proposal and actual-code review remain required.

### R29 — A malformed alias must not change a ritual's story family

- **Status:** the original Important finding is closed. The versioned241-case correction is independently Approved-for-base-reconciliation, zero Critical / Important / Minor. No affected reader is installed. [Correction approval](2026-09-13-magic-identity-proposal-approval.md).
- **Finding:** `storyThreads` stores versions by internal claim ID. A malformed second dictionary entry sharing the exact retained séance root's ID can overwrite its version and move the real ritual into an unrelated family. The exact root, `magicThreads` and legacy `threadOf` still agree on the original family.
- **Adopted correction:** enforce the exact retained dictionary identity when joining a story event. Preserve unresolved history and all 240 existing acceptance cases; add the real-ritual alias reproduction permanently. This corrects a false causal explanation without adding gameplay recording or inferring a new root.
- **Evidence:** the independent 240-case suite, both compilers, scoped lint and mandatory firing pass. A separate adversarial probe measures one failure and one passing control. [Review record](2026-09-13-magic-identity-proposal-review.md).
- **Independent result:** baseline240, causal RED240/1 and GREEN241; original controls2/2, author adjacency4/4 and extra all-event controls2/2. Both compilers,29-body lint and actual-path firing pass. Root verified445 review evidence entries and514 author entries.
- **Boundary:** the approved correction can now be consumed by the complete composition proposal. Original proposal/review evidence remain frozen. Actual model installation and accumulated code review remain required; recording work continues.

### R30 — Keep future operation records outside current terminal history

- **Status:** closed by independent review of the321-case receipt replacement, zero Critical/Important/Minor. No debrief model is installed; actual reconciliation and code review remain.
- **Finding:** current enemy evidence and physical evidence include rows acquired beyond the view clock; feature references include future digest results. The calendar and chronicle already enforce this boundary.
- **Adopted correction:** exclude known-future rows from current operation sections or retain them in explicitly typed beyond-clock sections. Preserve unknown-time rows as unknown and keep operation/orphan history reachable without inventing dates.
- **Evidence:** two independent rewound-world probes fail against the frozen 278-case proposal. All original assertions remain binding alongside these regressions. [Independent review](2026-09-13-composition-proposal-review.md).
- **Boundary:** author a versioned correction with real causal RED/GREEN and independent review; preserve the original proposal. UI work may continue provisionally but final certification consumes the approved replacement.
- **Correction checkpoint:** versioned313-case proposal preserves all278 prior cases, adds35 controls and passes the five original reviewer probes; causal RED284 passed/29 failed, GREEN313. Both compilers/34-body lint/law checks pass. Root verified576 evidence entries and the three exact changed bodies. Independent correction review is active; a current-feature/later-duplicate interaction is under adversarial examination, without a verdict yet.
- **Correction review:** Needs-fixes, zero Critical/one Important/zero Minor. A later duplicate receipt incorrectly removes a uniquely supported current feature. A second bounded correction now owns only proposed threads.ts and additive tests; retain a current projection without future indexes and preserve the future receipt separately. All313 cases and the exact reviewer regression remain binding. [Review](2026-09-13-composition-contract-review.md).
- **Receipt replacement checkpoint:** the versioned321-case proposal preserves all313 cases and adds eight controls. Native causal RED314 passed/7 failed, GREEN321; the exact mixed-time reviewer probe and original five probes pass. Both compilers,34-body lint and four mandatory laws pass. Root verified532 evidence entries, including all356 archive files,32 unchanged bodies and two exact replacements. Current features retain a clock-scoped copy; the original link in beyondClock is context for later receipts, not a second feature creation. Independent replacement review is active. [Proposal](../plans/drafts/2026-09-13-task-5b-receipt-partition.md).
- **Independent closure:** Approved for actual-base reconciliation, zero findings. Baseline313, RED314/7, GREEN321, exact mixed-time control and original five probes, both compilers,34-body lint and four law checks pass independently. Root verified all452 review entries, including356 archived files. R30 is closed and R31 remains closed. [Approval](2026-09-13-receipt-partition-proposal-approval.md).

### R31 — Resolve retained ending evidence before calling it consistent

- **Status:** closed within the313-case proposal and preserved by the independently approved321 replacement. Full model installation and separate code review remain.
- **Finding:** won, exposed and caught metadata with matching kind/day but missing supporting records are labeled consistent. Three independent controls reproduce this.
- **Adopted correction:** validate status-specific retained source identity; keep unresolvable or ambiguous payloads visible and mark them inconsistent. Preserve real ending fixtures and do not reconstruct missing history or rerun gameplay rules.
- **Evidence:** the independent proposal suite passes 278 cases while the three additional malformed-payload cases fail. [Independent review](2026-09-13-composition-proposal-review.md).
- **Boundary:** no recording/schema/gameplay change is licensed. The versioned correction preserves all existing assertions and needs independent reconciliation review before model or UI certification.
- **Independent disposition:** closed within the313-case proposal. Real endings and all malformed/missing/ambiguous/future controls pass; retained source identities now resolve without rerunning gameplay. The complete model still needs R30's remaining correction, installation and separate code review. [Review](2026-09-13-composition-contract-review.md).

### R32 — Changed debrief values need readable theme colors

- **Issue:** independent UI proposal review measures inline changed text at1.54:1 in dark mode and exact changed cells at2.46:1 in light mode.
- **Action:** a bounded correction must make both surfaces readable in both themes, preserve explicit Changed text and exact values, and add an actual-style regression.
- **Status:** correction frozen with654 cases passing; identical-test oldCSS run652/2 reproduces both failures. Only terminal CSS andfive appended style assertions change, retaining47 other bodies/all649 prior cases. Root verified544 entries/365archivefiles. Independent correction review is active; later installed browser checks remain required. [Review](2026-09-13-ui-proposal-review.md).
