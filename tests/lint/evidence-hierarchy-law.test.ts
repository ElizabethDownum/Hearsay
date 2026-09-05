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
 * THE STRUCTURAL INVERSION (re-review round two, the P11-19 fence precedent). Round one closed the
 * scan's VALUE recognition; round two showed the WRITE SURFACE was still an enumeration of node kinds
 * and a hand list of operators — the class of defect that regenerates every time the language grows a
 * spelling. So the surface is now closed the other way round:
 *
 *   · a credence write is recognized by the property NAME, in EVERY write position the language
 *     offers — property assignment, shorthand, computed key, element access, destructuring
 *     destination, update expression;
 *   · assignment operators come from the compiler's own `FirstAssignment..LastAssignment` RANGE,
 *     never from a list this file maintains;
 *   · targets and callees are resolved by BINDING through the TypeScript checker, so `Object.assign`
 *     under an alias, a renamed import of the anchor, and a shadowed `Math` all answer correctly;
 *   · anything the scan cannot PROVE — a computed key it cannot read, an API-mediated patch, an
 *     unprovable value — is REPORTED. Silence has to be earned.
 *
 * A number reaches a credence four ways, and the scan collects all four:
 *   1. a property position NAMED `credence`   — `{ credence: x }`, `{ credence }`, `{ ['credence']: x }`;
 *   2. an assignment or update whose TARGET is a credence — `b.credence = x`, `b['credence'] **= x`,
 *      `b.credence++`, `({ credence: b.credence } = incoming)`;
 *   3. `sink(…, <expr>, …)` — an argument in the credence parameter position of a function that takes
 *      one (`CREDENCE_SINKS`);
 *   4. an API-mediated write onto a target the CHECKER types as carrying a credence —
 *      `Object.assign` / `Object.defineProperty` / `Object.defineProperties` / `Reflect.set` /
 *      `Reflect.defineProperty`, and any element-access write whose key only the running program knows.
 * Positions 2 and 4 include shapes whose written VALUE is never visible to a static scan; those are
 * sites classified `unprovable` on sight, whatever they carry.
 *
 * Each write with a visible value is then classified BY VALUE (`classify`), not by its tokens: the
 * scan proves a bound where one is provable and REPORTS every other shape. Where a write is reported,
 * the numbers and names it reaches are held to the law as well — a literal may never exceed the
 * ceiling (evidence arrives by NAME, never as a bare 0.97), and the only BINDING allowed above it is
 * the one `ARTIFACT_CREDENCE` declaration.
 *
 * Prong 3 is what closes the parameter hole: `ingestEvidence` and `firstHearing` take a credence, so
 * a second number could otherwise sneak above the ceiling at a call site rather than at a write. The
 * completeness prong below fails if `src/` ever grows a credence-taking function this list does not
 * name — the law extends itself instead of silently narrowing.
 *
 * THE DECLARED BOUNDARY (docket P9-4). The accepted residual is checker-disconnected holder flow;
 * this scan does not claim universal alias or runtime accessor analysis. The explicit R14 TurnEvidence
 * projection is counted as recorded, not treated as a belief write or a proven bound. Backstops:
 * `noImplicitAny`, the P9-2 behavioural campaign pin, live ≡ replay, and zero such forms in production
 * today.
 *
 * Same idiom as `determinism-law.test.ts` (AST scan) and `jargon.test.ts` (live sweep plus an injected
 * firing proof): the live sweep reads only repository files, so by construction it can never be
 * OBSERVED failing — the firing blocks push real violations through the SAME extractor and assert each
 * diagnostic appears.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

/** name → the argument index that carries a credence. */
const CREDENCE_SINKS: Record<string, number> = { firstHearing: 1, ingestEvidence: 3 };

/**
 * Calls that can write a property without ever spelling its name where a scan could read it. Named by
 * the FULLY QUALIFIED declaration the checker resolves them to (`ObjectConstructor.assign`), which is
 * a binding question and not a spelling: `const put = Object.assign; put(belief, patch)` lands here.
 */
const WRITE_APIS = new Set([
  'ObjectConstructor.assign',
  'ObjectConstructor.defineProperty',
  'ObjectConstructor.defineProperties',
  'Reflect.set',
  'Reflect.defineProperty',
]);

/**
 * EVERY assignment operator the compiler knows, taken from its own contiguous SyntaxKind range. A
 * hand-maintained list is exactly what round two found missing ten operators; a range cannot fall
 * behind the language, because the language is the thing that defines it.
 */
const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
  kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;

const isUpdateOperator = (kind: ts.SyntaxKind): boolean =>
  kind === ts.SyntaxKind.PlusPlusToken || kind === ts.SyntaxKind.MinusMinusToken;

// ── The one program, and the checker that answers binding questions ───────────────────────────────

interface Source { file: string; text: string }

/**
 * The repo's OWN compiler options, so the scan reads the same language `npm run typecheck` does.
 * `types: []` drops the ambient test globals: this scan reads engine source, and loading them into
 * every injected program would be cost with no answer attached.
 */
const COMPILER_OPTIONS: ts.CompilerOptions = (() => {
  const config = ts.readConfigFile(path.join(repoRoot, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot);
  return { ...parsed.options, noEmit: true, skipLibCheck: true, types: [] };
})();

/** `lib.*.d.ts`, parsed once and shared — the firing proofs build one small program per case. */
const libCache = new Map<string, ts.SourceFile | undefined>();

const absolute = (file: string): string => path.resolve(repoRoot, file);

/**
 * One `ts.Program` over the audited sources, with their text overlaid on the real file system. The
 * live sweep hands over `src/` exactly as it sits on disk; a firing proof hands over a virtual module
 * — and both get a REAL checker, which is what makes "is this target a credence carrier?" a question
 * about types rather than about spelling.
 */
function programOf(sources: readonly Source[]): ts.Program {
  const overlay = new Map(sources.map(({ file, text }) => [absolute(file), text]));
  const host = ts.createCompilerHost(COMPILER_OPTIONS, true);
  const innerGet = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, shouldCreate) => {
    const key = path.resolve(name);
    const text = overlay.get(key);
    if (text !== undefined) {
      return ts.createSourceFile(name, text, languageVersion, true, ts.ScriptKind.TS);
    }
    if (libCache.has(key)) return libCache.get(key);
    const file = innerGet(name, languageVersion, onError, shouldCreate);
    libCache.set(key, file);
    return file;
  };
  const innerRead = host.readFile.bind(host);
  host.readFile = (name) => overlay.get(path.resolve(name)) ?? innerRead(name);
  const innerExists = host.fileExists.bind(host);
  host.fileExists = (name) => overlay.has(path.resolve(name)) || innerExists(name);
  return ts.createProgram([...overlay.keys()], COMPILER_OPTIONS, host);
}

interface Scan {
  program: ts.Program;
  checker: ts.TypeChecker;
  files: { file: string; ast: ts.SourceFile }[];
  /** Every module constant with a parse-time numeric value, including `OBJ.KEY` members. */
  constants: Map<string, number>;
  /** The SYMBOL of the one `ARTIFACT_CREDENCE` binding — identity, not spelling. */
  anchors: Set<ts.Symbol>;
}

const scanCache = new Map<readonly Source[], Scan>();

