# Task 3 recovered plan review (bounded, independent)

**Status: COMPLETE (2026-09-05). Verdict: Approved-for-base-reconciliation**, conditioned on the one exact additive amendment A1 below being applied in the dispatch brief before 3C2 executes. No Critical or Important defect was found in the authored code of the seven added cases, the comparator, the nested copy, or the auditor precondition.

Reviewer `claude-fable-5-1`, file tools only (Read/Glob/Grep/Edit/Write). **Nothing in this document claims that this reviewer ran any test, lint, typecheck, build, hash, or probe.** Every runtime statement below is either root's cited artifact or a read-derived hypothesis labelled as such.

Brief: `.superpowers/sdd/task-3-recovered-plan-review-brief.md`. Reviewer license applied: plan-authored code was not presumed correct; plan-mandated defects would be reported at full severity.

## Target and source state

- Draft under review: `.superpowers/sdd/task-3-author-draft.md`, 1794 lines. Brief-stated SHA-256 `EBACFF98…76ED`, 130187 bytes. Root's `task-3-validation/artifact-manifest-2026-09-05.json` and `review-corrections.mjs:9-10` assert that hash; this reviewer cannot hash files and relied on those artifacts.
- Author report: `.superpowers/sdd/task-3-author-report.md`.
- Source read at the working tree, which the brief states is the Task 2 endpoint `dc114da` with production/test blobs identical to documentation HEAD `4251cfd`. The seams this review depends on were verified by reading: `src/sim/enemy/digest.ts:127-135,188-191,220,358-366,375-394`, `src/sim/enemy/state.ts:64-105`, `tests/sim/sketch-faircop.test.ts:24-61`, `tests/sim/helpers/forensics-audit.ts`, `tests/sim/forensics.test.ts:23,128-131`, `tests/sim/enemy-runaround.test.ts`, `src/sim/counterintel.ts:36-126`, `src/sim/phases.ts:319-338,486-523,551-552,614,634-636`, `src/sim/perception.ts`, `src/sim/directives/field-reports.ts`, `src/sim/directives/transport.ts:456-466`, `src/sim/directives/types.ts:204-215`, `src/sim/types.ts:91-101`, `tests/sim/no-omniscience.test.ts:44`, and `.superpowers/sdd/task-4-author-draft.md:883-981`.
- Task 2 is implemented and locally gated at `dc114da` (1780/114 per `docs/handoff.md:15`); its independent code review is pending. No certified Task 2 prerequisite is assumed or invented here.

## Closure of the original findings

### Important 1 — `sameRefs` identity: CLOSED (proposed code correct; runtime GREEN still pending)

**Authored correction** (`task-3-author-draft.md:608-620`): the module-private comparator keeps the four legacy clauses in their original order and appends `residue?.id`, `residue?.witness`, `residue?.observedAt`. Read-verified properties:

| Case | Result | Why |
|---|---|---|
| Exact physical clone | equal | all seven clauses equal by value |
| Two real refs differing only by paid trace id (`s0` vs `s1`) | unequal | `residue.id` differs |
| Residue ref vs legacy null-id ref (same tick/observer) | unequal | `'s0' === undefined` is false |
| Two legacy refs | unchanged legacy result | `undefined === undefined` on all three new clauses |
| Positional ordering | preserved | `a.every((ref, i) => … b[i])` unchanged |

The current source comment at `digest.ts:127-131` is kept per `:608`. No import changes; the `no-omniscience` allow-list at `tests/sim/no-omniscience.test.ts:44` is exactly the four specifiers the draft's premise probe (`:42`) expects.

