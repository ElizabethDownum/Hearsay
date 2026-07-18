import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyDirective } from '../../src/sim/actions';
import { applyEnemyDecision, runEnemyDay } from '../../src/sim/counterintel';
import {
  attemptDirective, markDirectiveDue, settleDirectiveApplications,
} from '../../src/sim/directives/execution';
import {
  allocateNetworkMessage, beatAtOrAfter, issueDirectiveRecord, strictNextBeat,
} from '../../src/sim/directives/state';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type {
  DirectiveBrief, DirectiveRecord, EnemyActionReport, NetworkMessage,
} from '../../src/sim/directives/types';
import { emptyEnemyState, type EnemyDecision } from '../../src/sim/enemy/state';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { stableStringify } from '../../src/sim/hash';
import { collectCircleIntents, realizeCircleIntents, stepTransaction } from '../../src/sim/phases';
import type { WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer, trustBetween } from '../../src/sim/world';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { miniTown } from '../sim/helpers/minitown';

type OrderKind = 'inquiry' | 'interrogation' | 'watch';

function enemyWorld(relayed = false) {
  const fixture = miniTown();
  const kept = new Set(['ada', 'bez', 'cyn', 'dov']);
  fixture.npcs = fixture.npcs.filter((npc) => kept.has(npc.id)).map((npc) => ({
    ...npc, traits: ['literalist' as const],
    schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: 'square' }],
    edges: npc.edges.filter((edge) => kept.has(edge.to)),
  }));
  const world = buildWorld(fixture, relayed ? 'enemy-orders-relayed' : 'enemy-orders', STANDARD_RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push(
    { id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
  );
  if (relayed) {
    world.network.enemyAssets.push(
      { id: 'cyn', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
    );
  }
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  world.enemy.map = {
    venues: Object.values(world.venues).map(({ id, district, access }) => ({ id, district, access })),
    directory: Object.values(world.npcs).map((npc) => ({
      id: npc.id, occupation: npc.occupation, district: 'd0',
    })),
  };
  return world;
}

const completeDecision: EnemyDecision = {
  day: 0, features: [],
  inquiries: [{ asker: 'bez', about: { subject: 'dov' }, expiresDay: 3 }],
  interrogations: [{ target: 'dov', guard: 'bez', day: 1,
    about: { subject: 'dov' }, venue: 'square' }],
  watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }],
};

function decisionFor(kind: OrderKind): EnemyDecision {
  return {
    day: 0, features: [],
    inquiries: kind === 'inquiry' ? structuredClone(completeDecision.inquiries) : [],
    interrogations: kind === 'interrogation' ? structuredClone(completeDecision.interrogations) : [],
    watches: kind === 'watch' ? structuredClone(completeDecision.watches) : [],
  };
}

function recordFor(world: WorldState): DirectiveRecord {
  return world.network.directiveState!.records.at(-1)!;
}

function messageFor(world: WorldState, record: DirectiveRecord): NetworkMessage {
  return world.network.directiveState!.messages.find((message) =>
    message.payload.kind === 'directive' && message.payload.version.directiveId === record.id)!;
}

function deliverOrder(world: WorldState, record: DirectiveRecord, relayed = false): void {
  const message = messageFor(world, record);
  world.tick = 0;
  expect(realizeNetworkForward(world, message.id,
    { venue: 'square', members: relayed ? ['ada', 'cyn'] : ['ada', 'bez'] },
    0, STANDARD_RULES)).not.toBeNull();
  if (relayed) {
    world.tick = 15;
    expect(realizeNetworkForward(world, message.id,
      { venue: 'square', members: ['cyn', 'bez'] }, 15, STANDARD_RULES)).not.toBeNull();
  }
  expect(record.received).not.toBeNull();
  expect(record.decision?.commitment).toBe('attempt');
}

