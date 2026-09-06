# Task 3 additive base reconciliation — binding dispatch amendment

Authored-by: root Codex GPT-6, 5 September 2026.
Authority: completed independent plan review, `task-3-recovered-plan-review.md`, A1;
the current handoff's required consolidation of the temporary forensics auditor.

This amendment accompanies, and does not rewrite, the frozen scrying draft
SHA-256 `EBACFF982443BA604006D33CE62F5AD9AA11D95FE08E4C3DA70DB523A91176ED`.
The reviewed source endpoint is `dc114da3006a75115784e4e894e880dd113226f5`;
documentation HEAD during review was `4251cfdcfa251bbde17c498c521ec386418873c7`.
The verified implementation floor is 1780 tests in 114 files. Task 2/R15 independent
code approval is still pending. This is a reconciled proposal, not permission to
claim that prerequisite or Task 3 complete. Recheck source and counts at dispatch.

## A1: one shared fair-cop auditor in 3C2

Add two paths to 3C2's licensed files:

- `tests/sim/forensics.test.ts`: change its auditor import only.
- `tests/sim/helpers/forensics-audit.ts`: delete after migrating the caller.

Extract the private `auditSketch` from `tests/sim/sketch-faircop.test.ts` into
the already planned `tests/sim/helpers/sketch-audit.ts`. Before widening it, verify
the function text against the private pillar and temporary helper after normalizing
CRLF/LF only. The independently run nine-case probe confirms this text equality;
raw bytes differ by line endings, so do not claim raw-byte equality.

Change the forensics import to exactly:

```ts
import { auditSketch } from './helpers/sketch-audit';
```

Delete the old helper, then apply the draft's exact residue widening to the shared
helper. Keep this extraction, migration, deletion and widening in the same 3C2
commit. Preserve all 16 forensics tests and all five auditor calls; no fixture or
assertion edits are licensed. The two original fair-cop pillar tests retain every
assertion. Do not retain a second auditor to hide a migration failure.

The complete 3C2 focused command becomes:

```powershell
node node_modules/vitest/vitest.mjs run tests/sim/scry-residue.test.ts tests/sim/scry-ref-runaround.test.ts tests/sim/enemy-runaround.test.ts tests/sim/sketch-faircop.test.ts tests/sim/no-omniscience.test.ts tests/sim/forensics.test.ts
```

The native Node invocation avoids npm PowerShell argument forwarding ambiguities;
the selected tests are the frozen command plus the required forensics suite.
Verify the old helper path is absent and no import still names it before committing.
Extend the frozen consumer inventory with the actual forensics test's legacy
claim-ref literal and the temporary helper removed in this unit. Legacy refs keep
their original four fields and absence of optional physical markers.

## Retained review carries

The syntax-only probe supplied by the reviewer covers the three previously unparsed
3C2 fragments. It does not typecheck or execute the proposal. The authored count
remains 79; actual suite growth also includes registry-driven cases, so reconcile
that arithmetic against real output instead of guessing a final count.

For Task 4, use this canonical auditor order: residue-feature marker precondition,
night-visit-feature marker precondition, night-visit value branch, residue value
branch, then the legacy path. The proposed copied night-visit/runaround marker seam
remains a bounded Task 4 review charge. No new prohibition on ordinary asking refs
is adopted by this amendment.

All frozen model assignments, TDD requirements, six gates, no-magic full-report
comparison, replay assertions and separate implemented-code review remain binding.
