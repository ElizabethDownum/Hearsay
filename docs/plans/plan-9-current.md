# Plan 9 — current execution plan

Updated: 2026-09-05. Controller: Codex. Original authoring base: 2436a36.
Recovery base: 49cc3e7; measured inherited WIP baseline: 1710 tests / 113 files.
Recovery now committed through caa5a38: G2 a458cd2, G3 55a45ae, G4 caa5a38.
Controller gate: 1713 tests / 113 files, lint, both typechecks and production build
green; 10 complete simulation report blocks / 230 deterministic lines unchanged.
Independent review at caa5a38 returned Needs-fixes: one Critical and one Important.
Task 1 is not closed. Ellie resumed after the computer restart. Current base is
0241fc8; the repeated boot gate passes 1713/113, lint, typechecks and build.
A bounded correction for R12/R13 is being authored before implementation;
R14 distinguishes the referee's recorded outcome from a belief write.

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
- No Claude dispatch before 2026-09-05 12:24:11 UTC / 07:24:11 CDT. Existing native
  Codex workers continue. Implementation and review use independent threads.
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
   Task 2 waits for corrected code and independent review. Existing brief:
   ../../.superpowers/sdd/task-1-fix2-resume-2026-09-05.md plus original fix2 brief.
   Current correction authoring brief: ../../.superpowers/sdd/task-1-final-correction-author-brief.md.
2. **Task 2 forensics:** staged brief task-2-brief.md already carries P9-5's spoken
   document marker, traceable hand, anonymous venue pickup and one-hop disclosure
   defaults. Perception license now includes the utterance Observation arm and
   observationsFor's conditional projection, with direct/delayed boundary tests
   required by the amended brief. Replace the obsolete base placeholder
   only after Task 1 closes at a verified committed HEAD. Exposure/digest pillar
   suites stay unchanged. See review item R4 and the independent audit.
3. **Task 3 scrying:** exact live sensor/provenance interfaces and persistent
   physical residue discovery/reporting are being authored before dispatch (R5/R6).
   The original direct-evidence insertion and heuristic-3 route are invalid.
   Drafts are proposals until controller review; no magic code yet.
4. **Task 4 seance:** author separate historical witness metadata retained at runtime,
   living-only witness invariants, grounded clue, and offered local action (R7).
5. **Task 7A prose foundation:** implement registry-exhaustive renderClaim and existing
   board reading lines before Task 6 consumes it. Register action vocabulary when
   compile-driven; debrief-specific vocabulary can finish with its UI (R10).
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
