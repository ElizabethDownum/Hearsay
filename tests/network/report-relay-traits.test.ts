import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { miniTown } from '../sim/helpers/minitown';
import { traitContextOf } from '../../src/sim/rumors/traits';
import type { DirectiveBrief } from '../../src/sim/directives/types';
import type { WorldState } from '../../src/sim/types';

/**
 * R44 (Astra I10): a directive report relayed through another asset reaches the player in that
 * asset's words. The enclosed claim goes through the relay's traits exactly as the relay's own
 * gossip of the same claim does; before, only the envelope was projected and the claim arrived as
 * the originating asset saw it.
 */
const RULES = STANDARD_RULES;
const CLAIM = { subject: 'cyn', predicate: 'stole', object: null, count: 2, severity: 3 as const, place: null, attribution: 'cyn' };

/** Literal ada executes and reports through bez (traits under test) to the player; runs to 61. */
function relayRun(seed: string, traits: string[], rivals?: string[]): WorldState {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez', 'cyn'].includes(npc.id));
  for (const npc of fixture.npcs) {
    npc.traits = npc.id === 'bez' ? traits as typeof npc.traits : ['literalist'];
    npc.edges = npc.edges.filter((edge) => ['ada', 'bez', 'cyn'].includes(edge.to));
    if (npc.id === 'bez' && rivals) npc.rivals = rivals;
  }
    const w = buildWorld(fixture, seed, RULES);
    enrollPlayer(w, { home: 'square' });
    for (const id of ['ada', 'bez']) {
      w.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    }
    const brief: DirectiveBrief = {
      mission: { kind: 'shape', operation: 'spread', payload: { family: null, parent: null, claim: { ...CLAIM } },
        audience: { kind: 'person', id: 'cyn' }, redirectTo: null },
      priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'detailed', guidance: [],
      active: { from: 0, until: 120 }, report: 'full', reportBy: 15, purpose: null,
    };
    const action = { kind: 'directive', tick: 0, recipient: 'ada',
      handoff: { outboundVia: [], reportVia: ['bez'] }, brief } as Action;
    runLogOn(w, RULES, [action], 61);
    return w;
}

function hopsAndGossip(w: WorldState) {
    const hops = w.chronicle.flatMap((row) => {
      if (row.kind !== 'network-speech' || row.spoken.kind !== 'directive-report') return [];
      const item = row.spoken.report.evidence?.find((entry) => entry.kind === 'claim');
      return item?.kind === 'claim' ? [{ speaker: row.speaker, to: row.addressedTo, claim: item.reported }] : [];
    });
    const gossip = w.chronicle.flatMap((row) =>
      row.kind === 'telling' && row.speaker === 'bez' ? [w.claims[row.claimId]!] : []);
    return { hops, gossip };
}

describe('a relayed directive report is retold in the relay\'s mouth (R44)', () => {
  it('an exaggerating relay inflates the enclosed claim as its own gossip does', () => {
    const { hops, gossip } = hopsAndGossip(relayRun('r44-report-relay', ['exaggerator']));
    expect(hops.map((hop) => [hop.speaker, hop.to])).toEqual([['ada', 'bez'], ['bez', 'you']]);
    expect(hops[0]!.claim).toMatchObject({ count: 2, severity: 3 });   // the literal origin, unchanged
    expect(gossip.length).toBeGreaterThan(0);
    expect(hops[1]!.claim).toMatchObject({ count: gossip[0]!.count, severity: gossip[0]!.severity });
    expect(hops[1]!.claim).toMatchObject({ count: 4, severity: 4 });   // non-vacuous: bez inflated it
  });

  // R44-1 (R44 review I1): the relay's claim context is its gossip context, so a partisan relay
  // reads the subject's faction exactly as its gossip does.
  it('a partisan relay moves severity exactly as its own gossip does', () => {
    const { hops, gossip } = hopsAndGossip(relayRun('r44-report-relay', ['partisan']));
    expect(gossip.length).toBeGreaterThan(0);
    expect(gossip[0]!.severity).not.toBe(3);                          // non-vacuous: partisan fired
    expect(hops[1]!.claim).toMatchObject({ severity: gossip[0]!.severity, count: gossip[0]!.count });
  });

  // R44-1 (R44 review I2): the transport caller resolves the enclosed claim's REAL family.
  it('an objectifying relay picks the same grudge name as its gossip (real family, not claim id)', () => {
    const w = relayRun('r44-report-relay', ['objectifier'], ['r1', 'r2', 'r3']);
    const { hops, gossip } = hopsAndGossip(w);
    expect(gossip.length).toBeGreaterThan(0);
    expect(gossip[0]!.object).not.toBeNull();
    expect(hops[1]!.claim.object).toBe(gossip[0]!.object);
    const item = w.chronicle.flatMap((row) => row.kind === 'network-speech' && row.speaker === 'bez'
      && row.spoken.kind === 'directive-report' ? row.spoken.report.evidence ?? [] : [])
      .find((entry) => entry.kind === 'claim')!;
    if (item.kind !== 'claim') throw new Error('no enclosed claim');
    const byId = RULES.traits.objectifier!.transform(
      { ...w.claims[item.claimId]!, family: item.claimId }, traitContextOf(w.npcs.bez!, w));
    expect(byId.object).not.toBe(gossip[0]!.object);                  // non-vacuous: id would differ
  });
});
