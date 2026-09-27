import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { miniTown } from '../sim/helpers/minitown';
import type { DirectiveBrief } from '../../src/sim/directives/types';

/**
 * R44 (Astra I10): a directive report relayed through another asset reaches the player in that
 * asset's words. The enclosed claim goes through the relay's traits exactly as the relay's own
 * gossip of the same claim does; before, only the envelope was projected and the claim arrived as
 * the originating asset saw it.
 */
const RULES = STANDARD_RULES;
const CLAIM = { subject: 'cyn', predicate: 'stole', object: null, count: 2, severity: 3 as const, place: null, attribution: 'cyn' };

describe('a relayed directive report is retold in the relay\'s mouth (R44)', () => {
  it('an exaggerating relay inflates the enclosed claim as its own gossip does', () => {
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez', 'cyn'].includes(npc.id));
    for (const npc of fixture.npcs) {
      npc.traits = npc.id === 'bez' ? ['exaggerator'] : ['literalist'];
      npc.edges = npc.edges.filter((edge) => ['ada', 'bez', 'cyn'].includes(edge.to));
    }
    const w = buildWorld(fixture, 'r44-report-relay', RULES);
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

    const hops = w.chronicle.flatMap((row) => {
      if (row.kind !== 'network-speech' || row.spoken.kind !== 'directive-report') return [];
      const item = row.spoken.report.evidence?.find((entry) => entry.kind === 'claim');
      return item?.kind === 'claim' ? [{ speaker: row.speaker, to: row.addressedTo, claim: item.reported }] : [];
    });
    const gossip = w.chronicle.flatMap((row) =>
      row.kind === 'telling' && row.speaker === 'bez' ? [w.claims[row.claimId]!] : []);

    expect(hops.map((hop) => [hop.speaker, hop.to])).toEqual([['ada', 'bez'], ['bez', 'you']]);
    expect(hops[0]!.claim).toMatchObject({ count: 2, severity: 3 });   // the literal origin, unchanged
    expect(gossip.length).toBeGreaterThan(0);
    expect(hops[1]!.claim).toMatchObject({ count: gossip[0]!.count, severity: gossip[0]!.severity });
    expect(hops[1]!.claim).toMatchObject({ count: 4, severity: 4 });   // non-vacuous: bez inflated it
  });
});
