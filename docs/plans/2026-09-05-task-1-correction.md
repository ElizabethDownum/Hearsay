# Plan 9 Task 1 — bounded R12/R13 correction, with R14 reporting clarification

**Authored-by:** native Codex GPT-6 agent, inherited model (no explicit model override).
**Date:** 2026-09-05. **Status:** proposed complete code; controller must review before dispatch.
**Base:** `0241fc8b82a633856a47c625d2b807753e9fa138`; prior game-code HEAD `caa5a38fa6470082c2171024028bbe7a1a8556a7`.
**Resolved dispatch base:** `ae1d5ac5e02762f9a5402a1030099b3d33f6953d` (controller docs only; same game code; re-verify at dispatch).
**Spec:** `docs/plans/plan-9-current.md`, `docs/review/prior-decisions.md` P9-2/3/4,
`docs/review/2026-09-05-artifact-recovery-review.md` R12/R13, controller's R14 clarification recorded in the author report.
**Constraints:** `task-1-final-correction-author-report.md`, Binding constraints section (the author is licensed exactly two output paths).
**Dependency order:** H2 commit → H1 commit → full gates and complete-block comparison → independent frontier review.
The controller authorized H2 first while H1 author validation finishes; they have no code dependency.
**Gate:** `npm test`; `npm run lint`; `npm run typecheck`; `npm run app:build`; `npm run soak`; `npm run mc`; complete-block comparator below.

## Premises and exact scope

This changes only the scanner and world namespace guards. No rumor/artifact physics,
save shape, seeds, formulas, thresholds, or helper caller inventory changes. R12 and
R13 are plan-mandated defects, at their original full severity. Existing G1–G4 work
is retained. No universal alias/data-flow completeness is claimed.

The current write survey is: actions.ts:196 and phases.ts:419 literal 0.85 records;
world/attach.ts:53 and vignettes/engine.ts:96 literal 0.95 records;
propagation.ts:firstHearing shorthand forwards its governed input; ingest's
firstHearing argument is explicitly capped; ingestEvidence forwards its input;
artifacts.ts:deliverDocument supplies the sole new anchor; reactions.ts:70 and
propagation.ts:205 retain their own previous credence with a bounded candidate;
scenario/referee.ts:52 projects a Belief value into TurnEvidence for outcomes;
content/terms.ts is the existing nonnumeric glossary record. The three Object.assign
targets remain InjectSpec, invitation payload, and Partial<Claim>, not credence carriers.

R14 is an explicit controller adjudication: the existing, checker-bound TurnEvidence
report projection is a separate recorded-value site. It is never bounded and never
a new anchor. No other metadata interface acquires this privilege by resemblance.

Baseline is the root's fresh gate, with floor 1713 tests /113 files. Before changes,
verify HEAD, `git status --short`, relevant source hashes, and the root's baseline log.
Only source/test overlaps block this work; preserve unrelated controller docs.

## H1 — provenance instead of the false ceiling proof

**Model:** `frontier_implementer` (separate `frontier_reviewer` after both units).
**Files:** `tests/lint/evidence-hierarchy-law.test.ts` only.
**Commit subject:** `test: distinguish retained and recorded credence from new anchors`

The proof has eight verdicts: bounded, anchor, possibly-anchored, retained, forwarded,
recorded, not-a-number, and unprovable. `bounded` alone proves a
ceiling. `anchor` alone counts as a new anchor. `retained` proves a side-effect-free
read/update of the same checker binding and static member path. `forwarded` is a
direct declared-sink parameter whose input sites remain audited. `recorded` is the
explicit R14 non-belief projection. `possibly-anchored` is reported at every other
uncapped read/copy. The sink forwarding correction is necessary because its input
can also be 0.97; forwarding cannot serve as a min cap.

Composition is deliberately small: min with a genuinely bounded operand is bounded;
otherwise only all-anchor min is anchor. Every other min is unprovable. Max of only
bounded operands is bounded; max of bounded/anchor/retained with any anchor is anchor;
max of bounded/retained with any retained is retained. Other max expressions fail.
A retained verdict is accepted only if the complete expression passes the numeric
side-effect check. Thus `max(old, min(old, candidate))` fails, while the production
`max(old, min(ceiling, old + 0.15))` retains. A real outer cap can bound an otherwise
unsafe inner value. Retention never becomes a cap merely by nesting.

Stable identity is checker-root-symbol plus static member keys, normalizing dot and
literal brackets. No alias chase, dynamic index, optional access, call receiver,
getter/setter, assignment, increment, callback, or conversion-capable object operand
earns the new retention proof. Typed data properties are the declared boundary;
runtime getters hidden behind a structural data type and opaque alias flow are not
claimed solved. Existing strict typing and behavioral/replay pins remain backstops.

### Exact scanner edits

Add `destination?: ts.Expression` to `CredenceWrite` after `opaque`. Replace the
one assignment push inside `if (reach === 'credence')` with:

```ts
        found.push({
          expr: node.right, opaque: operator === null ? null : COMPOUND_WRITE(operator),
          ...(operator === null ? { destination: target } : {}),
        });
```