function executeOrder(world: WorldState, kind: OrderKind, relayed = false): DirectiveRecord {
  applyEnemyDecision(world, decisionFor(kind));
  const record = recordFor(world);
  deliverOrder(world, record, relayed);
  const due = record.decision!.timing.actAt!;
  world.tick = due;
  markDirectiveDue(world, record.id, due);
  attemptDirective(world, record.id,
    { venue: 'square', members: kind === 'interrogation' ? ['bez', 'dov'] : ['bez', 'cyn'] },
    due, STANDARD_RULES);

  if (kind === 'interrogation') {
    const askingTick = due + 15;
    world.tick = askingTick;
    const circle = { venue: 'square', members: ['bez', 'dov'] };
    const frame = collectCircleIntents(world, circle, askingTick, STANDARD_RULES, [], new Set());
    const realized = realizeCircleIntents(world, frame, askingTick, STANDARD_RULES);
    expect(realized.askings).toEqual([
      expect.objectContaining({ speaker: 'bez', addressedTo: 'dov' }),
    ]);
  } else if (kind === 'watch') {
    const workedAt = due + 15;
    world.tick = workedAt;
    settleDirectiveApplications(world, workedAt, STANDARD_RULES);
    expect(record.execution?.workedDays).toEqual([1]);
  }
  expect(world.network.directiveState!.messages.filter((message) =>
    message.payload.kind === 'directive-report' && message.payload.directiveId === record.id))
    .toHaveLength(1);
  return record;
}

function reportFor(world: WorldState, record: DirectiveRecord): NetworkMessage {
  return world.network.directiveState!.messages.find((message) =>
    message.payload.kind === 'directive-report' && message.payload.directiveId === record.id)!;
}

function hqInput(world: WorldState) {
  return {
    inquiriesIssued: world.enemy.inquiriesIssued,
    interrogated: world.enemy.interrogated,
    watchedDistricts: world.enemy.watchedDistricts,
    actionLedger: world.enemy.actionLedger ?? null,
    digestInput: stableStringify(world.enemy),
    digestOutput: stableStringify(enemyDigest(world.enemy, 2, STANDARD_RULES)),
  };
}

const pendingOrdersOf = (world: WorldState) => world.enemy.pendingOrders;

function deliverDirectReport(world: WorldState, record: DirectiveRecord): void {
  const report = reportFor(world, record);
  const tick = report.availableAfter;
  world.tick = tick;
  expect(realizeNetworkForward(world, report.id,
    { venue: 'square', members: [record.recipient, 'ada'] }, tick, STANDARD_RULES)).not.toBeNull();
}

function queueSpokenReport(
  world: WorldState, record: DirectiveRecord, enemyAction: EnemyActionReport | null,
  outcome = 'refused',
): NetworkMessage {
  const id = allocateNetworkMessage(world, 'enemy', record.recipient, ['ada'], {
    kind: 'directive-report', directiveId: record.id,
    report: { outcome, reason: 'heard outcome', evidence: null, source: record.recipient,
      uncertainty: 'medium' },
    factRefs: [], enemyAction,
  }, world.tick, null, null);
  return world.network.directiveState!.messages.find((message) => message.id === id)!;
}

