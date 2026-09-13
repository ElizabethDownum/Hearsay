import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { initializeDirectiveReceipt } from '../../src/sim/directives/execution';
import { buildDirectiveReport, queueDirectiveReport } from '../../src/sim/directives/reports';
import { ensureDirectiveState, allocateNetworkMessage } from '../../src/sim/directives/state';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord } from '../../src/sim/directives/types';
import { hashWorld } from '../../src/sim/hash';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { runUntil } from '../../src/sim/step';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'outcome-history', RULES);
  enrollPlayer(world, { home: 'square' });
  world.npcs.ada!.traits = ['exaggerator'];
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  const record: DirectiveRecord = {
    id: 'd0', principal: 'player', principalId: 'you', recipient: 'ada', issuedAt: 0,
    handoff: { outboundVia: [], reportVia: [] },
    authored: { id: 'v0', parent: null, directiveId: 'd0', brief: {
      mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
      priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: null,
    }, claimedIssuer: 'you', replyRoute: ['you'], changedBy: null, changes: [] },
    received: null, decision: null, execution: null, receivedReports: [],
  };
  record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'you', messageId: 'm-original' };
  ensureDirectiveState(world).records.push(record);
  const profile: DirectiveDecisionProfile = {
    interpretation: record.authored.brief.mission, commitment: 'attempt', initiative: 'literal',
    risk: 'measured', method: { kind: 'observe', target: { kind: 'person', id: 'bez' } },
    timing: { actAt: 15, reportAt: 30 },
    disclosure: { outcome: true, reason: true, evidence: true, source: true, uncertainty: true },
    candor: 'ordinary',
  };
  const result: DirectiveExecutionResult = {
    outcome: 'answer heard', reason: 'heard the answer in person',
    evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }],
    source: 'ada', uncertainty: 'low',
    reportedClaim: { id: 'c-heard', family: 'f-heard', parent: null, subject: 'bez', predicate: 'stole',
      object: null, count: 2, severity: 3, place: null, attribution: SOMEONE },
    factRefs: [{ asset: 'ada', factIndex: 0 }],
    enemyAction: { kind: 'watch-worked', subject: null, about: null, district: 'd0',
      scheduleStartDay: 0, guard: 'ada', venue: 'square', workedDay: 0, occurredAt: 15 },
  };
  return { world, record, profile, result };
}

