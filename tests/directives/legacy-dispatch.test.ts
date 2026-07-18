import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