Replace the complete `numericValueOf` function with this block, including its helper:

```ts
/** Numeric leaves are resolved by binding; a same-spelled shadow is not a bound. */
function numericValueOf(expr: ts.Expression, scan: Scan): number | undefined {
  const target = unwrap(expr);
  if (ts.isNumericLiteral(target)) return Number(target.text);
  const declaration = boundSymbol(target, scan)?.valueDeclaration;
  if (declaration === undefined) return undefined;
  if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined
    && ts.isVariableDeclarationList(declaration.parent)
    && (declaration.parent.flags & ts.NodeFlags.Const) !== 0) {
    const value = unwrap(declaration.initializer);
    return ts.isNumericLiteral(value) ? Number(value.text) : undefined;
  }
  if (ts.isPropertyAssignment(declaration)) {
    const value = unwrap(declaration.initializer);
    let owner: ts.Node = declaration.parent;
    while (ts.isParenthesizedExpression(owner.parent) || ts.isAsExpression(owner.parent)
      || ts.isSatisfiesExpression(owner.parent) || ts.isTypeAssertionExpression(owner.parent)) {
      owner = owner.parent;
    }
    const variable = owner.parent;
    const checked = scan.checker.getTypeAtLocation(target);
    if (ts.isNumericLiteral(value) && (checked.flags & ts.TypeFlags.NumberLiteral) !== 0
      && ts.isVariableDeclaration(variable)
      && ts.isVariableDeclarationList(variable.parent)
      && (variable.parent.flags & ts.NodeFlags.Const) !== 0) return Number(value.text);
  }
  return undefined;
}
```

Change `insideDeclaredSink(node: ts.Node)` to `insideDeclaredSink(node: ts.Expression, scan: Scan)`.
Inside it replace its final return with:

```ts
    const parameter = fn.parameters[index];
    const reference = ts.isShorthandPropertyAssignment(node.parent)
      ? scan.checker.getShorthandAssignmentValueSymbol(node.parent) : boundSymbol(node, scan);
    return declared !== null && CREDENCE_SINKS[declared] === index
      && parameter !== undefined && ts.isIdentifier(parameter.name)
      && reference === scan.checker.getSymbolAtLocation(parameter.name);
```

Replace `type Verdict` with:

```ts
type Verdict = 'bounded' | 'anchor' | 'possibly-anchored' | 'retained'
  | 'forwarded' | 'recorded' | 'not-a-number' | 'unprovable';
```

Insert these helpers immediately before `classify`:

```ts
interface StableReference { root: ts.Symbol; members: string[] }

/** A bound local and static data-member path; no runtime lookup or accessor proof. */
function stableReference(expr: ts.Expression, scan: Scan): StableReference | null {
  const target = unwrap(expr);
  if (ts.isIdentifier(target)) {
    const root = boundSymbol(target, scan);
    const declaration = root?.valueDeclaration;
    return root !== undefined && declaration !== undefined
      && (ts.isVariableDeclaration(declaration) || ts.isParameter(declaration)
        || ts.isBindingElement(declaration)) ? { root, members: [] } : null;
  }
  if (!ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target)) return null;
  if (target.questionDotToken !== undefined) return null;
  const key = ts.isPropertyAccessExpression(target) ? target.name.text : literalKey(target.argumentExpression);
  if (key === null) return null;
  const type = scan.checker.getTypeAtLocation(target.expression);
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) return null;
  const member = scan.checker.getPropertyOfType(scan.checker.getApparentType(type), key);
  const declarations = member?.declarations ?? [];
  if (declarations.length === 0 || !declarations.every((declaration) =>
    ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)
    || ts.isPropertyAssignment(declaration) || ts.isShorthandPropertyAssignment(declaration))) return null;
  const base = stableReference(target.expression, scan);
  return base === null ? null : { root: base.root, members: [...base.members, key] };
}

function sameStableReference(a: ts.Expression, b: ts.Expression, scan: Scan): boolean {
  const left = stableReference(a, scan);
  const right = stableReference(b, scan);
  return left !== null && right !== null && left.root === right.root
    && left.members.length === right.members.length
    && left.members.every((key, index) => key === right.members[index]);
}

/** Retention also requires evaluating the other operands without changing the target. */
function sideEffectFreeNumeric(expr: ts.Expression, scan: Scan): boolean {
  const target = unwrap(expr);
  const type = scan.checker.getTypeAtLocation(target);
  if ((type.flags & ts.TypeFlags.NumberLike) === 0) return false;
  if (ts.isNumericLiteral(target)) return true;
  if (ts.isIdentifier(target) || ts.isPropertyAccessExpression(target)
    || ts.isElementAccessExpression(target)) return stableReference(target, scan) !== null;
  if (ts.isBinaryExpression(target)) {
    return !isAssignmentOperator(target.operatorToken.kind)
      && target.operatorToken.kind !== ts.SyntaxKind.CommaToken
      && sideEffectFreeNumeric(target.left, scan) && sideEffectFreeNumeric(target.right, scan);
  }
  if (ts.isPrefixUnaryExpression(target)) {
    return (target.operator === ts.SyntaxKind.PlusToken || target.operator === ts.SyntaxKind.MinusToken
      || target.operator === ts.SyntaxKind.TildeToken) && sideEffectFreeNumeric(target.operand, scan);
  }
  if (ts.isCallExpression(target)) {
    const callee = standardLibraryCallee(target.expression, scan);
    const fn = unwrap(target.expression);
    const receiver = ts.isPropertyAccessExpression(fn) ? unwrap(fn.expression) : undefined;
    const declarations = receiver !== undefined && ts.isIdentifier(receiver)
      ? boundSymbol(receiver, scan)?.declarations ?? [] : [];
    if (declarations.length === 0 || !declarations.every((declaration) =>
      scan.program.isSourceFileDefaultLibrary(declaration.getSourceFile()))) return false;
    return (callee === 'Math.min' || callee === 'Math.max')
      && target.arguments.length > 0
      && target.arguments.every((argument) => sideEffectFreeNumeric(argument, scan));
  }
  return false;
}

/** Canonical interface binding, not a type's printed name or structural resemblance. */
function interfaceSymbol(scan: Scan, file: string, name: string): ts.Symbol | undefined {
  const source = scan.program.getSourceFile(absolute(file));
  const declaration = source?.statements.find((statement) =>
    ts.isInterfaceDeclaration(statement) && statement.name.text === name);
  return declaration !== undefined && ts.isInterfaceDeclaration(declaration)
    ? scan.checker.getSymbolAtLocation(declaration.name) : undefined;
}

/** R14: only a direct Belief read into the actual TurnEvidence outcome record. */
function recordsTurnEvidence(expr: ts.Expression, scan: Scan): boolean {
  if (!ts.isPropertyAccessExpression(expr) && !ts.isElementAccessExpression(expr)) return false;
  if (credenceTarget(expr, scan) !== 'credence' || stableReference(expr, scan) === null) return false;
  let asserted = false;
  const checkAssertion = (node: ts.Node): void => {
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)
      || ts.isSatisfiesExpression(node)) asserted = true;
    ts.forEachChild(node, checkAssertion);
  };
  checkAssertion(expr);
  if (asserted) return false;
  const property = expr.parent;
  if (!ts.isPropertyAssignment(property) || property.initializer !== expr
    || writtenName(property.name).name !== 'credence') return false;
  const literal = property.parent;
  if (!ts.isObjectLiteralExpression(literal)) return false;
  let outer: ts.Node = literal.parent;
  while (ts.isParenthesizedExpression(outer)) outer = outer.parent;
  if (ts.isAsExpression(outer) || ts.isTypeAssertionExpression(outer)
    || ts.isSatisfiesExpression(outer)) return false;
  const context = scan.checker.getContextualType(literal);
  const report = interfaceSymbol(scan, 'src/sim/scenario/types.ts', 'TurnEvidence');
  const belief = interfaceSymbol(scan, 'src/sim/types.ts', 'Belief');
  return context !== undefined && report !== undefined && belief !== undefined
    && scan.checker.getNonNullableType(context).getSymbol() === report
    && scan.checker.getNonNullableType(scan.checker.getTypeAtLocation(expr.expression)).getSymbol() === belief;
}
```

Replace `classify` completely with:

```ts
function classify(expr: ts.Expression, scan: Scan, destination?: ts.Expression): Verdict {
  const target = unwrap(expr);
  if (provablyNotNumeric(target)) return 'not-a-number';
  if (isAnchorReference(target, scan)) return 'anchor';

  // A visible credence can carry 0.97. It cannot prove a ceiling for another value.
  if (credenceTarget(target, scan) === 'credence') {
    return destination !== undefined && sameStableReference(destination, target, scan)
      ? 'retained' : 'possibly-anchored';
  }

  const value = numericValueOf(target, scan);
  if (value !== undefined) return value <= HEARSAY_CEILING ? 'bounded' : 'unprovable';
  if (ts.isIdentifier(target) && target.text === 'credence' && insideDeclaredSink(target, scan)) {
    return 'forwarded';
  }

  if (ts.isCallExpression(target) && target.arguments.length > 0) {
    const callee = standardLibraryCallee(target.expression, scan);
    const operands = target.arguments.map((argument) => classify(argument, scan, destination));
    if (callee === 'Math.min') {
      if (operands.includes('bounded')) return 'bounded';
      return operands.every((operand) => operand === 'anchor') ? 'anchor' : 'unprovable';
    }
    if (callee === 'Math.max') {
      if (operands.every((operand) => operand === 'bounded')) return 'bounded';
      if (operands.every((operand) => operand === 'bounded' || operand === 'anchor' || operand === 'retained')
        && operands.includes('anchor')) return 'anchor';
      if (operands.every((operand) => operand === 'bounded' || operand === 'retained')
        && operands.includes('retained')) return 'retained';
    }
  }
  return 'unprovable';
}

function writeVerdict(write: CredenceWrite, scan: Scan): Verdict {
  if (write.opaque !== null) return 'unprovable';
  const verdict = classify(write.expr, scan, write.destination);
  if (verdict === 'retained' && !sideEffectFreeNumeric(write.expr, scan)) return 'unprovable';
  if (verdict === 'possibly-anchored' && recordsTurnEvidence(write.expr, scan)) return 'recorded';
  return verdict;
}
```

