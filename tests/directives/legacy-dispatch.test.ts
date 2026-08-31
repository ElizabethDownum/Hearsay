import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  type ModuleGraph, accessedName, assertParsed, isAccess, parseModule, reachable, staticName,
} from '../helpers/callgraph';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import {
  applyAssignInformant, applyCourier, applyDirective, applySetDrop, type InjectSpec,
} from '../../src/sim/actions';
import {
  attemptDirective, expireDirectiveActsBeforeCollection, markDirectiveDue,
} from '../../src/sim/directives/execution';
import {
  applicationOf, correlationOf, type DirectiveBrief, type PlayerDirectiveApplication,
} from '../../src/sim/directives/types';
import { projectBrief } from '../../src/sim/directives/mutation';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { collectDropPickupIntents, realizeDropPickup } from '../../src/sim/network/couriers';
import { collectCircleIntents, realizeCircleIntents } from '../../src/sim/phases';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const learnVenue = (venue: string): DirectiveBrief => ({
  mission: { kind: 'learn', target: { kind: 'venue', id: venue } },
  priority: 'routine', authority: 'relationship', discretion: 'quiet',
  specificity: 'detailed', guidance: [{ kind: 'expected-presence', person: 'bez', venue, at: 15 }],
  active: { from: 15, until: at(1, 0) }, report: 'outcome', reportBy: at(1, 0), purpose: null,
});

function playerWorld() {
  const fixture = miniTown();
  const kept = new Set(['ada', 'bez']);
  fixture.npcs = fixture.npcs.filter((npc) => kept.has(npc.id))
    .map((npc) => ({ ...npc,
      schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: 'square' }],
      edges: npc.edges.filter((edge) => kept.has(edge.to)) }));
  const world = buildWorld(fixture, 'legacy-dispatch', STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.network.assets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.intel.informants.push({ id: 'ada', assignedVenue: null });
  world.npcs.ada!.traits = ['literalist'];
  world.npcs.bez!.traits = ['literalist'];
  world.npcs.ada!.edges.push({ to: 'you', kind: 'friend', trust: 0.75 });
  return world;
}

const shapePerson = (target: string): DirectiveBrief => ({
  mission: { kind: 'shape', operation: 'spread', payload: { family: null, parent: null,
    claim: { subject: 'ada', predicate: 'stole', object: null, count: 2, severity: 3,
      place: null, attribution: SOMEONE } }, audience: { kind: 'person', id: target },
  redirectTo: null },
  priority: 'important', authority: 'office', discretion: 'open', specificity: 'guided',
  guidance: [{ kind: 'not-before', tick: 30 }], active: { from: 30, until: 180 },
  report: 'full', reportBy: 180, purpose: 'retain every authored handoff lever',
});

function deliverDirectAndAttempt(world: ReturnType<typeof playerWorld>, brief: DirectiveBrief,
  application: PlayerDirectiveApplication) {
  applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, brief, 0, application);
  const record = world.network.directiveState!.records.at(-1)!;
  const message = world.network.directiveState!.messages.find((row) =>
    row.payload.kind === 'directive' && row.payload.version.directiveId === record.id)!;
  expect(realizeNetworkForward(world, message.id,
    { venue: 'square', members: ['you', 'ada', 'bez'] }, 0, STANDARD_RULES)).not.toBeNull();
  const due = record.decision!.timing.actAt!;
  world.tick = due;
  markDirectiveDue(world, record.id, due);
  attemptDirective(world, record.id, { venue: 'square', members: ['ada', 'bez'] },
    due, STANDARD_RULES);
  return record;
}