**Consumer test** (`tests/sim/scry-ref-runaround.test.ts`, draft `:1260-1354`) exercises the real `enemyDigest` (`:1341`), not a surrogate. Traced against `digest.ts:338-373`: `leadIds` sort to `physical-lead-0`, `physical-lead-1`; staged `workedDays [2,3]` are both `< 4`; the only evidence is the two residue entries on day 1, so no night is productive and `streak = 2 = RUNAROUND_WASTED_NIGHTS`; lead resolution passes (subject `citizen`, district `d0`, one ref). The `has(… sameRefs …)` check at `:361` then yields 1 runaround for the two exact-clone modes and 2 for `different-residue` and `physical-versus-legacy`; the deduped second lead skips both `addFeature` and the `tailDrops.push`, matching `:1344-1348`. The residue feature rule also emits one `arcane-residue` feature in the same decision, which the `filter((row) => row.kind === 'runaround')` at `:1342` correctly ignores. Absent-key behaviour is asserted for the legacy clone at `:1349-1351` and purity at `:1352`.

**Fixture labelling.** The refs come from real paid-trace capture and the real `ref(e)` projection (`:1270-1296`), but the subjectful carrier leads and worked-night ledger are explicitly staged pure-digest inputs (`:1258,1298`). Task 3's actual residue feature has `subject: null` (`:648`) and cannot become a lead at `digest.ts:360`. These fixtures are a physical-reference contract test, **not** a Task 3 runaround gameplay route, and this review does not describe them as one.

**Root's in-memory evidence.** `.superpowers/sdd/task-3-validation/review-corrections.mjs` extracts the exact authored comparator and copy blocks from the hashed draft, overlays them on the real `digest.ts`, and stages hand-built refs: `review-corrections-native.stdout.log` shows baseline `[1,1,1,1]`, comparator-only `[1,2,2,1]`, both corrections `[1,2,2,1]`; exit 0. That probe used literal refs, not the paid-trace capture path, and did not execute the authored test file. The mandate (R5, `docs/review/current.md:48-53`; draft `:12,20,429`) is satisfied by the authored code.

**Legacy control.** `tests/sim/enemy-runaround.test.ts:112-114,173-174,557-559,701-703` compare legacy trails with `toEqual`; no key is added to legacy refs by either the `ref(e)` extension (`:605`) or the conditional copy, so those pins are expected to stay byte-identical. Hypothesis until root runs the 3C2 command.

### Important 2 — nested residue copy: CLOSED (proposed code correct; runtime GREEN still pending)

**Authored correction** (`:622-631`): `{ ...row, ...(row.residue === undefined ? {} : { residue: { ...row.residue } }) }`. Detaches only the nested object, preserves value, omits the key when absent, and keeps ordinary key order because `...row` is spread first and `residue` overrides in place. No whole-state or JSON clone, no new import.

**The isolation test cannot pass because of the staging clone.** `stagedRunaroundState` (`:1299-1314`) clones the *input* ref into the lead. The test at `:1356-1378` then compares `derived.evidence[0].residue` (digest output) against `lead.evidence[0].residue` where `lead = state.sketch[0]` (`:1359`), i.e. the exact object the digest reads at `digest.ts:359`. With the old shallow copy `{ ...row }` (`digest.ts:365`) those two are the same object, so `expect(copy).not.toBe(original)` (`:1372`) fails, and the mutation at `:1373-1375` would also break `:1376-1377`. The helper's earlier clone is upstream of both operands and is irrelevant to the assertion. RED is meaningful; the authored claim at `:1382` is correct. Root's probe confirms the mechanism on hand-staged refs: `nestedIdentityShared` true for baseline and comparator-only, false with both corrections.

**Mandate.** `digest.ts:127-130` (independent copy contract), `docs/design-spec.md:81-84` as cited by the initial review, draft `:20,429`.

## Scope 3 — auditor precondition and the asking-twin controls

**Placement.** The precondition `if (feature.kind === 'arcane-residue') expect(ref.residue, …).toBeDefined();` (`:1387-1389`) sits at the start of the per-ref loop, before the value-keyed `if (ref.residue !== undefined)` branch (`:1390-1442`), before the legacy "exactly one id" check, and before the legacy finder, which gains only the prefix `e.kind !== 'arcane-residue' &&` (`:1445`). Keying on the feature kind means dispatch never consults the possibly-stripped marker.

