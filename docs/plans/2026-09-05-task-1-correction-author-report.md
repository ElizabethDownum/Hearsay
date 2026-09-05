# R12/R13 correction author report

Authored-by: native Codex GPT-6 agent, inherited model; no model override or Claude dispatch.
Date: 2026-09-05. Plan: `task-1-final-correction-plan.md`.
Status: COMPLETE — exact code is ready for controller review and separate implementation;
both author self-reviews completed. This is not independent implementation approval.

## Binding constraints

- Author owns only this report and the plan; no source/test/index/commit/child/network changes.
- Implementation is separately authorized only on the exact file set and commit units in the plan.
- P9-2: “Only while held” governs minting, not lifetime. Exactly one new anchor site,
  deliverDocument, with actual helper callers binding-checked as before.
- P9-3: same-belief monotone max-of-min remains production physics unchanged.
- P9-4: preserve the declared syntactic/API/sink surface and accepted checker-disconnected
  holder-flow residual; no claim of universal static completeness.
- R12: a credence read can carry an anchor. It must never serve as a proven ceiling.
  Retention requires the same stable checker binding/member path and no visible side effects.
- R13: venue/NPC disjointness survives default/custom/empty avatar enrollment atomically;
  empty shared IDs are rejected by initial builder and validator.
- R14 controller ruling: “actual object property context must resolve by checker binding to
  the existing TurnEvidence declaration from src/sim/scenario/types.ts; only a direct governed
  credence read is licensed.” The site remains counted/recorded, never bounded or newly anchored.
  Casts, anonymous/lookalike records, Belief destinations, arithmetic/calls/new weights do not
  acquire this reporting privilege. Future reporting types require separate review.
- Controller also approved distinct direct sink-parameter forwarding and checker-bound
  stable numeric leaves as necessary consequences of correcting the false bounded premise.
- No physics, save schema, seeds, formulas, thresholds, artifact production behavior, or
  unrelated docs change. Preserve all inherited correct behavior and all existing tests.
- Enforcement tests first; raw native-exit RED/GREEN logs; scoped `git commit -F` per unit.
  Final test/lint/typecheck/build plus complete soak/MC report equality and separate frontier review.
- Emergent-behavior assertions are hypotheses. Failing acceptance → STOP and report with evidence;
  never weaken thresholds/formulas/physics/seeds or edit the spec. Untraceable suite failure → BLOCKED.
- No replace-not-merge config is touched. If any scope change later touches it, every scoped block
  must carry all law groups and each law must have a firing proof.

## Primary evidence inspected

Canonical partnership, machine/Codex contexts, workspace loader, shared durable core and
Hearsay index/handoff; canonical author skill and template; project-local handoff; complete
R12/R13 independent review; current plan; prior fix2 brief/review mandate; P9-2/3/4;
actual scanner extraction/classification/caller pins; propagation and reactions writes;
referee/TurnEvidence source; builder/enrollment/validator; existing world/player/artifact
tests and miniTown fixture; npm scripts and complete-report comparator.

Initial inspected HEAD 0241fc8 was source clean. Root later reported a docs-only checkpoint
ae1d5ac with the same caa5a38 game code and a fresh 1713/113 test/lint/typecheck/build pass.
This author has not run full tests, lint, build, soak or MC and does not claim those results
as independent author evidence.

## In-memory validation script

This script reads the proposed fenced code and transforms only an in-memory string of
the existing scanner. It does not write production, tests, temporary modules or configs.
The real TypeScript parser/checker and real engine text are used. It registers test
callbacks using a small assertion adapter, then executes the 17 new scanner proofs
by default or all 66 callbacks in this one scanner file with `--all`.
It also prints production verdict inventory. Native worker RED/GREEN logs are still required.

