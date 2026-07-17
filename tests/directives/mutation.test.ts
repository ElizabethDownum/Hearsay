import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { projectBrief } from '../../src/sim/directives/mutation';
import type { BriefVersion, DirectiveBrief } from '../../src/sim/directives/types';
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