**Twin world** (`:1524-1555`): a clone of the real remote residue world, plus an asking evidence row in the exact `counterintel.ts:48-55` key set and an asking chronicle row in the exact `phases.ts:500-507` shape, at the residue ref's tick/venue/observer, and a legacy `entry-point` feature whose ref is `{tick, observer, claimId: null, messageId: null}`. `InquiryKey` includes `{ family }` (`perception.ts:18`); `AskingRecord` matches (`types.ts:91-101`).

**Positive control** (`:1557-1564`): the `arcane-residue` feature passes the precondition and its value-keyed branch; the legacy feature skips both, passes the id check, resolves at the prefixed finder to the staged asking row (the residue entry is now excluded), and resolves at branch (2) to the staged asking chronicle row heard by `guard`. The ordinary-question feature therefore remains auditable. The `['arcane-residue', 'asking']` non-vacuity assertion at `:1560-1562` is a read-derived hypothesis that no other null-id evidence row exists for `guard` at tick 1440 in that world; with no claims injected in `scryWorld`, none is expected.

**Corrupted-copy control** (`:1566-1574`): after `delete ref.residue`, the precondition throws for the residue feature. Without the precondition (the authored RED), the stripped ref passes the id check, matches the staged asking evidence at the prefixed finder, and matches the staged asking chronicle row, so the audit accepts it and `toThrow()` fails. RED/GREEN as stated at `:1578` is correct. The control's own pre-corruption `auditSketch(world)` call (`:1568`) proves the throw is caused by the single deletion.

**Trace of the fourteen faults** (`:1480-1515`) through the widened auditor, each on the remote world where the ref carries `residue`:

| Fault | First failing assertion |
|---|---|
| no-evidence | residue-branch entry finder (`:1401`) |
| no-creation | `created` chronicle check (`:1413-1416`) |
| no-sighting | `observed` chronicle check (`:1417-1420`) |
| wrong-witness | `observed` check: recorded sighting names `guard`, ref/entry now say `citizen` |
| no-receipt | `entry.observer` must be the spymaster (`:1422-1423`) |
| wrong-message | receipt speech finder (`:1428-1431`) |
| no-envelope | receipt speech finder |
| not-heard | receipt speech finder (`heardBy`) |
| omitted-atom | spoken-atom check (`:1435-1439`) |
| wrong-spoken-witness / -venue / -time | spoken-atom check |
| wrong-ref-channel | `expect(ref.claimId).toBeNull()` (`:1391`), residue still present |
| missing-ref-discriminant | the new precondition (`:1388`), now for the right reason |

All fourteen still throw. **Prior positive paths:** the Watchford emergent test (`sketch-faircop.test.ts:64-76`) and the network-ref test (`:78-120`) contain no `arcane-residue` feature or entry, so the precondition never fires, every ref has `residue === undefined`, and the finder prefix is vacuously true; their bodies are unchanged. The same holds for the Task 2 forensics worlds (see A1).

**Fixture reachability, read-derived.** `residueAuditWorld(true)` needs the guard's held report to reach `boss` at `hq` on tick 1485. `circlesFromPositions` (`phases.ts:319-338`) groups every occupant of a venue regardless of access, so the private `hq` does not block the hand-off; the `access === 'private'` checks live only in player actions (`actions.ts:722,742`). Delivery timing remains a runtime hypothesis, consistently authored with `tests/sim/scry-residue.test.ts` (`:1138-1146,1168-1171`).

## Scope 4 — consistency of the seven added cases and base reconciliation