describe('typed directive applications retire remote command dispatch', () => {
  it('normalizes absent application/correlation without changing serialized compatibility state', () => {
    expect(applicationOf(learnVenue('square'))).toEqual({ kind: 'standard' });
    expect(correlationOf({})).toEqual({ kind: 'none' });
  });

  it('rejects an across-town posting and a local handoff records only the requested post', () => {
    const remote = playerWorld();
    remote.playerVenue = 'backroom';
    expect(() => applyAssignInformant(remote, 'ada', 'square', 0)).toThrow(/offered circle/);
    expect(remote.intel.requestedPosts).toBeUndefined();
    expect(remote.scheduleOverrides.ada).toBeUndefined();

    const local = playerWorld();
    applyAssignInformant(local, 'ada', 'square', 0);
    expect(local.intel.requestedPosts).toEqual([{ informant: 'ada', venue: 'square', authoredAt: 0 }]);
    expect(local.intel.informants[0]!.assignedVenue).toBeNull();
    expect(local.scheduleOverrides.ada).toBeUndefined();
    expect(local.network.directiveState!.records[0]!.authored.brief.application)
      .toEqual({ kind: 'posting', venue: 'square' });
  });

  it('carries a posting application through the same place delta as its venue guidance', () => {
    const world = playerWorld();
    const brief = learnVenue('square');
    applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, brief, 0,
      { kind: 'posting', venue: 'square' });
    const record = world.network.directiveState!.records[0]!;
    const projected = projectBrief({
      version: record.authored,
      speaker: { id: 'cyn', faction: 'none', rivals: ['dov'], knownFactions: { cyn: 'none' },
        traits: ['relocator'] },
      lastFrom: 'you', audience: 'player', turnedAgainstAudience: false,
      perceivedScrutiny: 0, mode: 'relay',
    }, STANDARD_RULES);
    expect(projected.brief.guidance).toEqual([]);
    expect(applicationOf(projected.brief)).toEqual({ kind: 'posting', venue: null });
    expect(projected.changes.some((change) => change.field === 'brief.application.venue')).toBe(true);
  });

  it.each([
    ['posting', learnVenue('square'), { kind: 'posting', venue: 'square' }],
    ['courier', shapePerson('bez'), { kind: 'courier', target: 'bez' }],
    ['rendezvous', learnVenue('square'), { kind: 'rendezvous', venue: 'square', from: 45, until: 60 }],
  ] as const)('runs a custom relayed %s through the typed application without first-hop effects',
    (kind, brief, application) => {
      const world = playerWorld();
      applyDirective(world, 'ada', { outboundVia: ['bez'], reportVia: ['bez'] }, brief, 0, application);
      const record = world.network.directiveState!.records[0]!;
      const authoredNonMission = (({ priority, authority, discretion, specificity, guidance,
        active, report, reportBy, purpose }) => ({ priority, authority, discretion, specificity,
        guidance, active, report, reportBy, purpose }))(record.authored.brief);
      expect(authoredNonMission).toEqual({
        priority: brief.priority, authority: brief.authority, discretion: brief.discretion,
        specificity: brief.specificity, guidance: brief.guidance, active: brief.active,
        report: brief.report, reportBy: brief.reportBy, purpose: brief.purpose,
      });

      const message = world.network.directiveState!.messages[0]!;
      expect(realizeNetworkForward(world, message.id,
        { venue: 'square', members: ['you', 'bez'] }, 0, STANDARD_RULES)).not.toBeNull();
      expect(record.received).toBeNull();
      expect(world.scheduleOverrides.ada).toBeUndefined();
      expect(world.network.pendingCouriers).toEqual([]);
      expect(world.network.invitations).toBeUndefined();

      expect(realizeNetworkForward(world, message.id,
        { venue: 'square', members: ['bez', 'ada'] }, 15, STANDARD_RULES)).not.toBeNull();
      const due = record.decision!.timing.actAt!;
      world.tick = due;
      markDirectiveDue(world, record.id, due);
      attemptDirective(world, record.id, { venue: 'square', members: ['ada', 'bez'] },
        due, STANDARD_RULES);
      if (kind === 'posting') {
        expect(world.scheduleOverrides.ada).toEqual(expect.arrayContaining([
          expect.objectContaining({ sourceRef: 'posting:ada', venue: 'square' }),
        ]));
      } else if (kind === 'courier') {
        expect(world.network.pendingCouriers).toEqual([
          expect.objectContaining({ asset: 'ada', target: 'bez' }),
        ]);
      } else {
        expect(world.network.invitations).toEqual([
          expect.objectContaining({ kind: 'rendezvous', sourceDirectiveId: record.id }),
        ]);
      }
    });

  it('a refused posting leaves every schedule override byte-unchanged', () => {
    const world = playerWorld();
    world.npcs.ada!.edges = world.npcs.ada!.edges.filter((edge) => edge.to !== 'you');
    world.scheduleOverrides.ada = [{ fromDay: 1, toDay: 2, from: 60, to: 120,
      venue: 'square', source: 'player', sourceRef: 'rendezvous:kept' }];
    const before = structuredClone(world.scheduleOverrides);
    const brief = { ...learnVenue('square'), priority: 'routine' as const,
      authority: 'request' as const, discretion: 'open' as const, specificity: 'guided' as const };
    applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, brief, 0,
      { kind: 'posting', venue: 'square' });
    const record = world.network.directiveState!.records[0]!;
    expect(realizeNetworkForward(world, world.network.directiveState!.messages[0]!.id,
      { venue: 'square', members: ['you', 'ada'] }, 0, STANDARD_RULES)).not.toBeNull();
    expect(record.decision?.commitment).toBe('refuse');
    expect(world.scheduleOverrides).toEqual(before);
  });

  it('accepted unassignment removes only its posting provenance and preserves rendezvous/hosting', () => {
    const world = playerWorld();
    world.intel.informants[0]!.assignedVenue = 'backroom';
    world.scheduleOverrides.ada = [
      { fromDay: 1, toDay: 8, from: 960, to: 1200, venue: 'backroom', source: 'player',
        sourceRef: 'posting:ada' },
      { fromDay: 1, toDay: 2, from: 45, to: 60, venue: 'square', source: 'player',
        sourceRef: 'rendezvous:d-old' },
      { fromDay: 2, toDay: 3, from: 1080, to: 1200, venue: 'square', source: 'player',
        sourceRef: 'hosting:invite-0' },
    ];
    deliverDirectAndAttempt(world, { ...learnVenue(world.npcs.ada!.home),
      priority: 'urgent', authority: 'office' },
      { kind: 'posting', venue: null });
    expect(world.intel.informants[0]!.assignedVenue).toBeNull();
    expect(world.scheduleOverrides.ada?.map((row) => row.sourceRef)).toEqual([
      'rendezvous:d-old', 'hosting:invite-0',
    ]);
  });

  it('accepted posting installs tomorrow\'s schedule before the first physical visit', () => {
    const world = playerWorld();
    const record = deliverDirectAndAttempt(world,
      { ...learnVenue('backroom'), priority: 'urgent', authority: 'office' },
      { kind: 'posting', venue: 'backroom' });
    expect(record.execution?.state).toBe('attempted');
    expect(world.intel.informants[0]!.assignedVenue).toBe('backroom');
    expect(world.scheduleOverrides.ada).toEqual([
      expect.objectContaining({ fromDay: 1, venue: 'backroom', sourceRef: 'posting:ada' }),
    ]);
  });

  it('keeps a drop indefinitely pre-pickup, spends pickup\'s slot, and expires at pickup+3 days', () => {
    const world = playerWorld();
    applySetDrop(world, 'drop-0', 'square', STANDARD_RULES);
    const spec: InjectSpec = { subject: 'bez', predicate: 'stole', object: null, count: 1,
      severity: 2, place: null, attribution: SOMEONE };
    applyCourier(world, 'ada', spec, 'bez', 'drop-0', 0, STANDARD_RULES);
    const payload = world.network.dropPayloads![0]!;
    expireDirectiveActsBeforeCollection(world, at(20, 0), STANDARD_RULES);
    expect(payload).toMatchObject({ pickedUpAt: null, expiresAt: null, failedAt: null });

    const pickup = at(20, 0) + 15;
    world.beliefs.ada!['f-slot'] = { claim: { id: 'c-slot', family: 'f-slot', parent: null,
      subject: 'bez', predicate: 'stole', object: null, count: 1, severity: 2, place: null,
      attribution: SOMEONE }, credence: 0.9, heardFrom: 'bez', heardAt: pickup - 15,
      firstHeardAt: pickup - 15,
      timesHeard: 1, apparentSources: ['bez'], discretion: false, counterSpun: false };
    world.tick = pickup;
    const circle = { venue: 'square', members: ['you', 'ada', 'bez'] };
    const pickupIntents = collectDropPickupIntents(world, pickup, [circle]);
    const frame = collectCircleIntents(world, circle, pickup, STANDARD_RULES, pickupIntents, new Set());
    expect(frame.candidates.filter((intent) => intent.actor === 'ada').map((intent) => intent.kind))
      .toEqual(expect.arrayContaining(['drop-pickup', 'ordinary-tell']));
    expect(frame.selected.find((intent) => intent.actor === 'ada')?.kind).toBe('drop-pickup');
    const realized = realizeCircleIntents(world, frame, pickup, STANDARD_RULES,
      (w, intent, c, tick, rules) => intent.kind === 'drop-pickup'
        ? realizeDropPickup(w, intent.ref, c, tick, rules)
        : { askings: [], answers: [], tellings: [], extras: [] });
    expect(realized.tellings).toEqual([]);
    expect(payload).toMatchObject({ pickedUpAt: pickup,
      expiresAt: pickup + 3 * TICKS_PER_DAY, deliveredAt: null });
    expect(world.network.pendingCouriers).toEqual([]);

    const record = world.network.directiveState!.records[0]!;
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    expect(attemptDirective(world, record.id, circle, due, STANDARD_RULES).tellings).toEqual([]);
    expect(world.network.pendingCouriers).toHaveLength(1);
    expect(payload.deliveredAt).toBeNull();
    const expiry = pickup + 3 * TICKS_PER_DAY;
    expireDirectiveActsBeforeCollection(world, expiry - 1, STANDARD_RULES);
    expect(world.network.pendingCouriers).toHaveLength(1);
    expect(payload.failedAt).toBeNull();
    expireDirectiveActsBeforeCollection(world, expiry, STANDARD_RULES);
    expect(world.network.pendingCouriers).toEqual([]);
    expect(payload.failedAt).toBe(expiry);
  });
});