function buildScan(sources: readonly Source[]): Scan {
  const program = programOf(sources);
  const checker = program.getTypeChecker();
  const files = sources.map(({ file }) => {
    const ast = program.getSourceFile(absolute(file));
    if (ast === undefined) throw new Error(`the evidence-hierarchy scan could not load '${file}'`);
    // THE FAIL-CLOSED PARSE (the `assertParsed` precedent in tests/helpers/callgraph.ts): TypeScript
    // REPAIRS bad syntax rather than rejecting it, and a repaired parse silently reclassifies live
    // code. Text this scan cannot read is text it must refuse, not text it may guess at.
    const [firstError] = program.getSyntacticDiagnostics(ast);
    if (firstError !== undefined) {
      throw new Error(`the evidence-hierarchy scan could not parse '${file}': `
        + ts.flattenDiagnosticMessageText(firstError.messageText, ' '));
    }
    return { file, ast };
  });
  const constants = new Map<string, number>();
  for (const { ast } of files) collectConstants(ast, constants);
  const anchors = new Set<ts.Symbol>();
  for (const { ast } of files) collectAnchorBindings(ast, checker, anchors);
  return { program, checker, files, constants, anchors };
}

/** One program per source set, reused: the live sweep is asked several different questions. */
function scanOf(sources: readonly Source[]): Scan {
  const cached = scanCache.get(sources);
  if (cached !== undefined) return cached;
  const scan = buildScan(sources);
  scanCache.set(sources, scan);
  return scan;
}

// ── Reading the source ────────────────────────────────────────────────────────────────────────────

const parse = (file: string, src: string): ts.SourceFile =>
  ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

/** Syntactic wrappers that change nothing about the value an expression reaches. */
function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  for (;;) {
    if (ts.isParenthesizedExpression(current) || ts.isNonNullExpression(current)
      || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)
      || ts.isTypeAssertionExpression(current)) {
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

/**
 * A key with a parse-time answer: `belief['credence']` yes, `belief[whichever]` no. Position matters —
 * inside brackets an identifier is a variable READ whose value only the running program knows, so it
 * must never be mistaken for the property name it happens to be spelled like.
 */
function literalKey(node: ts.Expression | undefined): string | null {
  if (node === undefined) return null;
  const target = unwrap(node);
  if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) return target.text;
  return null;
}

/**
 * The property NAME a write position names. `unprovable` is the fail-closed answer for a computed key
 * the scan cannot read: it could be `credence`, and nothing in the text says otherwise.
 */
function writtenName(name: ts.PropertyName): { name: string | null; unprovable: boolean } {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    || ts.isNoSubstitutionTemplateLiteral(name)) {
    return { name: name.text, unprovable: false };
  }
  if (ts.isComputedPropertyName(name)) {
    const key = literalKey(name.expression);
    return key === null ? { name: null, unprovable: true } : { name: key, unprovable: false };
  }
  return { name: null, unprovable: false };  // a private `#name` can never be `credence`
}

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
          const key = writtenName(prop.name).name;
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
 * THE ANCHOR, as a BINDING. `ARTIFACT_CREDENCE` is not a word this scan looks for — it is a specific
 * declaration whose parse-time value is the production constant, and a reference is an anchor only
 * when the checker resolves it to that declaration. A second constant spelled the same way with a
 * different value is therefore NOT an anchor: it is an unprovable value, and it is reported.
 */
function collectAnchorBindings(
  file: ts.SourceFile, checker: ts.TypeChecker, into: Set<ts.Symbol>,
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && node.name.text === 'ARTIFACT_CREDENCE' && node.initializer !== undefined) {
      const init = unwrap(node.initializer);
      if (ts.isNumericLiteral(init) && Number(init.text) === ARTIFACT_CREDENCE) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol !== undefined) into.add(symbol);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

/** The symbol an expression is BOUND to, with import aliases resolved to what they stand for. */
function boundSymbol(node: ts.Expression, scan: Scan): ts.Symbol | undefined {
  const symbol = scan.checker.getSymbolAtLocation(unwrap(node));
  if (symbol === undefined) return undefined;
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) return symbol;
  try {
    return scan.checker.getAliasedSymbol(symbol);
  } catch {
    return symbol;
  }
}

/**
 * The fully-qualified name of the STANDARD-LIBRARY function a callee expression is really bound to,
 * following local renames one declaration at a time (`const put = Object.assign` →
 * `ObjectConstructor.assign`), and `null` for everything else.
 *
 * The library test is not decoration. `getFullyQualifiedName` composes symbol names, so a local
 * `const Math = { min: … }` also qualifies as `Math.min` — a spelling collision that would let a
 * shadowed `Math.min` inherit the real one's bounding power. Identity is the declaration's home: only
 * a symbol every one of whose declarations sits in a default library file is the global one.
 */
function standardLibraryCallee(node: ts.Expression, scan: Scan): string | null {
  let current: ts.Expression = node;
  for (let hops = 0; hops < 8; hops += 1) {
    const symbol = boundSymbol(current, scan);
    if (symbol === undefined) return null;
    const declarations = symbol.declarations ?? [];
    if (declarations.length > 0 && declarations.every((declaration) =>
      scan.program.isSourceFileDefaultLibrary(declaration.getSourceFile()))) {
      return scan.checker.getFullyQualifiedName(symbol);
    }
    const declaration = symbol.valueDeclaration;
    if (declaration === undefined || !ts.isVariableDeclaration(declaration)
      || declaration.initializer === undefined) {
      return null;
    }
    current = declaration.initializer;
  }
  return null;
}

/**
 * Does the CHECKER say this expression's type carries a `credence`? Fail-closed on the types that
 * mean "the checker does not know" — `any`, `unknown`, an error type — because a Belief is exactly
 * what one of those could be hiding.
 */
function typeCarriesCredence(
  type: ts.Type, checker: ts.TypeChecker, seen: Set<ts.Type>,
): boolean {
  if (seen.has(type)) return false;
  seen.add(type);
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) return true;
  const apparent = checker.getApparentType(type);
  if (checker.getPropertyOfType(apparent, 'credence') !== undefined) return true;
  if (apparent.isUnionOrIntersection()) {
    return apparent.types.some((part) => typeCarriesCredence(part, checker, seen));
  }
  return false;
}

const carriesCredence = (node: ts.Node, scan: Scan): boolean =>
  typeCarriesCredence(scan.checker.getTypeAtLocation(node), scan.checker, new Set());

/** An object literal in a value position: its declared shape, or the shape the context wants. */
function objectCarriesCredence(literal: ts.ObjectLiteralExpression, scan: Scan): boolean {
  const contextual = scan.checker.getContextualType(literal);
  if (contextual !== undefined
    && typeCarriesCredence(contextual, scan.checker, new Set())) return true;
  return carriesCredence(literal, scan);
}

// ── The write surface ─────────────────────────────────────────────────────────────────────────────

const COMPOUND_WRITE = (operator: string): string =>
  `a compound credence write ('${operator}') is never bounded by its right-hand side — the law must hold for the RESULT`;
const UPDATE_WRITE = (operator: string): string =>
  `an update expression ('${operator}') moves a credence by an amount the law never sees — no lawful increment of a credence exists`;
const DESTRUCTURED_WRITE =
  'a destructuring write lands a value the scan never inspects in a credence — the incoming side is not visible here';
const API_WRITE =
  'an API-mediated write onto a target the checker types as carrying a credence — the patch is never visible to the scan';
const COMPUTED_KEY_WRITE =
  "a computed property key the scan cannot read can name 'credence' on an object the checker types as carrying one";
