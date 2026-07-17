import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { buildDirectiveReport, queueDirectiveReport } from '../../src/sim/directives/reports';
import { ensureDirectiveState } from '../../src/sim/directives/state';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type {
  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord,
} from '../../src/sim/directives/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'directive-reports', STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  const record: DirectiveRecord = {
    id: 'd0', principal: 'player', principalId: 'you', recipient: 'ada', issuedAt: 0,
    handoff: { outboundVia: [], reportVia: ['bez'] },
    authored: { id: 'v0', parent: null, directiveId: 'd0', brief: {
      mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
      priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: null,
    }, claimedIssuer: 'you', replyRoute: ['bez', 'you'], changedBy: null, changes: [] },
    received: null, decision: null, execution: null, receivedReports: [],
  };
  record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'you', messageId: 'm0' };
  const profile: DirectiveDecisionProfile = {
    interpretation: record.authored.brief.mission, commitment: 'attempt', initiative: 'literal',
    risk: 'measured', method: { kind: 'observe', target: { kind: 'person', id: 'bez' } },
    timing: { actAt: 15, reportAt: 30 },
    disclosure: { outcome: true, reason: true, evidence: true, source: true, uncertainty: true },
    candor: 'ordinary',
  };
  const result: DirectiveExecutionResult = {
    outcome: 'observed', reason: 'shared venue',
    evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }],
    source: 'ada', uncertainty: 'low', reportedClaim: null,
    factRefs: [{ asset: 'ada', factIndex: 0 }],
  };
  return { world, record, profile, result };
}

