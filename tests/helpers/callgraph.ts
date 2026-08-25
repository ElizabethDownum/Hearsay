/**
 * A small TypeScript-AST call-graph analyser for the plan's mandated ENFORCEMENT SCANS.
 *
 * Token scans over a single function body are trivially bypassed: a violation moves one call deep
 * into a helper, or hides behind `const f = forbidden;`. These scans instead answer the structural
 * question — *which functions, transitively reachable from this root, can touch this thing?* — using
 * the repo's own `typescript` devDependency (the Task-1 AST-statement precedent).
 *
 * Deliberately module-local: a mention of an imported name is a LEAF (`ensureAssetRecord` is a fact
 * about the closure, not something to follow). Cross-module escape is closed separately, by pinning
 * the whole-`src` file set that may name each guarded primitive.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

export interface ModuleGraph {
  /** Every named function-like declaration in the module, keyed by name. */
  functions: Map<string, ts.SignatureDeclaration>;
  /** name → every identifier and property name mentioned directly in that body (aliases resolved). */
  mentions: Map<string, Set<string>>;
  /** name → every binary/assignment operator token spelling used directly in that body. */
  operators: Map<string, Set<string>>;
  /** local rename → the guarded name it stands for (identifier, property, or destructured). */
  aliases: Map<string, string>;
  source: string;
  file: ts.SourceFile;
}

function isFunctionLike(node: ts.Node): node is ts.SignatureDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);
}

function declaredName(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name && ts.isIdentifier(node.name) ? node.name.text : null;
  }
  const parent = node.parent;
  if ((ts.isFunctionExpression(node) || ts.isArrowFunction(node))
    && parent !== undefined && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  return null;
}

/** Syntactic wrappers that change nothing about which name an expression reaches. */
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

/**
 * An ELEMENT-ACCESS key with a parse-time answer: `api['name']` yes, `api[whichever]` no. Position
 * matters — inside brackets an identifier is a variable READ, whose value only the running program
 * knows, so it must not be mistaken for the property name it happens to be spelled like.
 */
function literalElementKey(node: ts.Node | undefined): string | null {
  if (node === undefined) return null;
  const target = ts.isExpression(node) ? unwrap(node) : node;
  if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) return target.text;
  return null;
}

/**
 * A property-NAME position, where an identifier IS the name: `{ guarded: local }`,
 * `{ 'guarded': local }`, `{ ['guarded']: local }`. A computed name falls back to the literal rule.
 */