```js
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
const plan = fs.readFileSync('.superpowers/sdd/task-1-final-correction-plan.md', 'utf8');
const blocks = [...plan.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]);
let source = fs.readFileSync('tests/lint/evidence-hierarchy-law.test.ts', 'utf8');
const originalSource = source;
const baseline = process.argv.includes('--baseline');
const allScannerProofs = process.argv.includes('--all');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `one edit anchor: ${before.slice(0, 70)}`);
  source = source.replace(before, after);
};
const replaceFunction = (name, code) => {
  const ast = ts.createSourceFile('test.ts', source, ts.ScriptTarget.Latest, true);
  const found = ast.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(found, name);
  source = source.slice(0, found.getStart(ast)) + code + source.slice(found.end);
};
replace('  opaque: string | null;', '  opaque: string | null;\n  destination?: ts.Expression;');
replace('        found.push({ expr: node.right, opaque: operator === null ? null : COMPOUND_WRITE(operator) });', blocks[0].trimEnd());
replaceFunction('numericValueOf', blocks[1]);
replace('function insideDeclaredSink(node: ts.Node): boolean {', 'function insideDeclaredSink(node: ts.Expression, scan: Scan): boolean {');
replace('    return declared !== null && CREDENCE_SINKS[declared] === index;', blocks[2].trimEnd());
replace("type Verdict = 'bounded' | 'anchor' | 'not-a-number' | 'unprovable';", blocks[3].trimEnd());
replaceFunction('classify', blocks[4] + '\n' + blocks[5]);
replace('    for (const { expr, opaque } of credenceWrites(ast, scan)) {', '    for (const write of credenceWrites(ast, scan)) {\n      const { expr, opaque } = write;');
replace("      const verdict: Verdict = opaque === null ? classify(expr, scan) : 'unprovable';", '      const verdict = writeVerdict(write, scan);');
replace("      if (verdict === 'bounded' || verdict === 'not-a-number') continue;", blocks[6].trimEnd());
replace("      if (verdict === 'unprovable' && violations.length === before) {", blocks[7].trimEnd());
source = source.replaceAll('export const STANCE = { REPEAT: 0.5 };', 'export const STANCE = { REPEAT: 0.5 } as const;');
replace('export function copy(b: { credence: number }) { return { credence: b.credence }; }', 'export function copy(b: { credence: number }) { return { credence: Math.min(HEARSAY_CEILING, b.credence) }; }');
const shorthandStart = source.indexOf("  it('the shorthand INSIDE a declared sink stays lawful");
assert.ok(shorthandStart >= 0);
const shorthandEnd = source.indexOf('\n  });', shorthandStart) + 6;
const shorthandTest = source.slice(shorthandStart, shorthandEnd);
replace(shorthandTest, shorthandTest.replace("toEqual(['bounded'])", "toEqual(['forwarded'])"));
const endR12 = blocks[8].lastIndexOf('});');
const newTests = '\n' + blocks[8].slice(0, endR12) + blocks[10] + blocks[8].slice(endR12) + '\n' + blocks[9];
source = (baseline ? originalSource : source) + newTests;
const proposedSource = source;
source = source.replace(/^import .*;\r?\n/gm, '');
source = source.replace('const here = path.dirname(fileURLToPath(import.meta.url));', "const here = path.resolve('tests/lint');");
const cases = [];
let suite = '';
const describe = (name, fn) => { const parent = suite; suite = name; fn(); suite = parent; };
const it = (name, fn) => cases.push({ suite, name, fn });
const expect = (actual) => ({
  toEqual: (expected) => {
    if (Array.isArray(expected)) {
      assert.equal(actual.length, expected.length);
      expected.forEach((item, index) => {
        if (item && typeof item === 'object' && '__containsString' in item) {
          assert.ok(typeof actual[index] === 'string' && actual[index].includes(item.__containsString));
        } else assert.deepEqual(actual[index], item);
      });
    } else assert.deepEqual(actual, expected);
  },
  toBe: (expected) => assert.equal(actual, expected),
  toHaveLength: (length) => assert.equal(actual.length, length),
  toContain: (value) => assert.ok(actual.includes(value)),
  toBeGreaterThan: (value) => assert.ok(actual > value),
  toBeGreaterThanOrEqual: (value) => assert.ok(actual >= value),
  toBeTruthy: () => assert.ok(actual),
  toBeUndefined: () => assert.equal(actual, undefined),
});
expect.stringContaining = (part) => ({ __containsString: part });
const js = ts.transpileModule(source + '\nreturn { live, programOf };', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const result = new Function('ts', 'fs', 'path', 'HEARSAY_CEILING', 'ARTIFACT_CREDENCE', 'describe', 'it', 'expect', js)(ts, fs, path, 0.95, 0.97, describe, it, expect);
const redNames = /rejects typed copied anchors|rejects retained reads|rejects different members|previously lawful anonymous|shadowed numeric|forwards the sink|mutable numeric/;
const selected = cases.filter((entry) => (allScannerProofs || entry.suite.startsWith('R12') || entry.suite.startsWith('R14'))
  && (!baseline || redNames.test(entry.name)));
assert.equal(selected.length, baseline ? 7 : allScannerProofs ? 66 : 17);
for (const entry of selected) {
  try { entry.fn(); process.stdout.write(`PASS ${entry.name}\n`); }
  catch (error) { process.stdout.write(`FAIL ${entry.name}\n${error.stack}\n`); process.exitCode = 1; }
}
process.stdout.write(JSON.stringify(result.live, null, 2) + '\n');
if (baseline) process.exit(process.exitCode ?? 0);
const program = result.programOf([{ file: 'tests/lint/evidence-hierarchy-law.test.ts', text: proposedSource }]);
const diagnostics = ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.file?.fileName.replaceAll('\\', '/').endsWith('/tests/lint/evidence-hierarchy-law.test.ts'));
process.stdout.write(`SCANNER_DIAGNOSTICS ${diagnostics.length}\n`);
for (const diagnostic of diagnostics) process.stdout.write(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ') + '\n');
if (diagnostics.length) process.exitCode = 1;
```

