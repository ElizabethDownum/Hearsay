# Task5B R25 receipt correction — focused independent native review

**Approved-for-base-reconciliation. Findings: 0 Critical / 0 Important / 0 Minor.**

Independent reviewer `review_prose_correction`, inherited highest controller
capability matching the author, 5 September 2026. This verdict covers the frozen
ordinary feature-link proposal correction only. It closes I1 in the previous
144-case proposal at the exact corrected draft below. The earlier Needs-fixes
review and its counterexample remain unchanged historical evidence.

Reviewed brief:
`.superpowers/sdd/task-5b-receipt-focused-review-brief-2026-09-05.md`, SHA256
`66A875C9097DA9E96EB4278F0E5976AC0627262FFB77DA2588D0F12C6FEE4A42`.
Corrected draft:
`.superpowers/sdd/task-5b-feature-links-receipt-corrected-author-draft.md`, SHA256
`667BC0DA2F6C2ED8F73EBECC27301EA7703EA8652F14777EF7788C724A94AD4C`.
Corrected author report SHA256
`0E7CD4E910DEFF51028CB1C73D2426B2A7267FEFCCA5DEA3B4EB86BDFD1CC549`;
correction constraints SHA256
`9D0BFE61B6AA6A19DD972741B2DA6FBD951DB0D5DF651B5D0B73F2700BC4BDEA`;
375-file author inventory SHA256
`7CB14D6708248B6C76300B497E64C8DABEF0C3D8F06E3C4CB6E3345545734EAB`.
All were independently rehashed. R25's provisional rule was evaluated against
the acquisition implementation, design/model constraints and the counterexample;
its adoption was not treated as proof of correctness.

## Finding disposition and bounded behavior

**I1 closed.** The real normal-phase one-hop fixture retains an answer observed
at1980 and a report m0 received by headquarters cyn at1995. Removing only the
actual received network-speech chronicle row leaves the original telling intact.
The old proposal marks the wrapper unknown, then falsely promotes its still
retained child to direct1980 using relay bez's original hearing. The independently
rerun RED fails exactly that acceptance case, with the received1980/expectednull
diff in `red/receipt-red-native.stderr.log`. The corrected fold reserves the
possible child before it can enter standalone direct dating. The same complete
147-case source passes with the correction.

The sole production proposal delta is inside `evidenceArrivals` in
`src/sim/debrief/evidence.ts`: physical corroboration becomes a local boolean;
ordinary wrapper projections can be examined even when it is false; the existing
bounded uncertainty branch runs for an uncorroborated or incomplete wrapper.
The exact reviewed change is saved as `reviewed-evidence-delta.diff`. The
projection/key helpers, completed-batch association and root validation bodies
remain unchanged, as does all of `feature-links.ts`.

An uncorroborated wrapper provides possible projected row identities only. The
fold initializes fresh arrival objects with exactly `evidenceIndex`, `observedAt`,
`learnedAt:null`, `reportMessageId:null`, and `timing:'unrecorded'`. Neither its
own constructor nor a reserved child's constructor receives receipt/root fields.
The uncertainty branch returns before the root-association code, and reserved
children return before direct corroboration or nested envelope processing.

I added one separately selected constructor diagnostic because the three accepted
cases use partial field matching and do not themselves assert absent optional
keys. It checks exact wrapper and child objects and key sets after removing the
real receipt, no `reportEvidenceIndex`, `reportItemIndex`, or `rootFingerprint`,
and an unrecorded H10 reference with no attention IDs. It then restores the exact
receipt at its original chronicle position and checks full arrival equality,
1995 receipt time, resolved reference and restored attention. It passes. This is
one diagnostic beyond the unchanged147; it is not a new permanent proposal case
or the historical trace-only148th case.

R24 boundaries remain satisfied by source inspection and the unchanged cases
passing in both native runs:

- Reservation is limited to offsets1 through the count of projected ordinary
  children. It cannot reach an equivalent row beyond the maximum append span.
- Only exact projected-key matches are reserved. A distinguishable direct HQ
  question inside a broken span keeps its own physically corroborated date;
  byte-indistinguishable candidates inside that span stay unknown.
- Resolved and reserved rows are skipped before processing. The accepted nested
  network-child case stays unknown while the distinct direct row in its span
  remains direct; a projected nested envelope is not recursively ingested.
- Complete corroborated one-hop, multi-hop and multi-item batches still carry
  actual receipt dates. Roots require a complete unique retained array; missing,
  malformed, duplicate and ambiguous roots confer no original attention link.

R20's received document reference, unique marked item/root selection, original
raw witness/event requirements, duplicate ambiguity, recorded work-beat checks,
digest-day ownership, ordinary/unsupported distinction and owned output arrays
are unchanged and exercised by the old144 cases. The correction changes no live
recording, runtime state, seeds, rules, thresholds or acquisition physics. It
makes no arbitrary damaged-history recovery guarantee and extends no closed
scanner mandate.

## Independently executed native evidence

All relative artifact paths in this report are below
`.superpowers/sdd/task-5b-receipt-focused-native-review/` unless otherwise stated.
The host was created from the start under its own excluded
`node_modules/hearsay-baseline` using `git archive` of
`09e54582f0a5fc9505e396bd1910c800c7413fff`. It uses the exact frozen26-file overlay
plus the reviewed three replacements/additions, yielding28 virtual files.
LiveHEAD60506d9 and its Task3 magic changes are not inputs to this review.

Reference scripts were read before copying. Prefix substitutions were reversed
and compared mechanically; the lint-firing script was copied byte-for-byte.
The original compiler/lint scopes and isolated `.probe.ts` loader were retained.
No ordinary scratch `.test.ts` entered root discovery. The native law-firing gate
ran first. Compiler/lint then passed before RED/GREEN.