In `auditCredencePaths`, replace the inner loop's opening destructure with
`for (const write of credenceWrites(ast, scan)) {`, then add
`const { expr, opaque } = write;` and replace the verdict assignment with
`const verdict = writeVerdict(write, scan);`. Replace its early continuation with:

```ts
      if (verdict === 'bounded' || verdict === 'not-a-number' || verdict === 'retained'
        || verdict === 'forwarded' || verdict === 'recorded') continue;
```

Change the final diagnostic condition to:

```ts
      if ((verdict === 'unprovable' || verdict === 'possibly-anchored') && violations.length === before) {
```

Keep the diagnostic's existing text, numeric/name diagnostics, helper reference scanner,
operator range, API/write extraction, anchor filtering and all other behavior unchanged.

Update the misleading comments to describe these exact verdict meanings: replace the
`insideDeclaredSink` block comment with “A direct reference to the declared sink's own
parameter forwards an already audited input; that input may be bounded or anchored.”
Replace the old four-verdict comment with the eight meanings above. Replace the large
comment immediately before `classify` with the composition paragraph above. In the
C-1 fixture overview remove “a credence read” from the list of bounded shapes. Replace
“max-of-min, every operand bounded” with “max-of-min retains the same target; the inner
min alone is bounded”. Replace the file header's “one class and one class only” claim
with “The accepted residual is checker-disconnected holder flow; this scan does not
claim universal alias or runtime accessor analysis. The explicit R14 TurnEvidence
projection is counted as recorded, not treated as a belief write or a proven bound.”

In the existing test `stays silent on every bounded shape the engine really uses, the
P9-3 monotone guard included`, change the object-copy fixture to the explicitly capped
control `export function copy(b: { credence: number }) { return { credence: Math.min(HEARSAY_CEILING, b.credence) }; }`.
Its six-site and empty-diagnostic assertions stay; this is a correction to a previously
false lawful control, not test retirement. Preserve its old anonymous-object case in
the explicit R14 anonymous-copy rejection below. Change the two existing injected
`export const STANCE = { REPEAT: 0.5 };` lines to `export const STANCE = { REPEAT: 0.5 } as const;`
so they model the actual readonly production constant (propagation.ts:18), instead
of a mutable member that cannot prove a lasting bound. Rename that test to `stays silent on the
engine's bounded, retained and forwarded shapes`. Rename the earlier “bare credence
pass-through is bounded only” test to “bare credence pass-through is forwarded only”.

In the existing test `the shorthand INSIDE a declared sink stays lawful — the real
firstHearing shape`, change only its verdict assertion from
`expect(injected.records.map((r) => r.verdict)).toEqual(['bounded']);` to
`expect(injected.records.map((r) => r.verdict)).toEqual(['forwarded']);`. Keep its
zero-violation assertion. The test continues proving lawful forwarding and now names
its value correctly; its count is unchanged.

### H1 exact firing tests

Append the following new describe block after the existing law firing blocks (before
the P9-2 helper reference blocks is convenient). Add tests first and capture the raw
RED log before modifying scanner logic. New helper-focused assertions may throw until
their helper exists: the RED command below selects the actual audit fixtures first.