const ELEMENT_KEY_WRITE =
  "an element-access write whose key only the running program knows can name 'credence' on a target the checker types as carrying one";

/**
 * One write of somebody's credence. `opaque` is load-bearing, not decoration: where it is set, the
 * write hides its own value from any static reading — a compound assignment whose result depends on
 * the prior credence, an update expression, a destructuring destination, an API-mediated patch, a key
 * only the running program knows — and no property of the visible text can bound the result.
 */
interface CredenceWrite {
  /** The expression whose value lands in the credence, or the construct the report quotes. */
  expr: ts.Expression;
  /** The reason this write is unprovable whatever it carries, or null when its value is visible. */
  opaque: string | null;
  destination?: ts.Expression;
}

/** Which credence a target names: one we can see, one we cannot read, or none. */
type TargetVerdict = 'credence' | 'unreadable' | 'other';

function credenceTarget(target: ts.Expression, scan: Scan): TargetVerdict {
  if (ts.isPropertyAccessExpression(target)) {
    return target.name.text === 'credence' ? 'credence' : 'other';
  }
  if (ts.isElementAccessExpression(target)) {
    const key = literalKey(target.argumentExpression);
    if (key !== null) return key === 'credence' ? 'credence' : 'other';
    return carriesCredence(target.expression, scan) ? 'unreadable' : 'other';
  }
  return 'other';
}

/** An object/array literal standing where a value is being assigned INTO it — a destructuring target. */
const isPattern = (node: ts.Expression): boolean =>
  ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node);

/**
 * Is this property position part of a DESTRUCTURING DESTINATION rather than a value being composed?
 * `({ credence: belief.credence } = incoming)` looks like `{ credence: <expr> }` to a naive walk, and
 * reading its "value" audits the OLD credence instead of the incoming one — round two's classifier
 * defect. The whole pattern is handled once, as an opaque write.
 */
function insideAssignmentPattern(node: ts.Node): boolean {
  let current: ts.Node = node;
  for (let parent = current.parent; parent !== undefined; parent = parent.parent) {
    if (ts.isBinaryExpression(parent)) {
      return parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && parent.left === current;
    }
    if (ts.isForOfStatement(parent) || ts.isForInStatement(parent)) {
      return parent.initializer === current;
    }
    if (!ts.isObjectLiteralExpression(parent) && !ts.isArrayLiteralExpression(parent)
      && !ts.isPropertyAssignment(parent) && !ts.isShorthandPropertyAssignment(parent)
      && !ts.isSpreadAssignment(parent) && !ts.isSpreadElement(parent)
      && !ts.isParenthesizedExpression(parent)) {
      return false;
    }
    current = parent;
  }
  return false;
}

/** Does a destructuring destination land anything in a credence? */
function patternWritesCredence(pattern: ts.Expression, scan: Scan): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isShorthandPropertyAssignment(node) && node.name.text === 'credence') { found = true; return; }
    if (ts.isPropertyAssignment(node)) {
      const key = writtenName(node.name);
      if (key.name === 'credence' || key.unprovable) { found = true; return; }
    }
    if (ts.isExpression(node) && !isPattern(node)
      && credenceTarget(unwrap(node), scan) !== 'other') { found = true; return; }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(pattern, visit);
  return found;
}

/** Every expression whose value becomes somebody's credence, in every position that can carry one. */
function credenceWrites(file: ts.SourceFile, scan: Scan): CredenceWrite[] {
  const found: CredenceWrite[] = [];
  const visit = (node: ts.Node): void => {
    // 1. PROPERTY POSITIONS, by NAME — `{ credence: x }`, `{ 'credence': x }`, `{ ['credence']: x }`.
    if (ts.isPropertyAssignment(node) && !insideAssignmentPattern(node)) {
      const key = writtenName(node.name);
      if (key.name === 'credence') found.push({ expr: node.initializer, opaque: null });
      else if (key.unprovable && objectCarriesCredence(node.parent, scan)) {
        found.push({ expr: node.parent, opaque: COMPUTED_KEY_WRITE });
      }
    }
    // …including the SHORTHAND, which is a distinct node kind and was the §5.1 hole.
    if (ts.isShorthandPropertyAssignment(node) && node.name.text === 'credence'
      && !insideAssignmentPattern(node)) {
      found.push({ expr: node.name, opaque: null });
    }

    // 2. ASSIGNMENTS — every operator in the compiler's own range, both member spellings, and the
    //    destructuring destination whose incoming value is never visible here.
    if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      const target = unwrap(node.left);
      const operator = node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ? null : ts.tokenToString(node.operatorToken.kind) ?? '<compound>';
      const reach = credenceTarget(target, scan);
      if (reach === 'credence') {
        found.push({
          expr: node.right, opaque: operator === null ? null : COMPOUND_WRITE(operator),
          ...(operator === null ? { destination: target } : {}),
        });
      } else if (reach === 'unreadable') {
        found.push({ expr: node, opaque: ELEMENT_KEY_WRITE });
      } else if (isPattern(target) && patternWritesCredence(target, scan)) {
        found.push({ expr: node, opaque: DESTRUCTURED_WRITE });
      }
    }
    // `for ([belief.credence] of rows)` — a destructuring destination with no `=` above it.
    if ((ts.isForOfStatement(node) || ts.isForInStatement(node))
      && ts.isExpression(node.initializer) && isPattern(node.initializer)
      && patternWritesCredence(node.initializer, scan)) {
      found.push({ expr: node.initializer, opaque: DESTRUCTURED_WRITE });
    }

    // 3. UPDATE EXPRESSIONS. No lawful increment of a credence exists: every one of them is a move
    //    by an amount the law cannot see, so the shape itself is the finding.
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
      && isUpdateOperator(node.operator)
      && credenceTarget(unwrap(node.operand), scan) !== 'other') {
      found.push({ expr: node, opaque: UPDATE_WRITE(ts.tokenToString(node.operator) ?? '<update>') });
    }

    if (ts.isCallExpression(node)) {
      // 4. SINK ARGUMENTS — the credence parameter position of a function that takes one.
      const callee = dottedName(node.expression);
      const index = callee === null ? undefined : CREDENCE_SINKS[callee];
      if (index !== undefined && node.arguments.length > index) {
        found.push({ expr: node.arguments[index]!, opaque: null });
      }
      // 5. API-MEDIATED WRITES, resolved by binding on the callee and by TYPE on the target.
      const api = standardLibraryCallee(node.expression, scan);
      if (api !== null && WRITE_APIS.has(api) && node.arguments.length > 0
        && carriesCredence(node.arguments[0]!, scan)) {
        found.push({ expr: node, opaque: API_WRITE });
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

// ── The value question ────────────────────────────────────────────────────────────────────────────

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

/**
 * A direct reference to the declared sink's own parameter forwards an already audited input; that
 * input may be bounded or anchored.
 */
function insideDeclaredSink(node: ts.Expression, scan: Scan): boolean {
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
    const parameter = fn.parameters[index];
    const reference = ts.isShorthandPropertyAssignment(node.parent)
      ? scan.checker.getShorthandAssignmentValueSymbol(node.parent) : boundSymbol(node, scan);
    return declared !== null && CREDENCE_SINKS[declared] === index
      && parameter !== undefined && ts.isIdentifier(parameter.name)
      && reference === scan.checker.getSymbolAtLocation(parameter.name);
  }
  return false;
}

/**
 * `bounded` — the value is proven at or below the hearsay ceiling.
 * `anchor` — the value is proven to be the one lawful new anchor.
 * `possibly-anchored` — an uncapped credence read/copy that may carry an anchor.
 * `retained` — a side-effect-free read/update of the same checker binding and static member path.
 * `forwarded` — a direct declared-sink parameter whose input sites remain audited.
 * `recorded` — the explicit R14 non-belief projection.
 * `not-a-number` — the value is provably not numeric.
 * `unprovable` — no licensed provenance or bound can be established.
 */
type Verdict = 'bounded' | 'anchor' | 'possibly-anchored' | 'retained'
  | 'forwarded' | 'recorded' | 'not-a-number' | 'unprovable';

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

/** A reference the checker resolves to the one anchor declaration — identity, never spelling. */
function isAnchorReference(expr: ts.Expression, scan: Scan): boolean {
  const target = unwrap(expr);
  if (!ts.isIdentifier(target) && !ts.isPropertyAccessExpression(target)) return false;
  const symbol = boundSymbol(target, scan);
  return symbol !== undefined && scan.anchors.has(symbol);
}

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

/**
 * Composition is deliberately small: min with a genuinely bounded operand is bounded; otherwise
 * only all-anchor min is anchor. Every other min is unprovable. Max of only bounded operands is
 * bounded; max of bounded/anchor/retained with any anchor is anchor; max of bounded/retained with any
 * retained is retained. Other max expressions fail. A real outer cap can bound an otherwise unsafe
 * inner value. Retention never becomes a cap merely by nesting.
 */
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

interface Reached { literals: number[]; names: { name: string; node: ts.Expression }[] }

/** Every number and every static name the expression can reach. */
function reachedBy(expr: ts.Expression): Reached {
  const literals: number[] = [];
  const names: { name: string; node: ts.Expression }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node)) { literals.push(Number(node.text)); return; }
    if (ts.isPropertyAccessExpression(node) || ts.isIdentifier(node)) {
      const dotted = dottedName(node as ts.Expression);
      if (dotted !== null) { names.push({ name: dotted, node: node as ts.Expression }); return; }
    }
    ts.forEachChild(node, visit);
  };
  visit(expr);
  return { literals, names };
}