function staticPropertyName(node: ts.Node | undefined): string | null {
  if (node === undefined) return null;
  if (ts.isComputedPropertyName(node)) return literalElementKey(node.expression);
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

/**
 * Every rename that can stand in for a guarded name. A rename is not an escape hatch, in any shape
 * TypeScript offers a STATIC answer for:
 *   `const peek = evaluateRecruitment`                  — a bare identifier;
 *   `const peek = api.evaluateRecruitment`              — a property access;
 *   `const peek = api['evaluateRecruitment']`           — a static element access;
 *   `const { evaluateRecruitment: peek } = api`         — a destructuring rename;
 *   `const { ['evaluateRecruitment']: peek } = api`     — a computed-literal destructuring rename;
 *   `import { ensureAssetRecord as peek } from '...'`   — an import specifier.
 * Shapes with no static answer (`api[whichever]`) are not aliased here — they FAIL CLOSED instead,
 * via `unresolvedSites`.
 */
function aliasTable(file: ts.SourceFile): Map<string, string> {
  const direct = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined
      && ts.isIdentifier(node.name)) {
      const from = unwrap(node.initializer);
      if (ts.isIdentifier(from)) direct.set(node.name.text, from.text);
      else if (ts.isPropertyAccessExpression(from)) direct.set(node.name.text, from.name.text);
      else if (ts.isElementAccessExpression(from)) {
        const key = literalElementKey(from.argumentExpression);
        if (key !== null) direct.set(node.name.text, key);
      }
    }
    // `const { guarded: local } = whatever` / `const { ['guarded']: local } = whatever`.
    if (ts.isBindingElement(node) && node.propertyName !== undefined && ts.isIdentifier(node.name)) {
      const key = staticPropertyName(node.propertyName);
      if (key !== null) direct.set(node.name.text, key);
    }
    // `import { guarded as local }` — the local name IS the primitive.
    if (ts.isImportSpecifier(node) && node.propertyName !== undefined) {
      direct.set(node.name.text, node.propertyName.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const resolved = new Map<string, string>();
  for (const [name] of direct) {
    const seen = new Set<string>([name]);
    let target = name;
    while (direct.has(target) && !seen.has(direct.get(target)!)) {
      target = direct.get(target)!;
      seen.add(target);
    }
    if (target !== name) resolved.set(name, target);
  }
  return resolved;
}

/**
 * The parser's OWN verdict on the source it just read. `ts.createSourceFile` records its parse
 * diagnostics but does not expose them on the public `SourceFile` type; `getSyntacticDiagnostics`
 * is the supported access path to exactly that list, so the already-parsed file is handed to a
 * one-file program rather than reparsed. The host is virtual and the options are `noResolve` +
 * `noLib`: nothing outside this text is ever read, and nothing semantic is ever asked.
 *
 * (Lifted to this shared home by fix wave 2 so the receipt scan and the determinism scan share one
 * fail-closed parse instead of each growing a private copy — the same duplication the wave's `(r)`
 * closure removes from production. `tests/directives/view.test.ts` keeps its own copy: that file is
 * outside this wave's scope, and converging it is a Plan-10 cleanup.)
 */
export function syntaxErrors(file: ts.SourceFile): readonly ts.Diagnostic[] {
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === file.fileName ? file : undefined),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => name === file.fileName,
    readFile: () => undefined,
  };
  return ts.createProgram([file.fileName], { noResolve: true, noLib: true }, host)
    .getSyntacticDiagnostics(file);
}

/**
 * THE FAIL-CLOSED PARSE. `ts.createSourceFile` does not REJECT bad syntax, it REPAIRS it — and a
 * repaired parse can silently reclassify live code, so a scan would call a source `tsc` refuses
 * "clean". Either symptom — a syntactic diagnostic, or a recovery so total that no statement
 * survives — means this text is not the language the scan is reading, and the scan must refuse it.
 */
export function assertParsed(file: ts.SourceFile, scanName: string): void {
  const [firstError] = syntaxErrors(file);
  if (firstError !== undefined) {
    throw new Error(`${scanName} could not parse ${file.fileName}: `
      + ts.flattenDiagnosticMessageText(firstError.messageText, ' '));
  }
  if (file.text.trim().length > 0 && file.statements.length === 0) {
    throw new Error(`${scanName} could not parse ${file.fileName}: no statements`);
  }
}

export type Access = ts.PropertyAccessExpression | ts.ElementAccessExpression;

/** A member read, in either spelling — `payload.fact` and `payload['fact']` are the same read. */
export function isAccess(node: ts.Node): node is Access {
  return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
}

/** The property NAME a member access reads — `null` when only the running program knows. */
export function accessedName(node: Access): string | null {
  return ts.isPropertyAccessExpression(node) ? node.name.text : literalElementKey(node.argumentExpression);
}

