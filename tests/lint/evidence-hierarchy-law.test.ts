import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { HEARSAY_CEILING } from '../../src/sim/rumors/propagation';
import { ARTIFACT_CREDENCE } from '../../src/sim/artifacts';

/**
 * THE EVIDENCE-HIERARCHY LAW, given teeth (Plan 9 global constraint: "an artifact IN HAND anchors at
 * ARTIFACT_CREDENCE = 0.97 — the only credence above the ceiling … No other constant may cross the
 * ceiling"). A comment cannot enforce that. This scan parses every file under `src/` with the repo's
 * own TypeScript and asks a structural question: which numbers can actually REACH a mind's credence?
 *
 * A number reaches a credence three ways, and the scan collects all three:
 *   1. `{ credence: <expr> }`        — a belief record being composed;
 *   2. `something.credence = <expr>` — an existing belief being moved;
 *   3. `sink(…, <expr>, …)`          — an argument in the credence parameter position of a function
 *                                      that takes one (`CREDENCE_SINKS`).
 * Each write is then classified BY VALUE (`classify`), not by its tokens: the scan proves a bound
 * where one is provable and REPORTS every other shape. Where a write is reported, the numbers and
 * names it reaches are held to the law as well — a literal may never exceed the ceiling (evidence
 * arrives by NAME, never as a bare 0.97), and the only NAME allowed above it is `ARTIFACT_CREDENCE`.
 *
 * Value-contextual bounds are the review's C-1 closure (fix wave 1). A token-level reading admitted
 * three writes through this scan's own declared surface: `credence += Math.min(CEILING, 0.99)` (a
 * bounded right-hand side does not bound a compound assignment), `credence = HEARSAY_CEILING + 0.01`
 * and `credence = ARTIFACT_CREDENCE + 0.01` (a ceiling constant used as an OPERAND is not a bound).
 * All three now fire, and so does every arithmetic form nobody has written yet — the default is
 * "report", and silence has to be earned by a demonstrable bound.
 *
 * Prong 3 is what closes the parameter hole: `ingestEvidence` and `firstHearing` take a credence, so
 * a second number could otherwise sneak above the ceiling at a call site rather than at a write. The
 * completeness prong below fails if `src/` ever grows a credence-taking function this list does not
 * name — the law extends itself instead of silently narrowing.
 *
 * Same idiom as `determinism-law.test.ts` (AST statement scan) and `jargon.test.ts` (live sweep plus
 * an injected firing proof): the live sweep reads only repository files, so by construction it can
 * never be OBSERVED failing — the firing block pushes real violations through the SAME extractor and
 * asserts each diagnostic appears.
 */

/** name → the argument index that carries a credence. */
const CREDENCE_SINKS: Record<string, number> = { firstHearing: 1, ingestEvidence: 3 };

const ASSIGNMENT_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

const parse = (file: string, src: string): ts.SourceFile =>
  ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