/** Enclosing-function name for a node, or `<top-level>` — how a site is attributed to an act. */
function enclosingFunction(node: ts.Node): string {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) {
      return current.name && ts.isIdentifier(current.name) ? current.name.text : '<anonymous>';
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent as ts.Node | undefined;
      if (parent !== undefined && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      return '<anonymous>';
    }
  }
  return '<top-level>';
}

interface Violation { file: string; source: string; detail: string }
/** One credence write, with the verdict the law reached about it — sites are counted by VERDICT. */
interface SiteRecord { file: string; within: string; verdict: Verdict; source: string }

/** The one diagnostic the law raises, run over whatever files it is handed. */
function auditCredencePaths(sources: readonly Source[]): {
  violations: Violation[]; sites: number; records: SiteRecord[]; namesAboveCeiling: string[];
} {
  const scan = scanOf(sources);
  const violations: Violation[] = [];
  const namesAboveCeiling = new Set<string>();
  const records: SiteRecord[] = [];

  for (const { file, ast } of scan.files) {
    for (const write of credenceWrites(ast, scan)) {
      const { expr, opaque } = write;
      // An opaque write is unprovable BY SHAPE: the law must hold for a result no static scan can
      // pin, and whatever the visible text carries is beside the point.
      const verdict = writeVerdict(write, scan);
      const source = expr.getText(ast).replace(/\s+/g, ' ').trim();
      records.push({ file, within: enclosingFunction(expr), verdict, source });
      if (verdict === 'bounded' || verdict === 'not-a-number' || verdict === 'retained'
        || verdict === 'forwarded' || verdict === 'recorded') continue;
      const before = violations.length;
      if (opaque !== null) violations.push({ file, source, detail: opaque });
      const { literals, names } = reachedBy(expr);
      for (const value of literals) {
        if (value > HEARSAY_CEILING) {
          violations.push({ file, source, detail: `bare literal ${value} exceeds the hearsay ceiling — evidence weight arrives by NAME, never as a literal` });
        }
      }
      for (const { name, node } of names) {
        const value = scan.constants.get(name);
        if (value === undefined || value <= HEARSAY_CEILING) continue;
        namesAboveCeiling.add(name);
        if (!isAnchorReference(node, scan)) {
          violations.push({ file, source, detail: `'${name}' (${value}) is a second constant above the hearsay ceiling` });
        }
      }
      // FAIL CLOSED. An unprovable write whose every token is individually lawful is exactly the
      // review's `HEARSAY_CEILING + 0.01`: no number is out of bounds, the VALUE is unbounded. The
      // guard keeps the report to one reason per site — where a literal or a name already explains
      // the failure, that is the diagnostic worth reading.
      if ((verdict === 'unprovable' || verdict === 'possibly-anchored') && violations.length === before) {
        violations.push({ file, source, detail: 'this write\'s value cannot be proven at or below the hearsay ceiling — a ceiling constant is a bound only where it IS the value, never as an operand' });
      }
    }
  }
  return { violations, sites: records.length, records, namesAboveCeiling: [...namesAboveCeiling].sort() };
}

// ── The live surface ──────────────────────────────────────────────────────────────────────────────

function engineFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return engineFiles(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

const sources: readonly Source[] = engineFiles(path.join(repoRoot, 'src')).map((full) => ({
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

/**
 * Every injected case carries the two governing constants in its own text, so the anchor is a real
 * BINDING the checker can resolve rather than a word the scan matches — the same question it asks of
 * `src/sim/artifacts.ts`.
 */
const PREAMBLE = [
  'export const HEARSAY_CEILING = 0.95;',
  'export const ARTIFACT_CREDENCE = 0.97;',
];

const audit = (lines: readonly string[]) =>
  auditCredencePaths([{ file: 'ghost.ts', text: [...PREAMBLE, ...lines].join('\n') }]);

const UNPROVABLE = 'cannot be proven at or below the hearsay ceiling';

describe('the evidence-hierarchy law FIRES on injected violations (proof, not presence)', () => {
  it('catches a bare literal above the ceiling in a composed belief record', () => {
    const injected = audit([
      "export function bad(store: Record<string, unknown>) { store['f'] = { credence: 0.99, claim: null }; }",
    ]);
    expect(injected.violations).toHaveLength(1);
    expect(injected.violations[0]!.detail).toContain('bare literal 0.99');
  });

  it('catches a SECOND named constant above the ceiling, wherever it is spelled', () => {
    const injected = audit([
      'export const CERTAINTY = 0.99;',
      'export const TIERS = { GOSPEL: 0.98 };',
      'export function moved(belief: { credence: number }) { belief.credence = CERTAINTY; }',
      'export function sunk(w: unknown, id: string, h: unknown) { ingestEvidence(w, id, h, TIERS.GOSPEL); }',
    ]);
    expect(injected.violations.map((v) => v.detail).sort()).toEqual([
      "'CERTAINTY' (0.99) is a second constant above the hearsay ceiling",
      "'TIERS.GOSPEL' (0.98) is a second constant above the hearsay ceiling",
    ]);
    expect(injected.namesAboveCeiling).toEqual(['CERTAINTY', 'TIERS.GOSPEL']);
  });

  it('a constant spelled ARTIFACT_CREDENCE but bound to another value is NOT the anchor', () => {
    // Identity, not spelling: the scan resolves the reference to a declaration whose parse-time value
    // is the production anchor. A same-named 0.99 is an unprovable value and is reported as one.
    const injected = auditCredencePaths([{
      file: 'ghost.ts',
      text: [
        'const ARTIFACT_CREDENCE = 0.99;',
        'export function bad(b: { credence: number }) { b.credence = ARTIFACT_CREDENCE; }',
      ].join('\n'),
    }]);
    expect(injected.records.map((record) => record.verdict)).toEqual(['unprovable']);
    expect(injected.violations.map((v) => v.detail))
      .toEqual(["'ARTIFACT_CREDENCE' (0.99) is a second constant above the hearsay ceiling"]);
  });

  it('stays silent on the lawful spellings the engine actually uses', () => {
    const injected = audit([
      'export const STANCE = { REPEAT: 0.5 } as const;',
      'export function ok(b: { credence: number }, t: number) {',
      '  b.credence = Math.min(HEARSAY_CEILING, b.credence + 0.15);',
      '  b.credence = Math.max(b.credence, STANCE.REPEAT);',
      '  return { credence: 0.85, t };',
      '}',
      'export function anchorIt(w: unknown, id: string, h: unknown) { ingestEvidence(w, id, h, ARTIFACT_CREDENCE); }',
    ]);
    expect(injected.violations).toEqual([]);
    expect(injected.namesAboveCeiling).toEqual(['ARTIFACT_CREDENCE']);
    expect(injected.sites).toBe(4);
  });

  it('the ceiling clamp is not a blanket escape — an UNBOUNDED Math.min is still audited', () => {
    const injected = audit([
      'export const CERTAINTY = 0.99;',
      // Bounded: whatever CERTAINTY is, the ceiling operand caps the result.
      'export function ok(b: { credence: number }) { b.credence = Math.min(HEARSAY_CEILING, CERTAINTY); }',
      // Unbounded: no operand is at or below the ceiling, so both numbers are audited.
      'export function bad(b: { credence: number }) { b.credence = Math.min(CERTAINTY, 0.98); }',
    ]);
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
 * The three forms review round one pushed through the scanner's own declared surface, plus the general
 * rule each one exposes. The posture is deliberately NOT an enumeration of forbidden arithmetic: the
 * scan proves a bound where a bound is provable (a ceiling-or-lower number, `Math.min` with a bounded
 * operand, `Math.max` with all operands bounded), distinguishes same-target retention and declared-
 * sink forwarding, and REPORTS every other shape. A new arithmetic spelling therefore arrives
 * already reported rather than waiting for the list to learn it.
 */
describe('the evidence-hierarchy law bounds credence writes BY VALUE and fails closed on the rest', () => {
  it('a bounded right-hand side does NOT bound a compound assignment (review form i)', () => {
    const injected = audit([
      'export function bad(belief: { credence: number }) {',
      '  belief.credence += Math.min(HEARSAY_CEILING, 0.99);',
      '}',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations.map((v) => v.detail).sort()).toEqual([
      COMPOUND_WRITE('+='),
      'bare literal 0.99 exceeds the hearsay ceiling — evidence weight arrives by NAME, never as a literal',
    ].sort());
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

  it('a bare `credence` pass-through is forwarded only inside a DECLARED sink, never anywhere', () => {
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

  it('stays silent on the engine\'s bounded, retained and forwarded shapes', () => {
    const injected = audit([
      'export const STANCE = { REPEAT: 0.5 } as const;',
      // The corroboration branch as docket P9-3 leaves it: max-of-min retains the same target; the inner min alone is bounded.
      'export function hearsay(existing: { credence: number }) {',
      '  existing.credence = Math.max(existing.credence, Math.min(HEARSAY_CEILING, existing.credence + 0.15));',
      '}',
      'export function reaction(belief: { credence: number }) {',
      '  belief.credence = Math.max(belief.credence, STANCE.REPEAT);',
      '}',
      'export function firstHearing(hearing: unknown, credence: number) { void hearing; return { credence, hearing }; }',
      'export function ingestEvidence(w: unknown, id: string, h: unknown, credence: number) {',
      '  void w; void id; return firstHearing(h, credence);',
      '}',
      'export function anchorIt(w: unknown, id: string, h: unknown) {',
      '  ingestEvidence(w, id, h, ARTIFACT_CREDENCE);',
      '}',
      'export function copy(b: { credence: number }) { return { credence: Math.min(HEARSAY_CEILING, b.credence) }; }',
    ]);
    expect(injected.sites).toBe(6);
    expect(injected.violations).toEqual([]);
    expect(injected.namesAboveCeiling).toEqual(['ARTIFACT_CREDENCE']);
  });
});

// ── C-1 round two: an ANCHOR is a value PROVEN to be the anchor, never one spelled like it ─────────

/**
 * Round two's Critical: `classify` called any `Math.min` with an anchor operand an anchor, so
 * `Math.min(ARTIFACT_CREDENCE, candidate)` — which writes 0.96 when `candidate` is 0.96, above the
 * ceiling and not the anchor — passed silently; and `Math.max(HEARSAY_CEILING, ARTIFACT_CREDENCE)`
 * could mint 0.97 anywhere while the P9-2 site pin, which matched the exact spelling
 * `ARTIFACT_CREDENCE`, never saw it. Both are answered by making `anchor` mean PROVEN.
 */
describe('the anchor verdict is proven compositionally, never read off the spelling', () => {
  const verdicts = (lines: readonly string[]) => audit(lines).records.map((r) => r.verdict);

  it('Math.min of the anchor and an unprovable co-operand proves nothing and is reported', () => {
    const injected = audit([
      'export function bad(belief: { credence: number }, candidate: number) {',
      '  belief.credence = Math.min(ARTIFACT_CREDENCE, candidate);',
      '}',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.records.map((r) => r.verdict)).toEqual(['unprovable']);
    expect(injected.violations).toHaveLength(1);
    expect(injected.violations[0]!.detail).toContain(UNPROVABLE);
    expect(injected.violations[0]!.source).toBe('Math.min(ARTIFACT_CREDENCE, candidate)');
  });

  it('Math.min of the anchor with a BOUNDED co-operand is bounded — the smallest operand caps it', () => {
    expect(verdicts([
      'export function ok(b: { credence: number }) { b.credence = Math.min(ARTIFACT_CREDENCE, HEARSAY_CEILING); }',
    ])).toEqual(['bounded']);
  });

  it('Math.min of nothing but anchors is still the anchor', () => {
    expect(verdicts([
      'export function ok(b: { credence: number }) { b.credence = Math.min(ARTIFACT_CREDENCE, ARTIFACT_CREDENCE); }',
    ])).toEqual(['anchor']);
  });

  it('a NESTED anchor is an anchor SITE wherever it is written — max over bounded-and-anchor', () => {
    // The spelling is not `ARTIFACT_CREDENCE`, but the VALUE is 0.97 — and the P9-2 pin below counts
    // sites by verdict, so this shape can no longer mint an anchor outside the one viewing sink.
    const injected = audit([
      'export function mint(b: { credence: number }) {',
      '  b.credence = Math.max(HEARSAY_CEILING, ARTIFACT_CREDENCE);',
      '}',
    ]);
    expect(injected.records.map((r) => ({ within: r.within, verdict: r.verdict })))
      .toEqual([{ within: 'mint', verdict: 'anchor' }]);
    expect(injected.violations).toEqual([]);
  });

  it('Math.max with any unprovable operand proves nothing, anchor operand or not', () => {
    expect(verdicts([
      'export function bad(b: { credence: number }, candidate: number) {',
      '  b.credence = Math.max(ARTIFACT_CREDENCE, candidate);',
      '}',
    ])).toEqual(['unprovable']);
  });

  it('a `Math` that is not the global Math proves nothing — the callee is resolved by binding', () => {
    expect(verdicts([
      'const Math = { min: (...xs: number[]) => xs[0]!, max: (...xs: number[]) => xs[0]! };',
      'export function sneak(b: { credence: number }, candidate: number) {',
      '  b.credence = Math.min(HEARSAY_CEILING, candidate);',
      '}',
    ])).toEqual(['unprovable']);
  });
});

// ── C-2 round two: the WRITE SURFACE is closed by NAME, in every position the language offers ──────

/**
 * Round two's other Critical, and the §5.1 spelling table. Every row below was run through the
 * delivered scanner and produced zero sites or zero violations; each is now a firing proof. The
 * closure is structural rather than enumerative — operators come from the compiler's own range, keys
 * and targets from the checker — so the next spelling arrives already covered.
 */
describe('a credence write is recognized by NAME in every write position the language offers', () => {
  it('every assignment operator the compiler knows is audited — the RANGE, never a hand list', () => {
    const operators: string[] = [];
    for (let kind = ts.SyntaxKind.FirstAssignment; kind <= ts.SyntaxKind.LastAssignment; kind += 1) {
      const spelling = ts.tokenToString(kind);
      expect(spelling, `SyntaxKind ${kind} sits in the assignment range with no spelling`).toBeTruthy();
      operators.push(spelling!);
    }
    // 2026-09: sixteen of them. The assertion is on the compiler's range, not on that number.
    expect(operators).toContain('**=');
    expect(operators).toContain('>>>=');
    expect(operators.length).toBeGreaterThanOrEqual(16);

    const injected = audit([
      'export function creep(b: { credence: number }) {',
      ...operators.map((operator) => `  b.credence ${operator} 0.5;`),
      '}',
    ]);
    expect(injected.sites, 'one site per operator').toBe(operators.length);
    // Plain `=` of a bounded value is the one lawful member of the range; every compound one fires.
    expect(injected.violations.map((v) => v.detail))
      .toEqual(operators.filter((operator) => operator !== '=').map(COMPOUND_WRITE));
  });

  it('the SHORTHAND property is a write (§5.1), and it is unprovable outside a declared sink', () => {
    const injected = audit([
      'export function bad(credence: number) { return { credence, claim: null }; }',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations).toHaveLength(1);
    expect(injected.violations[0]!.detail).toContain(UNPROVABLE);
    expect(injected.violations[0]!.source).toBe('credence');
  });

  it('the shorthand INSIDE a declared sink stays lawful — the real `firstHearing` shape', () => {
    const injected = audit([
      'export function firstHearing(hearing: unknown, credence: number, sources: string[]) {',
      '  return { claim: hearing, credence, apparentSources: sources };',
      '}',
    ]);
    expect(injected.records.map((r) => r.verdict)).toEqual(['forwarded']);
    expect(injected.violations).toEqual([]);
  });

  it('a computed key spelled as a literal is the same write (§5.1)', () => {
    const injected = audit([
      "export function bad(value: number) { return { ['credence']: value, claim: null }; }",
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations[0]!.detail).toContain(UNPROVABLE);
  });

  it('an element-access write with a literal key is the same write (§5.1)', () => {
    const injected = audit([
      "export function bad(b: { credence: number }, value: number) { b['credence'] = value; }",
      "export function creep(b: { credence: number }) { b['credence'] += 0.1; }",
      // A literal key that is NOT `credence` is not a credence write at all.
      "export function other(b: { credence: number; note: string }) { b['note'] = 'x'; }",
    ]);
    expect(injected.sites).toBe(2);
    expect(injected.violations.map((v) => v.detail))
      .toEqual([expect.stringContaining(UNPROVABLE), COMPOUND_WRITE('+=')]);
  });

  it('an UPDATE expression is a write in both fixities — no lawful increment of a credence exists', () => {
    const injected = audit([
      'export function post(b: { credence: number }) { b.credence++; }',
      'export function pre(b: { credence: number }) { --b.credence; }',
      "export function elem(b: { credence: number }) { b['credence']++; }",
    ]);
    expect(injected.sites).toBe(3);
    expect(injected.violations.map((v) => v.detail))
      .toEqual([UPDATE_WRITE('++'), UPDATE_WRITE('--'), UPDATE_WRITE('++')]);
  });

  it('a DESTRUCTURING destination is a write, and its incoming value is never inspected', () => {
    // The old walk read the DESTINATION expression (`b.credence`, a bounded credence read) and called
    // the write lawful. The pattern is now one opaque site: what arrives is not visible here.
    const injected = audit([
      'export function bad(b: { credence: number }, incoming: { credence: number }) {',
      '  ({ credence: b.credence } = incoming);',
      '}',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations.map((v) => v.detail)).toEqual([DESTRUCTURED_WRITE]);
  });

  it('every destructuring spelling that can reach a credence is one opaque site', () => {
    const injected = audit([
      'export function shorthand(incoming: { credence: number }) {',
      '  let credence = 0;',
      '  ({ credence } = incoming);',
      '  return credence;',
      '}',
      'export function nested(b: { credence: number }, rows: { inner: { credence: number } }) {',
      '  ({ inner: { credence: b.credence } } = rows);',
      '}',
      'export function array(b: { credence: number }, xs: number[]) { [b.credence] = xs; }',
      'export function loop(b: { credence: number }, rows: number[][]) {',
      '  for ([b.credence] of rows) { void b; }',
      '}',
    ]);
    expect(injected.sites).toBe(4);
    expect(new Set(injected.violations.map((v) => v.detail))).toEqual(new Set([DESTRUCTURED_WRITE]));
  });

  it('a destructuring destination that cannot reach a credence stays silent', () => {
    const injected = audit([
      'export function fine(b: { note: string }, incoming: { note: string }) {',
      '  ({ note: b.note } = incoming);',
      '}',
      // A DECLARATION binding cannot write an existing object\'s property — it makes a fresh local,
      // and any later write of that local into a credence is its own site, classified there.
      'export function read(b: { credence: number }) { const { credence } = b; return credence; }',
    ]);
    expect(injected.sites).toBe(0);
    expect(injected.violations).toEqual([]);
  });
});

// ── C-2 round two, prong 5: writes that never spell the name, resolved by the CHECKER ─────────────

describe('API-mediated credence writes are found by TYPE, not by the shape of the patch', () => {
  const BELIEF = 'export interface Belief { credence: number; note: string }';

  it('Object.assign onto a credence carrier is a site whatever the patch looks like', () => {
    const injected = audit([
      BELIEF,
      'export function literal(b: Belief, credence: number) { Object.assign(b, { credence }); }',
      'export function opaque(b: Belief, patch: Partial<Belief>) { Object.assign(b, patch); }',
    ]);
    // Three sites, not two: the VISIBLE patch is recognized twice over — once as the API-mediated
    // write and once, independently, as a shorthand property position named `credence`. Two prongs
    // catching the same danger is what a fail-closed surface looks like; the OPAQUE patch, which no
    // property walk can see, is the §5.1 (c) row and is caught only by the type-level prong.
    expect(injected.sites).toBe(3);
    expect(injected.violations.filter((v) => v.detail === API_WRITE)).toHaveLength(2);
    expect(injected.violations.filter((v) => v.detail.includes(UNPROVABLE))).toHaveLength(1);
  });

  it('defineProperty, defineProperties, Reflect.set and Reflect.defineProperty all count', () => {
    const injected = audit([
      BELIEF,
      "export function a(b: Belief, value: number) { Object.defineProperty(b, 'credence', { value }); }",
      "export function c(b: Belief, props: PropertyDescriptorMap) { Object.defineProperties(b, props); }",
      "export function d(b: Belief, value: number) { Reflect.set(b, 'credence', value); }",
      "export function e(b: Belief, spec: PropertyDescriptor) { Reflect.defineProperty(b, 'credence', spec); }",
    ]);
    expect(injected.sites).toBe(4);
    expect(injected.violations.map((v) => v.detail)).toEqual(Array(4).fill(API_WRITE));
  });

  it('the API is resolved by BINDING — a local rename of Object.assign is the same call', () => {
    const injected = audit([
      BELIEF,
      'const put = Object.assign;',
      'export function sneak(b: Belief, patch: Partial<Belief>) { put(b, patch); }',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations.map((v) => v.detail)).toEqual([API_WRITE]);
  });

  it('an element write whose key only the running program knows is a site on a credence carrier', () => {
    const injected = audit([
      BELIEF,
      "export function sneak(b: Belief, key: 'credence' | 'note', value: never) { b[key] = value; }",
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations.map((v) => v.detail)).toEqual([ELEMENT_KEY_WRITE]);
  });

  it('a computed key the scan cannot read is a site on an object typed as carrying a credence', () => {
    const injected = audit([
      BELIEF,
      'export function compose(key: string, value: number): Belief {',
      "  return { credence: 0.5, note: 'x', [key]: value } as Belief;",
      '}',
    ]);
    expect(injected.violations.map((v) => v.detail)).toContain(COMPUTED_KEY_WRITE);
  });

  it('the SAME calls on a target that carries no credence stay silent — the three real src/ shapes', () => {
    // `directives/mutation.ts`, `directives/transport.ts` and `rumors/traits.ts` each `Object.assign`
    // onto a claim or a payload. The checker types those targets as `InjectSpec`, an invitation
    // payload and `Partial<Claim>` — none of them carries a credence, so none of them is a site.
    const injected = audit([
      'export interface Claim { subject: string; severity: number }',
      'export function mutate(claim: Claim, field: string, delta: Record<string, unknown>) {',
      '  Object.assign(claim, { [field]: delta[field] });',
      '}',
      'export function merge(merged: Partial<Claim>, delta: Partial<Claim>) { Object.assign(merged, delta); }',
      "export function payload(p: { kind: string }, more: { venue: string }) { Object.assign(p, more); }",
      'export function route(map: Record<string, string>, id: string, faction: string) { map[id] = faction; }',
    ]);
    expect(injected.sites).toBe(0);
    expect(injected.violations).toEqual([]);
  });

  it('fails CLOSED where the checker cannot type the target at all', () => {
    const injected = audit([
      'export function murky(target: any, patch: unknown) { Object.assign(target, patch); }',
    ]);
    expect(injected.sites).toBe(1);
    expect(injected.violations.map((v) => v.detail)).toEqual([API_WRITE]);
  });
});

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

// ── DOCKET P9-2, the negative half: only a paper-present viewing may MINT an anchor ────────────────

/**
 * Adjudication P9-2 reads the plan's "only while the holder physically holds it" as a constraint on
 * MINTING, not on lifetime: the events that may put a 0.97 belief into a mind are the four
 * paper-present viewing acts and nothing else. The positive half of that ruling (no path demotes a
 * minted anchor) is behavioural and lives in `tests/sim/artifacts.test.ts`; the negative half is
 * structural, so it belongs to this scan — the same extractor that already knows which expressions
 * reach a credence is the thing that can enumerate where the anchor enters one.
 *
 * Two questions, both answered from the AST rather than from a reading of the source:
 *   1. Across all of `src/`, does an ANCHOR VALUE reach a credence anywhere except the single viewing
 *      helper? Counted by `classify` VERDICT, so a nested spelling counts too.
 *   2. Is every REFERENCE to that helper one of the four viewing acts? A fifth caller is the other way.
 */

/** Every credence site in `src/` whose value the law proves to BE the anchor. */
const anchorSites = live.records.filter((record) => record.verdict === 'anchor');

/** The three functions the plan authorizes to put a page in front of a pair of eyes. */
const VIEWING_FUNCTIONS = ['applyPlant', 'applyShow', 'resolveArtifacts'];

/** How a reference that is NOT a direct call reaches the audited function. */
function referenceShape(node: ts.Identifier): string {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
    return `through '.${parent.name.text}'`;
  }
  if (ts.isElementAccessExpression(parent) && parent.expression === node) {
    return 'through an element access';
  }
  if (ts.isVariableDeclaration(parent) || ts.isBindingElement(parent)) {
    return 'aliased to a local binding';
  }
  if (ts.isExportSpecifier(parent) || ts.isImportSpecifier(parent)
    || ts.isExportAssignment(parent)) {
    return 'crossing a module boundary';
  }
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    return 'passed as a value to another call';
  }
  return `as a ${ts.SyntaxKind[parent.kind]}`;
}

/**
 * EVERY REFERENCE to one function, resolved by BINDING (round two's I-1). The delivered pin asked
 * whether a call expression's callee TEXT read `deliverDocument`, which answers a different question
 * in three directions at once: `deliverDocument.call(undefined, …)` spells `deliverDocument.call` and
 * was invisible; `const deliver = deliverDocument; deliver(…)` spells `deliver` and was invisible;
 * and a same-named function in another module was counted as a caller of this one.
 *
 * REFERENCE-FIRST, UNRECOGNIZED-BY-DEFAULT. The scan enumerates every identifier the checker resolves
 * to the audited symbol and demands that each one be either the declaration itself or the direct
 * callee of a call inside an authorized function. An alias, a `.call`/`.apply`/`.bind`, a value use,
 * an export, an import, a fifth caller, an identifier the checker cannot resolve at all — every one of
 * them is reported. Text is used only to shortlist candidates (a static reference to a binding must
 * spell its name; an alias spells it at the alias declaration, which is itself a reported reference);
 * BINDING decides.
 */
function referencesTo(
  sources: readonly Source[], home: string, name: string, authorized: readonly string[],
): { callers: string[]; violations: Violation[] } {
  const scan = scanOf(sources);
  const violations: Violation[] = [];
  const callers: string[] = [];
  const quote = (node: ts.Node, ast: ts.SourceFile): string =>
    node.getText(ast).replace(/\s+/g, ' ').trim().slice(0, 120);

  // 1. THE DECLARATION: exactly one, in the file that owns it. A second function of the same name
  //    anywhere would leave the audit reading two different things under one word — reported, not
  //    guessed at.
  let declared: ts.Identifier | undefined;
  for (const { file, ast } of scan.files) {
    const visit = (node: ts.Node): void => {
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node))
        && node.name !== undefined && node.name.text === name) {
        if (file === home && declared === undefined) declared = node.name;
        else {
          violations.push({
            file, source: quote(node.name, ast),
            detail: `a second declaration of '${name}' — the pin would be reading two different functions under one name`,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  if (declared === undefined) {
    throw new Error(`the P9-2 caller pin found no '${name}' declaration in '${home}'`);
  }
  const target = scan.checker.getSymbolAtLocation(declared);
  if (target === undefined) {
    throw new Error(`the P9-2 caller pin could not bind '${name}' in '${home}'`);
  }

  // 2. EVERY reference to that symbol, held to the direct-call-inside-an-authorized-act shape.
  for (const { file, ast } of scan.files) {
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === name && node !== declared) {
        const symbol = boundSymbol(node, scan);
        if (symbol === undefined) {
          violations.push({
            file, source: quote(node.parent, ast),
            detail: `a reference to '${name}' the checker cannot resolve — unrecognized by default`,
          });
        } else if (symbol === target) {
          const parent = node.parent;
          if (ts.isCallExpression(parent) && unwrap(parent.expression) === node) {
            const within = enclosingFunction(node);
            callers.push(within);
            if (!authorized.includes(within)) {
              violations.push({
                file, source: quote(parent, ast),
                detail: `'${name}' is called from '${within}', which is not one of the authorized acts`,
              });
            }
          } else {
            violations.push({
              file, source: quote(parent, ast),
              detail: `'${name}' is reached ${referenceShape(node)}, not as a direct call inside an authorized act`,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return { callers: callers.sort(), violations };
}

describe('docket P9-2 — the anchor is minted by paper-present viewings and by nothing else', () => {
  it('an anchor VALUE reaches a credence at exactly ONE site in src/, whatever its spelling', () => {
    expect(anchorSites.map((site) => ({ file: site.file, within: site.within })))
      .toEqual([{ file: 'src/sim/artifacts.ts', within: 'deliverDocument' }]);
  });

  it('the site pin counts by verdict, so a nested anchor elsewhere would fail it', () => {
    // Non-vacuity, without touching production: the same records pass through the same filter.
    const injected = audit([
      'export function elsewhere(b: { credence: number }) {',
      '  b.credence = Math.max(HEARSAY_CEILING, ARTIFACT_CREDENCE);',
      '}',
    ]);
    expect(injected.records.filter((record) => record.verdict === 'anchor')
      .map((record) => record.within)).toEqual(['elsewhere']);
  });
});

describe('docket P9-2 — the one viewing helper is reached by the four acts and by nothing else', () => {
  const audited = referencesTo(sources, 'src/sim/artifacts.ts', 'deliverDocument', VIEWING_FUNCTIONS);

  it('every reference to it in src/ is a direct call inside one of the authorized acts', () => {
    expect(audited.violations).toEqual([]);
  });

  it('and those calls are exactly show, hand-over, pickup and re-show', () => {
    // SHOW, HAND-OVER (`applyPlant`), PICKUP and RE-SHOW (both inside the beat-tail hook) — the four
    // acts the plan names, and the only four ways a pair of eyes reaches a page.
    expect(audited.callers).toEqual(['applyPlant', 'applyShow', 'resolveArtifacts', 'resolveArtifacts']);
  });
});

// ── I-1 round two: the caller pin FIRES on every reference shape that is not a direct lawful call ──

describe('the caller pin is binding-resolved: every other way to reach the helper is reported', () => {
  const HELPER = 'function deliverDocument(world: unknown, page: unknown) { void world; void page; }';
  const LAWFUL = 'export function applyShow(w: unknown, p: unknown) { deliverDocument(w, p); }';
  const walk = (files: readonly Source[]) =>
    referencesTo(files, 'ghost.ts', 'deliverDocument', VIEWING_FUNCTIONS);
  const ghost = (lines: readonly string[]): Source =>
    ({ file: 'ghost.ts', text: [HELPER, LAWFUL, ...lines].join('\n') });

  it('the lawful shape alone is silent — one direct call inside an authorized act', () => {
    const audited = walk([ghost([])]);
    expect(audited.violations).toEqual([]);
    expect(audited.callers).toEqual(['applyShow']);
  });

  it('an ALIAS is reported at the alias, and its call is never counted as a caller', () => {
    const audited = walk([ghost([
      'const deliver = deliverDocument;',
      'export function smuggle(w: unknown, p: unknown) { deliver(w, p); }',
    ])]);
    expect(audited.callers).toEqual(['applyShow']);
    expect(audited.violations.map((v) => v.detail))
      .toEqual(["'deliverDocument' is reached aliased to a local binding, not as a direct call inside an authorized act"]);
  });

  it('a `.call` form is reported — the delivered pin read its callee text as `deliverDocument.call`', () => {
    const audited = walk([ghost([
      'export function smuggle(w: unknown, p: unknown) { deliverDocument.call(undefined, w, p); }',
    ])]);
    expect(audited.callers).toEqual(['applyShow']);
    expect(audited.violations.map((v) => v.detail))
      .toEqual(["'deliverDocument' is reached through '.call', not as a direct call inside an authorized act"]);
  });

  it('`.apply` and `.bind` are the same finding', () => {
    const audited = walk([ghost([
      'export function a(w: unknown, p: unknown) { deliverDocument.apply(undefined, [w, p]); }',
      'export function b() { return deliverDocument.bind(undefined); }',
    ])]);
    expect(audited.violations.map((v) => v.detail)).toEqual([
      "'deliverDocument' is reached through '.apply', not as a direct call inside an authorized act",
      "'deliverDocument' is reached through '.bind', not as a direct call inside an authorized act",
    ]);
  });

  it('passing it as a VALUE is reported', () => {
    const audited = walk([ghost([
      'export function register(fn: unknown) { return fn; }',
      'export const hook = register(deliverDocument);',
    ])]);
    expect(audited.violations.map((v) => v.detail))
      .toEqual(["'deliverDocument' is reached passed as a value to another call, not as a direct call inside an authorized act"]);
  });

  it('exporting it is reported — the helper stops being module-private', () => {
    const audited = walk([ghost(['export { deliverDocument };'])]);
    expect(audited.violations.map((v) => v.detail))
      .toEqual(["'deliverDocument' is reached crossing a module boundary, not as a direct call inside an authorized act"]);
  });

  it('a FIFTH direct call from an unauthorized function is reported AND counted', () => {
    const audited = walk([ghost([
      'export function backdoor(w: unknown, p: unknown) { deliverDocument(w, p); }',
    ])]);
    expect(audited.callers).toEqual(['applyShow', 'backdoor']);
    expect(audited.violations.map((v) => v.detail))
      .toEqual(["'deliverDocument' is called from 'backdoor', which is not one of the authorized acts"]);
  });

  it('a SAME-NAMED function in another module is never misattributed to this one', () => {
    const audited = walk([ghost([]), {
      file: 'other.ts',
      text: [
        'function deliverDocument(world: unknown, page: unknown) { void world; void page; }',
        'export function elsewhere(w: unknown, p: unknown) { deliverDocument(w, p); }',
      ].join('\n'),
    }]);
    // `elsewhere` calls a DIFFERENT symbol, so it is not a caller of the audited one…
    expect(audited.callers).toEqual(['applyShow']);
    // …and the duplicate name is itself the finding: one word, two functions.
    expect(audited.violations.map((v) => v.detail))
      .toEqual(["a second declaration of 'deliverDocument' — the pin would be reading two different functions under one name"]);
  });
});
