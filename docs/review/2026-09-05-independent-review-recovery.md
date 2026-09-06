# Independent reviews and capture recovery — 5 September 2026

Root recovery record, not an independent verdict. Source remains dc114da; all
independent runner invocations recorded documentation HEAD4251cfd and verified
source/test/config equality to that endpoint.

Ellie explicitly confirmed Hearsay source, context and plans may be sent to
Claude/Anthropic. The prepared dispatches passed automatic approval. All four
processes are now closed: Task2/R15 session97184 exit1; scrying plan18660 exit0;
watch plan67543 exit0; séance plan70746 exit1. The failures report a session limit
resetting at **12am America/Chicago**, next **6 September 00:00 CDT /05:00 UTC**.
This is a quota failure, not an authorization issue. Do not retry before that reset.

## Completed independent plan reviews

- [Scrying](2026-09-05-scrying-plan-rereview.md): Approved-for-base-reconciliation,
  conditional on A1. The two original consumer defects are closed in the proposal.
  The [binding amendment](../plans/drafts/2026-09-05-task-3-base-reconciliation.md)
  adds the actual forensics caller/helper migration to 3C2. No code approval yet.
- [Watch corrections](2026-09-05-watch-plan-review.md): Approved-for-implementation,
  zero Critical/Important. R16 then six gates and separate code review, then R17 and
  the same checks. [Execution notes](../plans/drafts/2026-09-05-watch-execution-amendment.md)
  retain the existing pin, strengthen one assertion and disclose broader self-guidance
  behavior. Three observations outside the two-clause scope are held in HTML R18.

Both reviewers had file tools only. Their approvals assess authored plans against
source and root's artifacts; neither reviewer executed those proposed changes.
Root subsequently ran the exact reviewer-supplied 3C2 syntax probe: diagnostics[],
exit0. It parses three fragments and is not a typecheck. An initial inline extraction
failed because shell quoting altered the fence regex; the file-based extractor
then copied the unchanged probe successfully. No proposal code changed.

## Interrupted implemented-code review

[Original report](2026-09-05-forensics-review-interrupted.md) is still IN PROGRESS,
with no findings recorded and no verdict. The gate table below is reconstructed
from runner invocation/exit files, not attributed to the unfinished report.

| Mode | Independent native exit | Evidence |
|---|---:|---|
| Build | 0 | Raw invocation and output retained |
| Compare | 1 | Rejected corrupted Unicode capture, correctly |
| Focused | 0 | 162 tests /4 files |
| Identity | 0 | Raw invocation and output retained |
| Lint | 0 | Raw invocation and output retained |
| Mc | 0 | Raw invocation and output retained |
| Probe | 0 | 9 cases; later comparison addition was not run |
| Soak | 0 | Raw invocation and output retained |
| Tests | 0 | 1780 tests /114 files |
| Types | 0 | Raw invocation and output retained |

The last tested reviewer probe had nine cases. Its final file additionally contains
an unexecuted ASCII-folded comparison. Preserve it for the next reviewer, but do not
call that edited file tested or adopt its lossy comparison as the acceptance check.
The helper text equality test normalizes CRLF/LF. Raw function text was not byte-equal
(2414 versus2451 characters); that difference is preserved rather than concealed.

## Encoding proof and complete comparison

The npm PowerShell shim decoded Node UTF-8 output using inherited CP437. A controlled
emitter of middle dot/em dash/arrow/checkmark reproduces the exact corruption with
CP437 and captures exact expected text with UTF-8. Each original soak/MC log can be
inverted once with `text.encode('cp437').decode('utf-8')`; converting the result back
reproduces the original text exactly. These are lossless decoded copies. Originals,
SHA-256 hashes and the failed comparator remain in the project-local recovery area.

The **unchanged** full-block comparator passes against those copies: 10 blocks,
230 deterministic lines, known-good/changed-value/extra-output/missing-output controls.
Root also created a versioned UTF-8 runner and reran native soak and MC: both exit0;
the same comparator again passes10/230, exit0, on the fresh unmodified captures.
The initial sandbox loader denials are saved separately; exact native escalations
succeeded with no config or gameplay change. This confirms the capture repair and
simulation equality, not the unfinished reviewer's approval of R15/Task2.

Artifacts: `.superpowers/sdd/review-recovery-2026-09-05/`,
`review-encoding-validation/`, `review-native-utf8/controller/` and
`task-3-validation/parse-3c2-fragments.*`. Paths are relative to Hearsay.

## Séance and next review

[Séance's partial report](2026-09-05-seance-review-interrupted.md) records reading
progress only. No verdict or closure of the copied night-visit/runaround seam was
delivered. Both interrupted reviews remain pending; their saved output must be read
as partial work, with fresh progress saved incrementally after the reset.
