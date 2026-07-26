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

/** `const peek = evaluateRecruitment` — a rename is not an escape hatch. */
function aliasTable(file: ts.SourceFile): Map<string, string> {
  const direct = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
      && node.initializer !== undefined && ts.isIdentifier(node.initializer)) {
      direct.set(node.name.text, node.initializer.text);
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
      else if (ts.isBinaryExpression(node)) ops.add(ts.tokenToString(node.operatorToken.kind) ?? '');
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
  return { functions, mentions, operators, source, file };
}

/** Every module-local function transitively reachable from `roots` (roots included). */
export function reachable(graph: ModuleGraph, roots: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (seen.has(name) || !graph.functions.has(name)) continue;
    seen.add(name);
    for (const mention of graph.mentions.get(name) ?? []) {
      if (graph.functions.has(mention) && !seen.has(mention)) queue.push(mention);
    }
  }
  return seen;
}

/** Every name mentioned anywhere in the closure of `roots` — the closed "what can this touch" set. */
export function mentionsFrom(graph: ModuleGraph, roots: readonly string[]): Set<string> {
  const all = new Set<string>();
  for (const name of reachable(graph, roots)) {
    for (const mention of graph.mentions.get(name) ?? []) all.add(mention);
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
): string[] {
  const reachedNames = mentionsFrom(graph, roots);
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
  /** The enclosing named function, or `'<module>'` for a top-level call. */
  enclosing: string;
  /** Conditions of every enclosing `if`/ternary, as source text. */
  guards: string[];
}

/** Every call to any of `callees`, with the conditions that dominate it. */
export function callSites(graph: ModuleGraph, callees: readonly string[]): CallSite[] {
  const wanted = new Set(callees);
  const sites: CallSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && wanted.has(node.expression.text)) {
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
      sites.push({ enclosing, guards });
    }
    ts.forEachChild(node, visit);
  };
  visit(graph.file);
  return sites;
}

/**
 * Array names that are `.push`ed into anywhere in the closure of `roots`. Names alone cannot see
 * roster GROWTH (`world.intel.informants.push(...)` reads as an ordinary property chain), so the
 * enrollment scan asks this question separately.
 */
export function pushTargets(graph: ModuleGraph, roots: readonly string[]): Set<string> {
  const inClosure = reachable(graph, roots);
  const targets = new Set<string>();
  const visit = (node: ts.Node, owner: string): void => {
    let current = owner;
    if (isFunctionLike(node) && declaredName(node) !== null) current = declaredName(node)!;
    if (inClosure.has(current) && ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push') {
      const receiver = node.expression.expression;
      if (ts.isIdentifier(receiver)) targets.add(receiver.text);
      else if (ts.isPropertyAccessExpression(receiver)) targets.add(receiver.name.text);
    }
    ts.forEachChild(node, (child) => { visit(child, current); });
  };
  visit(graph.file, '<module>');
  return targets;
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
