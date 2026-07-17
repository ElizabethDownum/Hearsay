import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { circlesAt } from '../../src/sim/agents';
import { attemptDirective, markDirectiveDue } from '../../src/sim/directives/execution';
import { buildDirectiveReport, queueDirectiveReport } from '../../src/sim/directives/reports';
import { ensureDirectiveState, recordScrutiny } from '../../src/sim/directives/state';
import { queueNetworkMessage, realizeNetworkForward } from '../../src/sim/directives/transport';
import type {
  BriefVersion, DirectiveBrief, DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord,
} from '../../src/sim/directives/types';
import type { Principal } from '../../src/sim/network/types';
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

const CALLER_BRIEF: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
  priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
  guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: null,
};

const SHARED_CLAIM_RESULT: DirectiveExecutionResult = {
  outcome: 'story emitted', reason: 'same production result',
  evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }],
  source: 'ada', uncertainty: 'low',
  reportedClaim: { id: 'c-mirror', family: 'f-mirror', parent: null, subject: 'bez',
    predicate: 'stole', object: null, count: 8, severity: 5, place: null, attribution: SOMEONE },
  factRefs: [],
};

function callerWorld(seed: string, turnedAgainst: Principal | null) {
  const town = miniTown();
  const kept = new Set(['ada', 'bez', 'cyn']);
  town.npcs = town.npcs.filter((npc) => kept.has(npc.id)).map((npc) => ({
    ...npc,
    schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: 'square' }],
    edges: npc.edges.filter((edge) => kept.has(edge.to)),
  }));
  const world = buildWorld(town, seed, STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.network.spymaster = 'cyn';
  world.npcs.ada!.traits = ['literalist'];
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
    ...(turnedAgainst === 'player' ? { turned: true } : {}) });
  world.network.enemyAssets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
    ...(turnedAgainst === 'enemy' ? { turned: true } : {}) });
  return world;
}

function receiveThroughProduction(world: ReturnType<typeof callerWorld>, principal: Principal,
  directiveId: string): DirectiveRecord {
  const principalId = principal === 'player' ? 'you' : 'cyn';
  const version: BriefVersion = {
    id: `v-${directiveId}`, parent: null, directiveId, brief: structuredClone(CALLER_BRIEF),
    claimedIssuer: principalId, replyRoute: [principalId], changedBy: null, changes: [],
  };
  const record: DirectiveRecord = {
    id: directiveId, principal, principalId, recipient: 'ada', issuedAt: 0,
    handoff: { outboundVia: [], reportVia: [] }, authored: structuredClone(version),
    received: null, decision: null, execution: null, receivedReports: [],
  };
  ensureDirectiveState(world).records.push(record);
  const messageId = queueNetworkMessage(world, principal, principalId, ['ada'],
    { kind: 'directive', version }, 0, CALLER_BRIEF.active.until, null);
  const circle = circlesAt(world, 0).find((candidate) =>
    candidate.members.includes(principalId) && candidate.members.includes('ada'));
  expect(circle, `${principal} receipt fixture must be physically co-located`).toBeDefined();
  expect(realizeNetworkForward(world, messageId, circle!, 0, STANDARD_RULES)).not.toBeNull();
  return record;
}

function executeThroughProduction(world: ReturnType<typeof callerWorld>, records: DirectiveRecord[]): void {
  for (const record of [...records].sort((a, b) =>
    a.decision!.timing.actAt! - b.decision!.timing.actAt!)) {
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    const circle = circlesAt(world, due).find((candidate) => candidate.members.includes('ada'));
    expect(circle, `${record.principal} execution fixture must contain ada`).toBeDefined();
    attemptDirective(world, record.id, circle!, due, STANDARD_RULES);
    expect(record.execution?.state).toBe('completed');
  }
}

function claimEvidence(built: ReturnType<typeof buildDirectiveReport>) {
  return built.report.evidence?.find((row) => row.kind === 'claim');
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

  it.each([
    ['player', 'doctored', 'ordinary'],
    ['enemy', 'ordinary', 'doctored'],
  ] as const)('derives the inverse dual-roster report channels when turned against %s',
    (turnedAgainst, playerCandor, enemyCandor) => {
      const world = callerWorld(`directive-report-${turnedAgainst}`, turnedAgainst);
      const playerRecord = receiveThroughProduction(world, 'player', 'd-player');
      expect(playerRecord.decision?.candor).toBe(playerCandor);
      const enemyRecord = receiveThroughProduction(world, 'enemy', 'd-enemy');
      expect(enemyRecord.decision?.candor).toBe(enemyCandor);
      executeThroughProduction(world, [playerRecord, enemyRecord]);

      expect(playerRecord.decision?.candor).toBe(playerCandor);
      expect(enemyRecord.decision?.candor).toBe(enemyCandor);
      const playerCopy = buildDirectiveReport(world, playerRecord, playerRecord.decision!,
        SHARED_CLAIM_RESULT, STANDARD_RULES);
      const enemyCopy = buildDirectiveReport(world, enemyRecord, enemyRecord.decision!,
        SHARED_CLAIM_RESULT, STANDARD_RULES);
      const playerClaim = claimEvidence(playerCopy);
      const enemyClaim = claimEvidence(enemyCopy);
      const doctored = turnedAgainst === 'player' ? playerClaim : enemyClaim;
      const ordinary = turnedAgainst === 'player' ? enemyClaim : playerClaim;
      expect(ordinary).toMatchObject({ reported: { count: 8, severity: 5 } });
      expect(doctored).toMatchObject({ reported: { count: 4, severity: 4 } });
    });

  it('derives guarded candor for a genuinely loyal high-scrutiny reporter with resolvable claim evidence', () => {
    const world = callerWorld('directive-report-loyal-guarded', null);
    recordScrutiny(world, 'ada', 'you', 'confrontation', 0);
    recordScrutiny(world, 'ada', 'you', 'questioning', 0);
    const record = receiveThroughProduction(world, 'player', 'd-loyal');
    executeThroughProduction(world, [record]);

    expect(world.network.assets[0]!.turned).not.toBe(true);
    expect(world.network.enemyAssets[0]!.turned).not.toBe(true);
    expect(record.decision?.candor).toBe('guarded');
    const guarded = buildDirectiveReport(world, record, record.decision!, SHARED_CLAIM_RESULT,
      STANDARD_RULES);
    expect(guarded.report.source).toBeNull();
    expect(claimEvidence(guarded)).toMatchObject({ kind: 'claim', claimId: 'c-mirror',
      reported: { count: 8, severity: 5 } });
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
