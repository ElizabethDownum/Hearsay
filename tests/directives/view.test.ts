import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { STANDARD_RULES } from '../../src/content/rules';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { ensureDirectiveState, issueDirectiveRecord } from '../../src/sim/directives/state';
import { directiveView } from '../../src/sim/directives/view';
import { stableStringify } from '../../src/sim/hash';
import { miniTown } from '../sim/helpers/minitown';
import type {
  DirectiveBrief, DirectiveDecisionProfile, DirectiveRecord,
} from '../../src/sim/directives/types';
import type { WorldState } from '../../src/sim/types';

/**
 * THE directive desk's epistemic selector (Plan 11 Task 13). Everything below proves the same
 * sentence from two sides: the ledger shows what the PLAYER authored plus what physically came
 * back, and NOTHING about delivery, interpretation, execution, allegiance, or the enemy.
 */

const brief = (over: Partial<DirectiveBrief> = {}): DirectiveBrief => ({
  mission: { kind: 'learn', target: { kind: 'person', id: 'cyn' } },
  priority: 'routine', authority: 'relationship', discretion: 'quiet',
  specificity: 'guided', guidance: [], active: { from: 0, until: 240 },
  report: 'outcome', reportBy: 120, purpose: null,
  ...over,
});

/** A world with a real roster and two REAL player directives issued through the real issuer. */
function fixture(seed = 'dv-1'): WorldState {
  const world = buildWorld(miniTown(), seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  for (const id of ['ada', 'bez', 'cyn']) {
    world.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.intel.informants.push({ id, assignedVenue: null });
  }
  world.tick = 0;
  issueDirectiveRecord(world, {
    principal: 'player', principalId: 'you', recipient: 'ada',
    handoff: { outboundVia: [], reportVia: ['bez'] }, brief: brief(), tick: 0, cause: null,
  });
  world.tick = 15;
  issueDirectiveRecord(world, {
    principal: 'player', principalId: 'you', recipient: 'bez',
    handoff: { outboundVia: ['cyn'], reportVia: [] },
    brief: brief({ reportBy: null, mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } } }),
    tick: 15, cause: null,
  });
  // An ENEMY-principal directive on the same substrate — the selector must never surface it.
  issueDirectiveRecord(world, {
    principal: 'enemy', principalId: 'cyn', recipient: 'dov',
    handoff: { outboundVia: [], reportVia: [] }, brief: brief({ purpose: 'enemy-only-purpose' }),
    tick: 15, cause: null,
  });
  world.tick = 0;
  return world;
}

const playerRecords = (world: WorldState): DirectiveRecord[] =>
  ensureDirectiveState(world).records.filter((record) => record.principal === 'player');

const PROFILE: DirectiveDecisionProfile = {
  interpretation: { kind: 'learn', target: { kind: 'person', id: 'dov' } },
  commitment: 'refuse', initiative: 'adaptive', risk: 'bold',
  method: { kind: 'hold' }, timing: { actAt: 30, reportAt: 45 },
  disclosure: { outcome: false, reason: false, evidence: false, source: false, uncertainty: false },
  candor: 'doctored',
};

/** Flip EVERY hidden dimension the constraints forbid the desk from reading. */
function flipHiddenState(world: WorldState): void {
  const state = ensureDirectiveState(world);
  for (const record of playerRecords(world)) {
    record.received = {
      tick: 30,
      version: {
        id: 'v-mutated', parent: record.authored.id, directiveId: record.id,
        brief: brief({
          priority: 'urgent', authority: 'compel', discretion: 'open', specificity: 'detailed',
          purpose: 'MUTATED-PURPOSE', reportBy: 999,
          mission: { kind: 'learn', target: { kind: 'person', id: 'dov' } },
        }),
        claimedIssuer: 'dov', replyRoute: ['dov'], changedBy: 'dov',
        changes: [{ field: 'purpose', from: null, to: 'MUTATED-PURPOSE' }],
      },
      handoffFrom: 'dov', messageId: 'm-mutated',
    };
    record.decision = PROFILE;
    record.execution = { state: 'aborted', changedAt: 45, dueAt: 60, waiting: null };
  }
  state.scrutiny.push({ observer: 'ada', principal: 'you', observedAt: 0, cause: 'confrontation' });
  for (const message of state.messages) {
    message.deliveredAt = 30;
    message.failedAt = 45;
    message.holder = 'dov';
    message.nextHop = 1;
  }
  for (const asset of world.network.assets) asset.turned = true;
  world.network.enemyAssets.push({
    id: 'dov', mice: 'coercion', wagePaidThroughDay: 3, strikes: 1, facts: [], turned: true,
  });
  world.enemy.sketch.push({
    id: 'sf-1', kind: 'carrier-profile', day: 1, family: null, subject: 'ada',
    district: 'd0', detail: 'the ghost uses a grocer',
    evidence: [{ tick: 0, observer: 'cyn', claimId: null, messageId: 'm0' }],
  });
}