/** Syntactic wrappers that change nothing about which name an expression reaches (node-level). */
export function unwrapNode(node: ts.Node): ts.Node {
  let current = node;
  for (;;) {
    if (ts.isParenthesizedExpression(current) || ts.isNonNullExpression(current)
      || ts.isAsExpression(current) || ts.isSatisfiesExpression(current)
      || ts.isTypeAssertionExpression(current) || ts.isAwaitExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

/** Every name on an access chain, root first: `message.payload.fact` ⇒ message, payload, fact. */
export function chainNames(node: ts.Node): string[] {
  const target = unwrapNode(node);
  if (ts.isIdentifier(target)) return [target.text];
  if (isAccess(target)) return [...chainNames(target.expression), accessedName(target) ?? '*'];
  if (ts.isCallExpression(target)) return chainNames(target.expression);
  return [];
}

/** A property-name position spelled statically (`{ fact: x }`, `{ 'fact': x }`, `{ ['fact']: x }`). */
export function staticNamePosition(node: ts.Node | undefined): string | null {
  return staticPropertyName(node);
}

export function parseModule(relativePath: string, sourceOverride?: string): ModuleGraph {
  const source = sourceOverride ?? readFileSync(join(process.cwd(), relativePath), 'utf8');
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.ESNext, true);
  const aliases = aliasTable(file);
  const functions = new Map<string, ts.SignatureDeclaration>();
  const mentions = new Map<string, Set<string>>();
  const operators = new Map<string, Set<string>>();

  const collect = (fn: ts.SignatureDeclaration, name: string): void => {
    const named = mentions.get(name) ?? new Set<string>();
    const ops = operators.get(name) ?? new Set<string>();
    const walk = (node: ts.Node): void => {
      // A nested named function belongs to its own entry; its body is walked separately below.
      if (node !== fn && isFunctionLike(node) && declaredName(node) !== null) return;
      if (ts.isIdentifier(node)) named.add(aliases.get(node.text) ?? node.text);
      else if (ts.isPropertyAccessExpression(node)) named.add(node.name.text);
      else if (ts.isElementAccessExpression(node)) {
        // `api['evaluateRecruitment']` names the evaluator exactly as `api.evaluateRecruitment` does.
        const key = literalElementKey(node.argumentExpression);
        if (key !== null) named.add(aliases.get(key) ?? key);
      } else if (ts.isBinaryExpression(node)) {
        ops.add(ts.tokenToString(node.operatorToken.kind) ?? '');
      }
      ts.forEachChild(node, walk);
    };
    const body = (fn as { body?: ts.Node }).body;
    if (body !== undefined) walk(body);
    named.delete(name);
    mentions.set(name, named);
    operators.set(name, ops);
  };

  const visit = (node: ts.Node): void => {
    if (isFunctionLike(node)) {
      const name = declaredName(node);
      if (name !== null) {
        functions.set(name, node);
        collect(node, name);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { functions, mentions, operators, aliases, source, file };
}

/**
 * Every module-local function transitively reachable from `roots` (roots included).
 *
 * `cut` names functions the walk neither follows nor reports. That is how a SHARED DISPATCHER can be
 * brought inside a boundary: root at the dispatcher and cut the one lawful branch target it hands
 * off to, and what remains is exactly the region that runs whichever branch is taken — including the
 * unguarded prologue, where the re-reviewer's injection lived. No branch-polarity analysis needed.
 */
export function reachable(
  graph: ModuleGraph, roots: readonly string[], cut: readonly string[] = [],
): Set<string> {
  const excluded = new Set(cut);
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (seen.has(name) || excluded.has(name) || !graph.functions.has(name)) continue;
    seen.add(name);
    for (const mention of graph.mentions.get(name) ?? []) {
      if (graph.functions.has(mention) && !seen.has(mention) && !excluded.has(mention)) {
        queue.push(mention);
      }
    }
  }
  return seen;
}

/** Every name mentioned anywhere in the closure of `roots` — the closed "what can this touch" set. */
export function mentionsFrom(
  graph: ModuleGraph, roots: readonly string[], cut: readonly string[] = [],
): Set<string> {
  const excluded = new Set(cut);
  const all = new Set<string>();
  for (const name of reachable(graph, roots, cut)) {
    for (const mention of graph.mentions.get(name) ?? []) {
      if (!excluded.has(mention)) all.add(mention);
    }
  }
  return all;
}

/** Every operator spelling used anywhere in the closure of `roots` (catches `%` parity tricks). */
export function operatorsFrom(graph: ModuleGraph, roots: readonly string[]): Set<string> {
  const all = new Set<string>();
  for (const name of reachable(graph, roots)) {
    for (const op of graph.operators.get(name) ?? []) all.add(op);
  }
  return all;
}

/** Which module-local functions mention `name` at all — call, alias creation, or bare reference. */
export function mentionedBy(graph: ModuleGraph, name: string): string[] {
  return [...graph.mentions.entries()]
    .filter(([, named]) => named.has(name))
    .map(([fn]) => fn)
    .sort();
}

/** Names from `candidates` that appear anywhere in the closure of `roots`. */
export function forbiddenReached(
  graph: ModuleGraph, roots: readonly string[], candidates: readonly string[],
  cut: readonly string[] = [],
): string[] {
  const reachedNames = mentionsFrom(graph, roots, cut);
  return candidates.filter((candidate) => reachedNames.has(candidate)).sort();
}

/** Argument counts of every call to `callee` in the module, in source order. */
export function callArgCounts(graph: ModuleGraph, callee: string): number[] {
  const counts: number[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text === callee) {
      counts.push(node.arguments.length);
    }
    ts.forEachChild(node, visit);
  };
  visit(graph.file);
  return counts;
}

export interface CallSite {
  /** The guarded name this call resolves to (after alias/property resolution). */
  callee: string;
  /** The enclosing named function, or `'<module>'` for a top-level call. */
  enclosing: string;
  /** Conditions of every enclosing `if`/ternary, as source text. */
  guards: string[];
}

/**
 * The static name an expression reaches — the ONE resolver every scan shares. `null` means only the
 * running program knows, which in the guarded module is itself a failure (see `unresolvedSites`).
 */
export function staticName(graph: ModuleGraph, expr: ts.Expression): string | null {
  const target = unwrap(expr);
  const resolve = (raw: string): string => graph.aliases.get(raw) ?? raw;
  if (ts.isIdentifier(target)) return resolve(target.text);
  if (ts.isPropertyAccessExpression(target)) return resolve(target.name.text);
  if (ts.isElementAccessExpression(target)) {
    const key = literalElementKey(target.argumentExpression);
    return key === null ? null : resolve(key);
  }
  // `rosterFor(world, p).push(row)` — the array is named by the accessor that produced it.
  if (ts.isCallExpression(target)) return staticName(graph, target.expression);
  return null;
}

function calleeName(graph: ModuleGraph, node: ts.CallExpression): string | null {
  return staticName(graph, node.expression);
}

/**
 * Every call that reaches any of `callees`, with the conditions that dominate it. This is the EXACT
 * allowed-call-site enforcement the re-review required: pin the whole `callee→enclosing` set and any
 * new site anywhere in the module — dispatcher included — changes it.
 */
export function callSites(graph: ModuleGraph, callees: readonly string[]): CallSite[] {
  const wanted = new Set(callees);
  const sites: CallSite[] = [];
  const visit = (node: ts.Node): void => {
    const resolved = ts.isCallExpression(node) ? calleeName(graph, node) : null;
    if (ts.isCallExpression(node) && resolved !== null && wanted.has(resolved)) {
      const guards: string[] = [];
      let enclosing = '<module>';
      let cursor: ts.Node | undefined = node;
      let child: ts.Node = node;
      while (cursor !== undefined) {
        if (ts.isIfStatement(cursor) && cursor.expression !== child) {
          guards.push(cursor.expression.getText(graph.file));
        }
        if (ts.isConditionalExpression(cursor) && cursor.condition !== child) {
          guards.push(cursor.condition.getText(graph.file));
        }
        if (isFunctionLike(cursor) && declaredName(cursor) !== null) {
          enclosing = declaredName(cursor)!;
          break;
        }
        child = cursor;
        cursor = cursor.parent;
      }
      sites.push({ callee: resolved, enclosing, guards });
    }
    ts.forEachChild(node, visit);
  };
  visit(graph.file);
  return sites;
}

/** `callee→enclosing` for every call reaching `callees`, sorted — the exact-table pin shape. */
export function callSiteTable(graph: ModuleGraph, callees: readonly string[]): string[] {
  return callSites(graph, callees)
    .map((site) => `${site.callee}→${site.enclosing}`)
    .sort();
}

/**
 * Array names that are `.push`ed into anywhere in the closure of `roots`. Names alone cannot see
 * roster GROWTH (`world.intel.informants.push(...)` reads as an ordinary property chain), so the
 * enrollment scan asks this question separately.
 */
export function pushTargets(
  graph: ModuleGraph, roots: readonly string[], cut: readonly string[] = [],
): Set<string> {
  const inClosure = reachable(graph, roots, cut);
  const named: string[] = [];
  for (const site of pushSites(graph)) {
    // An UNNAMEABLE receiver is not silently dropped here — `unresolvedSites` refuses it outright.
    if (site.array !== null && inClosure.has(site.enclosing)) named.push(site.array);
  }
  return new Set(named);
}

export interface PushSite {
  /** The receiver the row is pushed into, by static name — `null` when only runtime knows. */
  array: string | null;
  /** The enclosing named function, or `'<module>'`. */
  enclosing: string;
}

/**
 * Every `<receiver>.push(...)` in the module, the receiver resolved by `staticName`. An unresolvable
 * receiver is reported as `null` rather than a sentinel string: sentinels were silently filtered out
 * of the pinned table, which is exactly how `(cond ? a.assets : a.enemyAssets).push(...)` escaped.
 */
export function pushSites(graph: ModuleGraph): PushSite[] {
  const sites: PushSite[] = [];
  const visit = (node: ts.Node, owner: string): void => {
    let current = owner;
    if (isFunctionLike(node) && declaredName(node) !== null) current = declaredName(node)!;
    if (GROWTH_METHODS.some((method) => isMethodCall(node, method)) && isMethodCall(node)) {
      sites.push({ array: staticName(graph, node.expression.expression), enclosing: current });
    }
    ts.forEachChild(node, (child) => { visit(child, current); });
  };
  visit(graph.file, '<module>');
  return sites;
}

/** `array@enclosing` for every push whose receiver is one of `arrays`, sorted — the exact-table pin. */
export function pushSiteTable(graph: ModuleGraph, arrays: readonly string[]): string[] {
  const wanted = new Set(arrays);
  return pushSites(graph)
    .filter((site) => site.array !== null && wanted.has(site.array))
    .map((site) => `${site.array!}@${site.enclosing}`)
    .sort();
}

type MethodCall = ts.CallExpression & {
  expression: ts.PropertyAccessExpression | ts.ElementAccessExpression;
};

function isMethodCall(node: ts.Node, name?: string): node is MethodCall {
  if (!ts.isCallExpression(node)) return false;
  const target = unwrap(node.expression);
  if (!ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target)) return false;
  if (name === undefined) return true;
  const called = ts.isPropertyAccessExpression(target)
    ? target.name.text : literalElementKey(target.argumentExpression);
  return called === name;
}

/**
 * The array mutators that can GROW a roster. Their receiver must be nameable; an ordinary read
 * (`(rows ?? []).some(...)`, `[...members].filter(...)`) hides no name and is left alone.
 */
export const GROWTH_METHODS = ['push', 'unshift', 'splice'];

/** A site in the guarded module whose meaning the scans cannot read at parse time. */
export interface UnresolvedSite {
  kind: 'callee' | 'growth-receiver' | 'module-capture';
  /** The offending source text, trimmed for a readable failure message. */
  text: string;
  enclosing: string;
  line: number;
}

/**
 * THE FAIL-CLOSED DEFAULT. Everything above answers "is this guarded name reached from here?"; this
 * answers the question that terminates the arms race: "is there anything here I cannot read?"
 *
 * Three ways a guarded module can become unreadable, each reported rather than skipped:
 *  1. `callee`           — a call whose target has no static name (`api[whichever](...)`, `(a ? f : g)(...)`);
 *  2. `growth-receiver`  — an array-GROWTH call whose receiver has no static name
 *                          (`(cond ? a.assets : a.enemyAssets).push(...)`);
 *  3. `module-capture` — a guarded name referenced at MODULE scope outside an import/export. Every
 *     bracket/computed bypass needs a module-level holder to read the name out of; a guarded name has
 *     no lawful reason to be captured into module state, so capturing one is itself the violation.
 *
 * A truly dynamic form is therefore structurally banned in the guarded module: it either resolves
 * (and the exact tables see it) or it lands here.
 */
export function unresolvedSites(graph: ModuleGraph, guarded: readonly string[]): UnresolvedSite[] {
  const watched = new Set(guarded);
  const sites: UnresolvedSite[] = [];
  const record = (kind: UnresolvedSite['kind'], node: ts.Node, enclosing: string): void => {
    const text = node.getText(graph.file).replace(/\s+/g, ' ').slice(0, 90);
    const line = graph.file.getLineAndCharacterOfPosition(node.getStart(graph.file)).line + 1;
    sites.push({ kind, text, enclosing, line });
  };

  const visit = (node: ts.Node, owner: string): void => {
    // Import/export declarations name the primitives lawfully — that IS the module's wiring.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      || ts.isImportEqualsDeclaration(node)) return;
    let current = owner;
    if (isFunctionLike(node) && declaredName(node) !== null) current = declaredName(node)!;

    if (ts.isCallExpression(node) && staticName(graph, node.expression) === null) {
      record('callee', node.expression, current);
    }
    if (GROWTH_METHODS.some((method) => isMethodCall(node, method))
      && isMethodCall(node) && staticName(graph, node.expression.expression) === null) {
      record('growth-receiver', node.expression.expression, current);
    }
    if (current === '<module>' && !isTypePosition(node)) {
      const named = ts.isIdentifier(node) ? node.text
        : ts.isPropertyAccessExpression(node) ? node.name.text
          : ts.isElementAccessExpression(node) ? literalElementKey(node.argumentExpression) : null;
      const resolved = named === null ? null : (graph.aliases.get(named) ?? named);
      if (resolved !== null && watched.has(resolved)) record('module-capture', node, current);
    }
    ts.forEachChild(node, (child) => { visit(child, current); });
  };
  visit(graph.file, '<module>');
  return sites;
}

/** Type annotations mention names without reaching their values. */
function isTypePosition(node: ts.Node): boolean {
  for (let cursor: ts.Node | undefined = node; cursor !== undefined; cursor = cursor.parent) {
    if (ts.isTypeNode(cursor) || ts.isTypeAliasDeclaration(cursor)
      || ts.isInterfaceDeclaration(cursor)) return true;
  }
  return false;
}

/** One readable line per unresolved site — the scan's failure message. */
export function describeUnresolved(sites: readonly UnresolvedSite[]): string {
  return sites
    .map((site) => `${site.kind} @ ${site.enclosing} (line ${site.line}): ${site.text}`)
    .join('\n');
}

/** Strip comments so a prose mention of a guarded name is not read as a call site. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Files under `src/` whose CODE names any of `needles` — the cross-module escape fence. */
export function srcFilesNaming(needles: readonly string[]): string[] {
  const root = join(process.cwd(), 'src');
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) {
        const text = withoutComments(readFileSync(full, 'utf8'));
        if (needles.some((needle) => text.includes(needle))) {
          hits.push(full.slice(process.cwd().length + 1).replaceAll('\\', '/'));
        }
      }
    }
  };
  walk(root);
  return hits.sort();
}