Commands below were invoked with native PowerShell and Python `-X utf8` from
`C:\Users\eliza\Desktop\ClaudeFiles\hearsay`. Runner child cwd is the owned
snapshot. Each prefix has raw binary `.stdout.log`, `.stderr.log`, native
`.exit.txt`, exact child `.invocation.json`, and `.preserved.json`. Vitest also
has `.results.json`. Only the exact known esbuild ancestor-read escalation was
used for the three Vitest invocations; no configuration workaround was applied.

| Command after `python -X utf8 .superpowers/sdd/task-5b-receipt-focused-native-review/` | Saved prefix | Native result |
| --- | --- | --- |
| `run-owned.py root lint firing` | `firing` | Exit0; four required diagnostics at each of both actual proposed source paths |
| `run-owned.py green preflight compiler-lint` | `green/compiler-lint` | Exit0; both compiler configs0 diagnostics; all28 files lint0 errors/0 warnings |
| `run-owned.py red tests receipt-red-native` | `red/receipt-red-native` | Exit1;146 pass/1 fail; only I1 fails |
| `run-owned.py green tests receipt-green-native` | `green/receipt-green-native` | Exit0;147 pass/0 fail |
| `run-owned.py constructor-control tests constructor-native -t 'focused R25 constructor ownership diagnostic'` | `constructor-control/constructor-native` | Exit0;1 diagnostic passes,147 unchanged proposal cases skipped |

`lint-firing-proof.json` preserves `no-restricted-properties` twice for
Math.random/Date.now, `no-restricted-syntax` for newDate, and
`no-restricted-imports` for content rules at both evidence.ts and feature-links.ts.
`green/tsconfig.json.diagnostics.json` and
`green/tsconfig.app.json.diagnostics.json` are empty arrays;
`green/virtual-lint.json` records all28 file results.

`node .superpowers/sdd/task-5b-receipt-focused-native-review/structural-audit.mjs`
ran from the repository root with native exit0; exact child command/cwd and raw
output are in `structural.*`. Its AST comparison establishes that five fixture
helpers equal committed09e forensics helpers (CRLF normalization only), all three
original preflight assertions remain, and original root compiler/ESLint settings
are retained. The final successful integrity command was
`python -X utf8 .superpowers/sdd/task-5b-receipt-focused-native-review/capture-final-audit-v3.py`;
`final-audit-v3.*` preserves native exit0, output and exact underlying arguments.

## Source, count and preservation proof

`prepare.py`, `input-integrity.json`, `case-registry.json`,
`final-integrity.json`, and the complete red/green maps make the proof replayable.
The three corrected code fences equal the executed map values byte-for-byte:

| Proposed file | SHA256 |
| --- | --- |
| `src/sim/debrief/evidence.ts` | `66379e449334049373fa1db50de083532952e553bbbb2073d024c4c795a8ccbd` |
| `src/sim/debrief/feature-links.ts` | `9a5da1137f96f9e5b5066dfc6d0683db943374f22733f4edd303d985f9d05987` |
| `tests/debrief/feature-links.test.ts` | `de0fb4c3840838d98c876c68733b4b773883ce48b132e9479c09e675f20443c3` |

The final map retains25 of26 original values exactly, including all seven old
test files. The feature-link test is the complete unchanged144-case version plus
the exact three reviewer cases, suffix SHA256
`45cc288096c6622d59eea201c99cb4680db086410cee39c97fa426f4cd1ec2c4`.
RED and GREEN use identical147 test identities; all144 old cases pass in both.
Their only source difference is evidence.ts. The separate constructor stage
retains every one of the28 green values except its one exact test suffix.

I independently rehashed the author's1012 prior protected inputs, including all193
original historical files; checked all375 correction inventory entries against
both SHA256 and byte length; and verified all302 snapshot files against the
committed archive and author snapshot manifest. The combined1389 protected file
hashes and302 snapshot hashes are unchanged after every model gate and final
audit. `protected-before.json` equals `protected-after.json`.

The original96 baseline, WIP122/22 and prior144/native-review evidence remain
frozen. Their stored JSON was read for identity/subset comparison; no historical
wave or whole-game gate was rerun for this pure-fold correction. The earlier
receipt trace and trace-addition bytes equal the protected author copies and
remain diagnostic-only.

Audit utility disclosure: `final-audit.*` preserves an exit1 from expecting the
displayed1980 diff inside Vitest JSON failureMessages; that diff is actually in
the already saved native stderr. `final-audit-v2.*` preserves a second exit1 from
expecting per-case status `pending` where this Vitest spells selected-out cases
`skipped`. Version3 corrects only these evidence-reader assumptions and reuses
the successful structural gate and byte-identical partial outputs. All scripts
and raw failures remain, documented in `reviewer-utility-notes.md` and
`reviewer-utility-v3-note.md`. No source/test/configuration assertion or native
model gate changed or reran. The author's separate disclosed utility repairs
were also read and were not confused with model RED evidence.

## Integration limit and ownership

Approval allows the exact ordinary proposal fragment to proceed to reconciliation
against its actual implemented predecessors. It does not approve installed code,
fullTask5B, physical magic receipt branches, story/séance integration, calendar or
terminal composition, or future widened unions. Task3/4, Task5A/5A2,
Task5A-A1, R16/R17, Task7A and other successor integration obligations remain;
actual native implementation gates and independent committed-code review are
still required. No npm whole-game suite, build, soak or MC result is claimed here.

This review wrote only this report and its newly owned directory. Earlier
reports/artifacts, live production, tests, app/configuration, documentation,
index and shared AI files were left untouched. No children, installation,
external calls, commits or pushes were used. Final focused proposal finding
totals are **0 Critical / 0 Important / 0 Minor**.