describe('directive reports', () => {
  it('applies disclosure first and candor last without inventing evidence', () => {
    const { world, record, profile, result } = fixture();
    const guarded = buildDirectiveReport(world, record, { ...profile, candor: 'guarded' }, result,
      STANDARD_RULES);
    expect(guarded.report).toMatchObject({ outcome: 'observed', source: null,
      evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }] });
    expect(guarded.factRefs).toEqual([]);
    const omitted = buildDirectiveReport(world, record, { ...profile, candor: 'omissive' }, result,
      STANDARD_RULES);
    expect(omitted.report).toMatchObject({ outcome: 'observed', reason: null, evidence: null });
    const doctored = buildDirectiveReport(world, record, { ...profile, candor: 'doctored' }, result,
      STANDARD_RULES);
    expect(doctored.report.outcome).toBe('observed');
    expect(doctored.report.reason).toBeNull();
    expect(doctored.factRefs).toEqual([]);
  });

  it('uses only the received replyRoute after pristine handoff mutation and null means silence', () => {
    const { world, record, profile, result } = fixture();
    record.handoff.reportVia = ['cyn'];
    queueDirectiveReport(world, record, profile, result, STANDARD_RULES, 15);
    expect(world.network.directiveState!.messages[0]).toMatchObject({
      origin: 'ada', holder: 'ada', route: ['bez', 'you'], availableAfter: 30,
    });

    const silent = fixture();
    silent.record.received!.version.replyRoute = null;
    queueDirectiveReport(silent.world, silent.record, silent.profile, silent.result,
      STANDARD_RULES, 15);
    expect(silent.world.network.directiveState).toBeUndefined();
  });

  it('applies reporter traits once, with audience turncoat doctoring only for doctored candor', () => {
    const { world, record, profile, result } = fixture();
    world.npcs.ada!.traits = ['exaggerator'];
    world.network.assets[0]!.turned = true;
    result.reportedClaim = { id: 'c0', family: 'f0', parent: null, subject: 'bez', predicate: 'stole',
      object: null, count: 2, severity: 3, place: null, attribution: SOMEONE };
    const ordinary = buildDirectiveReport(world, record, profile, result, STANDARD_RULES);
    const doctored = buildDirectiveReport(world, record, { ...profile, candor: 'doctored' }, result,
      STANDARD_RULES);
    const ordinaryClaim = ordinary.report.evidence?.find((row) => row.kind === 'claim');
    const doctoredClaim = doctored.report.evidence?.find((row) => row.kind === 'claim');
    expect(ordinaryClaim).toMatchObject({ reported: { count: 4, severity: 4 } });
    expect(doctoredClaim).toMatchObject({ reported: { count: 2, severity: 3 } });
  });

  it('stays absent across separation, advances hop by hop, and mutates the ledger only at final receipt', () => {
    const { world, record, profile, result } = fixture();
    ensureDirectiveState(world).records.push(record);
    const id = queueDirectiveReport(world, record, profile, result, STANDARD_RULES, 15)!;
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['ada', 'cyn'] },
      30, STANDARD_RULES)).toBeNull();
    expect(record.receivedReports).toEqual([]);
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['ada', 'bez'] },
      30, STANDARD_RULES)).not.toBeNull();
    expect(record.receivedReports).toEqual([]);
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['bez', 'you'] },
      45, STANDARD_RULES)).not.toBeNull();
    expect(record.receivedReports).toEqual([
      { receivedAt: 45, via: 'bez', report: expect.objectContaining({ outcome: 'observed' }) },
    ]);
  });

  it('mirrors audience-specific turncoat doctoring and keeps loyal guarded claim evidence resolvable', () => {
    const player = fixture();
    player.world.network.assets[0]!.turned = true;
    player.result.reportedClaim = { id: 'c0', family: 'f0', parent: null, subject: 'bez',
      predicate: 'stole', object: null, count: 4, severity: 4, place: null, attribution: SOMEONE };
    const playerCopy = buildDirectiveReport(player.world, player.record,
      { ...player.profile, candor: 'doctored' }, player.result, STANDARD_RULES);

    const enemy = fixture();
    enemy.record.principal = 'enemy';
    enemy.world.network.enemyAssets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0,
      strikes: 0, facts: [], turned: true });
    enemy.result.reportedClaim = structuredClone(player.result.reportedClaim);
    const enemyCopy = buildDirectiveReport(enemy.world, enemy.record,
      { ...enemy.profile, candor: 'doctored' }, enemy.result, STANDARD_RULES);
    expect(enemyCopy.report.evidence).toEqual(playerCopy.report.evidence);

    const guarded = buildDirectiveReport(enemy.world, enemy.record,
      { ...enemy.profile, candor: 'guarded' }, enemy.result, STANDARD_RULES);
    expect(guarded.report.source).toBeNull();
    expect(guarded.report.evidence).toEqual([
      expect.objectContaining({ kind: 'observation' }),
      expect.objectContaining({ kind: 'claim', claimId: 'c0' }),
    ]);
  });

  it('direct and relayed twins apply the reporter transform exactly once before relay candor', () => {
    const direct = fixture();
    direct.world.npcs.ada!.traits = ['exaggerator'];
    direct.result.reportedClaim = { id: 'c0', family: 'f0', parent: null, subject: 'bez',
      predicate: 'stole', object: null, count: 2, severity: 3, place: null, attribution: SOMEONE };
    direct.record.received!.version.replyRoute = ['you'];
    ensureDirectiveState(direct.world).records.push(direct.record);
    const directId = queueDirectiveReport(direct.world, direct.record, direct.profile,
      direct.result, STANDARD_RULES, 15)!;
    const directSpeech = realizeNetworkForward(direct.world, directId,
      { venue: 'square', members: ['ada', 'you'] }, 30, STANDARD_RULES)!;

    const relayed = fixture();
    relayed.world.npcs.ada!.traits = ['exaggerator'];
    relayed.world.npcs.bez!.traits = ['literalist'];
    relayed.result.reportedClaim = structuredClone(direct.result.reportedClaim);
    ensureDirectiveState(relayed.world).records.push(relayed.record);
    const relayedId = queueDirectiveReport(relayed.world, relayed.record, relayed.profile,
      relayed.result, STANDARD_RULES, 15)!;
    realizeNetworkForward(relayed.world, relayedId,
      { venue: 'square', members: ['ada', 'bez'] }, 30, STANDARD_RULES);
    const relayedSpeech = realizeNetworkForward(relayed.world, relayedId,
      { venue: 'square', members: ['bez', 'you'] }, 45, STANDARD_RULES)!;
    expect(relayedSpeech.spoken).toMatchObject({ kind: 'directive-report',
      report: directSpeech.spoken.kind === 'directive-report' ? directSpeech.spoken.report : {} });
  });
});