**File licenses and imports.** The five runaround cases live in new `tests/sim/scry-ref-runaround.test.ts`, licensed in 3C2 (`:350`) with `tests/sim/helpers/scry-world.ts` licensed from 3B (`:208,930`). The two twin controls live in `tests/sim/sketch-faircop.test.ts`, licensed in 3C2; the added imports at `:1384` (`applyAction`, `step`, `enemyDigest`, `cloneSerializable`, `type SketchEvidenceRef`, `type SketchFeature`, `scryWorld`) cover every new identifier, and `expect`, `runUntil`, `STANDARD_RULES`, `WorldState` are already imported at `sketch-faircop.test.ts:1,2,4,10`. The extracted helper's two imports (`:1450-1451`) are exactly those of `forensics-audit.ts:1-2`. The 3C2 command (`:1643`) runs the new file and the legacy consumer control. All object literals in the seven cases carry every required field of `EnemyActionLedgerEntry`, `SketchFeature`, the asking `EvidenceEntry` arm, and `AskingRecord`.

**Count reconciliation.** Counting the draft text by hand: 3+3+1+1 = 8 (`:174-200`), 1 (`:384`), 2+5 = 7 (`:806-862`), 4 (`:893-920`), 16+1+3+2+5 = 27 (`:982-1092`), 7 (`:1127-1252`), 4+1 = 5 (`:1317-1378`), 2+14 = 16 (`:1473-1515`), 2 (`:1557-1574`), 2 (`:1588-1626`) = **79**, matching root's `count-authored-cases.stdout.log` (blocks 5, 13, 43, 44, 46, 47, 48, 51, 52, 53). Limit: blocks 51 and 52 and the auditor-branch fragment are not complete files, so root's run gave them **no syntax diagnostics at all** (`"diagnostics": null`); the recovery seat also ran nothing. I parsed them by reading and found balanced braces and consistent narrowing, but that is not compiler evidence. An optional exact probe is saved below.

**Document-marker reconciliation at `dc114da` (draft `:22`).** Verified present: `Utterance.document?` (`perception.ts:15`), utterance `Observation` arm (`:44`) with conditional projection (`:78`), `ReportedFieldObservation` (`directives/types.ts:209`) with raw/projected/enemy projections (`field-reports.ts:152,220,385`), direct capture (`counterintel.ts:46`), `EvidenceEntry` (`state.ts:68`), the H10 consumer (`digest.ts:380`), and the `inquiry.ts:80` source. The draft's 3A `utteranceObservation` helper (`:119-128`) reproduces `perception.ts:74-79` key-for-key including the conditional spread, so ordinary bytes are unchanged. The 3C1 edits only add arms, cases, and a parameter (`field-reports.ts:53,142,190,208,359,376,420`; `transport.ts:463`, where `spoken` and `t` are in scope in the field-report arm) and replace no Task 2 branch. The prescribed residue-rule insertion point exists (`digest.ts:375-394` then `:467`; `allFeatures` at `:471` sees it). The stale base identifiers at draft `:5` (`0241fc8b`, `caa5a38`, `a53551d`) and the historical count at `:44` are already delegated to root: the dispatch header must record `dc114da` and the **1780/114** baseline.

### A1 — Required additive amendment: migrate the Task 2 forensics caller into the shared auditor (base reconciliation)