```ts
describe('R12 — credence provenance and same-target retention', () => {
  const B = 'interface Belief { credence: number }';
  const broken = (lines: readonly string[], count: number): void => {
    const result = audit([B, ...lines]);
    expect(result.sites).toBe(count);
    expect(result.violations).toHaveLength(count);
    for (const row of result.violations) expect(row.detail).toContain(UNPROVABLE);
  };

  it('rejects typed copied anchors in dot, literal element, object and sink positions', () => {
    const result = audit([
      B,
      'const source: Belief = { credence: ARTIFACT_CREDENCE };',
      'export function copy(destination: Belief, w: unknown, id: string, h: unknown) {',
      '  destination.credence = source.credence;',
      "  destination['credence'] = source['credence'];",
      '  const composed: Belief = { credence: source.credence };',
      '  ingestEvidence(w, id, h, source.credence);',
      '  return composed;',
      '}',
    ]);
    expect(result.sites).toBe(5);
    expect(result.records.map((row) => row.verdict))
      .toEqual(['anchor', 'possibly-anchored', 'possibly-anchored', 'possibly-anchored', 'possibly-anchored']);
    expect(result.violations).toHaveLength(4);
    for (const row of result.violations) expect(row.detail).toContain(UNPROVABLE);
  });

  it('retains the same bound target through dot and literal member paths without calling it bounded', () => {
    const result = audit([
      B,
      'export function keep(b: Belief, holder: { belief: Belief }) {',
      '  b.credence = Math.max(b.credence, Math.min(HEARSAY_CEILING, b.credence + 0.15));',
      "  b['credence'] = Math.max(b.credence, 0.5);",
      "  holder.belief.credence = Math.max(holder['belief']['credence'], 0.5);",
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['retained', 'retained', 'retained']);
    expect(result.violations).toEqual([]);
    expect(result.records.filter((row) => row.verdict === 'anchor')).toHaveLength(0);
  });

  it('allows a true nested ceiling cap on a cross-target read', () => {
    const result = audit([
      B,
      'export function cap(destination: Belief, source: Belief, candidate: number) {',
      '  destination.credence = Math.min(HEARSAY_CEILING, Math.max(source.credence, candidate));',
      '  return { credence: Math.min(HEARSAY_CEILING, source.credence) };',
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['bounded', 'bounded']);
    expect(result.violations).toEqual([]);
  });

  it('rejects retained reads used as fake caps and unsafe nested min/max composition', () => {
    broken([
      'export function bad(b: Belief, other: Belief, candidate: number) {',
      '  b.credence = Math.min(b.credence, candidate);',
      '  b.credence = Math.max(b.credence, Math.min(b.credence, candidate));',
      '  b.credence = Math.max(b.credence, Math.min(ARTIFACT_CREDENCE, candidate));',
      '  b.credence = Math.max(b.credence, other.credence);',
      '  b.credence = Math.max(b.credence, HEARSAY_CEILING + 0.01);',
      '}',
    ], 5);
  });

  it('rejects different members, aliases, dynamic lookups, getters and side effects', () => {
    broken([
      'export function bad(left: Belief, right: Belief, box: { a: Belief; b: Belief },',
      '  list: Belief[], pick: () => Belief, mutate: () => number) {',
      '  const alias = left;',
      '  left.credence = Math.max(right.credence, 0.5);',
      '  left.credence = Math.max(alias.credence, 0.5);',
      '  box.a.credence = Math.max(box.b.credence, 0.5);',
      '  list[0].credence = Math.max(list[0].credence, 0.5);',
      '  pick().credence = Math.max(pick().credence, 0.5);',
      '  left.credence = Math.max(left.credence, Math.min(HEARSAY_CEILING, mutate()));',
      '  left.credence = Math.max(left.credence, Math.min(HEARSAY_CEILING, (left = right, left.credence)));',
      '  let maximum = Math.max; maximum = mutate;',
      '  left.credence = maximum(left.credence, 0.5);',
      '}',
      'export function accessor(box: { get belief(): Belief; set belief(value: Belief) }) {',
      '  box.belief.credence = Math.max(box.belief.credence, 0.5);',
      '}',
    ], 9);
  });

  it('compares target root bindings, so equal spellings in different scopes differ', () => {
    const scan = scanOf([{ file: 'ghost.ts', text: [
      B,
      'export function outer(b: Belief) { return b.credence; }',
      'export function inner(b: Belief) { return b.credence; }',
    ].join('\n') }]);
    const reads: ts.PropertyAccessExpression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'credence') reads.push(node);
      ts.forEachChild(node, visit);
    };
    visit(scan.files[0]!.ast);
    expect(reads).toHaveLength(2);
    expect(sameStableReference(reads[0]!, reads[0]!, scan)).toBe(true);
    expect(sameStableReference(reads[0]!, reads[1]!, scan)).toBe(false);
  });

  it('does not use a shadowed numeric spelling as a ceiling proof', () => {
    broken([
      'const LIMIT = 0.5;',
      'export function bad(b: Belief, LIMIT: number) {',
      '  b.credence = Math.max(b.credence, LIMIT);',
      '  b.credence = Math.min(LIMIT, b.credence);',
      '}',
    ], 2);
  });

  it('forwards the sink parameter directly but cannot use it as a min cap', () => {
    const result = audit([
      B,
      'export function firstHearing(hearing: unknown, credence: number) {',
      '  void hearing; return { credence };',
      '}',
      'export function ingestEvidence(w: unknown, id: string, h: unknown, credence: number) {',
      '  void w; void id; firstHearing(h, credence);',
      '  return { credence: Math.min(credence, HEARSAY_CEILING + 0.01) };',
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['forwarded', 'forwarded', 'unprovable']);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.detail).toContain(UNPROVABLE);
  });

  it('still counts a new anchor inside a max that also reads the same target', () => {
    const result = audit([B,
      'export function mint(b: Belief) { b.credence = Math.max(b.credence, ARTIFACT_CREDENCE); }',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['anchor']);
    expect(result.records.filter((row) => row.verdict === 'anchor').map((row) => row.within))
      .toEqual(['mint']);
  });

  it('the production retention and reporting inventories are exact and never bounded', () => {
    expect(live.records.filter((row) => row.verdict === 'retained')
      .map((row) => ({ file: row.file, within: row.within })).sort((a, b) => a.file.localeCompare(b.file)))
      .toEqual([
        { file: 'src/sim/reactions.ts', within: 'reactToSelfRumor' },
        { file: 'src/sim/rumors/propagation.ts', within: 'ingest' },
      ]);
    expect(live.records.filter((row) => row.verdict === 'recorded')
      .map((row) => ({ file: row.file, within: row.within })))
      .toEqual([{ file: 'src/sim/scenario/referee.ts', within: 'councilTurns' }]);
    expect(live.records.filter((row) => row.verdict === 'possibly-anchored')).toEqual([]);
  });
});
```

