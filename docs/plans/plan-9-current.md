# Plan 9 — current execution plan

Updated: 2026-09-05. Controller: Codex. Current implementation HEAD:
**dc114da3006a75115784e4e894e880dd113226f5**.

Task 1's R15 correction is implemented at 7d5608f. Task 2 forensics is implemented
in 8fee456, 664e0a2 and dc114da. All six local gates pass: **1780 tests /114 files**,
lint, both typechecks, build, soak and MC. All 10 complete simulation report
blocks /230 deterministic lines match the baseline. Twelve full no-forgery world
snapshots also match the pre-Task-2 source byte for byte. Independent approval of
R15 and Task 2 remains pending; neither is certified complete.

Ellie renewed the go-ahead after worker quotas and the controller-only restriction
were explained. Under the disclosed PROVISIONAL process amendment, root implemented
the audited forensics task on the green foundation while independent review remained
open. This superseded review-before-start sequencing, without waiving final review
or changing gameplay design/physics. All new production changes stay in the brief's
eight licensed files; pillar suites and exposure/turncoat mechanics are unchanged.

Task 3 scrying and Task 4 séance remain author proposals, with no magic implementation.
Root verified the Task 3 recovered count/syntax and the two corrected digest consumers
in memory; separate plan re-review remains open. Both worker providers exhausted
capacity. Claude's last reset message was 15:20 CDT /20:20 UTC on 5 September;
no worker remains active, and closed sessions must not be repeatedly polled.

This document records the current execution order and binding audit amendments.
It does not certify unimplemented task bodies as dispatch-ready. Exact per-task
briefs live in .superpowers/sdd and are verified against the committed HEAD at
dispatch. Original plan bytes are preserved in archive/2026-07-05-plan-9.md
(SHA-256 7A050FC1FD036CF4B46DA7AAF834B04F23F2BC726A2C89A497EAAD32A4501B3F).
Plan 10's original is archived beside it for subsequent audit; it is not being
silently rewritten by this Plan 9 recovery.

## Authority and boundaries

- Governing design: ../design-spec.md and ../backlog.md. Global constraints:
  ../../.superpowers/sdd/plan6-constraints.md, plan7-constraints.md,
  plan8-constraints.md, and plan11-constraints.md where Plan 11 rebuilt the physics.
- User direction on 2026-09-05: audit then continue implementation; keep all writes
  in this Hearsay checkout; take recommended defaults and retain all questions and
  issues for Ellie in ../review.html. Shared AI memory and external plans are read-only.
- The no-Claude deadline 2026-09-05 12:24:11 UTC / 07:24:11 CDT has expired.
  Ellie also explicitly approved sending these Hearsay plans/context/source to
  Anthropic after an automatic-review rejection. Restricted Claude Fable 5.1
  dispatches were approved; unrelated personal/shared memory is excluded.
  Subsequent API 429 session-limit failures are capacity failures, not a renewed
  authorization question. Both worker providers currently lack capacity.
  Implementation and review still use independent threads.
- One code writer and index owner at a time. Scoped local commits; preserve unrelated
  documentation work. No push performed or needed for local verification.
- Gate: npm test, npm run lint, npm run typecheck, npm run app:build. Physics/world
  changes also run soak and mc with complete like-for-like measurement comparison.
  No formula/threshold/seed changes to turn a failed acceptance test green.

## Execution order and readiness

1. **Task 1 recovery:** F1–F5/G1 already committed; G2–G4 now committed and the
   controller's full gate/sweep passed. Review over bd930cc..caa5a38 found an
   unsound ceiling classification of credence reads and an omitted avatar
   enrollment namespace guard (also falsy empty-id checks). Controller accepts
   these as defects inside the existing mandate. Author a bounded correction,
   preserving same-belief monotone anchor retention; do not widen the accepted
   static-analysis boundary or start another speculative hardening cycle.
   Corrected code is committed and independently gated. Review found that bound
   parameters and function aliases can be reassigned after the scanner's proof;
   R15 is now corrected at 7d5608f; independent closure remains pending.
   Task 2 proceeded under the prominently disclosed process amendment above.
   Current author brief: ../../.superpowers/sdd/task-1-binding-stability-author-brief.md.
   Interrupted review evidence: ../review/2026-09-05-binding-stability-findings.md.
   Current review: ../../.superpowers/sdd/task-1-final-correction-review-brief.md.
   Existing recovery brief:
   ../../.superpowers/sdd/task-1-fix2-resume-2026-09-05.md plus original fix2 brief.
   Current correction authoring brief: ../../.superpowers/sdd/task-1-final-correction-author-brief.md.
   Execution amendment: H2 may run before H1; no source dependency connects them.
   Frozen H2 dispatch: ../../.superpowers/sdd/task-1-h2-implementation-brief.md.
   Approved full correction: 2026-09-05-task-1-correction.md. Resolved H1 continuation:
   ../../.superpowers/sdd/task-1-h1-continuation-brief.md, base 2fe440f.
   Expected unit counts are H2 +7 ->1720/113, then H1 +17 ->1737/113, subject to
   exact final suite arithmetic. Review remains after both committed units.
