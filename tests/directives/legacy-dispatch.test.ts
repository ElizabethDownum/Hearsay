import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAssignInformant, applyDirective } from '../../src/sim/actions';
import { applicationOf, correlationOf, type DirectiveBrief } from '../../src/sim/directives/types';
import { projectBrief } from '../../src/sim/directives/mutation';
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
    .map((npc) => ({ ...npc, edges: npc.edges.filter((edge) => kept.has(edge.to)) }));
  const world = buildWorld(fixture, 'legacy-dispatch', STANDARD_RULES);
  enrollPlayer(world, { home: 'square' });
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.intel.informants.push({ id: 'ada', assignedVenue: null });
  return world;
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
});

describe('legacy courier loop enforcement', () => {
  const productionHasLegacyCall = (source: string): boolean =>
    /\bdeliverCouriers\s*\(/.test(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));

  it('FIRES for an injected production call and pins phases.ts free of the old loop', () => {
    const path = join(process.cwd(), 'src/sim/phases.ts');
    const source = readFileSync(path, 'utf8');
    expect(productionHasLegacyCall(`${source}\nconst injected = deliverCouriers(world, tick, rules);`)).toBe(true);
    expect(productionHasLegacyCall(source)).toBe(false);
  });
});