/** Syntactic wrappers that change nothing about the value an expression reaches. */
function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  for (;;) {
    if (ts.isParenthesizedExpression(current) || ts.isNonNullExpression(current)
      || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

/** `A`, `A.B`, `A.B.C` — a static dotted spelling, or null where no parse-time answer exists. */
function dottedName(node: ts.Expression): string | null {
  const target = unwrap(node);
  if (ts.isIdentifier(target)) return target.text;
  if (ts.isPropertyAccessExpression(target)) {
    const head = dottedName(target.expression);
    return head === null ? null : `${head}.${target.name.text}`;
  }
  return null;
}

const propertyName = (node: ts.PropertyName): string | null =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : null;

/** Every module constant with a parse-time numeric value, including `OBJ.KEY` members. */
function collectConstants(file: ts.SourceFile, into: Map<string, number>): void {
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && node.initializer !== undefined) {
      const init = unwrap(node.initializer);
      if (ts.isNumericLiteral(init)) into.set(node.name.text, Number(init.text));
      else if (ts.isObjectLiteralExpression(init)) {
        for (const prop of init.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const key = propertyName(prop.name);
          const value = unwrap(prop.initializer);
          if (key !== null && ts.isNumericLiteral(value)) {
            into.set(`${node.name.text}.${key}`, Number(value.text));
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

/**
 * One write of somebody's credence: the expression whose value lands there, plus the OPERATOR that
 * lands it. `compound` is load-bearing, not decoration — for `+=`/`*=`/`??=` the value written is a
 * function of the PRIOR credence and the right-hand side, so no property of the right-hand side alone
 * can bound the result.
 */
interface CredenceWrite { expr: ts.Expression; compound: string | null }

/** Every expression whose value becomes somebody's credence. */
function credenceWrites(file: ts.SourceFile): CredenceWrite[] {
  const found: CredenceWrite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'credence') {
      found.push({ expr: node.initializer, compound: null });
    }
    if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)
      && ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'credence') {
      const operator = node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ? null : ts.tokenToString(node.operatorToken.kind) ?? '<compound>';
      found.push({ expr: node.right, compound: operator });
    }
    if (ts.isCallExpression(node)) {
      const callee = dottedName(node.expression);
      const index = callee === null ? undefined : CREDENCE_SINKS[callee];
      if (index !== undefined && node.arguments.length > index) {
        found.push({ expr: node.arguments[index]!, compound: null });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** Every function in the file that ACCEPTS a credence, with the argument index that carries it. */
function credenceSinks(file: ts.SourceFile): { name: string; index: number }[] {
  const sinks: { name: string; index: number }[] = [];
  const record = (name: string | null, params: ts.NodeArray<ts.ParameterDeclaration>): void => {
    const index = params.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === 'credence');
    if (index >= 0) sinks.push({ name: name ?? '<anonymous>', index });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      record(node.name && ts.isIdentifier(node.name) ? node.name.text : null, node.parameters);
    } else if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      const parent = node.parent as ts.Node | undefined;
      const named = parent !== undefined && ts.isVariableDeclaration(parent)
        && ts.isIdentifier(parent.name) ? parent.name.text : null;
      record(named, node.parameters);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return sinks;
}

/** A parse-time number: a literal, or a name the constant map resolves. */
function numericValueOf(expr: ts.Expression, constants: Map<string, number>): number | undefined {
  const target = unwrap(expr);
  if (ts.isNumericLiteral(target)) return Number(target.text);
  const name = dottedName(target);
  return name === null ? undefined : constants.get(name);
}

/**
 * Is this expression the enclosing function's own `credence` parameter, where that function is a
 * DECLARED sink? Then the value was already held to the law at the call site — prong 3 audits every
 * one of them, and the completeness prong fails if a credence-taking function goes unnamed. So the
 * pass-through is bounded by the scan's own coverage, not by an allowlist. A `credence` parameter of
 * anything NOT declared as a sink is unprovable, which is what keeps that reasoning honest.
 */
function insideDeclaredSink(node: ts.Node): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    const isFn = ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)
      || ts.isArrowFunction(current) || ts.isFunctionExpression(current);
    if (!isFn) continue;
    const fn = current as ts.SignatureDeclaration & { name?: ts.Node; parent?: ts.Node };
    const index = fn.parameters.findIndex(
      (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === 'credence');
    if (index < 0) return false;
    const declared = fn.name !== undefined && ts.isIdentifier(fn.name)
      ? fn.name.text
      : (fn.parent !== undefined && ts.isVariableDeclaration(fn.parent)
        && ts.isIdentifier(fn.parent.name) ? fn.parent.name.text : null);
    return declared !== null && CREDENCE_SINKS[declared] === index;
  }
  return false;
}

/**
 * `bounded`  — the value is PROVEN to sit at or below the hearsay ceiling.
 * `anchor`   — the value is the one lawful exception, ARTIFACT_CREDENCE, reached by name.
 * `not-a-number` — the value is provably not numeric, so no numeric ceiling applies to it.
 * `unprovable` — no bound can be established, so the law reports it.
 */
type Verdict = 'bounded' | 'anchor' | 'not-a-number' | 'unprovable';

/**
 * A value that cannot be a number at all. The scan's write surface keys on the NAME `credence`, and a
 * name is not always a belief: `src/content/terms.ts` carries a glossary row keyed `'credence'` whose
 * value is an object literal. A string, an object, an array, `null` or a boolean crosses no numeric
 * ceiling, and `Belief.credence: number` means anything that reached a real credence this way would
 * fail the typecheck long before this scan saw it. Deliberately literal FORMS only — no inference.
 */
function provablyNotNumeric(target: ts.Expression): boolean {
  return ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)
    || ts.isTemplateExpression(target) || ts.isObjectLiteralExpression(target)
    || ts.isArrayLiteralExpression(target) || target.kind === ts.SyntaxKind.NullKeyword
    || target.kind === ts.SyntaxKind.TrueKeyword || target.kind === ts.SyntaxKind.FalseKeyword;
}

/**
 * THE ONE SOUNDNESS QUESTION, asked of the VALUE rather than of the tokens: can this expression be
 * proven to land at or below the ceiling? A ceiling constant is a bound only where it IS the value —
 * as an operand of arithmetic it is just a number the result is computed from, which is exactly how
 * `HEARSAY_CEILING + 0.01` slipped past a token-level reading.
 *
 * The classification is deliberately a short list of PROVABLE shapes and a fail-closed default. It
 * does not enumerate forbidden arithmetic: a spelling nobody has thought of arrives reported, and the
 * only way to make the scan silent is to write a shape whose bound is demonstrable.
 */
function classify(expr: ts.Expression, constants: Map<string, number>): Verdict {
  const target = unwrap(expr);

  if (provablyNotNumeric(target)) return 'not-a-number';

  // A parse-time number, by literal or by name: the value itself answers the question.
  const value = numericValueOf(target, constants);
  if (value !== undefined) {
    if (value <= HEARSAY_CEILING) return 'bounded';
    return dottedName(target) === 'ARTIFACT_CREDENCE' ? 'anchor' : 'unprovable';
  }

  // Reading a credence is bounded by closure: whatever it holds, the law governed its own write.
  if (ts.isPropertyAccessExpression(target) && target.name.text === 'credence') return 'bounded';

  if (ts.isIdentifier(target) && target.text === 'credence' && insideDeclaredSink(target)) {
    return 'bounded';
  }

  if (ts.isCallExpression(target) && target.arguments.length > 0) {
    const callee = dottedName(target.expression);
    const operands = target.arguments.map((argument) => classify(argument, constants));
    // The result of a min is at most its smallest operand: ONE bounded operand caps it.
    if (callee === 'Math.min') {
      if (operands.includes('bounded')) return 'bounded';
      return operands.includes('anchor') ? 'anchor' : 'unprovable';
    }
    // The result of a max is its LARGEST operand: every operand must be bounded, and one anchor
    // makes the whole thing an anchor (which is why the P9-3 monotone guard stays lawful).
    if (callee === 'Math.max') {
      if (operands.every((operand) => operand === 'bounded')) return 'bounded';
      return operands.every((operand) => operand !== 'unprovable') ? 'anchor' : 'unprovable';
    }
  }

  // Everything else — every arithmetic form, every call the scan cannot reason about — fails closed.
  return 'unprovable';
}

interface Reached { literals: number[]; names: string[] }

/** Every number and every static name the expression can reach. */
function reachedBy(expr: ts.Expression): Reached {
  const literals: number[] = [];
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node)) { literals.push(Number(node.text)); return; }
    if (ts.isPropertyAccessExpression(node) || ts.isIdentifier(node)) {
      const dotted = dottedName(node as ts.Expression);
      if (dotted !== null) { names.push(dotted); return; }
    }
    ts.forEachChild(node, visit);
  };
  visit(expr);
  return { literals, names };
}

