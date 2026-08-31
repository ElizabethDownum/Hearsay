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
 * Every numeric literal and every named constant inside those expressions is then held to the law:
 * a literal may never exceed the ceiling (evidence arrives by NAME, never as a bare 0.97), and the
 * only NAME allowed above it is `ARTIFACT_CREDENCE`.
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

/** Every expression whose value becomes somebody's credence. */
function credenceExpressions(file: ts.SourceFile): ts.Expression[] {
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'credence') {
      found.push(node.initializer);
    }
    if (ts.isBinaryExpression(node) && ASSIGNMENT_OPERATORS.has(node.operatorToken.kind)
      && ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'credence') {
      found.push(node.right);
    }
    if (ts.isCallExpression(node)) {
      const callee = dottedName(node.expression);
      const index = callee === null ? undefined : CREDENCE_SINKS[callee];
      if (index !== undefined && node.arguments.length > index) found.push(node.arguments[index]!);
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
 * `Math.min(X, …)` with an X at or below the ceiling BOUNDS the whole expression: whatever the other
 * operands compute, the result cannot cross. That is exactly how the hearsay path is written, and it
 * is why the arithmetic inside it (a `? 1 : 0.5` addressing multiplier, say) is not a credence and
 * must not be audited as one. Anything NOT provably bounded this way is held to the law in full.
 */
function ceilingBounded(expr: ts.Expression, constants: Map<string, number>): boolean {
  const target = unwrap(expr);
  if (!ts.isCallExpression(target)) return false;
  if (dottedName(target.expression) !== 'Math.min') return false;
  return target.arguments.some((arg) => {
    const value = numericValueOf(arg, constants);
    return value !== undefined && value <= HEARSAY_CEILING;
  });
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
    for (const expr of credenceExpressions(ast)) {
      sites += 1;
      if (ceilingBounded(expr, constants)) continue;
      const source = expr.getText(ast).replace(/\s+/g, ' ').trim();
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