- **Artifact lines.** Draft `:350` (3C2 file list), `:1447-1454` (extraction), `:1643` (3C2 command), `:1724` (consumer inventory, stated at `a53551d`).
- **Failing scenario.** The frozen draft was authored before Task 2 landed. At `dc114da`, `tests/sim/forensics.test.ts:23` imports `auditSketch` from `tests/sim/helpers/forensics-audit.ts`, an exact copy of the private pillar auditor (compared by reading: identical to `sketch-faircop.test.ts:24-61` apart from `export`). The 3C2 license does not name either file, so an implementer executing the draft as frozen cannot migrate the caller or delete the duplicate. Result: two auditors diverge (one widened, one not) and the consolidation mandated by the handoff is silently skipped while the gate stays green.
- **Mandate.** `docs/handoff.md:104-107,131-134`; `docs/review/2026-09-05-forensics-implementation.md:65-68`; `docs/review/current.md:45` (R4 local choice); `docs/review/2026-09-05-scrying-controller-preflight.md:39-41`.
- **Severity.** Not a code defect in the authored snippets. If omitted from the dispatch: **Important**, because a plan-mandated pillar consolidation would not happen.
- **Bounded correction (additive; no authored code changes).**
  1. Add to the 3C2 file list at `:350`: `tests/sim/forensics.test.ts` (import path only) and `tests/sim/helpers/forensics-audit.ts` (delete).
  2. After `:1454`, add: "Change `tests/sim/forensics.test.ts:23` to `import { auditSketch } from './helpers/sketch-audit';` and delete `tests/sim/helpers/forensics-audit.ts`. No forensics assertion or fixture changes. The widened auditor's precondition, residue branch, and finder prefix are inert for forensics worlds, which contain no `arcane-residue` feature or entry, so the five forensics `auditSketch` calls (`forensics.test.ts:131,144,151,176,286`) keep their original pillar coverage. All 16 forensics cases must stay green; any drop is a per-test disposition, never a deletion."
  3. Add `tests/sim/forensics.test.ts` to the 3C2 focused command at `:1643`.
  4. Extend the inventory at `:1724`: at `dc114da` a sixteenth ref-literal test file exists, `tests/sim/forensics.test.ts:128-130` (`toMatchObject` on a claim ref, unaffected because legacy refs gain no key), plus the temporary helper being removed.
  5. Optional implementer sequencing inside the single 3C2 commit: extract first (byte-identical to `forensics-audit.ts` apart from `export`), migrate and delete, then widen. Same committed result, trivial function-byte check.

No other base-reconciliation gap was found in the reviewed scope.

## Scope 5 — the held Task 4 seam, bounded

- **Task 3 demonstrates no omission.** In Task 3 the only feature that carries a residue ref is `arcane-residue` itself (`:641-654`); every other minting rule requires a family, a reported claim, a speaker, a network kind, or a document answer (`digest.ts:210-332,375-394`), and the residue feature's null subject excludes it from `leadAmong` (`:404-406`) and the runaround guard (`:360`). A copied residue ref inside a subjectful derived feature cannot occur in Task 3 production; it exists only in the staged runaround fixtures, which do not call the auditor.
- **Task 4's saved code was inspected, not assumed.** `task-4-author-draft.md:937` carries `if (feature.kind === 'night-visit') expect(ref.nightVisit).toBeDefined();` as the first line of a block to be inserted "before its Task3 residue branch" (`:934`). `:892-901` preserves Task 3's three residue clauses before the three `nightVisit` clauses; `:923-927` preserves the conditional residue spread; `:981` adds `expect(ref.nightVisit).toBeUndefined()` inside Task 3's residue branch and extends the finder exclusion. The shared residue clauses are preserved in that widening.
- **Placement, for the Task 4 review to pin.** Both orders are correct by the trace above, because each precondition precedes its own value branch and the legacy path. Recommended canonical order: Task 3 precondition, Task 4 precondition, Task 4 `nightVisit` branch, Task 3 `residue` branch, legacy path, i.e. Task 4's block goes between draft `:1389` and `:1390`.
- **Prerequisite for the pending Task 4 review, not a Task 3 finding.** Night-visit features are subjectful, so a lead can be a night-visit feature and a runaround can copy its physical ref; a stripped copy would reach the legacy path and pass only when an asking twin exists. Inference for root's docket, not a mandate: at `dc114da` plus both drafts, no subjectful lead kind ever mints a null/null asking ref (carrier-profile, origin-vague, forged-document and brief leads carry a claim or message id), so a bounded Task 4 auditor rule "a runaround ref with both speech ids null must carry a physical marker" would close the seam without weakening any legacy assertion. Whether to adopt it is the Task 4 reviewer's and Ellie's call.

## New defects

None Critical. None Important in authored code. A1 above is the single required amendment. Minor carries for root's docket:

- (a) The corrupted-copy control asserts `toThrow()` without a pattern (`:1573`); non-vacuity is carried by the identical-world positive call at `:1568`. Root may tighten to `/lacks its residue discriminant/` after seeing the real message. Author's held item 3.
- (b) Three 3C2 fragments (auditor branch `:1387-1442`, fault controls `:1459-1516`, twin controls `:1524-1575`) have no compiler evidence from any session. Optional probe below.
- (c) The draft's Task 4 relay note (`:1738`) and author report item 2 say Task 4's precondition should land "before Task 3's residue branch"; the canonical order above resolves the ambiguity root's preflight flagged.

## Optional exact probe for root (safe; reads the draft only)

Saves nothing to production. Parses the three unparsed 3C2 fragments as syntax inside a shell that declares the free identifiers. Expected: empty diagnostics.

```js
// .superpowers/sdd/task-3-validation/parse-3c2-fragments.mjs
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const draft = readFileSync(process.argv[2], 'utf8');
const blocks = [...draft.matchAll(/^```ts\r?\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]);
const pick = (prefix) => {
  const found = blocks.filter((b) => b.trimStart().startsWith(prefix));
  if (found.length !== 1) throw new Error(`expected one block starting ${JSON.stringify(prefix)}, got ${found.length}`);
  return found[0];
};
const auditor = pick("if (feature.kind === 'arcane-residue')");
const faults = pick('function residueAuditWorld');
const twins = pick('/** The same witness heard an ordinary asking');
const shell = `import { describe, expect, it } from 'vitest';
declare const world: any; declare const feature: any; declare const ref: any;
declare const auditSketch: any, scryWorld: any, applyAction: any, step: any, runUntil: any, enemyDigest: any;
declare const cloneSerializable: any, STANDARD_RULES: any;
type WorldState = any; type SketchEvidenceRef = any; type SketchFeature = any;
function auditorFragment(): void { for (const _ of [0]) {\n${auditor}\n} }
${faults}
${twins}
`;
const out = ts.transpileModule(shell, { reportDiagnostics: true, fileName: 'fragments.ts',
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
process.stdout.write(JSON.stringify({ diagnostics: out.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')) }, null, 2) + '\n');
```

Invocation: `node .superpowers/sdd/task-3-validation/parse-3c2-fragments.mjs .superpowers/sdd/task-3-author-draft.md`. Syntax only; not a typecheck.

## Verdict and retained gates

**Approved-for-base-reconciliation.** Both original Important findings are closed by the authored corrections; the auditor precondition and its twin controls are correct and non-vacuous by trace; the seven added cases are license- and import-consistent and reconcile to 79. A1 must be applied at dispatch.

Explicitly **unverified and retained**: independent certification of the Task 2 source at `dc114da` and the R15/Task 2 code review; real RED then GREEN for every authored case; production typecheck, lint, and app build; the full suite against the 1780/114 baseline with per-test dispositions for any drop; save/replay equality; soak, Monte Carlo, and complete deterministic-report comparison; and independent review of the implemented code. Nothing in this proposal review certifies deployed gameplay, and no probe in it was executed by this reviewer.

## Progress log

- [x] Read mapped collaboration/review context (partnership, machine.local, claude binding, workspace-AGENTS, orchestrate skill and SDD annex); memory/ not read.
- [x] Read initial review, author report, recovery checkpoint, controller preflight, source confirmation, corrected draft in full.
- [x] Scope 1: `sameRefs` residue identity re-review.
- [x] Scope 2: runaround nested residue copy re-review.
- [x] Scope 3: auditor precondition and twin controls; fourteen faults and both positive paths traced.
- [x] Scope 4: seven-case consistency, count reconciliation, document-marker reconciliation at `dc114da`, forensics seam amendment A1.
- [x] Scope 5: Task 4 seam bounded from saved code.
- [x] Verdict and retained gates.