interface Violation { file: string; source: string; detail: string }

/** The one diagnostic the law raises, run over whatever files it is handed. */
function auditCredencePaths(
  sources: readonly { file: string; text: string }[],
): { violations: Violation[]; sites: number; namesAboveCeiling: string[] } {
  const parsed = sources.map(({ file, text }) => ({ file, ast: parse(file, text) }));
  const constants = new Map<string, number>();
  for (const { ast } of parsed) collectConstants(ast, constants);

  const violations: Violation[] = [];
  const namesAboveCeiling = new Set<string>();
  let sites = 0;

  for (const { file, ast } of parsed) {
    for (const { expr, compound } of credenceWrites(ast)) {
      sites += 1;
      // A compound write is unprovable BY SHAPE: the law must hold for the result, and the result
      // depends on a prior credence no static scan can pin. Its right-hand side is irrelevant.
      const verdict: Verdict = compound === null ? classify(expr, constants) : 'unprovable';
      if (verdict === 'bounded' || verdict === 'not-a-number') continue;
      const source = expr.getText(ast).replace(/\s+/g, ' ').trim();
      const before = violations.length;
      if (compound !== null) {
        violations.push({ file, source, detail: `a compound credence write ('${compound}') is never bounded by its right-hand side — the law must hold for the RESULT` });
      }
      const { literals, names } = reachedBy(expr);
      for (const value of literals) {
        if (value > HEARSAY_CEILING) {
          violations.push({ file, source, detail: `bare literal ${value} exceeds the hearsay ceiling — evidence weight arrives by NAME, never as a literal` });
        }
      }
      for (const name of names) {
        const value = constants.get(name);
        if (value === undefined || value <= HEARSAY_CEILING) continue;
        namesAboveCeiling.add(name);
        if (name !== 'ARTIFACT_CREDENCE') {
          violations.push({ file, source, detail: `'${name}' (${value}) is a second constant above the hearsay ceiling` });
        }
      }
      // FAIL CLOSED. An unprovable write whose every token is individually lawful is exactly the
      // review's `HEARSAY_CEILING + 0.01`: no number is out of bounds, the VALUE is unbounded. The
      // guard keeps the report to one reason per site — where a literal or a name already explains
      // the failure, that is the diagnostic worth reading.
      if (verdict === 'unprovable' && violations.length === before) {
        violations.push({ file, source, detail: 'this write\'s value cannot be proven at or below the hearsay ceiling — a ceiling constant is a bound only where it IS the value, never as an operand' });
      }
    }
  }
  return { violations, sites, namesAboveCeiling: [...namesAboveCeiling].sort() };
}