describe('legacy courier loop enforcement', () => {
  const productionHasLegacyCall = (source: string): boolean =>
    /\bdeliverCouriers\s*\(/.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));

  const productionFiles = (root: string): string[] => readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return productionFiles(path);
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
    });

  it('FIRES for an injected production call and pins every src module free of the old loop', () => {
    const files = productionFiles(join(process.cwd(), 'src'));
    expect(files.length).toBeGreaterThan(0);
    const anchor = readFileSync(files.find((path) => path.endsWith(join('sim', 'phases.ts')))!, 'utf8');
    expect(productionHasLegacyCall(
      `${anchor}\nconst injected = deliverCouriers(world, tick, rules);`,
    )).toBe(true);
    expect(files.filter((path) => productionHasLegacyCall(readFileSync(path, 'utf8')))).toEqual([]);
  });
});

/**
 * NO COMPATIBILITY COMMAND BUS — the STRUCTURAL half (carry `(q)`, whole-branch M-1).
 *
 * `plan11-constraints.md`: "Compatibility action kinds may remain, but not their old guaranteed
 * remote-control effects." The per-verb behavioural tests above prove the present actions do not
 * move anyone's schedule; what they cannot prove is the architectural statement, that no compat
 * apply function CAN. A schedule is moved by writing `world.scheduleOverrides`, and the lawful
 * writers are all downstream of physical receipt — `directives/execution.ts` (an accepted
 * application), `directives/transport.ts` (an accepted invitation), `phases.ts` (prior setup) and
 * `vignettes/engine.ts`. `src/sim/actions.ts` — where the player's verbs are applied, before
 * anything has physically arrived — must contain no such write anywhere.
 *
 * The scan is on the AST, over the closure of every exported `apply*` entry point, and it resolves
 * in-module aliases: `const s = world.scheduleOverrides; s[who] = []` is the same write as the
 * direct one.
 *
 * The scan is REFERENCE-FIRST, and that inversion is the whole of its claim. It does not look for
 * write shapes and report the ones it recognizes; it finds every mention of the ledger and demands
 * that each one justify itself — as a write of a known kind (`assign`, `delete`, `mutate`), or as a
 * lawful read (a known non-writing method, a compared value, a plain binding). Anything else is
 * reported, whatever node kind it is. An enumeration of write shapes can only ever be as good as
 * its last counterexample; a demand that every reference account for itself has no per-node-kind
 * arm to leave out. See the doctrine note beside the firing matrix below.
 */
