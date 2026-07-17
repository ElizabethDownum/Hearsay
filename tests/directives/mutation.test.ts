import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { projectBrief, projectDirectiveReport } from '../../src/sim/directives/mutation';
import type {
  BriefVersion, DirectiveBrief, DirectiveReportPayload, EnemyActionReport,
} from '../../src/sim/directives/types';
import { queueNetworkMessage, realizeNetworkForward } from '../../src/sim/directives/transport';
import { ensureDirectiveState } from '../../src/sim/directives/state';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const brief: DirectiveBrief = {
  mission: { kind: 'shape', operation: 'spread', payload: {
    family: 'family-0', parent: null,
    claim: { subject: 'target', predicate: 'stole', object: null, count: 1,
      severity: 3, place: 'square', attribution: 'issuer' },
  }, audience: { kind: 'person', id: 'target' }, redirectTo: null },
  priority: 'important', authority: 'relationship', discretion: 'quiet', specificity: 'guided',
  guidance: [{ kind: 'expected-presence', person: 'target', venue: 'square', at: 15 }],
  active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: 'test purpose',
};

const version = (value = brief): BriefVersion => ({
  id: 'v0', parent: null, directiveId: 'd0', brief: value, claimedIssuer: 'issuer',
  replyRoute: ['issuer'], changedBy: null, changes: [],
});

const speaker = (traits: string[]) => ({
  id: 'relay', faction: 'none' as const, rivals: ['rival'],
  knownFactions: { relay: 'none' as const, rival: 'crown' as const, target: 'guild' as const }, traits,
});