describe('private directive outcomes survive the report channel', () => {
  it.each(['ordinary', 'guarded', 'omissive', 'doctored'] as const)(
    'retains the local result before %s candor and reporter traits', (candor) => {
      const { world, record, profile, result } = fixture();
      world.network.assets[0]!.turned = candor === 'doctored';
      profile.candor = candor;
      const expected = structuredClone(result);
      const id = queueDirectiveReport(world, record, profile, result, RULES, 15);
      expect(id).not.toBeNull();
      expect(record.outcomes).toEqual([{ tick: 15, result: expected, reportMessageId: id }]);
      const packet = world.network.directiveState!.messages.find((message) => message.id === id)!;
      expect(packet.payload.kind).toBe('directive-report');
      if (packet.payload.kind !== 'directive-report') throw new Error('report fixture');
      if (candor === 'ordinary') expect(packet.payload.report.evidence).toContainEqual({
        kind: 'claim', claimId: 'c-heard', reported: expect.objectContaining({ count: 4, severity: 4 }),
      });
      if (candor === 'guarded') expect(packet.payload.report.source).toBeNull();
      if (candor === 'omissive' || candor === 'doctored') {
        expect(packet.payload.report.reason).toBeNull();
        expect(packet.payload.enemyAction).toBeNull();
      }
    });

  it('retains a no-route outcome without allocating a report or message id', () => {
    const { world, record, profile, result } = fixture();
    record.received!.version.replyRoute = null;
    const before = world.network.directiveState!.nextMessage;
    expect(queueDirectiveReport(world, record, profile, result, RULES, 15)).toBeNull();
    expect(record.outcomes).toEqual([{ tick: 15, result, reportMessageId: null }]);
    expect(world.network.directiveState!.messages).toEqual([]);
    expect(world.network.directiveState!.nextMessage).toBe(before);
  });

  it('retains all-omitted outcomes without changing the omission policy', () => {
    const { world, record, profile, result } = fixture();
    profile.disclosure = { outcome: false, reason: false, evidence: false, source: false, uncertainty: false };
    expect(queueDirectiveReport(world, record, profile, result, RULES, 15)).toBeNull();
    expect(record.outcomes).toEqual([{ tick: 15, result, reportMessageId: null }]);
    expect(world.network.directiveState!.messages).toEqual([]);
  });

  it('building a spoken projection alone remains pure and creates no history', () => {
    const { world, record, profile, result } = fixture();
    const before = hashWorld(world);
    buildDirectiveReport(world, record, profile, result, RULES);
    expect(hashWorld(world)).toBe(before);
    expect(Object.hasOwn(record, 'outcomes')).toBe(false);
  });

  it('keeps a deep snapshot, including claim, physical action, evidence and fact references', () => {
    const { world, record, profile, result } = fixture();
    const expected = structuredClone(result);
    queueDirectiveReport(world, record, profile, result, RULES, 15);
    Object.assign(result.reportedClaim!, { count: 99 }); // exercise a runtime alias despite readonly types
    result.evidence[0]!.text = 'changed';
    result.factRefs[0]!.factIndex = 99;
    result.enemyAction!.venue = 'backroom';
    expect(record.outcomes?.[0]?.result).toEqual(expected);
    Object.assign(record.outcomes![0]!.result.reportedClaim!, { count: 7 });
    const packet = world.network.directiveState!.messages[0]!;
    expect(JSON.stringify(packet.payload)).not.toContain('"count":7');
  });

  it('links each repeated result occurrence to its own actual report packet', () => {
    const { world, record, profile, result } = fixture();
    const first = queueDirectiveReport(world, record, profile, result, RULES, 15);
    const second = queueDirectiveReport(world, record, profile, result, RULES, 30);
    expect(first).not.toBe(second);
    expect(record.outcomes).toEqual([
      { tick: 15, result, reportMessageId: first }, { tick: 30, result, reportMessageId: second },
    ]);
  });

  it('leaves rejected route validation atomic', () => {
    const { world, record, profile, result } = fixture();
    record.received!.version.replyRoute = ['ada'];
    const before = hashWorld(world);
    expect(() => queueDirectiveReport(world, record, profile, result, RULES, 15)).toThrow('self-hop');
    expect(hashWorld(world)).toBe(before);
  });

  it('does not add the private history to audible speech or destination receipt data', () => {
    const { world, record, profile, result } = fixture();
    const id = queueDirectiveReport(world, record, profile, result, RULES, 15)!;
    const speech = realizeNetworkForward(world, id,
      { venue: 'square', members: ['ada', 'you'] }, 30, RULES)!;
    expect(speech).not.toBeNull();
    expect(JSON.stringify(speech.spoken)).not.toContain('reportMessageId');
    expect(JSON.stringify(speech.spoken)).not.toContain('outcomes');
    expect(record.receivedReports).toHaveLength(1);
    expect(Object.keys(record.receivedReports[0]!).sort()).toEqual(['receivedAt', 'report', 'via']);
    expect(record.outcomes?.[0]?.reportMessageId).toBe(id);
  });

  it.each(['none', 'full'] as const)('records direct-player refusal even with report:%s', (policy) => {
    const { world, record, profile } = fixture();
    record.received!.version.brief.report = policy;
    profile.commitment = 'refuse';
    profile.timing.actAt = null;
    const original = allocateNetworkMessage(world, 'player', 'you', ['ada'],
      { kind: 'directive', version: record.received!.version }, 0, 120,
      { kind: 'player-action', action: 'directive', tick: 0 });
    const message = world.network.directiveState!.messages.find((row) => row.id === original)!;
    initializeDirectiveReceipt(world, record, profile, message, 0, RULES);
    const response = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive-response')!;
    expect(record.outcomes ?? []).toHaveLength(1);
    expect(record.outcomes?.[0]).toMatchObject({ tick: 0, reportMessageId: response.id,
      result: { outcome: 'refused', reason: 'the recipient refused the received brief' } });
    expect(response.payload).toMatchObject({ kind: 'directive-response', response: 'refuse',
      report: policy === 'none' ? null : expect.objectContaining({ outcome: 'refused' }) });
    expect(record.execution?.state).toBe('aborted');
  });

  it('records no false execution result for a direct acceptance response', () => {
    const { world, record, profile } = fixture();
    const original = allocateNetworkMessage(world, 'player', 'you', ['ada'],
      { kind: 'directive', version: record.received!.version }, 0, 120,
      { kind: 'player-action', action: 'directive', tick: 0 });
    const message = world.network.directiveState!.messages.find((row) => row.id === original)!;
    initializeDirectiveReceipt(world, record, profile, message, 0, RULES);
    expect(Object.hasOwn(record, 'outcomes')).toBe(false);
    expect(record.execution?.state).toBe('pending');
  });

  it('retains every real worked night after expiry even when the authored watch requests no reports', () => {
    const town = miniTown();
    town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of town.npcs) {
      npc.traits = ['literalist'];
      npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
    }
    const world = buildWorld(town, 'unreported-watch-history', RULES);
    world.network.spymaster = 'ada';
    world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
    applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
    const record = world.network.directiveState!.records[0]!;
    const message = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
    if (message.payload.kind !== 'directive') throw new Error('watch fixture');
    // A lawful staged report policy; keep the planner's actual self-presence guidance.
    record.authored.brief.report = 'none';
    message.payload.version.brief.report = 'none';
    expect(record.authored.brief.guidance.some((row) => row.kind === 'expected-presence')).toBe(true);
    const replay = structuredClone(world);
    runUntil(world, 1, RULES);
    expect(record.received).not.toBeNull();
    runUntil(world, 1440 + 1141, RULES);
    expect(record.execution?.workedDays).toContain(1);
    const first = structuredClone(record.outcomes);
    runUntil(world, record.received!.version.brief.active.until + 1, RULES);
    expect(record.execution?.state).toBe('aborted');
    expect(Object.hasOwn(record.execution!, 'workedDays')).toBe(false);
    const work = record.outcomes?.filter((row) => row.result.enemyAction?.kind === 'watch-worked') ?? [];
    expect(work.length).toBeGreaterThan(0);
    expect(new Set(work.map((row) => row.result.enemyAction!.workedDay)).size).toBe(work.length);
    expect(record.outcomes?.slice(0, first?.length)).toEqual(first);
    expect(record.outcomes?.at(-1)?.result.outcome).toBe('refused');
    expect(record.outcomes?.every((row) => row.reportMessageId === null)).toBe(true);
    expect(world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report')).toEqual([]);
    expect(world.enemy.actionLedger ?? []).toEqual([]);
    runUntil(replay, world.tick, RULES);
    expect(hashWorld(replay)).toBe(hashWorld(world));
  });
});