Append this second new block (all sources remain in-memory):

```ts
describe('R14 — only the declared outcome projection records a credence', () => {
  const TYPES = [
    "import type { Belief } from './src/sim/types';",
    "import type { TurnEvidence } from './src/sim/scenario/types';",
  ];

  it('records a direct typed Belief read without calling it bounded or newly anchored', () => {
    const result = audit([...TYPES,
      'export function report(b: Belief): TurnEvidence {',
      "  return { npc: 'ada', family: b.claim.family, claimId: b.claim.id, credence: b.credence };",
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['recorded']);
    expect(result.violations).toEqual([]);
  });

  it('the previously lawful anonymous object copy is an explicit rejection', () => {
    const result = audit([
      'export function copy(b: { credence: number }) { return { credence: b.credence }; }',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['possibly-anchored']);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.detail).toContain(UNPROVABLE);
  });

  it('a lookalike TurnEvidence name does not acquire the canonical reporting permission', () => {
    const result = audit([
      'interface TurnEvidence { npc: string; family: string; claimId: string; credence: number }',
      'export function report(b: { credence: number }): TurnEvidence {',
      "  return { npc: 'ada', family: 'f', claimId: 'c', credence: b.credence };",
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['possibly-anchored']);
    expect(result.violations).toHaveLength(1);
  });

  it('casts on the record or on its source cannot grant reporting permission', () => {
    const result = audit([...TYPES,
      'export function a(b: Belief) {',
      "  return ({ npc: 'ada', family: b.claim.family, claimId: b.claim.id, credence: b.credence }) as TurnEvidence;",
      '}',
      'export function c(b: Belief): TurnEvidence {',
      "  return { npc: 'ada', family: b.claim.family, claimId: b.claim.id, credence: (b as Belief).credence };",
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['possibly-anchored', 'possibly-anchored']);
    expect(result.violations).toHaveLength(2);
  });

  it('an ungoverned carrier, arithmetic, calls and new weights are not recorded reads', () => {
    const result = audit([...TYPES,
      'export function a(b: { credence: number }): TurnEvidence {',
      "  return { npc: 'ada', family: 'f', claimId: 'c', credence: b.credence };",
      '}',
      'export function c(b: Belief): TurnEvidence {',
      "  return { npc: 'ada', family: 'f', claimId: 'c', credence: b.credence + 0.01 };",
      '}',
      'export function d(read: () => number): TurnEvidence {',
      "  return { npc: 'ada', family: 'f', claimId: 'c', credence: read() };",
      '}',
      'export function e(): TurnEvidence {',
      "  return { npc: 'ada', family: 'f', claimId: 'c', credence: 0.96 };",
      '}',
      'export function f(): TurnEvidence {',
      "  return { npc: 'ada', family: 'f', claimId: 'c', credence: ARTIFACT_CREDENCE };",
      '}',
    ]);
    expect(result.records.map((row) => row.verdict))
      .toEqual(['possibly-anchored', 'unprovable', 'unprovable', 'unprovable', 'anchor']);
    expect(result.records.filter((row) => row.verdict === 'recorded')).toEqual([]);
    expect(result.violations).toHaveLength(4);
    expect(result.records.filter((row) => row.verdict === 'anchor').map((row) => row.within)).toEqual(['f']);
  });

  it('a recorded outcome value copied back into a belief still fires', () => {
    const result = audit([...TYPES,
      'export function back(destination: Belief, report: TurnEvidence) {',
      '  destination.credence = report.credence;',
      '}',
    ]);
    expect(result.records.map((row) => row.verdict)).toEqual(['possibly-anchored']);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.detail).toContain(UNPROVABLE);
  });
});
```

Add one further R12 test after the shadowed-numeric test:

```ts
  it('mutable numeric locals and object members cannot prove a ceiling', () => {
    broken([
      'let limit = 0.5;',
      'const band = { repeat: 0.5 };',
      'export function bad(b: Belief, value: number) {',
      '  limit = value; band.repeat = value;',
      '  b.credence = Math.max(b.credence, limit);',
      '  b.credence = Math.max(b.credence, band.repeat);',
      '}',
    ], 2);
  });
```

Tests-first command (log exact native exit before reading output):
`npx vitest run tests/lint/evidence-hierarchy-law.test.ts -t "rejects typed copied anchors|rejects retained reads|rejects different members|previously lawful anonymous|shadowed numeric|forwards the sink|mutable numeric"`.
It must fail on actual expectations about the old audit, not a loader/type/syntax
error. After the scanner edits run the complete scanner file, then `npm run typecheck`
and `npx eslint tests/lint/evidence-hierarchy-law.test.ts`. H1 adds **17 tests**
(11 R12, 6 R14) and alters no existing test count: after H2's 1720 baseline, expected floor **1737/113**.