describe('enemy orders use physical directives', () => {
  it('queues order groups without any immediate operational or digest-visible effect', () => {
    const world = enemyWorld();
    applyEnemyDecision(world, completeDecision);
    expect(world.inquiries).toEqual({});
    expect(world.scheduleOverrides).toEqual({});
    expect(world.enemy.inquiriesIssued).toEqual([]);
    expect(world.enemy.interrogated).toEqual([]);
    expect(world.enemy.watchedDistricts).toEqual([]);
    expect(world.enemy.actionLedger).toBeUndefined();
    expect(world.enemy.pendingOrders?.map((row) => row.key).sort()).toEqual([
      'inquiry:s:dov', 'interrogation:dov:s:dov', 'watch:d0',
    ]);
    expect(world.network.directiveState!.messages.every((message) =>
      message.payload.kind === 'directive')).toBe(true);
  });

  it('keeps the pure digest byte-identical for identical EnemyState input', () => {
    const state = emptyEnemyState();
    const before = stableStringify(state);
    expect(enemyDigest(state, 0, STANDARD_RULES)).toEqual(enemyDigest(state, 0, STANDARD_RULES));
    expect(stableStringify(state)).toBe(before);
  });

  it('keeps each order group singly reserved across two production digest nights while in transit', () => {
    const world = enemyWorld(true);
    world.enemy.observers.push({ id: 'cyn', vigilance: 1 });
    world.enemy.evidence.push({
      tick: 0, venue: 'square', observer: 'bez', overheard: false,
      speaker: 'cyn', addressedTo: 'bez', kind: 'utterance', mode: 'telling',
      claimId: 'c0', family: 'f1',
      reported: { subject: 'cyn', predicate: 'stole', object: null, count: 2, severity: 4,
        place: null, attribution: 'dov' },
      about: null,
    });
    world.enemy.sketch.push(
      { id: 'sf0', kind: 'origin-vague', day: 0, family: 'f0', subject: 'dov', district: 'd0',
        detail: 'staged in-transit reservation pin', evidence: [] },
      { id: 'sf1', kind: 'district-activity', day: 0, family: 'f0', subject: null, district: 'd0',
        detail: 'staged in-transit reservation pin', evidence: [] },
    );
    world.enemy.featureCounter = 2;

    const assertSinglyReserved = (day: number): string[] => {
      const pending = world.enemy.pendingOrders ?? [];
      expect(pending.map((row) => row.key).sort()).toEqual([
        'inquiry:s:dov', 'watch:d0',
      ]);
      expect(pending.every((row) => day <= row.reconsiderAfterDay)).toBe(true);

      const directiveIds = pending.flatMap((row) => row.directiveIds).sort();
      expect(new Set(directiveIds).size).toBe(directiveIds.length);
      const records = world.network.directiveState!.records;
      const messages = world.network.directiveState!.messages.filter((message) =>
        message.payload.kind === 'directive');
      expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
      expect(new Set(messages.map((message) => message.id)).size).toBe(messages.length);
      expect(records.map((record) => record.id).sort()).toEqual(directiveIds);
      expect(messages.map((message) => message.payload.kind === 'directive'
        ? message.payload.version.directiveId : '').sort()).toEqual(directiveIds);
      expect(world.enemy.issuedDirectiveIds?.slice().sort()).toEqual(directiveIds);
      return directiveIds;
    };

    const assertSinglyReservedInTransit = (day: number): string[] => {
      const directiveIds = assertSinglyReserved(day);
      const state = world.network.directiveState!;
      expect(state.records.every((record) => record.received === null)).toBe(true);
      expect(state.messages.every((message) => message.deliveredAt === null
        && message.failedAt === null && message.nextHop === 0)).toBe(true);
      return directiveIds;
    };

    world.tick = TICKS_PER_DAY - 1;
    stepTransaction(world, STANDARD_RULES);
    const firstNightDirectiveIds = assertSinglyReservedInTransit(0);
    const firstTransportExpiry = Math.min(...world.network.directiveState!.messages
      .map((message) => message.expiresAt ?? Number.POSITIVE_INFINITY));
    expect(Number.isFinite(firstTransportExpiry)).toBe(true);
    const firstTransportExpiryDay = Math.floor(firstTransportExpiry / TICKS_PER_DAY);

    for (const day of [firstTransportExpiryDay - 1, firstTransportExpiryDay]) {
      world.tick = day * TICKS_PER_DAY + TICKS_PER_DAY - 1;
      stepTransaction(world, STANDARD_RULES);
      expect(assertSinglyReservedInTransit(day)).toEqual(firstNightDirectiveIds);
    }

    const failureDay = firstTransportExpiryDay + 1;
    world.tick = failureDay * TICKS_PER_DAY + TICKS_PER_DAY - 1;
    stepTransaction(world, STANDARD_RULES);
    expect(assertSinglyReserved(failureDay)).toEqual(firstNightDirectiveIds);
    expect(world.network.directiveState!.messages.some((message) =>
      message.failedAt === failureDay * TICKS_PER_DAY + TICKS_PER_DAY - 1)).toBe(true);

    const firstReconsiderAfterDay = Math.min(...world.enemy.pendingOrders!
      .map((row) => row.reconsiderAfterDay));
    expect(firstReconsiderAfterDay).toBeGreaterThan(failureDay);
    world.tick = firstReconsiderAfterDay * TICKS_PER_DAY + TICKS_PER_DAY - 1;
    stepTransaction(world, STANDARD_RULES);
    expect(assertSinglyReserved(firstReconsiderAfterDay)).toEqual(firstNightDirectiveIds);
  });

  it('keeps a failed in-transit group reserved, then permits reissue only after reconsiderAfterDay', () => {
    const world = enemyWorld(true);
    const watch: EnemyDecision = { day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'd0', posts: [
        { guard: 'bez', venue: 'square' }, { guard: 'cyn', venue: 'backroom' },
      ], startDay: 1 }] };
    applyEnemyDecision(world, watch);
    const reservation = world.enemy.pendingOrders![0]!;
    expect(reservation.directiveIds).toHaveLength(2);
    for (const message of world.network.directiveState!.messages) message.failedAt = 15;
    applyEnemyDecision(world, { ...watch, day: reservation.reconsiderAfterDay });
    expect(world.enemy.pendingOrders).toEqual([reservation]);
    expect(world.enemy.issuedDirectiveIds).toHaveLength(2);

    world.tick = (reservation.reconsiderAfterDay + 1) * TICKS_PER_DAY;
    runEnemyDay(world, STANDARD_RULES);
    expect(world.enemy.pendingOrders).toBeUndefined();
    applyEnemyDecision(world, { ...watch, day: reservation.reconsiderAfterDay + 1,
      watches: [{ ...watch.watches[0]!, startDay: reservation.reconsiderAfterDay + 2 }] });
    expect(world.enemy.issuedDirectiveIds).toHaveLength(4);
    expect(world.enemy.pendingOrders?.[0]?.directiveIds).toHaveLength(2);
  });

  it('a physically heard refusal/doctored-null report settles early with no marker or ledger write', () => {
    const world = enemyWorld();
    applyEnemyDecision(world, decisionFor('inquiry'));
    const record = recordFor(world);
    const report = queueSpokenReport(world, record, null);
    expect(realizeNetworkForward(world, report.id,
      { venue: 'square', members: ['bez', 'ada'] }, 0, STANDARD_RULES)).not.toBeNull();
    expect(record.receivedReports).toEqual([
      expect.objectContaining({ report: expect.objectContaining({ outcome: 'refused' }) }),
    ]);
    expect(world.enemy.pendingOrders).toBeUndefined();
    expect(world.enemy.inquiriesIssued).toEqual([]);
    expect(world.enemy.interrogated).toEqual([]);
    expect(world.enemy.watchedDistricts).toEqual([]);
    expect(world.enemy.actionLedger).toBeUndefined();
  });

  it.each(['inquiry', 'interrogation', 'watch'] as const)(
    'keeps %s execution digest-invisible until its first matching report reaches HQ', (kind) => {
      const executed = enemyWorld();
      const control = enemyWorld();
      const record = executeOrder(executed, kind);
      applyEnemyDecision(control, decisionFor(kind));
      const report = reportFor(executed, record);
      expect(realizeNetworkForward(executed, report.id,
        { venue: 'square', members: ['ada', 'cyn'] }, report.availableAfter, STANDARD_RULES)).toBeNull();
      expect(hqInput(executed)).toEqual(hqInput(control));

      deliverDirectReport(executed, record);
      if (kind === 'inquiry') {
        expect(executed.enemy.inquiriesIssued).toEqual(['s:dov']);
        expect(executed.enemy.actionLedger).toBeUndefined();
      } else if (kind === 'interrogation') {
        expect(executed.enemy.interrogated).toEqual(['dov:s:dov']);
        expect(executed.enemy.actionLedger).toEqual([
          expect.objectContaining({ orderKey: 'interrogation:dov:s:dov', kind,
            directiveIds: [record.id], askedAt: expect.any(Number) }),
        ]);
      } else {
        expect(executed.enemy.watchedDistricts).toEqual(['d0']);
        expect(executed.enemy.actionLedger).toEqual([
          expect.objectContaining({ orderKey: 'watch:d0', kind,
            directiveIds: [record.id], workedDays: [1] }),
        ]);
      }
    },
  );

  it('mirrors a multi-hop reply route: relay receipt is inert and final HQ receipt settles', () => {
    const world = enemyWorld(true);
    const record = executeOrder(world, 'inquiry', true);
    const report = reportFor(world, record);
    expect(report.route).toEqual(['cyn', 'ada']);
    world.tick = report.availableAfter;
    expect(realizeNetworkForward(world, report.id,
      { venue: 'square', members: ['bez', 'cyn'] }, world.tick, STANDARD_RULES)).not.toBeNull();
    expect(world.enemy.inquiriesIssued).toEqual([]);
    expect(world.enemy.pendingOrders).toHaveLength(1);
    world.tick += 15;
    expect(realizeNetworkForward(world, report.id,
      { venue: 'square', members: ['cyn', 'ada'] }, world.tick, STANDARD_RULES)).not.toBeNull();
    expect(world.enemy.inquiriesIssued).toEqual(['s:dov']);
    expect(world.enemy.pendingOrders).toBeUndefined();
  });

  it('a late old report records only its exact directive, never an unexecuted reissue', () => {
    const world = enemyWorld();
    applyEnemyDecision(world, decisionFor('watch'));
    const oldRecord = recordFor(world);
    delete world.enemy.pendingOrders;
    world.tick = 20 * TICKS_PER_DAY;
    applyEnemyDecision(world, { ...decisionFor('watch'), day: 20,
      watches: [{ ...completeDecision.watches[0]!, startDay: 21 }] });
    const reissued = recordFor(world);
    const report = queueSpokenReport(world, oldRecord, {
      kind: 'watch-worked', subject: null, about: null, district: 'd0', scheduleStartDay: 1,
      guard: 'bez', venue: 'square', workedDay: 1, occurredAt: TICKS_PER_DAY + 960,
    }, 'watch worked');
    expect(realizeNetworkForward(world, report.id,
      { venue: 'square', members: ['bez', 'ada'] }, world.tick, STANDARD_RULES)).not.toBeNull();
    expect(world.enemy.actionLedger?.[0]?.directiveIds).toEqual([oldRecord.id]);
    expect(world.enemy.actionLedger?.[0]?.directiveIds).not.toContain(reissued.id);
    expect(pendingOrdersOf(world)?.[0]?.directiveIds).toEqual([reissued.id]);
  });

  it('hand-issued cancel-watch removes only exact sourceRef+fromDay and queues one report', () => {
    const world = enemyWorld();
    world.scheduleOverrides.bez = [
      { fromDay: 1, toDay: 9, from: 960, to: 1140, venue: 'square', source: 'enemy',
        sourceRef: 'order:watch:d0:bez' },
      { fromDay: 2, toDay: 10, from: 960, to: 1140, venue: 'square', source: 'enemy',
        sourceRef: 'order:watch:d0:bez' },
      { fromDay: 1, toDay: 9, from: 960, to: 1140, venue: 'backroom', source: 'enemy',
        sourceRef: 'order:watch:d0:other' },
      { fromDay: 1, toDay: 8, from: 960, to: 1200, venue: 'square', source: 'player',
        sourceRef: 'posting:bez' },
    ];
    const brief: DirectiveBrief = {
      mission: { kind: 'learn', target: { kind: 'venue', id: 'backroom' } },
      priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 15, until: 180 }, report: 'outcome', reportBy: null,
      purpose: null, application: { kind: 'cancel-watch', district: 'd0', guard: 'bez',
        venue: 'backroom', startDay: 1 },
    };
    const record = issueDirectiveRecord(world, {
      principal: 'enemy', principalId: 'ada', recipient: 'bez',
      handoff: { outboundVia: [], reportVia: [] }, brief,
      correlation: { kind: 'enemy-order', orderKey: 'cancel:watch:d0:bez', leadFeatureId: null,
        sourceRef: 'order:watch:d0:bez' }, tick: 0, cause: null,
    });
    world.enemy.pendingOrders = [{ key: 'cancel:watch:d0:bez', issuedDay: 0,
      reconsiderAfterDay: 8, directiveIds: [record.id] }];
    deliverOrder(world, record);
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    attemptDirective(world, record.id, { venue: 'square', members: ['bez', 'cyn'] },
      due, STANDARD_RULES);
    expect(world.scheduleOverrides.bez?.map((row) => [row.sourceRef, row.fromDay])).toEqual([
      ['order:watch:d0:bez', 2], ['order:watch:d0:other', 1], ['posting:bez', 1],
    ]);
    const reports = world.network.directiveState!.messages.filter((message) =>
      message.payload.kind === 'directive-report' && message.payload.directiveId === record.id);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.payload).toMatchObject({ enemyAction: {
      kind: 'watch-cancelled', guard: 'bez', venue: 'backroom', scheduleStartDay: 1,
    } });
    expect(world.enemy.actionLedger).toBeUndefined();
    expect(world.enemy.watchedDistricts).toEqual([]);
  });

  it('interrogation never messages or overrides the target and asks only the exact co-present target', () => {
    const world = enemyWorld();
    applyEnemyDecision(world, decisionFor('interrogation'));
    const record = recordFor(world);
    expect(messageFor(world, record).route.at(-1)).toBe('bez');
    expect(messageFor(world, record).route).not.toContain('dov');
    deliverOrder(world, record);
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    attemptDirective(world, record.id, { venue: 'square', members: ['bez', 'cyn'] },
      due, STANDARD_RULES);
    expect(world.scheduleOverrides.dov).toBeUndefined();
    expect(world.inquiries.bez?.[0]?.addressee).toBe('dov');
    const separated = collectCircleIntents(world,
      { venue: 'square', members: ['bez', 'cyn'] }, due + 15, STANDARD_RULES, [], new Set());
    expect(realizeCircleIntents(world, separated, due + 15, STANDARD_RULES).askings).toEqual([]);
    expect(world.network.directiveState!.messages.filter((message) =>
      message.payload.kind === 'directive-report')).toHaveLength(0);
    const together = collectCircleIntents(world,
      { venue: 'square', members: ['bez', 'dov'] }, due + 30, STANDARD_RULES, [], new Set());
    expect(realizeCircleIntents(world, together, due + 30, STANDARD_RULES).askings).toEqual([
      expect.objectContaining({ speaker: 'bez', addressedTo: 'dov' }),
    ]);
    expect(world.network.directiveState!.messages.filter((message) =>
      message.payload.kind === 'directive-report')).toHaveLength(1);

    const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const issueSource = stripComments(readFileSync(join(process.cwd(), 'src/sim/counterintel.ts'), 'utf8'));
    const executionSource = stripComments(readFileSync(
      join(process.cwd(), 'src/sim/directives/execution.ts'), 'utf8'));
    expect(issueSource).not.toMatch(/recipient\s*:\s*(?:order|input\.order)\.target/);
    expect(executionSource).not.toMatch(/scheduleOverrides\s*\[\s*application\.target\s*\]/);
  });

  it('mirrors the normalized player-post and enemy-watch transport/evaluator/execution timeline', () => {
    const player = enemyWorld();
    enrollPlayer(player, { home: 'square' });
    player.network.assets.push({ id: 'cyn', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    player.intel.informants.push({ id: 'cyn', assignedVenue: null });
    player.npcs.cyn!.edges.push({ to: 'you', kind: 'friend', trust: 0.9 });
    for (const id of ['ada', 'bez']) {
      player.npcs[id]!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    }
    const postBrief: DirectiveBrief = {
      mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
      priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      guidance: [{ kind: 'expected-presence', person: 'cyn', venue: 'square', at: 960 }],
      active: { from: 960, until: 7 * TICKS_PER_DAY + 1139 },
      report: 'outcome', reportBy: null, purpose: null,
    };
    applyDirective(player, 'cyn', { outboundVia: [], reportVia: [] }, postBrief, 0,
      { kind: 'posting', venue: 'square' });
    const playerRecord = recordFor(player);

    const enemy = enemyWorld();
    enemy.network.enemyAssets = [
      { id: 'cyn', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
    ];
    enemy.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    applyEnemyDecision(enemy, { day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'd0', posts: [{ guard: 'cyn', venue: 'square' }], startDay: 0 }] });
    const enemyRecord = recordFor(enemy);
    const withoutApplication = (brief: DirectiveBrief): DirectiveBrief => {
      const normalized = structuredClone(brief);
      delete normalized.application;
      return normalized;
    };
    expect(withoutApplication(playerRecord.authored.brief))
      .toEqual(withoutApplication(enemyRecord.authored.brief));
    expect(trustBetween(player, 'cyn', 'you')).toBe(trustBetween(enemy, 'cyn', 'ada'));
    expect(player.npcs.cyn!.schedule).toEqual(enemy.npcs.cyn!.schedule);

    const timeline = (world: WorldState, record: DirectiveRecord, recipient: string,
      operational: () => boolean) => {
      const rows: {
        received: boolean;
        commitment: string | null;
        execution: string | null;
        dueOffset: number | null;
        operational: boolean;
      }[] = [{ received: false, commitment: null, execution: null, dueOffset: null,
        operational: operational() }];
      world.tick = 0;
      expect(realizeNetworkForward(world, messageFor(world, record).id,
        { venue: 'square', members: [record.principalId, recipient] }, 0,
        STANDARD_RULES)).not.toBeNull();
      rows.push({ received: true, commitment: record.decision!.commitment,
        execution: record.execution!.state,
        dueOffset: record.decision!.timing.actAt! - record.received!.version.brief.active.from,
        operational: operational() });
      const due = record.decision!.timing.actAt!;
      const base = Math.max(strictNextBeat(record.received!.tick),
        beatAtOrAfter(record.received!.version.brief.active.from));
      expect(due).toBe(base + CONVERSATION_BEAT);
      world.tick = due;
      markDirectiveDue(world, record.id, due);
      rows.push({ received: true, commitment: record.decision!.commitment,
        execution: record.execution!.state, dueOffset: due - record.received!.version.brief.active.from,
        operational: operational() });
      attemptDirective(world, record.id, { venue: 'square', members: [recipient, 'dov'] },
        due, STANDARD_RULES);
      rows.push({ received: true, commitment: record.decision!.commitment,
        execution: record.execution!.state, dueOffset: due - record.received!.version.brief.active.from,
        operational: operational() });
      return rows;
    };
    expect(timeline(player, playerRecord, 'cyn', () =>
      player.scheduleOverrides.cyn?.some((row) => row.sourceRef === 'posting:cyn') ?? false))
      .toEqual(timeline(enemy, enemyRecord, 'cyn', () =>
        enemy.scheduleOverrides.cyn?.some((row) => row.sourceRef === 'order:watch:d0:cyn') ?? false));
  });
});