## Executed author checks and limits

The script above was executed directly from this report's fenced text through
PowerShell stdin into `node --input-type=module -`. For baseline RED, append
`--baseline`; for the completed scanner compatibility pass, append `--all`.
Use a line-anchored fence extractor, because the JavaScript contains triple-backtick
tokens in its regex. The correct PowerShell extraction is:

```powershell
$report = Get-Content -Raw -LiteralPath '.superpowers/sdd/task-1-final-correction-author-report.md'
$scriptText = [regex]::Match($report, '(?ms)^```js\r?\n(.*?)^```\r?$').Groups[1].Value
$scriptText | node --input-type=module - --all
```

Measured outcomes, in actual execution order:

1. The first proposal probe passed 16/17 new checks and returned one live violation:
   firstHearing's shorthand was unprovable. This was an author defect: checking a
   shorthand identifier with getSymbolAtLocation gives its property symbol, not the
   referenced parameter. The final plan uses getShorthandAssignmentValueSymbol.
2. Corrected proposal passed 17/17 new checks, zero live violations and zero scanner
   TypeScript diagnostics. A second run after narrowing retention's call purity proof
   also passed 17/17. A mutable local alias of Math.max is now rejected for retention.
3. The unchanged scanner plus seven new negative fixtures returned native exit 1 for
   seven real assertion failures. Exact observed disagreements included copied anchors
   labeled bounded four times; fake-cap diagnostics 2 vs expected 5; unsafe targets 0 vs 9;
   shadowed numeric bounds 0 vs 2; sink forwarding all bounded; mutable numeric bounds 0
   vs 2; anonymous copied credence bounded instead of possibly-anchored.
4. The compatibility pass over all 66 scanner callbacks caught one remaining author
   omission: the inherited shorthand test explicitly expected bounded. The plan now
   changes that assertion to forwarded while retaining its zero-diagnostic proof.
   The custom probe adapter also lacked Vitest's stringContaining matcher; the report
   adapter gained that matcher (no production or test change for this probe limitation).
5. The final compatibility pass returned native exit 0: **66/66 callbacks passed**,
   including the 49 inherited tests and 17 new tests. **SCANNER_DIAGNOSTICS 0**.

The final live sweep, measured against the in-memory proposed scanner and actual
engine text, has **12 sites**, **zero violations**, and this exact verdict inventory:

| Verdict | Count | Location / purpose |
|---|---:|---|
| bounded | 5 | applyInject; resolvePlayerSpeech; capped firstHearing call in ingest; vignette apply; worldFromTown |
| anchor | 1 | artifacts.ts / deliverDocument |
| retained | 2 | reactions.ts / reactToSelfRumor; propagation.ts / ingest |
| forwarded | 2 | propagation.ts / firstHearing and ingestEvidence |
| recorded | 1 | scenario/referee.ts / councilTurns |
| not-a-number | 1 | glossary credence row |
| possibly-anchored / unprovable | 0 | no unlicensed live sites |

The existing helper-reference proofs also passed, including exact callers
applyPlant/applyShow/resolveArtifacts/resolveArtifacts and all alias/call/apply/bind/
export/value/unauthorized-call firing tests. The sole name above the ceiling remains
ARTIFACT_CREDENCE. The scan was not made silent by changing game physics.