## H2 — enrollment preserves the disjoint namespace atomically

**Model:** `frontier_implementer` (serial; controller may use the same worker for H1 later).
**Files:** `src/sim/world.ts`, `src/world/validate.ts`, `tests/sim/player.test.ts`,
`tests/world/validate.test.ts`, `tests/sim/artifacts.test.ts`.
**Commit subject:** `fix: reject avatar and empty venue NPC id collisions before mutation`

In `buildWorld` change only `if (sharedId)` to `if (sharedId !== undefined)`.
Make the identical sharedId condition change in `validateTown`. The separate
same-namespace firstDuplicate checks are outside these two review findings.
In `enrollPlayer`, immediately after its existing `world.npcs[id]` guard and before
creating the avatar, insert:

```ts
  if (world.venues[id] !== undefined) throw new Error(`enrollPlayer: id '${id}' is already a venue`);
```

Change its doc comment's final phrase from “or an id already taken by an NPC” to
“or an id already taken by an NPC or venue”. No artifact production edit.

### Exact tests first

Inside `tests/world/validate.test.ts`'s `structural invariants` describe, immediately
after the two current cross-namespace tests, add:

```ts
  it('ids-unique rejects an empty shared id without mutating the town', () => {
    const t = town([npc(''), npc('b')], [venue('')]);
    const before = structuredClone(t);
    expect(validateTown(t, cfg()).failures).toContainEqual({
      invariant: 'ids-unique', detail: "venue and npc share id ''",
    });
    expect(t).toEqual(before);
  });

  it('buildWorld rejects an empty shared id without mutating its fixture', () => {
    const t = town([npc(''), npc('b')], [venue('')]);
    const before = structuredClone(t.fixture);
    expect(() => buildWorld(t.fixture, 'empty-cross-namespace-id'))
      .toThrow("buildWorld: venue and npc share id ''");
    expect(t.fixture).toEqual(before);
  });
```

Inside the existing `player groundwork` describe, after `double-enroll throws;
unknown home throws`, add these five tests. All mutation checks compare complete
worlds to independent twins; checking only playerId would miss partial writes.

```ts
  it('rejects the default you id when a venue owns it, before any mutation', () => {
    const fixture = miniTown();
    fixture.venues.push({ id: 'you', district: 'd0', access: 'public' });
    const world = buildWorld(fixture, 'avatar-default-venue-collision');
    const twin = buildWorld(fixture, 'avatar-default-venue-collision');
    expect(() => enrollPlayer(world, { home: 'square' }))
      .toThrow("enrollPlayer: id 'you' is already a venue");
    expect(world).toEqual(twin);
  });

  it('rejects a custom id owned by the home venue before any mutation', () => {
    const world = buildWorld(miniTown(), 'avatar-custom-venue-collision');
    const twin = buildWorld(miniTown(), 'avatar-custom-venue-collision');
    expect(() => enrollPlayer(world, { id: 'square', home: 'square' }))
      .toThrow("enrollPlayer: id 'square' is already a venue");
    expect(world).toEqual(twin);
  });

  it('rejects an empty id owned by a venue before any mutation', () => {
    const fixture = miniTown();
    fixture.venues.push({ id: '', district: 'd0', access: 'public' });
    const world = buildWorld(fixture, 'avatar-empty-venue-collision');
    const twin = buildWorld(fixture, 'avatar-empty-venue-collision');
    expect(() => enrollPlayer(world, { id: '', home: 'square' }))
      .toThrow("enrollPlayer: id '' is already a venue");
    expect(world).toEqual(twin);
  });

  it('the existing NPC id guard also leaves the complete world unchanged', () => {
    const world = buildWorld(miniTown(), 'avatar-npc-collision');
    const twin = buildWorld(miniTown(), 'avatar-npc-collision');
    expect(() => enrollPlayer(world, { id: 'ada', home: 'square' }))
      .toThrow("enrollPlayer: id 'ada' is already an npc");
    expect(world).toEqual(twin);
  });

  it('accepts unused custom and empty avatar ids while keeping namespaces disjoint', () => {
    for (const id of ['avatar', '']) {
      const world = buildWorld(miniTown(), 'avatar-unused-id');
      enrollPlayer(world, { id, name: 'Player', home: 'square' });
      expect(world.playerId).toBe(id);
      expect(world.playerVenue).toBe('square');
      expect(world.npcs[id]).toMatchObject({ id, name: 'Player', schedule: [], edges: [] });
      expect(world.beliefs[id]).toEqual({});
      expect(world.venues[id]).toBeUndefined();
      expect(Object.keys(world.npcs).filter((npcId) => world.venues[npcId] !== undefined)).toEqual([]);
    }
  });
```

Connect the invariant directly to existing artifact consequence tests without another
physics vehicle: in `tests/sim/artifacts.test.ts` add these two assertions immediately
after enrollment in both `trustsTheForger` and the M-1 replay `build` helper:

```ts
    expect(world.venues[world.playerId!]).toBeUndefined();
    expect(Object.keys(world.npcs).filter((id) => world.venues[id] !== undefined)).toEqual([]);
```

The existing avatar latch test already proves one re-show and one hint after eight
beats; the M-1 test proves re-show record, hint, and whole-world replay hash. These
now explicitly pin the namespace premise they depend on. Keep their timing and
artifact assertions unchanged.

RED command before either production guard changes:
`npx vitest run tests/world/validate.test.ts tests/sim/player.test.ts -t "empty shared id|default you id|custom id owned|empty id owned"`.
Expected five assertion failures: two missing cross-namespace rejections and three
missing enrollment rejections. A rejected invalid input must leave its full source
fixture/world unchanged. Then apply the exact three production guard edits and run
`npx vitest run tests/world/validate.test.ts tests/sim/player.test.ts tests/sim/artifacts.test.ts`,
`npm run typecheck`, and `npx eslint src/sim/world.ts src/world/validate.ts tests/world/validate.test.ts tests/sim/player.test.ts tests/sim/artifacts.test.ts`.
H2 adds **7 tests** (2 validator/builder +5 player); artifact tests gain assertions
only. H2 first raises the baseline 1713 to **1720/113**. H1 later yields **1737/113**,
**+24 net**, with no retired tests.

## Delivery, verification and review

Each unit ends with a scoped commit via `git commit -F`, using a UTF-8 message file
under `.superpowers/sdd/` and only the paths owned by that unit. The implementation
worker owns `.superpowers/sdd/task-1-final-correction-implementation-report.md`,
`.superpowers/sdd/task-1-final-correction-progress.md`, and raw log artifacts under
`.superpowers/sdd/task-1-final-correction-logs/`. These paths are implementation
authorization, not permission for this author to write extra files. Before staging,
inspect both working and staged diffs; never stage by directory/glob or include
unrelated docs. After each commit, append hash, exact green commands, log paths,
test arithmetic, and next step to the unit progress file (3–6 lines minimum).

Run each command separately with stdout/stderr redirected directly to a raw log;
save `$LASTEXITCODE` immediately, then inspect the log and fail the wrapper on nonzero.
Do not pipeline the tested command through a tail/grep stage. RED commands must
have the expected assertion failures and nonzero native exits; an environment
failure is not RED evidence. No fabricated or reconstructed historical stdout.

After both units, run once: `npm test`; `npm run lint`; `npm run typecheck`; `npm run app:build`;
`npm run soak`; `npm run mc`. Record exact test/file counts and build sizes. Compare
the complete new soak/mc logs with:

```powershell
node .superpowers/sdd/compare-report-blocks-2026-09-05.mjs .superpowers/sdd/controller-gate-p9.log .superpowers/sdd/task-1-final-correction-logs/soak.log .superpowers/sdd/task-1-final-correction-logs/mc.log .superpowers/sdd/task-1-final-correction-logs/comparison.json
```

Expected 10 complete report blocks /230 deterministic lines equal, all four comparator
controls passed. Do not edit the comparator, baseline or report formulas to obtain
equality. A generator `ids-unique` failure or any unexplained deterministic movement
stops delivery. Literal lint includes ignored scripts; preserve and report unrelated
failures instead of claiming a tracked-only lint command equals the required gate.

Root verifies artifacts before dispatching a separate `frontier_reviewer` at the
actual two-commit HEAD. Review the exact diff, run the firing tests first, then full
test/lint/typecheck/build. Inspect complete soak/mc evidence; repeat simulations
only for an evidence defect or movement. Reviewer's independent judgment owns the
verdict; plan-mandated defects remain full-severity findings. Label new discoveries
(a) mechanism defects inside P9-4, (b) missing requirements outside scope, or (c)
accepted checker-disconnected flow. Only (a) calls for a fix in this unit; root
adjudicates instead of automatically expanding the scanner.

## Escalation license and deferred scope

Emergent-behavior assertions are hypotheses. Failing acceptance → STOP and report
with evidence; never weaken thresholds/formulas/physics/seeds; never edit the spec.
Untraceable existing-suite failure → BLOCKED. Stop on overlap or a source seam that
does not match this plan. No children, Claude, installs/network, UI/process automation,
shared-memory edits or push. Never reflection-load third-party binaries or use
techniques resembling malware patterns; inspect third-party software as text.

No new extraction skill is needed: the existing author/orchestrate workflow and
complete-block comparator already capture the reusable process. Mechanical log
comparison can use a mechanical_worker later with the comparator's four firing
controls; the provenance correction itself remains frontier implementation/review.

Deferred: whole-program alias/runtime accessor analysis and new reporting types →
future scanner scope ruling; other duplicate-ID policies → separate review if raised;
artifact mechanics, forensics, scrying and séance → the current Plan 9 dependency
order. R14 is carried to `docs/review.html` by root for Ellie; no user question is
required from this worker.