// ── The live surface ──────────────────────────────────────────────────────────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

function engineFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return engineFiles(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

const sources = engineFiles(path.join(repoRoot, 'src')).map((full) => ({
  file: path.relative(repoRoot, full).replace(/\\/g, '/'),
  text: fs.readFileSync(full, 'utf8'),
}));

const live = auditCredencePaths(sources);

describe('the evidence-hierarchy law — one number, and only one, sits above the hearsay ceiling', () => {
  it('the sweep is not vacuous: it really finds the engine\'s credence writes', () => {
    expect(sources.length).toBeGreaterThan(20);
    expect(live.sites).toBeGreaterThanOrEqual(8);
  });

  it('no number reaching a credence exceeds the ceiling except the artifact anchor', () => {
    expect(live.violations).toEqual([]);
  });

  it('the ONE constant above the ceiling is ARTIFACT_CREDENCE, and it is 0.97', () => {
    expect(live.namesAboveCeiling).toEqual(['ARTIFACT_CREDENCE']);
    expect(ARTIFACT_CREDENCE).toBe(0.97);
    expect(ARTIFACT_CREDENCE).toBeGreaterThan(HEARSAY_CEILING);
  });

  it('every credence-taking function in src/ is named by the scan (the law extends itself)', () => {
    const declared = sources.flatMap(({ file, text }) =>
      credenceSinks(parse(file, text)).map((sink) => ({ file, ...sink })));
    expect(declared.length).toBeGreaterThan(0);
    for (const sink of declared) {
      expect(CREDENCE_SINKS[sink.name], `${sink.file} declares '${sink.name}(…credence…)' but the evidence-hierarchy scan does not name it`).toBe(sink.index);
    }
  });
});

// ── The law's firing proof: real violations through the REAL extractor ────────────────────────────

describe('the evidence-hierarchy law FIRES on injected violations (proof, not presence)', () => {
  const anchor = { file: 'anchor.ts', text: 'export const HEARSAY_CEILING = 0.95;\nexport const ARTIFACT_CREDENCE = 0.97;\n' };

  it('catches a bare literal above the ceiling in a composed belief record', () => {
    const injected = auditCredencePaths([anchor, {
      file: 'ghost.ts',
      text: "export function bad(store: Record<string, unknown>) { store['f'] = { credence: 0.99, claim: null }; }",
    }]);
    expect(injected.violations).toHaveLength(1);
    expect(injected.violations[0]!.detail).toContain('bare literal 0.99');
  });

  it('catches a SECOND named constant above the ceiling, wherever it is spelled', () => {
    const injected = auditCredencePaths([anchor, {
      file: 'ghost.ts',
      text: [
        'export const CERTAINTY = 0.99;',
        'export const TIERS = { GOSPEL: 0.98 };',
        'export function moved(belief: { credence: number }) { belief.credence = CERTAINTY; }',
        'export function sunk(w: unknown, id: string, h: unknown) { ingestEvidence(w, id, h, TIERS.GOSPEL); }',
      ].join('\n'),
    }]);
    expect(injected.violations.map((v) => v.detail).sort()).toEqual([
      "'CERTAINTY' (0.99) is a second constant above the hearsay ceiling",
      "'TIERS.GOSPEL' (0.98) is a second constant above the hearsay ceiling",
    ]);
    expect(injected.namesAboveCeiling).toEqual(['CERTAINTY', 'TIERS.GOSPEL']);
  });

  it('stays silent on the lawful spellings the engine actually uses', () => {
    const injected = auditCredencePaths([anchor, {
      file: 'ghost.ts',
      text: [
        'export const STANCE = { REPEAT: 0.5 };',
        'export function ok(b: { credence: number }, t: number) {',
        '  b.credence = Math.min(HEARSAY_CEILING, b.credence + 0.15);',
        '  b.credence = Math.max(b.credence, STANCE.REPEAT);',
        '  return { credence: 0.85, t };',
        '}',
        'export function anchorIt(w: unknown, id: string, h: unknown) { ingestEvidence(w, id, h, ARTIFACT_CREDENCE); }',
      ].join('\n'),
    }]);
    expect(injected.violations).toEqual([]);
    expect(injected.namesAboveCeiling).toEqual(['ARTIFACT_CREDENCE']);
    expect(injected.sites).toBe(4);
  });

  it('the ceiling clamp is not a blanket escape — an UNBOUNDED Math.min is still audited', () => {
    const injected = auditCredencePaths([anchor, {
      file: 'ghost.ts',
      text: [
        'export const CERTAINTY = 0.99;',
        // Bounded: whatever CERTAINTY is, the ceiling operand caps the result.
        'export function ok(b: { credence: number }) { b.credence = Math.min(HEARSAY_CEILING, CERTAINTY); }',
        // Unbounded: no operand is at or below the ceiling, so both numbers are audited.
        'export function bad(b: { credence: number }) { b.credence = Math.min(CERTAINTY, 0.98); }',
      ].join('\n'),
    }]);
    expect(injected.sites).toBe(2);
    expect(injected.violations.map((v) => v.detail).sort()).toEqual([
      "'CERTAINTY' (0.99) is a second constant above the hearsay ceiling",
      'bare literal 0.98 exceeds the hearsay ceiling — evidence weight arrives by NAME, never as a literal',
    ]);
  });

  it('the completeness prong sees an unnamed credence-taking function', () => {
    const sinks = credenceSinks(parse('ghost.ts', [
      'export function smuggle(store: unknown, credence: number) { void store; void credence; }',
      'const arrow = (a: number, b: number, credence: number) => a + b + credence;',
      'void arrow;',
    ].join('\n')));
    expect(sinks).toEqual([
      { name: 'smuggle', index: 1 },
      { name: 'arrow', index: 2 },
    ]);
    for (const sink of sinks) expect(CREDENCE_SINKS[sink.name]).toBeUndefined();
  });
});

// ── C-1: the law closes its own surface — bounds are VALUE-CONTEXTUAL, everything else fails closed ─

/**
 * The three forms the review pushed through the scanner's own declared surface, plus the general
 * rule each one exposes. The posture is deliberately NOT an enumeration of forbidden arithmetic: the
 * scan proves a bound where a bound is provable (a ceiling-or-lower number, a credence read, a
 * declared-sink pass-through, `Math.min` with a bounded operand, `Math.max` with all operands
 * bounded) and REPORTS every other shape. A new arithmetic spelling therefore arrives already
 * reported rather than waiting for the list to learn it.
 */
describe('the evidence-hierarchy law bounds credence writes BY VALUE and fails closed on the rest', () => {
  const anchor = { file: 'anchor.ts', text: 'export const HEARSAY_CEILING = 0.95;\nexport const ARTIFACT_CREDENCE = 0.97;\n' };
  const audit = (lines: readonly string[]) =>
    auditCredencePaths([anchor, { file: 'ghost.ts', text: lines.join('\n') }]);

  const COMPOUND = (op: string) =>
    `a compound credence write ('${op}') is never bounded by its right-hand side — the law must hold for the RESULT`;
  const UNPROVABLE = 'cannot be proven at or below the hearsay ceiling';

  it('a bounded right-hand side does NOT bound a compound assignment (review form i)', () => {
    const injected = audit([
      'export function bad(belief: { credence: number }) {',
      '  belief.credence += Math.min(HEARSAY_CEILING, 0.99);',
      '}',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations.map((v) => v.detail).sort()).toEqual([
      COMPOUND('+='),
      'bare literal 0.99 exceeds the hearsay ceiling — evidence weight arrives by NAME, never as a literal',
    ].sort());
  });

  it('every compound operator is audited as a write, even with a fully lawful right-hand side', () => {
    const injected = audit([
      'export const STANCE = { REPEAT: 0.5 };',
      'export function creep(b: { credence: number }) {',
      '  b.credence += STANCE.REPEAT;',
      '  b.credence *= 0.5;',
      '  b.credence ??= HEARSAY_CEILING;',
      '}',
    ]);
    expect(injected.sites).toBe(3);
    expect(injected.violations.map((v) => v.detail))
      .toEqual([COMPOUND('+='), COMPOUND('*='), COMPOUND('??=')]);
  });

  it('a ceiling constant used as an OPERAND of arithmetic is not a bound (review forms ii and iii)', () => {
    const injected = audit([
      'export function over(b: { credence: number }) { b.credence = HEARSAY_CEILING + 0.01; }',
      'export function past(b: { credence: number }) { b.credence = ARTIFACT_CREDENCE + 0.01; }',
    ]);
    expect(injected.sites).toBe(2);
    expect(injected.violations.map((v) => v.source))
      .toEqual(['HEARSAY_CEILING + 0.01', 'ARTIFACT_CREDENCE + 0.01']);
    for (const violation of injected.violations) expect(violation.detail).toContain(UNPROVABLE);
  });

  it('a bare `credence` pass-through is bounded only inside a DECLARED sink, never anywhere', () => {
    const injected = audit([
      'export function smuggle(b: { credence: number }, credence: number) { b.credence = credence; }',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations).toHaveLength(1);
    expect(injected.violations[0]!.detail).toContain(UNPROVABLE);
  });

  it('a `credence` key whose value cannot be a number is not a credence write (the glossary row)', () => {
    const injected = audit([
      "export const TERMS = { 'credence': { id: 'credence', label: 'Credence', entry: null } };",
      'export function real(b: { credence: number }) { b.credence = HEARSAY_CEILING; }',
    ]);
    expect(injected.sites, 'the glossary row IS still a site — it is classified, not skipped').toBe(2);
    expect(injected.violations).toEqual([]);
  });

  it('stays silent on every bounded shape the engine really uses, the P9-3 monotone guard included', () => {
    const injected = audit([
      'export const STANCE = { REPEAT: 0.5 };',
      // The corroboration branch as docket P9-3 leaves it: max-of-min, every operand bounded.
      'export function hearsay(existing: { credence: number }) {',
      '  existing.credence = Math.max(existing.credence, Math.min(HEARSAY_CEILING, existing.credence + 0.15));',
      '}',
      'export function reaction(belief: { credence: number }) {',
      '  belief.credence = Math.max(belief.credence, STANCE.REPEAT);',
      '}',
      'export function firstHearing(hearing: unknown, credence: number) { void hearing; return credence; }',
      'export function ingestEvidence(w: unknown, id: string, h: unknown, credence: number) {',
      '  void w; void id; return firstHearing(h, credence);',
      '}',
      'export function anchorIt(w: unknown, id: string, h: unknown) {',
      '  ingestEvidence(w, id, h, ARTIFACT_CREDENCE);',
      '}',
      'export function copy(b: { credence: number }) { return { credence: b.credence }; }',
    ]);
    expect(injected.sites).toBe(5);
    expect(injected.violations).toEqual([]);
    expect(injected.namesAboveCeiling).toEqual(['ARTIFACT_CREDENCE']);
  });
});