Two command-launch mistakes occurred before useful probes: the first report extractor
stopped at a backtick token inside JavaScript, and the first baseline invocation omitted
Node's stdin `-`. Both produced syntax/module-loader failures and are expressly NOT
counted as RED evidence. The corrected invocations above produced the reported results.

No full suite, native Vitest run, lint/build/soak/MC run, production edit or temporary
test file was performed by this author. In-memory callback assertions and a TypeScript
overlay are useful author checks, not substitutes for the implementation worker's raw
native RED/GREEN logs and the independent review gates.

## Author self-review 1 — mechanism first

Completed over extraction → proof → composition → reporting → tests → gates.

- Termination: stableReference recursively consumes a receiver; wrappers strictly move
  inward; composition visits finite child AST nodes; the added declaration lookup scans
  only source-file top-level statements. No loop depends on resetting gameplay state.
- Magnitude: ceilings 0.95 / anchor 0.97 are actual exports; STANCE is actual `as const`
  object. Candidate 0.96 examples stay unsafe; no production numeric value changes.
- Binding/API provenance: APIs are present in the installed TypeScript declarations;
  overlay compilation yielded zero diagnostics. In-memory evaluation caught the
  shorthand-symbol mistake instead of delegating it to an implementer.
- Target identity: same checker-root-symbol plus static member sequence; equal spelling
  across scopes fails; aliases/dynamic indexes/getters/calls cannot establish retention.
  The complete numeric RHS must be side-effect-free, including capped subexpressions.
- Composition: retained/forwarded/recorded never satisfy the bounded-min branch. Only
  bounded proves a cap, only anchor enters the new-anchor inventory. Nested unsafe
  max/min examples fire; real outer ceiling caps remain lawful.
- Metadata: actual canonical Belief and TurnEvidence interface symbols are required;
  source/record casts and lookalike names fail. The production inventory is exactly one;
  an outcome value copied back to a belief fails. No new reporting schema is inferred.
- Scope: the second reporting disposition is controller-approved R14; direct forwarding
  and stable numeric bindings are controller-approved consequences. No other scan surface,
  helper reference rule or production physics change was introduced.

## Author self-review 2 — reverse task order, acceptance first

Completed bottom-up over final gate → H2 controls → H2 guards → H1 old tests → H1 new
tests → proof leaves → scope/header. The compatibility pass above is evidence from
this second reading order, not an independent reviewer claim.

- Gates and count arithmetic: root confirmed baseline 1713/113. Controller allowed H2
  first while H1 validation continued. H2 +7 =1720; H1 +17 =1737, 113 files throughout.
  Existing scanner tests remain49; the final scanner file contains 66. The anonymous
  copy previously called lawful survives as an explicit rejection test. The shorthand
  expectation changes its verdict, not its lawful forwarding assertion. No tests retire.
- H2: the venue guard precedes avatar construction and all writes to npcs, beliefs,
  playerId/playerVenue. Full-world twins pin default/custom/empty collisions and the
  existing NPC guard. Empty shared fixture IDs are tested in builder and validator;
  fixture immutability is pinned. Positive custom/empty noncolliding IDs remain legal.
- Artifact consequence: existing avatar one-shot hint/re-show and whole-world replay
  pins now assert the namespace premise. Their schedules, timings and outcome assertions
  stay unchanged; there is no newly hand-simulated artifact sequence.
- H1 compatibility: all 49 old callbacks remain, with the explicit justified changes
  described above; all 17 new callbacks pass under actual TypeScript checker resolution.
  Opaque write diagnostics and compound-operator enumeration are unchanged.
- Conservative edges: numeric locals need const bindings; numeric object members need
  the checked literal type plus a const owner. Typed structural lies/runtime accessors
  and checker-disconnected alias flows are not claimed solved. Retention intentionally
  refuses unneeded forms (for example min involving only retained operands).
- Placeholder/scope/ambiguity scan: no unfinished code or alternative implementation
  branch remains. Exact sources are base 0241fc8/caa5a38 with docs-only dispatch base
  ae1d5ac; root must resolve H2's new hash before H1 dispatch. Source overlap is a stop
  condition; unrelated controller docs are preserved. No author implementation occurred.

## Handoff

Plan ready for root's exact-code review. Required execution order is now H2 → H1;
H2's separately extracted brief may already be running under controller ownership.
The root owns final review/HTML docket updates and dispatch identity. No concrete
authoring blocker remains. Both the plan and this report are the only paths written
by this author. No shared AI repository writes or index operations were performed.