describe('directiveView — the authored ledger is blind to every hidden dimension', () => {
  it('selects only player-principal rows, sorted by issuedAt then id', () => {
    const view = directiveView(fixture());
    expect(view.rows.map((row) => row.id)).toEqual(['d0', 'd1']);
    expect(view.rows.map((row) => row.recipient)).toEqual(['ada', 'bez']);
    expect(view.rows.map((row) => row.issuedAt)).toEqual([0, 15]);
    expect(stableStringify(view)).not.toContain('enemy-only-purpose');
    expect(stableStringify(view)).not.toContain('dov');
  });

  it('shows the AUTHORED brief and the player-known handoff, never the received version', () => {
    const world = fixture();
    const before = stableStringify(directiveView(world));
    flipHiddenState(world);
    const after = stableStringify(directiveView(world));
    expect(after).toBe(before);
    expect(after).not.toContain('MUTATED-PURPOSE');
    expect(after).not.toContain('aborted');
    expect(after).not.toContain('doctored');
  });

  it('the twin flip moves NOTHING: received/decision/execution/scrutiny/turned/enemy roster/sketch', () => {
    const clean = fixture('dv-twin');
    const flipped = fixture('dv-twin');
    flipHiddenState(flipped);
    expect(stableStringify(directiveView(flipped))).toBe(stableStringify(directiveView(clean)));
  });

  it('a physically received report changes ONLY the reports array', () => {
    const world = fixture('dv-report');
    const before = directiveView(world);
    expect(before.rows[0]!.reports).toEqual([]);

    playerRecords(world)[0]!.receivedReports.push({
      receivedAt: 60, via: 'bez',
      report: { outcome: 'saw cyn at the square', reason: null, evidence: null, source: 'ada', uncertainty: 'low' },
    });
    const after = directiveView(world);

    expect(after.rows[0]!.reports).toEqual([{
      receivedAt: 60, via: 'bez',
      report: { outcome: 'saw cyn at the square', reason: null, evidence: null, source: 'ada', uncertainty: 'low' },
    }]);
    // Every other field of every row is byte-identical — reports are the only delta.
    const strip = (v: ReturnType<typeof directiveView>) => stableStringify({
      rows: v.rows.map((row) => ({
        id: row.id, recipient: row.recipient, issuedAt: row.issuedAt,
        handoff: row.handoff, authored: row.authored, clock: row.clock,
      })),
    });
    expect(strip(after)).toBe(strip(before));
    expect(after.rows[0]!.clock).toBe(before.rows[0]!.clock); // a report never rewrites the clock
  });

  it('sorts reports by receivedAt then via', () => {
    const world = fixture('dv-report-order');
    const payload = { outcome: null, reason: null, evidence: null, source: null, uncertainty: null };
    playerRecords(world)[0]!.receivedReports.push(
      { receivedAt: 90, via: 'cyn', report: { ...payload, outcome: 'third' } },
      { receivedAt: 60, via: 'cyn', report: { ...payload, outcome: 'second' } },
      { receivedAt: 60, via: 'ada', report: { ...payload, outcome: 'first' } },
    );
    expect(directiveView(world).rows[0]!.reports.map((r) => r.report.outcome))
      .toEqual(['first', 'second', 'third']);
  });

  it('the clock crosses exact active→due→overdue boundaries on authored time alone', () => {
    const world = fixture('dv-clock');
    const clockOf = (tick: number, id: string): string => {
      world.tick = tick;
      return directiveView(world).rows.find((row) => row.id === id)!.clock;
    };
    // d0 authored reportBy=120 (its deadline), active.until=240.
    expect(clockOf(119, 'd0')).toBe('active');
    expect(clockOf(120, 'd0')).toBe('due');
    expect(clockOf(121, 'd0')).toBe('overdue');
    // d1 authored reportBy=null → the deadline falls back to active.until=240.
    expect(clockOf(239, 'd1')).toBe('active');
    expect(clockOf(240, 'd1')).toBe('due');
    expect(clockOf(241, 'd1')).toBe('overdue');
  });

  it('the clock is unmoved by execution completion or a returned report (authored time only)', () => {
    const world = fixture('dv-clock-2');
    world.tick = 119;
    expect(directiveView(world).rows[0]!.clock).toBe('active');
    const record = playerRecords(world)[0]!;
    record.execution = { state: 'completed', changedAt: 30, dueAt: null, waiting: null };
    record.receivedReports.push({
      receivedAt: 60, via: 'bez',
      report: { outcome: 'done', reason: null, evidence: null, source: null, uncertainty: null },
    });
    expect(directiveView(world).rows[0]!.clock).toBe('active');
    world.tick = 500;
    expect(directiveView(world).rows[0]!.clock).toBe('overdue');
  });

  it('returns DEEP COPIES — mutating a returned row never reaches the world', () => {
    const world = fixture('dv-copy');
    playerRecords(world)[0]!.receivedReports.push({
      receivedAt: 60, via: 'bez',
      report: { outcome: 'observed', reason: null, evidence: null, source: null, uncertainty: null },
    });
    const record = playerRecords(world)[0]!;
    const row = directiveView(world).rows[0]!;

    expect(row.authored).not.toBe(record.authored.brief);
    expect(row.handoff).not.toBe(record.handoff);
    expect(row.reports[0]).not.toBe(record.receivedReports[0]);

    row.authored.purpose = 'tampered';
    row.authored.guidance.push({ kind: 'avoid-person', person: 'dov' });
    row.handoff.reportVia.push('dov');
    row.reports[0]!.report.outcome = 'tampered';

    expect(record.authored.brief.purpose).toBeNull();
    expect(record.authored.brief.guidance).toEqual([]);
    expect(record.handoff.reportVia).toEqual(['bez']);
    expect(record.receivedReports[0]!.report.outcome).toBe('observed');
  });

  it('a world that never issued a directive yields an empty ledger (lazy state stays absent)', () => {
    const world = buildWorld(miniTown(), 'dv-empty', STANDARD_RULES);
    enrollPlayer(world, { home: 'square' });
    expect(directiveView(world)).toEqual({ rows: [] });
    expect(world.network.directiveState).toBeUndefined(); // the selector never materializes state
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural enforcement: the SOURCE of the selector and of every app file may not even NAME the
// hidden dimensions. A token scan is bypassable in general, but these are whole-name bans on a
// small, hand-written surface — and each one is proved to FIRE against an injected violation below.

const repoRoot = process.cwd();
const SELECTOR_FILE = join(repoRoot, 'src/sim/directives/view.ts');

/**
 * THE CLASSIFIER — the scan reads the PARSE TREE, never the text.
 *
 * Two review rounds each minted a fresh parser-valid source that a hand-written text normalizer
 * mis-read: first a comment marker carried inside an ordinary string (`"http://x"`), then a pair
 * of perfectly ordinary JSX apostrophes closing over live code
 * (`<p>player's desk</p>{record.decision}<p>asset's file</p>`). Both are the same defect, not two
 * bugs: a lexer guessing at a language it does not parse will always have one more counterexample
 * in it. So this scan stops guessing. It hands each source to the repo's own TypeScript parser —
 * the `tests/helpers/callgraph.ts` and determinism-law precedent — and asks the tree:
 *
 *   - PROSE IS INVISIBLE BY CONSTRUCTION. String text, template TEXT chunks, JSX text, comments,
 *     and regular-expression literals are simply not name-bearing nodes; there is no "erase the
 *     prose" pass that can over- or under-reach, because prose is never read in the first place.
 *     Template `${…}` expressions and JSX `{…}` containers ARE code and are walked like any other
 *     subtree.
 *   - ONE MECHANISM COVERS EVERY ACCESS SPELLING. `x.name`, `x?.name`, `x['name']`, `{ name }`,
 *     `{ name: alias }` and object shorthand all deposit the same NAME in the same set, so a prong
 *     asks about a name and never about a spelling.
 *   - RECEIVERS DO NOT MATTER. A `.network.assets` reach is reported whether the receiver is a
 *     plain identifier, a parenthesized expression, an optional chain, or a call result.
 *   - WHAT CANNOT BE READ AT PARSE TIME FAILS CLOSED. A computed key only the running program
 *     knows (`world[whichever]`) is reported as unresolvable rather than skipped.
 */

/** `.tsx` is parsed as TSX, so JSX prose is JSX prose and not punctuation. */
function parseSource(text: string, fileName: string): ts.SourceFile {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  // Fail closed: a source the parser could not turn into statements must never scan as "clean".
  if (text.trim().length > 0 && file.statements.length === 0) {
    throw new Error(`the hidden-name scan could not parse ${fileName}`);
  }
  return file;
}

/** Syntactic wrappers that change nothing about which name an expression reaches. */
function unwrap(node: ts.Node): ts.Node {
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

/** A key with a PARSE-TIME answer: `x['decision']` yes, `x[whichever]` no. */
function literalKey(node: ts.Node | undefined): string | null {
  if (node === undefined) return null;
  const target = unwrap(node);
  return ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)
    ? target.text : null;
}

type Access = ts.PropertyAccessExpression | ts.ElementAccessExpression;
const isAccess = (node: ts.Node): node is Access =>
  ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);

/** The property NAME a member access reads — `null` when only the running program knows. */
function accessedName(node: Access): string | null {
  return ts.isPropertyAccessExpression(node) ? node.name.text : literalKey(node.argumentExpression);
}

/** A property-name POSITION spelled as a string rather than an identifier (`{ 'decision': x }`). */
function staticStringName(node: ts.Node | undefined): string | null {
  if (node === undefined) return null;
  if (ts.isComputedPropertyName(node)) return literalKey(node.expression);
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
}

/** Where a declaration spells a property name that is NOT an ordinary identifier child. */
function namePositions(node: ts.Node): (ts.Node | undefined)[] {
  if (ts.isPropertyAssignment(node) || ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)
    || ts.isMethodDeclaration(node) || ts.isMethodSignature(node) || ts.isEnumMember(node)
    || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return [node.name];
  if (ts.isBindingElement(node)) return [node.propertyName];
  return [];
}

/** Every name on an access chain, root first: `session.world.network` ⇒ session, world, network. */
function chainNames(node: ts.Node): string[] {
  const target = unwrap(node);
  if (ts.isIdentifier(target)) return [target.text];
  if (isAccess(target)) return [...chainNames(target.expression), accessedName(target) ?? '*'];
  if (ts.isCallExpression(target)) return chainNames(target.expression);
  return [];
}

/** What an initializer LEADS with — `session.world ?? fallback` leads with `session.world`. */
function leadingExpression(node: ts.Node): ts.Node {
  const target = unwrap(node);
  if (ts.isBinaryExpression(target)) return leadingExpression(target.left);
  if (ts.isConditionalExpression(target)) return leadingExpression(target.condition);
  return target;
}

/** Does this expression hand over the world OBJECT itself? (`world`, `session.world`, `(s?.world)`) */
function isWorldSource(node: ts.Node): boolean {
  const leading = leadingExpression(node);
  if (ts.isIdentifier(leading)) return leading.text === 'world';
  for (let cursor: ts.Node = leading; isAccess(cursor); cursor = unwrap(cursor.expression)) {
    if (accessedName(cursor) === 'world') return true;
  }
  return false;
}

/** Does this expression reach ANYWHERE through the world? (`world.network`, `session.world.x`) */
const touchesWorld = (node: ts.Node): boolean =>
  chainNames(leadingExpression(node)).includes('world');

/** A `<receiver>.network.assets` reach, and whether its receiver is the canonical world binding. */
interface RosterReach { rootedAtWorld: boolean; text: string }
/** The four ways to put the world behind a name the scan cannot follow. */
type WorldAliasKind = 'destructured' | 'declared' | 'direct' | 'assigned';
interface WorldAlias { kind: WorldAliasKind; text: string }

interface ScanFacts {
  /** Every name a CODE construct in this source reaches, in any spelling. */
  names: ReadonlySet<string>;
  roster: readonly RosterReach[];
  aliases: readonly WorldAlias[];
  /** Reaches through world/network whose key only the running program knows. */
  unresolved: readonly string[];
}

/** Roots whose dynamic reach fails closed. Every OTHER forbidden root is already a name prong, so
 *  `record[whichever]` is reported by the `record`-side names it must eventually spell. */
const DYNAMIC_ROOTS = new Set(['world', 'network']);

function scanSource(text: string, fileName: string): ScanFacts {
  const file = parseSource(text, fileName);
  const names = new Set<string>();
  const roster: RosterReach[] = [];
  const aliases: WorldAlias[] = [];
  const unresolved: string[] = [];
  const show = (node: ts.Node): string => node.getText(file).replace(/\s+/g, ' ').slice(0, 90);

  const visit = (node: ts.Node): void => {
    if (ts.isJSDoc(node)) return;                       // documentation is prose, not a read

    // 1. NAMES — one mechanism for every spelling a field access can wear.
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) names.add(node.text);
    if (isAccess(node)) {
      const key = accessedName(node);
      if (key !== null) names.add(key);                 // `x['decision']` names it as `x.decision` does
    }
    for (const position of namePositions(node)) {
      const spelled = staticStringName(position);
      if (spelled !== null) names.add(spelled);         // `{ 'decision': x }`, `{ ['decision']: x }`
    }

    // 2. THE ROSTER REACH — receiver-agnostic: any chain ENDING `network.assets`, however spelled.
    if (isAccess(node) && accessedName(node) === 'assets') {
      const inner = unwrap(node.expression);
      if (isAccess(inner) && accessedName(inner) === 'network') {
        roster.push({ rootedAtWorld: isWorldSource(inner.expression), text: show(node) });
      }
    }

    // 3. THE WORLD BEHIND A NAME — fail-closed, because a source scan cannot follow an alias.
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const bound = ts.isIdentifier(node.name) ? node.name.text : null;
      const leading = leadingExpression(node.initializer);
      if (bound === null) {
        if (touchesWorld(node.initializer)) aliases.push({ kind: 'destructured', text: show(node) });
      } else if (bound !== 'world' && isWorldSource(node.initializer)) {
        aliases.push({ kind: ts.isIdentifier(leading) ? 'direct' : 'declared', text: show(node) });
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && isWorldSource(node.right)) {
      const target = unwrap(node.left);
      const canonical = ts.isIdentifier(target) && target.text === 'world';
      if (!canonical) aliases.push({ kind: 'assigned', text: show(node) });
    }

    // 4. FAIL CLOSED — a world/network reach whose key only the running program knows.
    if (ts.isElementAccessExpression(node) && literalKey(node.argumentExpression) === null
      && chainNames(node.expression).some((name) => DYNAMIC_ROOTS.has(name))) {
      unresolved.push(show(node));
    }

    ts.forEachChild(node, visit);
  };
  visit(file);
  return { names, roster, aliases, unresolved };
}

/** A synthetic probe source. TSX, so a JSX counterexample is parsed as the TSX it really is. */
const scan = (source: string): ScanFacts => scanSource(source, 'probe.tsx');

const factsCache = new Map<string, ScanFacts>();
function factsFor(file: string): ScanFacts {
  const cached = factsCache.get(file);
  if (cached !== undefined) return cached;
  const facts = scanSource(readFileSync(file, 'utf8'), file);
  factsCache.set(file, facts);
  return facts;
}

describe('the scan classifies its sources on the TypeScript AST', () => {
  // Every parser-valid counterexample two review rounds minted against the old TEXT normalizer.
  // Each one is now answered by construction rather than by another normalization rule.
  it.each([
    ['a line-comment marker in a prior string', 'const s = "http://x"; const x = record.decision;'],
    ['block-comment markers in strings', 'const a = "/*"; const x = record.decision; const b = "*/";'],
    ['paired JSX apostrophes around the read',
      "const v = <><p>player's desk</p>{record.decision}<p>asset's file</p></>;"],
    ['a regex literal carrying a quote character', "const r = /'/; const x = record.decision;"],
    ['the plain dotted form (regression guard)', 'const x = record.decision;'],
  ])('REPORTS the hidden name through %s', (_label, form) => {
    expect(scan(form).names.has('decision'), `silent on: ${form}`).toBe(true);
  });

  // The other half of the same law: prose must not swallow the code BESIDE it. These anchors sit
  // next to a construct whose text carries markers or quotes, so any future classifier that starts
  // consuming live source drops them and goes red here first.
  it.each([
    ['a line-comment marker in a string', 'const s = "http://x"; const anchorAfterUrl = 1;',
      'anchorAfterUrl'],
    ['block-comment markers in strings',
      'const a = "/*"; const anchorBetweenMarkers = 1; const b = "*/";', 'anchorBetweenMarkers'],
    ['a comment marker in a template literal',
      'const s = `http://x`; const anchorAfterTemplate = 1;', 'anchorAfterTemplate'],
    ['a block-comment marker split across two strings',
      'const a = "/*"; const anchorSplit = 1;\nconst b = "*/"; const anchorAfterClose = 2;',
      'anchorAfterClose'],
    ['a regex literal carrying a quote character',
      "const r = /'/; const anchorAfterRegex = 1;", 'anchorAfterRegex'],
  ])('still sees the code beside %s', (_label, form, anchor) => {
    expect(scan(form).names.has(anchor), `swallowed the code after: ${form}`).toBe(true);
  });

  it('never reads prose: comments, doc comments, string text, and template prose', () => {
    expect(scan('// const x = record.decision;\nconst ok = 1;').names.has('decision')).toBe(false);
    expect(scan('/* record.decision */\nconst ok = 1;').names.has('decision')).toBe(false);
    expect(scan('/** @see record.decision */\nconst ok = 1;').names.has('decision')).toBe(false);
    expect(scan("const s = 'the council turned on the usurper';").names.has('turned')).toBe(false);
    expect(scan('const s = `a turned asset: ${row.id}`;').names.has('turned')).toBe(false);
    expect(scan('const s = `an asset: ${row.decision}`;').names.has('decision')).toBe(true);
  });

  it('never reads a regular expression — but reads the code around it', () => {
    expect(scan('const r = /decision|turned|npcs/;').names.has('decision')).toBe(false);
    expect(scan('const r = /decision/; const x = record.decision;').names.has('decision')).toBe(true);
  });

  it('JSX text is prose; a JSX expression container is code', () => {
    expect(scan("const v = <p>the player's own paperwork</p>;").names.has('decision')).toBe(false);
    expect(scan("const v = <p>a turned asset's file</p>;").names.has('turned')).toBe(false);
    expect(scan('const v = <p>{record.decision}</p>;').names.has('decision')).toBe(true);
    expect(scan('const v = <Row decision={record.decision} />;').names.has('decision')).toBe(true);
  });
});

/** One forbidden name, the question that reports it, and the forms that question MUST answer yes.
 *  Carrying the proofs on the prong itself makes the 1:1 pairing structural — a prong cannot be
 *  added without its firing evidence, and no index bookkeeping can drift. */
interface Prong { label: string; reports: (facts: ScanFacts) => boolean; violations: string[] }

/** The access spellings ONE name question has to answer, given an owner expression. The old scan
 *  needed a normalization rule per spelling; on the AST they are all just the name. */
const accessForms = (owner: string, name: string): string[] => [
  `const a = ${owner}.${name};`,
  `const b = ${owner}['${name}'];`,
  `const c = ${owner}?.${name};`,
  `const { ${name} } = ${owner};`,
  `const { ${name}: alias } = ${owner};`,
  `const d = { ${name} };`,
];

const named = (label: string, owner: string, name: string): Prong => ({
  label,
  reports: (facts) => facts.names.has(name),
  violations: accessForms(owner, name),
});

/** Fail-closed (the T11 convention): a source scan cannot follow an alias, so binding the world to
 *  anything but the canonical `world`, or reaching it with a key only the running program knows, is
 *  itself the failure. All four ways to bind are prongs — a destructuring, a declaration off a
 *  `.world` property, a direct copy of the canonical binding, and an assignment into an existing
 *  binding — and every one of them is receiver-agnostic, so a parenthesis or an optional chain
 *  changes nothing. The composition root's own `const world = session.world;` is the one lawful
 *  shape and is excluded by name. */
const aliasProng = (label: string, kind: WorldAliasKind, violations: string[]): Prong => ({
  label, reports: (facts) => facts.aliases.some((alias) => alias.kind === kind), violations,
});

const WORLD_ALIAS_PRONGS: Prong[] = [
  aliasProng('a destructured world (fail-closed: the scan cannot follow the alias)', 'destructured', [
    'const { network } = world;',
    'const { npcs, beliefs } = session.world;',
    'const { assets } = world.network;',
  ]),
  aliasProng('a world DECLARED under another name (fail-closed)', 'declared', [
    'const w = session.world;',
    'let hidden = this.world;',
    'const w = (session.world);',
    'const w = session?.world;',
    'const w = session.world ?? fallback;',
  ]),
  aliasProng('a DIRECT alias of the canonical world binding (fail-closed)', 'direct', [
    'const w = world;', 'let w = world;', 'const w = world; const x = w.network.assets;',
  ]),
  aliasProng('a world ASSIGNED into an existing binding (fail-closed)', 'assigned', [
    'let w; w = session.world; const x = w.network.assets;',
    'w = world;',
    'cache.w = session.world;',
    'w = (session.world);',
  ]),
  {
    label: 'a DYNAMIC computed world reach (fail-closed: only the running program knows the key)',
    reports: (facts) => facts.unresolved.length > 0,
    violations: ['const a = world[key];', 'const b = world.network[key];', 'const c = (world)[key];'],
  },
];

/** Every hidden name the constraints forbid the DESK SELECTOR from reading. */
const FORBIDDEN_IN_SELECTOR: Prong[] = [
  named('received (the mutated version)', 'record', 'received'),
  named('decision', 'record', 'decision'),
  named('execution', 'record', 'execution'),
  named('turned', 'asset', 'turned'),
  named('enemyAssets', 'world.network', 'enemyAssets'),
  named('sketch', 'world.enemy', 'sketch'),
  named('perceivedScrutiny', 'row', 'perceivedScrutiny'),
  named('scrutiny', 'state', 'scrutiny'),
  named('recruitmentApproaches', 'state', 'recruitmentApproaches'),
  {
    label: 'enemyLinked (in any suffixed spelling)',
    reports: (facts) => [...facts.names].some((name) => name.startsWith('enemyLinked')),
    violations: [...accessForms('row', 'enemyLinked'), 'const e = row.enemyLinkedAtDecision;'],
  },
  named('message transit (deliveredAt)', 'message', 'deliveredAt'),
  named('message transit (failedAt)', 'message', 'failedAt'),
  named('message transit (nextHop)', 'message', 'nextHop'),
  named('the message queue', 'state', 'messages'),
  named('heldObservations', 'state', 'heldObservations'),
  named('npcs (the roster behind the views)', 'world', 'npcs'),
  named('beliefs', 'world', 'beliefs'),
  ...WORLD_ALIAS_PRONGS,
];

describe('hidden-name source scan — the selector cannot name what it must not know', () => {
  const selectorFacts = factsFor(SELECTOR_FILE);

  it('the scan is not vacuous: the selector really was parsed as code', () => {
    expect(selectorFacts.names.has('directiveView')).toBe(true);
    expect(selectorFacts.names.has('receivedReports')).toBe(true); // the lawful near-neighbour…
    expect(selectorFacts.names.has('received')).toBe(false);       // …is not the banned name
  });

  it.each(FORBIDDEN_IN_SELECTOR)('never names $label', ({ reports }) => {
    expect(reports(selectorFacts)).toBe(false);
  });

  it.each(FORBIDDEN_IN_SELECTOR)('FIRES: $label is reported in every access form', ({ reports, violations }) => {
    expect(violations.length).toBeGreaterThan(0);
    for (const form of violations) {
      expect(reports(scan(form)), `must report the form: ${form}`).toBe(true);
    }
  });
});

/** Hidden names no APP file (composition root included) may reach for — in ANY access form, and
 *  whether the record is reached through the raw world or through an imported helper under an
 *  alias, which is why these are NAME questions and not dotted-path patterns. */
const FORBIDDEN_IN_APP: Prong[] = [
  named('the raw directive substrate', 'world.network', 'directiveState'),
  named('received (the mutated version)', 'record', 'received'),
  named('decision', 'record', 'decision'),
  named('execution', 'record', 'execution'),
  named('enemyAssets', 'world.network', 'enemyAssets'),
  named('sketch', 'world.enemy', 'sketch'),
  named('perceivedScrutiny', 'row', 'perceivedScrutiny'),
  named('turned', 'asset', 'turned'),
  named('evaluateReceivedBrief', 'engine', 'evaluateReceivedBrief'),
  named('heldObservations', 'state', 'heldObservations'),
  named('recruitmentApproaches', 'state', 'recruitmentApproaches'),
  named('the message queue', 'state', 'messages'),
  named('npcs (the roster behind the views)', 'world', 'npcs'),
  named('beliefs', 'world', 'beliefs'),
  named('inquiries', 'world', 'inquiries'),
  {
    label: 'the world roster behind NetworkView',
    reports: (facts) => facts.roster.some((reach) => reach.rootedAtWorld),
    violations: ['const a = world.network.assets;', "const b = world['network']['assets'];",
      'const c = session.world.network.assets;'],
  },
  // `assets` is the lawful NetworkView field every roster panel reads, so this reach cannot be
  // leaf-widened to a bare name. It is widened by SHAPE instead: any chain ending `network.assets`
  // is reported whatever its receiver is, so an alias is caught at the point of USE — a parenthesis,
  // an optional chain, or a call result is not a hiding place, and no receiver spelling is enumerated.
  {
    label: 'a non-`world` binding reaching the roster behind NetworkView',
    reports: (facts) => facts.roster.some((reach) => !reach.rootedAtWorld),
    violations: ['const x = w.network.assets;', "const y = w['network'].assets;",
      'const z = roster.network.assets;', 'const p = (w).network.assets;',
      'const q = w?.network.assets;', 'const r = pick(session).network.assets;'],
  },
  ...WORLD_ALIAS_PRONGS,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('hidden-name source scan — no app surface reaches behind its selectors', () => {
  const appFiles = walk(join(repoRoot, 'app/src')).filter((f) => /\.tsx?$/.test(f));

  it('enumerates a real app surface including the new directive desk', () => {
    const rel = appFiles.map((f) => f.replace(/\\/g, '/'));
    expect(rel.some((f) => f.endsWith('app/src/panels/Directives.tsx'))).toBe(true);
    expect(rel.some((f) => f.endsWith('app/src/main.tsx'))).toBe(true);
    expect(appFiles.length).toBeGreaterThan(10);
  });

  it('the app scan is not vacuous: the composition root really was parsed as code', () => {
    const main = factsFor(join(repoRoot, 'app/src/main.tsx'));
    expect(main.names.has('directiveView')).toBe(true);
    expect(main.names.has('networkView')).toBe(true);
    expect(main.names.has('world')).toBe(true);     // `const world = session.world;` — the lawful root
  });

  it.each(FORBIDDEN_IN_APP)('no app file names $label', ({ label, reports }) => {
    for (const file of appFiles) {
      expect(reports(factsFor(file)), `${file.replace(/\\/g, '/')} names ${label}`).toBe(false);
    }
  });

  it.each(FORBIDDEN_IN_APP)('FIRES: $label is reported in every access form', ({ reports, violations }) => {
    expect(violations.length).toBeGreaterThan(0);
    for (const form of violations) {
      expect(reports(scan(form)), `must report the form: ${form}`).toBe(true);
    }
  });

  /** Which app prongs report a source — the whole list, so an alias only has to be caught SOMEWHERE
   *  (at the binding or at the use) rather than by one nominated pattern. */
  const reportingProngs = (form: string): string[] =>
    FORBIDDEN_IN_APP.filter((prong) => prong.reports(scan(form))).map((prong) => prong.label);

  // The exact coverage counterexamples the frontier review demonstrated against the old dotted-only
  // patterns: five real access forms the app scan walked straight past. Each is now pinned to the
  // prong that owns it, and the whole app prong list has to report it.
  it.each([
    ['received (the mutated version)', 'const { received } = record;'],
    ['decision', "const x = record['decision'];"],
    ['execution', 'const { execution: x } = record;'],
    ['turned', "const x = asset['turned'];"],
    ['the message queue', 'const { messages } = state;'],
  ])('FIRES: the form a dotted-only scan let through — %s', (label, form) => {
    const prong = FORBIDDEN_IN_APP.find((p) => p.label === label);
    expect(prong, `no app prong is labelled '${label}'`).toBeDefined();
    expect(prong!.reports(scan(form)), `still silent on: ${form}`).toBe(true);
  });

  // The world-alias counterexamples of BOTH review rounds: the roster behind NetworkView reached
  // through a binding the rooted-path patterns could not follow, and then through the receiver
  // spellings the widened pattern still could not — parentheses, an optional chain, a call result.
  it.each([
    ['a declaration alias', 'const w = session.world; const x = w.network.assets;'],
    ['a DIRECT alias', 'const w = world; const x = w.network.assets;'],
    ['an ASSIGNMENT alias', 'let w; w = session.world; const x = w.network.assets;'],
    ['a PARENTHESIZED receiver', 'const w = (session.world);\nconst x = (w).network.assets;'],
    ['an OPTIONAL-CHAIN receiver off a call result',
      'const w = pick(session.world);\nconst x = w?.network.assets;'],
    ['a CALL-RESULT receiver', 'const x = pick(session).network.assets;'],
  ])('FIRES: the roster reach a rooted-path scan let through — %s', (_label, form) => {
    expect(reportingProngs(form), `no app prong reports: ${form}`).not.toEqual([]);
  });

  // The lexical counterexamples that closed this class, now asked of the REAL app prong list rather
  // than of the classifier alone: prose can no longer hide a read from the scan that ships.
  it.each([
    ['a comment marker inside a prior string',
      'const s = "http://x"; const x = record.decision;'],
    ['paired JSX apostrophes around the read',
      "const v = <><p>player's desk</p>{record.decision}<p>asset's file</p></>;"],
    ['a regex literal carrying a quote character',
      "const r = /'/; const x = record.decision;"],
  ])('FIRES: the read a TEXT normalizer erased — %s', (_label, form) => {
    expect(reportingProngs(form), `no app prong reports: ${form}`).not.toEqual([]);
  });

  // …and the lawful surface stays lawful. The whole app scan above runs over the REAL app/src tree,
  // so its staying green IS the false-positive regression proof; these name the shapes that proof
  // depends on, so a future over-eager classifier says exactly which one it broke.
  it.each([
    ['the canonical composition root',
      'const world = session.world;\nconst view = playerView(world);'],
    ['player-facing prose containing a forbidden word',
      "const label = 'The council turned on the usurper';"],
    ['a registered term id containing a forbidden word', "const id = 'counter-sketch';"],
    ['a string containing the word decision', 'const note = "the decision was the player\'s own";'],
    ['JSX prose with paired apostrophes and no code between',
      "const v = <><p>player's desk</p><p>asset's file</p></>;"],
    ['the three regex literals the real app source contains',
      'const ok = /^(INPUT|SELECT|TEXTAREA)$/.test(tag);\n'
      + 'const parts = npcId.split(/[-_\\s]+/);\nconst m = /^(.*)-d\\d+$/.exec(id);'],
    ['the lawful NetworkView roster read',
      'const a = view.assets;\nconst b = net.assets.map((row) => row.id);'],
  ])('LAWFUL: no prong reports %s', (_label, form) => {
    expect(reportingProngs(form), `a prong reports the lawful form: ${form}`).toEqual([]);
  });
});