2. **Task 2 forensics:** staged brief task-2-brief.md already carries P9-5's spoken
   document marker, traceable hand, anonymous venue pickup and one-hop disclosure
   defaults. Perception license now includes the utterance Observation arm and
   observationsFor's conditional projection, with direct/delayed boundary tests
   required by the amended brief. Replace the obsolete base placeholder
   in the resolved root execution note (base 7d5608f). Implementation is now
   committed at dc114da and locally gated; independent review remains pending.
   Exposure/digest pillar suites are unchanged. See R4 and the implementation report.
3. **Task 3 scrying:** exact live sensor/provenance interfaces and persistent
   physical residue discovery/reporting are fully drafted. Independent plan review
   found two missing physical-reference consumer migrations: identity comparison
   and nested-copy isolation. Both are corrected in the recovered author draft
   (R5/R6), together with the required-marker/colliding-question control.
   Root counted 79 proposed cases and parsed the complete TypeScript blocks
   without syntax diagnostics; focused independent re-review remains pending.
   runtime proof still requires the real Task 2 base to be certified.
   The original direct-evidence insertion and heuristic-3 route are invalid.
   Drafts are proposals until controller review; no magic code yet.
4. **Task 4 seance:** author separate historical witness metadata retained at runtime,
   living-only witness invariants, grounded clue, and offered local action (R7).
   The complete draft/report are saved; independent plan review was interrupted
   by quota before a verdict. Restart that bounded review when capacity returns.
5. **Task 7A prose foundation:** implement registry-exhaustive renderClaim and existing
   board reading lines before Task 6 consumes it. Register action vocabulary when
   compile-driven; debrief-specific vocabulary can finish with its UI (R10).
   Complete proposal saved in drafts/2026-09-05-task-7a-prose.md: 44 exact authored
   tests pass against virtual source, both compiler configurations and lint pass.
   No production implementation yet. Independent plan review and reconciliation
   with the actual future Task 4 base remain required before execution.
6. **Task 5 debrief substrate and models:** first prove whether retained network
   speech uniquely reconstructs receipt/report chronology, then make only the
   missing correlations explicit. Author typed operation/report threads and semantic
   overlay matching (R8/R9). The original rumor-lineage-only folds are insufficient.
7. **Task 6 + Task 7B debrief UI:** terminal-only props-fed panels, existing panel
   import fence firing proof, running-world non-reachability, remaining terms/slots.
8. **Task 8 integration/closeout:** legal two-council forger route; real interrogation
   mirror; terminal report-divergence lesson; final full-plan independent review.
   Stage vehicles and measure reachability; never modify quorum/physics to fit the
   original singular-council hand-simulation (R11).

## Evidence and review

- Recovery premises: ../../.superpowers/sdd/p9-resume-premises-2026-09-05-report.md.
- Independent remaining-task audit:
  ../../.superpowers/sdd/p9-plan-audit-2026-09-05-report.md.
- User reading surface: ../review.html. Current decisions in review/current.md;
  previous docket retained byte-for-byte in review/prior-decisions.md.
- Durable implementation ledger: ../../.superpowers/sdd/progress.md.
- Controller recovery gate and complete-report comparison:
  ../../.superpowers/sdd/p9-t1-controller-2026-09-05/.

Before every dispatch, verify prerequisites, exact source seams, current HEAD,
suite-count floor, and all known scope amendments. The audit itself is read-only
evidence, not proof that later gameplay features have been implemented.
