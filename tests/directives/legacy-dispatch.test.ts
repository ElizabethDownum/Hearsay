import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  type ModuleGraph, accessedName, assertParsed, chainNames, isAccess, parseModule, reachable,
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
 * direct one. Writes are assignments (plain and compound), `delete`, the array mutators — and,
 * fail-closed, any use of the ledger the fence cannot READ: handed to a call, or reached through a
 * method that is neither an enumerated mutator nor a known non-writing read. That last rule is what
 * makes "no write anywhere" a claim rather than a list; see the doctrine note beside it below.
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

  interface WriteSite {
    kind: 'assign' | 'delete' | 'mutate' | 'unrecognized';
    enclosing: string;
    line: number;
    text: string;
  }

  /** Chain names with in-module aliases resolved: `s[who]` becomes `scheduleOverrides.*`. */
  const namesOf = (graph: ModuleGraph, node: ts.Node): string[] =>
    chainNames(node).map((name) => graph.aliases.get(name) ?? name);

  const touchesGuarded = (graph: ModuleGraph, node: ts.Node): boolean =>
    namesOf(graph, node).includes(GUARDED);

  /**
   * A mutator's receiver is not always a plain chain: `(world.scheduleOverrides[x] ?? []).push(row)`
   * hides it inside a `??`, and a ternary would hide it inside two branches. Any mention of the
   * guarded name anywhere in the receiver expression is the receiver, so the whole subtree is read.
   */
  const receiverTouchesGuarded = (graph: ModuleGraph, node: ts.Node): boolean => {
    let hit = false;
    const walk = (current: ts.Node): void => {
      if (hit) return;
      const named = ts.isIdentifier(current) ? current.text
        : ts.isPropertyAccessExpression(current) ? current.name.text : null;
      if (named !== null && (graph.aliases.get(named) ?? named) === GUARDED) hit = true;
      else ts.forEachChild(current, walk);
    };
    walk(node);
    return hit;
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

    const visit = (node: ts.Node, owner: string): void => {
      let current = owner;
      if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node))
        && node.name !== undefined && ts.isIdentifier(node.name)) current = node.name.text;
      const counts = inScope === null || inScope.has(current);

      // A method call's CALLEE, in either spelling. `rows.push(row)` and `rows['push'](row)` name
      // the same method, so both arms below read the callee through the shared `isAccess` /
      // `accessedName` pair rather than through `PropertyAccessExpression` alone. `method` is
      // `null` exactly when only the running program knows the name (`rows[whichever](row)`) —
      // the fail-closed arm reports that rather than skipping it.
      const callee = ts.isCallExpression(node) && isAccess(node.expression)
        ? node.expression : null;
      const method = callee === null ? null : accessedName(callee);

      if (counts && ts.isBinaryExpression(node)
        && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        && touchesGuarded(graph, node.left)) {
        sites.push({ kind: 'assign', enclosing: current, ...at(node) });
      }
      if (counts && ts.isDeleteExpression(node) && touchesGuarded(graph, node.expression)) {
        sites.push({ kind: 'delete', enclosing: current, ...at(node) });
      }
      if (counts && callee !== null && method !== null && MUTATORS.includes(method)
        && receiverTouchesGuarded(graph, callee.expression)) {
        sites.push({ kind: 'mutate', enclosing: current, ...at(node) });
      }
      // THE FAIL-CLOSED DEFAULT. Enumerating spellings can never make good on "no write anywhere":
      // `Reflect.set` and `Object.assign` write the ledger without matching any form above, and the
      // next reflective spelling would need another enumeration. So a use of the ledger this fence
      // cannot READ counts as a write — handing it to a call, or calling a method on it that is
      // neither an enumerated mutator (reported above) nor a known non-writing read. A method whose
      // NAME the fence cannot read either (`ledger[whichever](...)`) is the same failure to read,
      // so it lands here too rather than falling out of both arms unclassified.
      if (counts && ts.isCallExpression(node)) {
        const handedOver = node.arguments.some((argument) => receiverTouchesGuarded(graph, argument));
        const unknownMethod = callee !== null
          && (method === null || (!MUTATORS.includes(method) && !READS.includes(method)))
          && receiverTouchesGuarded(graph, callee.expression);
        if (handedOver || unknownMethod) {
          sites.push({ kind: 'unrecognized', enclosing: current, ...at(node) });
        }
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
   * THE FAIL-CLOSED DEFAULT (whole-branch M-1). Enumerating write SPELLINGS cannot make good on the
   * claim that no compat verb writes a schedule "anywhere": the reviewer recovered the same write
   * through `Reflect.set` and `Object.assign`, and the next reflective spelling would need another
   * enumeration. So the rule is inverted — a use of the ledger this fence cannot READ is a write
   * until proven otherwise. Handing it to a call, or calling a method on it that is neither an
   * enumerated mutator nor a known non-writing read, is reported. SPELLING IS NOT A LOOPHOLE:
   * `ledger['copyWithin'](...)` names its method exactly as `ledger.copyWithin(...)` does and is
   * classified identically, and `ledger[whichever](...)` — a method name only the running program
   * knows — is the same failure to read the ledger's use, so it is reported rather than skipped.
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

  it.each([
    ['a filtered read', "void (world.scheduleOverrides[asset] ?? []).filter((row) => row.venue === 'x');"],
    ['a searched read', "void (world.scheduleOverrides[asset] ?? []).find((row) => row.source === 'player');"],
    ['a plain index read', 'const venue = world.scheduleOverrides[asset]?.[0]?.venue;'],
    ['a static bracket-spelled read',
      "void (world.scheduleOverrides[asset] ?? [])['filter']((row) => row.venue === 'x');"],
  ])('stays SILENT on %s — the fence reports uses it cannot read, not reads', (_label, statement) => {
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