describe('no compatibility command-bus writes — the structural fence', () => {
  const MUTATORS = ['push', 'unshift', 'splice', 'pop', 'shift', 'sort', 'reverse', 'fill'];
  /**
   * Array and object methods that return a value and write nothing. A method outside BOTH lists is
   * unrecognized — see the fail-closed rule below — so this list is the only thing standing between
   * a lawful read and a report, and every entry on it is a non-writing operation by definition.
   */
  const READS = ['filter', 'find', 'findIndex', 'findLast', 'findLastIndex', 'some', 'every',
    'map', 'flatMap', 'flat', 'slice', 'concat', 'includes', 'indexOf', 'lastIndexOf', 'join',
    'reduce', 'reduceRight', 'at', 'forEach', 'entries', 'keys', 'values', 'toString',
    'toSorted', 'toReversed', 'toSpliced', 'with'];
  const GUARDED = 'scheduleOverrides';
  /**
   * The ledger's container. The fence guards `world.scheduleOverrides`, so an operation can reach
   * the ledger without naming it as a value at all — by naming it as a PROPERTY of `world`. That is
   * what makes `Object.assign(world, { scheduleOverrides: {} })` a write, and what makes the same
   * word in `console.log('scheduleOverrides')` merely a word.
   */
  const HOST = 'world';

  interface WriteSite {
    kind: 'assign' | 'delete' | 'mutate' | 'unrecognized';
    enclosing: string;
    line: number;
    text: string;
  }

  /** The classified USE of one ledger reference. `null` is the fence's ONLY silence. */
  type Use = { kind: WriteSite['kind']; node: ts.Node } | null;

  const isGuarded = (graph: ModuleGraph, raw: string | null): boolean =>
    raw !== null && (graph.aliases.get(raw) ?? raw) === GUARDED;

  /**
   * A NAME position rather than a value: the `.name` half of the access that already IS the
   * reference (`world.scheduleOverrides`), a binding name (`const bus = …`), a key (`{ bus: x }`),
   * a parameter, an import specifier. Counting these would double-report the access they belong to.
   * A shorthand `{ bus }` is exempt — there the name IS the value being handed over.
   */
  const isNamePosition = (node: ts.Node): boolean => {
    const parent = node.parent as (ts.Node & { name?: ts.Node; propertyName?: ts.Node }) | undefined;
    if (parent === undefined || ts.isShorthandPropertyAssignment(parent)) return false;
    return parent.name === node || parent.propertyName === node;
  };

  /**
   * The name this node spells as DATA — a bare string handed to a call (`f(world, 'ledger')`) or a
   * property NAME in an object literal, in all three spellings (`{ ledger: … }`, `{ 'ledger': … }`,
   * `{ ['ledger']: … }`). These are the positions where a name is written down rather than read
   * through an access, so they are the ones an access-based resolver cannot see.
   *
   * An IDENTIFIER argument is excluded: `f(world, ledger)` passes the ledger's VALUE, which the
   * ordinary identifier rule already reports. So is a shorthand `{ ledger }`, where the name is
   * likewise the value. Anything else — a comparison operand, an element-access key — is not a
   * name-as-data position at all; the element-access key in particular belongs to the access that
   * already IS the reference, and counting it here would report one use twice.
   */
  const dataNameOf = (node: ts.Node): string | null => {
    const parent = node.parent;
    if (parent === undefined) return null;
    const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
    if (!literal && !ts.isIdentifier(node)) return null;
    if (literal && (ts.isCallExpression(parent) || ts.isNewExpression(parent))
      && (parent.arguments ?? []).some((argument) => argument === node)) return node.text;
    if (ts.isPropertyAssignment(parent) && parent.name === node) return node.text;
    if (literal && ts.isComputedPropertyName(parent) && parent.expression === node) return node.text;
    return null;
  };

  /**
   * Is the operation this data-name belongs to aimed at the ledger's HOST? A property name only
   * denotes the ledger when something is being done to `world` — `Object.assign(world, …)`,
   * `Reflect.set(world, …)`, `Object.defineProperty(world, …)`. No operation is enumerated: the
   * question asked is only whether the enclosing call RECEIVES the host, so any callee that takes
   * it qualifies. Without this, every mention of the word anywhere in the closure would report,
   * which is noise rather than fail-closed — the fence would stop distinguishing a write from a
   * log line. The search stops at the enclosing statement: a call further out is a different
   * operation.
   */
  const aimedAtHost = (graph: ModuleGraph, node: ts.Node): boolean => {
    for (let cursor = node.parent; cursor !== undefined; cursor = cursor.parent) {
      if (ts.isBlock(cursor) || ts.isSourceFile(cursor)) return false;
      if (ts.isCallExpression(cursor) || ts.isNewExpression(cursor)) {
        return (cursor.arguments ?? [])
          .some((argument) => staticName(graph, argument) === HOST);
      }
    }
    return false;
  };

  /** A type annotation names the ledger without ever reaching its value. */
  const inTypePosition = (node: ts.Node): boolean => {
    for (let cursor: ts.Node | undefined = node; cursor !== undefined; cursor = cursor.parent) {
      if (ts.isTypeNode(cursor) || ts.isTypeAliasDeclaration(cursor)
        || ts.isInterfaceDeclaration(cursor)) return true;
    }
    return false;
  };

  /**
   * Does this node NAME the ledger? Every spelling the shared `isAccess`/`accessedName` pair
   * resolves — `world.scheduleOverrides`, `world['scheduleOverrides']`, through casts, parens and
   * `!` — plus any identifier the module's alias table renames onto it (`const bus = …; bus`).
   * A key only the running program knows (`world[whichever]`) resolves to nothing HERE, and is
   * caught instead by the unreadable-name rules below.
   *
   * A reference can also be spelled as DATA rather than as an access — see `dataNameOf` and
   * `aimedAtHost` below, which decide that case together.
   */
  const namesLedger = (graph: ModuleGraph, node: ts.Node): boolean => {
    if (inTypePosition(node)) return false;
    if (isAccess(node)) return isGuarded(graph, accessedName(node));
    const asData = dataNameOf(node);
    if (asData !== null) return isGuarded(graph, asData) && aimedAtHost(graph, node);
    if (isNamePosition(node)) return false;
    return ts.isIdentifier(node) && isGuarded(graph, node.text);
  };

  const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
    kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;

  /**
   * THE INVERTED RULE. Given one reference to the ledger, walk OUTWARD through its parents and ask
   * what is being done with it. Three outcomes, and only three:
   *
   *  - a recognized WRITE keeps its kind — `assign` (an assignment of any operator, a destructuring
   *    target, a `for…of`/`for…in` target, `++`/`--`), `delete`, or `mutate` (an enumerated array
   *    mutator called on it);
   *  - a recognized lawful READ is silent — a known non-writing method from `READS`, a value merely
   *    compared or combined, an iteration source, a PROJECTION out of the ledger stored somewhere
   *    (`const kept = ledger[who] ?? []`), or a plain declaration binding (`const bus = ledger`),
   *    whose rename the module's alias table resolves so that every USE of the rename is itself a
   *    scanned reference;
   *  - EVERYTHING ELSE is `unrecognized`. Not "every other shape I thought of" — every other node
   *    kind that exists, including ones added to the language after this was written. Handing the
   *    ledger to a call or a `new`, embedding it in a tagged template, a method whose name only the
   *    running program knows: none of these need their own arm, because the DEFAULT is to report.
   *
   * Identity is tracked deliberately, by two flags.
   *
   * `boxed` — the reference has passed through an array/object literal. The container may still be
   * a destructuring TARGET (a write), but it is no longer the ledger, so a method dispatched off it
   * is a hand-off rather than a mutator.
   *
   * `projected` — a member has been taken off the ledger (`ledger[who]`, `ledger.length`), so what
   * travels onward is a value read OUT of it rather than the ledger object. Only a projection may
   * be stored freely. The bare ledger escaping into a binding the module's alias table cannot
   * resolve (`let bus; bus = ledger`, `const held = { bus: ledger }`) is a use this fence cannot
   * read, and is reported like any other.
   */
  const classifyUse = (graph: ModuleGraph, reference: ts.Node): Use => {
    let child: ts.Node = reference;
    let member: string | null = null;
    let boxed = false;
    let projected = false;
    for (let parent = reference.parent; parent !== undefined; child = parent, parent = parent.parent) {
      if (ts.isParenthesizedExpression(parent) || ts.isNonNullExpression(parent)
        || ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent)
        || ts.isTypeAssertionExpression(parent)) continue;
      if (ts.isDeleteExpression(parent)) return { kind: 'delete', node: parent };
      // `void x` and `typeof x` evaluate and discard — pure observation, classified as a read.
      if (ts.isVoidExpression(parent) || ts.isTypeOfExpression(parent)) return null;
      if (ts.isPostfixUnaryExpression(parent)) return { kind: 'assign', node: parent };
      if (ts.isPrefixUnaryExpression(parent)) {
        return parent.operator === ts.SyntaxKind.PlusPlusToken
          || parent.operator === ts.SyntaxKind.MinusMinusToken
          ? { kind: 'assign', node: parent } : null;
      }
      if (ts.isForOfStatement(parent) || ts.isForInStatement(parent)) {
        return parent.initializer === child ? { kind: 'assign', node: parent } : null;
      }
      if (ts.isBinaryExpression(parent)) {
        const operator = parent.operatorToken.kind;
        if (isAssignmentOperator(operator)) {
          if (parent.left === child) return { kind: 'assign', node: parent };
          return projected ? null : { kind: 'unrecognized', node: parent };
        }
        if (operator === ts.SyntaxKind.QuestionQuestionToken
          || operator === ts.SyntaxKind.BarBarToken
          || operator === ts.SyntaxKind.AmpersandAmpersandToken) continue;
        if (operator === ts.SyntaxKind.CommaToken && parent.right === child) continue;
        return null; // compared or combined — the value is read, never reached back through.
      }
      if (ts.isConditionalExpression(parent)) {
        if (parent.condition === child) return null;
        continue;
      }
      if ((ts.isCallExpression(parent) || ts.isNewExpression(parent))
        && (parent.arguments ?? []).some((argument) => argument === child)) {
        return { kind: 'unrecognized', node: parent };
      }
      if (ts.isCallExpression(parent) && parent.expression === child) {
        if (boxed || member === null) return { kind: 'unrecognized', node: parent };
        if (MUTATORS.includes(member)) return { kind: 'mutate', node: parent };
        return READS.includes(member) ? null : { kind: 'unrecognized', node: parent };
      }
      if (isAccess(parent) && parent.expression === child) {
        if (boxed) return { kind: 'unrecognized', node: parent };
        member = accessedName(parent);
        projected = true;
        continue;
      }
      if (ts.isArrayLiteralExpression(parent) || ts.isObjectLiteralExpression(parent)
        || ts.isSpreadElement(parent) || ts.isSpreadAssignment(parent)
        || ts.isShorthandPropertyAssignment(parent)
        || (ts.isPropertyAssignment(parent) && parent.initializer === child)) {
        boxed = true;
        continue;
      }
      if (ts.isVariableDeclaration(parent) && parent.initializer === child) {
        if (projected) return null;
        if (boxed) return { kind: 'unrecognized', node: parent };
        // A destructuring pattern takes MEMBERS off the ledger — a projection by another spelling.
        if (!ts.isIdentifier(parent.name)) return null;
        // THE BARE LEDGER MAY ONLY REST WHERE THE ALIAS TABLE CAN FOLLOW IT. `const bus = ledger`
        // is silent because the table records `bus`, so every later use of it is itself a scanned
        // reference — that is the entire justification for the silence, so it is checked rather
        // than assumed. Put any wrapper in between (`?? {}`, `|| {}`, a ternary, a comma) and the
        // table records nothing, the binding escapes unwatched, and the silence is unearned.
        return graph.aliases.get(parent.name.text) === GUARDED
          ? null : { kind: 'unrecognized', node: parent };
      }
      return { kind: 'unrecognized', node: parent };
    }
    return { kind: 'unrecognized', node: reference };
  };

  function scheduleWrites(
    relativePath: string, roots: readonly string[] | null, sourceOverride?: string,
  ): WriteSite[] {
    const graph = parseModule(relativePath, sourceOverride);
    assertParsed(graph.file, 'the schedule-write fence');
    const inScope = roots === null ? null : reachable(graph, roots);
    const sites: WriteSite[] = [];
    const at = (node: ts.Node): { line: number; text: string } => ({
      line: graph.file.getLineAndCharacterOfPosition(node.getStart(graph.file)).line + 1,
      text: node.getText(graph.file).replace(/\s+/g, ' ').slice(0, 80),
    });

    // EVERY reference, then its use — never the other way round. There is no per-node-kind arm to
    // omit, so a write in a node kind nobody enumerated cannot fall out of the scan unclassified.
    const visit = (node: ts.Node, owner: string): void => {
      let current = owner;
      if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node))
        && node.name !== undefined && ts.isIdentifier(node.name)) current = node.name.text;
      if ((inScope === null || inScope.has(current)) && namesLedger(graph, node)) {
        const use = classifyUse(graph, node);
        if (use !== null) sites.push({ kind: use.kind, enclosing: current, ...at(use.node) });
      }
      ts.forEachChild(node, (child) => { visit(child, current); });
    };
    visit(graph.file, '<module>');
    return sites;
  }

  const ACTIONS = 'src/sim/actions.ts';
  const applyEntryPoints = (): string[] =>
    [...parseModule(ACTIONS).functions.keys()].filter((name) => name.startsWith('apply')).sort();

  /** Inject one statement at the top of the real `applyMeet` — the 1:1 firing vehicle. */
  const injectedWrites = (statement: string): WriteSite[] => {
    const source = readFileSync(join(process.cwd(), ACTIONS), 'utf8');
    const brace = source.indexOf('{', source.indexOf('export function applyMeet('));
    return scheduleWrites(ACTIONS, ['applyMeet'],
      `${source.slice(0, brace + 1)}\n  ${statement}\n${source.slice(brace + 1)}`);
  };

  it('the scanned closure really is the compat verb surface (the scan is not vacuous)', () => {
    const entries = applyEntryPoints();
    // Every compatibility kind the constraints name has an entry point in the scanned set.
    expect(entries).toEqual(expect.arrayContaining([
      'applyAssignInformant', 'applyCourier', 'applyDirective', 'applyHost', 'applyMeet',
      'applySetDrop', 'applyDebrief', 'applyTell', 'applyAsk', 'applySell', 'applyRecruit',
    ]));
    expect(reachable(parseModule(ACTIONS), entries).size).toBeGreaterThanOrEqual(entries.length);
  });

  it('no apply function in src/sim/actions.ts writes a schedule override', () => {
    expect(scheduleWrites(ACTIONS, applyEntryPoints())
      .map((site) => `${site.kind}@${site.enclosing}:${site.line} ${site.text}`)).toEqual([]);
  });

  it('POSITIVE CONTROL: the same scanner finds the lawful writers downstream of receipt', () => {
    // If the detector could not see a real write, the clean verdict above would prove nothing.
    const execution = scheduleWrites('src/sim/directives/execution.ts', null);
    expect(execution.length).toBeGreaterThan(0);
    expect(new Set(execution.map((site) => site.kind))).toEqual(new Set(['assign', 'delete']));
    expect(scheduleWrites('src/sim/directives/transport.ts', null).length).toBeGreaterThan(0);
    expect(scheduleWrites('src/sim/vignettes/engine.ts', null).length).toBeGreaterThan(0);
  });

  it.each([
    ['a direct assignment', 'world.scheduleOverrides[asset] = [];', 'assign'],
    ['a compound assignment', 'world.scheduleOverrides[asset] ??= [];', 'assign'],
    ['a spread prepend', 'world.scheduleOverrides[asset] = [row, ...(world.scheduleOverrides[asset] ?? [])];', 'assign'],
    ['a delete', 'delete world.scheduleOverrides[asset];', 'delete'],
    ['an array mutator', '(world.scheduleOverrides[asset] ?? []).push(row);', 'mutate'],
    ['an aliased assignment', 'const bus = world.scheduleOverrides; bus[asset] = [];', 'assign'],
    ['an aliased mutator', 'const bus = world.scheduleOverrides; bus[asset]!.unshift(row);', 'mutate'],
    ['a static bracket mutator', "world.scheduleOverrides[asset]!['unshift'](row);", 'mutate'],
    ['a bracket-spelled ledger name in the receiver', "world['scheduleOverrides'][asset].push(row);", 'mutate'],
  ])('FIRES on %s injected into a compat apply function', (_label, statement, kind) => {
    const found = injectedWrites(statement);
    expect(found.map((site) => site.kind)).toContain(kind);
    expect(found.every((site) => site.enclosing === 'applyMeet')).toBe(true);
  });

  /**
   * SPELLING PARITY. `toContain` above proves a bracket-spelled method is REPORTED; this proves it
   * is reported as the SAME THING as its dot-spelled twin — an enumerated mutator stays `mutate`
   * and does not degrade into `unrecognized`, an unenumerated one stays `unrecognized`, and a read
   * stays silent. Equality against the dot form is the claim, so neither spelling can drift alone.
   */
  it('classifies a bracket-spelled method exactly as its dot-spelled twin', () => {
    const kindsOf = (statement: string): string[] =>
      injectedWrites(statement).map((site) => site.kind);
    expect(kindsOf("world.scheduleOverrides[asset]!['unshift'](row);"))
      .toEqual(kindsOf('world.scheduleOverrides[asset]!.unshift(row);'));
    expect(kindsOf("world.scheduleOverrides[asset]!['copyWithin'](0, 1);"))
      .toEqual(kindsOf('world.scheduleOverrides[asset]!.copyWithin(0, 1);'));
    expect(kindsOf("void (world.scheduleOverrides[asset] ?? [])['filter']((r) => r.venue === 'x');"))
      .toEqual(kindsOf("void (world.scheduleOverrides[asset] ?? []).filter((r) => r.venue === 'x');"));
  });

  /**
   * THE SAME PARITY, ONE LEVEL OUT. The pin above fixes how the METHOD may be spelled; this fixes
   * how the LEDGER may be spelled inside that method's RECEIVER. `world['scheduleOverrides']` names
   * the ledger exactly as `world.scheduleOverrides` does, so an enumerated mutator reached through it
   * must still be `mutate`, an unenumerated one `unrecognized`, and a lawful read silent. Callee and
   * receiver read names through the same `isAccess`/`accessedName` pair, and equality against the dot
   * form is what stops the two spelling rules from drifting apart again.
   */
  it('reads a bracket-spelled ledger name in a receiver exactly as its dot-spelled twin', () => {
    const kindsOf = (statement: string): string[] =>
      injectedWrites(statement).map((site) => site.kind);
    expect(kindsOf("world['scheduleOverrides'][asset].push(row);"))
      .toEqual(kindsOf('world.scheduleOverrides[asset].push(row);'));
    expect(kindsOf("world['scheduleOverrides'][asset]!.copyWithin(0, 1);"))
      .toEqual(kindsOf('world.scheduleOverrides[asset]!.copyWithin(0, 1);'));
    expect(kindsOf("void (world['scheduleOverrides'][asset] ?? []).filter((r) => r.venue === 'x');"))
      .toEqual(kindsOf("void (world.scheduleOverrides[asset] ?? []).filter((r) => r.venue === 'x');"));
  });

  /**
   * THE FAIL-CLOSED DEFAULT (whole-branch M-1). Enumerating write SPELLINGS cannot make good on the
   * claim that no compat verb writes a schedule "anywhere": the reviewer recovered the same write
   * through `Reflect.set` and `Object.assign`, and the next reflective spelling would need another
   * enumeration. So a use of the ledger this fence cannot READ is a write until proven otherwise.
   * Handing it to a call, or calling a method on it that is neither an enumerated mutator nor a
   * known non-writing read, is reported. SPELLING IS NOT A LOOPHOLE: `ledger['copyWithin'](...)`
   * names its method exactly as `ledger.copyWithin(...)` does and is classified identically, and
   * `ledger[whichever](...)` — a method name only the running program knows — is the same failure
   * to read the ledger's use, so it is reported rather than skipped.
   */
  it.each([
    ['a reflective set', 'Reflect.set(world.scheduleOverrides, asset, []);'],
    ['an object merge', 'Object.assign(world.scheduleOverrides, { [asset]: [] });'],
    ['a defined property', 'Object.defineProperty(world.scheduleOverrides, asset, { value: [] });'],
    ['an aliased reflective set',
      'const bus = world.scheduleOverrides; Reflect.set(bus, asset, []);'],
    ['a hand-off to an unreadable helper', 'installOverride(world.scheduleOverrides, asset);'],
    ['an unenumerated array mutator', 'world.scheduleOverrides[asset]!.copyWithin(0, 1);'],
    ['a static bracket-spelled unenumerated mutator',
      "world.scheduleOverrides[asset]!['copyWithin'](0, 1);"],
    ['a bracket method only the running program can name',
      'world.scheduleOverrides[asset]![whichever](0, 1);'],
  ])('FIRES on %s injected into a compat apply function', (_label, statement) => {
    expect(injectedWrites(statement).map((site) => site.kind)).toContain('unrecognized');
  });

  /**
   * THE INVERSION (fix wave 6). Everything above still described the fence arm-first: each arm
   * recognized its own shapes, so every node kind WITHOUT an arm was silent by default. Three
   * review rounds each falsified "no write anywhere" with a new statically readable spelling, and
   * the fix-5 residual measured thirteen at once across four sub-classes. The rule is therefore
   * inverted at the REFERENCE level: every mention of the ledger must justify itself as a write of
   * a known kind or as a lawful read, and anything else — any node kind, named or not — is
   * reported. This table is that claim's firing matrix; the four sub-classes are labelled.
   */
  it.each([
    // (1) non-chain assignment/delete targets — the target is not a linear access chain.
    ['a ternary-hidden assignment target', '(cond ? world.scheduleOverrides : other)[asset] = [];', 'assign'],
    ['a nullish-hidden assignment target', '(world.scheduleOverrides ?? {})[asset] = [];', 'assign'],
    ['a comma-hidden assignment target', '(0, world.scheduleOverrides)[asset] = [];', 'assign'],
    ['a ternary-hidden delete', 'delete (cond ? world.scheduleOverrides : other)[asset];', 'delete'],
    // (2) destructuring assignment targets — the left-hand side is a literal, not a chain.
    ['an array destructuring assignment', '[world.scheduleOverrides[asset]] = [[]];', 'assign'],
    ['an object destructuring assignment', '({ ada: world.scheduleOverrides.ada } = src);', 'assign'],
    ['a rest destructuring assignment', '[...world.scheduleOverrides[asset]] = rows;', 'assign'],
    // (3) writes that are not BinaryExpressions at all.
    ['a for-of assignment target', 'for (world.scheduleOverrides[asset] of rows) {}', 'assign'],
    ['a for-in assignment target', 'for (world.scheduleOverrides[asset] in rows) {}', 'assign'],
    ['a postfix increment', 'world.scheduleOverrides[asset]!.length++;', 'assign'],
    ['a prefix decrement', '--world.scheduleOverrides[asset]!.length;', 'assign'],
    // (4) hand-offs that are not CallExpressions.
    ['a new-expression hand-off', 'void new Installer(world.scheduleOverrides, asset);', 'unrecognized'],
    ['a tagged-template hand-off', 'tag`${world.scheduleOverrides}`;', 'unrecognized'],
  ])('FIRES on %s — an unjustified ledger reference is reported whatever its node kind',
    (_label, statement, kind) => {
      const found = injectedWrites(statement);
      expect(found.map((site) => site.kind)).toContain(kind);
      expect(found.every((site) => site.enclosing === 'applyMeet')).toBe(true);
    });

  it.each([
    ['a filtered read', "void (world.scheduleOverrides[asset] ?? []).filter((row) => row.venue === 'x');"],
    ['a searched read', "void (world.scheduleOverrides[asset] ?? []).find((row) => row.source === 'player');"],
    ['a plain index read', 'const venue = world.scheduleOverrides[asset]?.[0]?.venue;'],
    ['a static bracket-spelled read',
      "void (world.scheduleOverrides[asset] ?? [])['filter']((row) => row.venue === 'x');"],
  ])('stays SILENT on %s — the fence reports uses it cannot read, not reads', (_label, statement) => {
    expect(injectedWrites(statement)).toEqual([]);
  });

  /**
   * WHAT MAKES THIS AN INVERSION RATHER THAN THIRTEEN MORE ARMS. Nothing below was anyone's
   * counterexample; none has a rule written for it. They are reported because the fence's DEFAULT
   * is to report, so a node kind nobody thought of — including one the language grows later —
   * cannot fall out of the scan unclassified the way `for…of`, `++` and `new` all did. If a future
   * change reintroduces per-kind arms, these are the cases that go quiet first.
   */
  it.each([
    ['a throw', 'throw world.scheduleOverrides;'],
    ['a return', 'if (asset) { return world.scheduleOverrides; }'],
    ['an untagged template', 'void `${world.scheduleOverrides}`;'],
    ['a bare expression statement', 'world.scheduleOverrides;'],
    ['a class-field capture', 'class Holder { rows = world.scheduleOverrides; }'],
    ['a switch discriminant', 'switch (world.scheduleOverrides) { default: break; }'],
    ['an awaited hand-off', 'void (async () => { await world.scheduleOverrides; })();'],
    ['a method dispatched off a boxing literal',
      '[world.scheduleOverrides].forEach((b) => b[asset] = []);'],
  ])('FIRES on %s — no arm recognizes it; the fence reports it because nothing classified it',
    (_label, statement) => {
      expect(injectedWrites(statement).map((site) => site.kind)).toContain('unrecognized');
    });

  /**
   * THE LEDGER ITSELF MAY NOT LEAVE UNREAD. A PROJECTION out of the ledger (`ledger[who]`, and the
   * rows spread out of it) is a value, and storing one is a read — production does exactly that
   * when it rebuilds a row list. The bare ledger OBJECT is different: stored into a binding the
   * module's alias table resolves (`const bus = ledger`) it stays readable, and every later use of
   * `bus` is itself a scanned reference — but stored anywhere else it escapes into something this
   * fence cannot follow, so it is reported. Both forms below were silent until the inversion.
   */
  it.each([
    ['a deferred alias assignment', 'let bus; bus = world.scheduleOverrides; bus[asset] = [];'],
    ['an object-literal capture', 'const held = { bus: world.scheduleOverrides };'],
  ])('FIRES on %s — the ledger escaping into a binding the fence cannot resolve',
    (_label, statement) => {
      expect(injectedWrites(statement).map((site) => site.kind)).toContain('unrecognized');
    });

  /**
   * THE NAME AS DATA. Every form above reaches the ledger through a member ACCESS. These replace or
   * remove it while never reading it through one: the name travels as a string, to a callee that
   * redefines the slot on the container. The fence counts a ledger-naming string literal as a
   * reference and classifies it by the same outward walk, so no new arm was added for this — which
   * is also why the comparison below stays silent, a string being compared writing nothing.
   */
  it.each([
    ['a defined getter over the ledger slot',
      "Object.defineProperty(world, 'scheduleOverrides', { get: g });"],
    ['a reflective delete of the ledger slot', "Reflect.deleteProperty(world, 'scheduleOverrides');"],
    ['a computed-key object merge', "Object.assign(world, { ['scheduleOverrides']: {} });"],
    ['a plain property-name merge', 'Object.assign(world, { scheduleOverrides: {} });'],
    ['a string-quoted property-name merge', "Object.assign(world, { 'scheduleOverrides': {} });"],
    ['a reflective set of the ledger slot', "Reflect.set(world, 'scheduleOverrides', {});"],
  ])('FIRES on %s — the ledger named as data, never read through an access',
    (_label, statement) => {
      expect(injectedWrites(statement).map((site) => site.kind)).toContain('unrecognized');
    });

  /**
   * …AND ONLY WHEN THE OPERATION IS AIMED AT THE LEDGER. A property name is only a ledger reference
   * in an operation that targets the ledger's container; the same word elsewhere is just a word.
   * Discovery is therefore context-sensitive: without this, every mention of the string anywhere in
   * the closure would report, which is noise, not fail-closed.
   */
  it.each([
    ['a logged string', "console.log('scheduleOverrides');"],
    ['an unrelated computed-key object', "const metadata = { ['scheduleOverrides']: {} };"],
    ['an unrelated property name', 'const metadata = { scheduleOverrides: {} };'],
    ['a merge into an unrelated target', "Object.assign(other, { scheduleOverrides: {} });"],
    ['a ledger name merely compared as a string',
      "if (whichever === 'scheduleOverrides') { void 0; }"],
  ])('stays SILENT on %s — the word alone is not a reference', (_label, statement) => {
    expect(injectedWrites(statement)).toEqual([]);
  });

  /**
   * A BINDING THE ALIAS TABLE CANNOT ACTUALLY RECORD. `const bus = ledger` is silent because the
   * module's alias table resolves `bus`, so every later use of it is itself a scanned reference —
   * that is the whole justification for the silence. Put any logical wrapper in between and the
   * table records nothing (it reads only direct identifier/property/element initializers), so the
   * binding escapes unwatched. The silence must therefore be conditioned on the table REALLY
   * holding the rename, not on the shape looking alias-like.
   */
  it.each([
    ['a nullish-wrapped binding', 'const held = world.scheduleOverrides ?? {}; held[asset] = [];'],
    ['a logical-or-wrapped binding', 'const held = world.scheduleOverrides || {}; held[asset] = [];'],
    ['a ternary-wrapped binding',
      'const held = cond ? world.scheduleOverrides : other; held[asset] = [];'],
    ['a comma-wrapped binding', 'const held = (0, world.scheduleOverrides); held[asset] = [];'],
  ])('FIRES on %s — the bare ledger entering a binding the alias table cannot resolve',
    (_label, statement) => {
      expect(injectedWrites(statement).map((site) => site.kind)).toContain('unrecognized');
    });

  /**
   * The inversion's read surface, pinned. These are silent because they are CLASSIFIED as reads,
   * not because no arm happened to match them — which is the distinction the table above turns on.
   * Iterating the ledger and comparing it cannot write it; a projection stored in a binding is the
   * shape production itself uses (`const kept = world.scheduleOverrides[who] ?? []`).
   */
  it.each([
    ['an iteration source', 'for (const r of world.scheduleOverrides[asset]!) { void r; }'],
    ['a comparison', 'if (world.scheduleOverrides[asset] === undefined) { void 0; }'],
    ['a projection stored in a binding', 'const kept = world.scheduleOverrides[asset] ?? [];'],
    ['a plain alias declaration the alias table resolves',
      'const bus = world.scheduleOverrides; void bus.length;'],
  ])('stays SILENT on %s — a classified read, not an unmatched node kind', (_label, statement) => {
    expect(injectedWrites(statement)).toEqual([]);
  });

  it('a write OUTSIDE the scanned closure is correctly not attributed to the compat verbs', () => {
    // The closure is the point: this scanner reports what the compat surface can reach, and a
    // lawful writer elsewhere in another module is not a finding here.
    const source = readFileSync(join(process.cwd(), ACTIONS), 'utf8');
    const injected = `${source}\nfunction unrelated(world, asset) { world.scheduleOverrides[asset] = []; }\n`;
    expect(scheduleWrites(ACTIONS, applyEntryPoints(), injected)).toEqual([]);
    expect(scheduleWrites(ACTIONS, ['unrelated'], injected).length).toBe(1);
  });

  it('the fence refuses a source the parser only recovered from', () => {
    const source = readFileSync(join(process.cwd(), ACTIONS), 'utf8');
    expect(() => scheduleWrites(ACTIONS, ['applyMeet'], `${source}\nfunction broken( {`))
      .toThrow(/could not parse/);
  });
});