describe('projectBrief', () => {
  it.each([
    ['exaggerator', 'routine', 'important', 'detailed', 4],
    ['minimizer', 'important', 'routine', 'guided', 2],
    ['numberer', 'important', 'important', 'detailed', 3],
  ] as const)('%s projects envelope and shape through the registered transform',
    (trait, inputPriority, priority, specificity, severity) => {
      const input = version({ ...brief, priority: inputPriority,
        specificity: trait === 'numberer' ? 'outcome-only' : brief.specificity });
      const output = projectBrief({ version: input, speaker: speaker([trait]), lastFrom: 'issuer',
        audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
      expect(output.retell).toBe('speak');
      expect(output.brief.priority).toBe(priority);
      expect(output.brief.specificity).toBe(specificity);
      expect(output.brief.mission.kind === 'shape'
        ? output.brief.mission.payload.claim.severity : null).toBe(severity);
    });

  it('relocator removes the first venue guidance; vaguener and name-dropper project only attribution', () => {
    const relocated = projectBrief({ version: version(), speaker: speaker(['relocator']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(relocated.brief.guidance).toEqual([]);
    const vague = projectBrief({ version: version(), speaker: speaker(['vaguener']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(vague.claimedIssuer).toBe('someone');
    const named = projectBrief({ version: version(), speaker: speaker(['name-dropper']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(named.claimedIssuer).toBe('rival');
  });

  it('literalist deep-copies byte-identically and returns sorted recursive change paths', () => {
    const literal = projectBrief({ version: version(), speaker: speaker(['literalist']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(literal.brief).toEqual(brief);
    expect(literal.brief).not.toBe(brief);
    expect(literal.changes).toEqual([]);
    const changed = projectBrief({ version: version(), speaker: speaker(['exaggerator', 'vaguener']),
      lastFrom: 'issuer', audience: 'player', turnedAgainstAudience: false,
      perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(changed.changes.map((row) => row.field)).toEqual([
      'brief.mission.payload.claim.attribution', 'brief.mission.payload.claim.count',
      'brief.mission.payload.claim.severity',
      'brief.specificity', 'claimedIssuer',
    ]);
  });

  it('skeptic requires two distinct lawful apparent sources only for voluntary retelling', () => {
    const one = projectBrief({ version: version(), speaker: speaker(['skeptic']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(one.retell).toBe('withhold');
    const two = projectBrief({ version: version(), speaker: speaker(['skeptic']), lastFrom: 'other',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0, mode: 'relay' }, STANDARD_RULES);
    expect(two.retell).toBe('speak');
    const privateRead = projectBrief({ version: version(), speaker: speaker(['skeptic']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: false, perceivedScrutiny: 0,
      mode: 'private-interpretation' }, STANDARD_RULES);
    expect(privateRead.retell).toBe('speak');
  });

  it('scrutiny suppresses conspicuous traits and turned mid scrutiny omits one guidance plus purpose', () => {
    const mid = projectBrief({ version: version(), speaker: speaker(['exaggerator', 'name-dropper']),
      lastFrom: 'issuer', audience: 'player', turnedAgainstAudience: true,
      perceivedScrutiny: 0.5, mode: 'relay' }, STANDARD_RULES);
    expect(mid.claimedIssuer).toBe('issuer');
    expect(mid.brief.priority).toBe('important');
    expect(mid.brief.purpose).toBeNull();
    expect(mid.brief.guidance).toEqual([]);
    const high = projectBrief({ version: version(), speaker: speaker(['exaggerator']), lastFrom: 'issuer',
      audience: 'player', turnedAgainstAudience: true, perceivedScrutiny: 0.7,
      mode: 'relay' }, STANDARD_RULES);
    expect(high.brief).toEqual(brief);
    expect(high.changes).toEqual([]);
  });

  it('mints exact v0 -> v1 -> v2 relay lineage with changedBy and sorted paths', () => {
    const world = buildWorld(miniTown(), 'mutation-lineage', STANDARD_RULES);
    enrollPlayer(world, { home: 'square' });
    world.npcs.ada!.traits = ['literalist'];
    world.npcs.bez!.traits = ['exaggerator'];
    world.npcs.cyn!.traits = ['minimizer'];
    const state = ensureDirectiveState(world);
    state.nextVersion = 1;
    const original = { ...version(), claimedIssuer: 'ada' } as BriefVersion;
    state.records.push({ id: 'd0', principal: 'player', principalId: 'you', recipient: 'dov',
      issuedAt: 0, handoff: { outboundVia: ['ada', 'bez', 'cyn'], reportVia: [] },
      authored: structuredClone(original), received: null, decision: null, execution: null,
      receivedReports: [] });
    const id = queueNetworkMessage(world, 'player', 'ada', ['bez', 'cyn', 'dov'],
      { kind: 'directive', version: original }, 0, null, null);
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['ada', 'bez'] },
      0, STANDARD_RULES)).not.toBeNull();
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['bez', 'cyn'] },
      15, STANDARD_RULES)).not.toBeNull();
    const afterFirst = world.network.directiveState!.messages[0]!.payload;
    expect(afterFirst.kind === 'directive' ? afterFirst.version : null)
      .toMatchObject({ id: 'v1', parent: 'v0', changedBy: 'bez' });
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['cyn', 'dov'] },
      30, STANDARD_RULES)).not.toBeNull();
    const afterSecond = world.network.directiveState!.messages[0]!.payload;
    expect(afterSecond.kind === 'directive' ? afterSecond.version : null)
      .toMatchObject({ id: 'v2', parent: 'v1', changedBy: 'cyn' });
    const paths = afterSecond.kind === 'directive'
      ? afterSecond.version.changes.map((row) => row.field) : [];
    expect(paths).toEqual([...paths].sort());
  });

  it('skips a colliding current version id instead of creating v0 parent v0 self-lineage', () => {
    const world = buildWorld(miniTown(), 'mutation-lineage-collision', STANDARD_RULES);
    enrollPlayer(world, { home: 'square' });
    world.npcs.ada!.traits = ['literalist'];
    world.npcs.bez!.traits = ['exaggerator'];
    const state = ensureDirectiveState(world);
    state.nextVersion = 0;
    const original = { ...version(), claimedIssuer: 'ada' } as BriefVersion;
    state.records.push({ id: 'd0', principal: 'player', principalId: 'you', recipient: 'cyn',
      issuedAt: 0, handoff: { outboundVia: ['ada', 'bez'], reportVia: [] },
      authored: structuredClone(original), received: null, decision: null, execution: null,
      receivedReports: [] });
    const id = queueNetworkMessage(world, 'player', 'you', ['ada', 'bez', 'cyn'], {
      kind: 'directive', version: original,
    }, 0, null, null);
    realizeNetworkForward(world, id, { venue: 'square', members: ['you', 'ada'] },
      0, STANDARD_RULES);
    realizeNetworkForward(world, id, { venue: 'square', members: ['ada', 'bez'] },
      15, STANDARD_RULES);
    realizeNetworkForward(world, id, { venue: 'square', members: ['bez', 'cyn'] },
      30, STANDARD_RULES);
    const payload = state.messages[0]!.payload;
    expect(payload.kind === 'directive' ? payload.version : null)
      .toMatchObject({ id: 'v1', parent: 'v0', changedBy: 'bez' });
    expect(payload.kind === 'directive' ? payload.version.id : null)
      .not.toBe(payload.kind === 'directive' ? payload.version.parent : null);
  });

  it('handler-report skeptics withhold one-source copies without allocation or hop processing', () => {
    const stage = (claimedIssuer: string) => {
      const world = buildWorld(miniTown(), `mutation-handler-skeptic-${claimedIssuer}`, STANDARD_RULES);
      enrollPlayer(world, { home: 'square' });
      world.npcs.ada!.traits = ['literalist'];
      world.npcs.bez!.traits = ['skeptic'];
      const state = ensureDirectiveState(world);
      const id = queueNetworkMessage(world, 'player', 'ada', ['bez', 'cyn'], {
        kind: 'handler-brief', sourceDirectiveId: 'd0',
        version: { ...version(), claimedIssuer },
      }, 0, null, null);
      realizeNetworkForward(world, id, { venue: 'square', members: ['ada', 'bez'] },
        0, STANDARD_RULES);
      return { world, state, id };
    };

    const one = stage('ada');
    expect(realizeNetworkForward(one.world, one.id, { venue: 'square', members: ['bez', 'cyn'] },
      15, STANDARD_RULES)).toBeNull();
    expect(one.state.nextVersion).toBe(0);
    expect(one.state.messages[0]).toMatchObject({
      holder: 'bez', nextHop: 1, processedRelayHops: [], deliveredAt: null,
    });

    const two = stage('cyn');
    expect(realizeNetworkForward(two.world, two.id, { venue: 'square', members: ['bez', 'cyn'] },
      15, STANDARD_RULES)).not.toBeNull();
    expect(two.state.nextVersion).toBe(0);
    expect(two.state.messages[0]).toMatchObject({
      holder: 'cyn', nextHop: 2, processedRelayHops: [1], deliveredAt: 15,
    });
  });

  it('a one-source skeptic relay withholds without allocating or processing the hop', () => {
    const world = buildWorld(miniTown(), 'mutation-skeptic', STANDARD_RULES);
    enrollPlayer(world, { home: 'square' });
    world.npcs.bez!.traits = ['skeptic'];
    const state = ensureDirectiveState(world);
    state.nextVersion = 1;
    const id = queueNetworkMessage(world, 'player', 'ada', ['bez', 'cyn'],
      { kind: 'directive', version: { ...version(), claimedIssuer: 'ada' } }, 0, null, null);
    realizeNetworkForward(world, id, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES);
    expect(realizeNetworkForward(world, id, { venue: 'square', members: ['bez', 'cyn'] },
      15, STANDARD_RULES)).toBeNull();
    expect(state.nextVersion).toBe(1);
    expect(state.messages[0]).toMatchObject({ holder: 'bez', nextHop: 1, processedRelayHops: [] });
  });
});

describe('projectDirectiveReport', () => {
  const report: DirectiveReportPayload = {
    outcome: 'done', reason: 'quietly',
    evidence: [
      { kind: 'observation', text: 'first' },
      { kind: 'observation', text: 'second' },
      { kind: 'observation', text: 'third' },
      { kind: 'observation', text: 'fourth' },
    ],
    source: 'issuer', uncertainty: 'medium',
  };
  const enemyAction: EnemyActionReport = {
    kind: 'watch-worked', subject: 'target', about: null, district: 'd0',
    scheduleStartDay: 1, guard: 'guard', venue: 'square', workedDay: 2, occurredAt: 30,
  };
  const factRefs = [{ asset: 'relay', factIndex: 1 }, { asset: 'issuer', factIndex: 2 }];
  const project = (traits: string[], turnedAgainstAudience = false, perceivedScrutiny = 0,
    value: DirectiveReportPayload = report) => projectDirectiveReport({
      report: value, enemyAction, factRefs, speaker: speaker(traits),
      turnedAgainstAudience, perceivedScrutiny,
    }, STANDARD_RULES);

  it('projects attribution and severity/count through the report claim seam without inventing evidence', () => {
    const attributed = projectDirectiveReport({
      report: { ...report, source: null }, enemyAction, factRefs,
      speaker: speaker(['attributor']), turnedAgainstAudience: false, perceivedScrutiny: 0,
    }, STANDARD_RULES);
    expect(attributed.report.source).toBe('rival');
    expect(attributed.factRefs).toEqual([]);
    expect(project(['vaguener']).report.source).toBe('someone');

    const smaller = project(['minimizer']);
    expect(smaller.report.uncertainty).toBe('low');
    expect(smaller.report.evidence).toEqual(report.evidence!.slice(0, 2));
    expect(smaller.report).toMatchObject({ outcome: 'done', reason: 'quietly' });
    const larger = project(['exaggerator']);
    expect(larger.report.uncertainty).toBe('medium');
    expect(larger.report.evidence).toEqual(report.evidence);
    for (const uncertainty of ['low', 'medium', 'high'] as const) {
      expect(project(['literalist'], false, 0, { ...report, uncertainty }).report.uncertainty)
        .toBe(uncertainty);
    }
  });

  it('keeps enemyAction byte-exact only for ordinary/guarded and strips it for omissive/doctored', () => {
    const ordinary = project(['literalist']);
    const guarded = project(['literalist'], false, 0.7);
    expect(ordinary.enemyAction).toEqual(enemyAction);
    expect(guarded.enemyAction).toEqual(enemyAction);
    expect(project(['literalist'], true, 0.5).enemyAction).toBeNull();
    expect(project(['literalist'], true, 0).enemyAction).toBeNull();
  });

  it('keeps factRefs only for ordinary candor with disclosed source and strips the whole list otherwise', () => {
    expect(project(['literalist']).factRefs).toEqual(factRefs);
    expect(project(['literalist'], false, 0.7).factRefs).toEqual([]);
    expect(project(['literalist'], true, 0.5).factRefs).toEqual([]);
    expect(project(['literalist'], true, 0).factRefs).toEqual([]);
    expect(project(['literalist'], false, 0, { ...report, source: null }).factRefs).toEqual([]);
  });
});
