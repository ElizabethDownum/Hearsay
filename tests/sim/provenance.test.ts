import { ingest, freshness, apparentSourceOf } from '../../src/sim/rumors/propagation';
import { applyInject } from '../../src/sim/actions';
import { buildWorld } from '../../src/sim/world';
import { runUntil } from '../../src/sim/step';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';

const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
};

const claimWith = (base: Claim, attribution: Claim['attribution'], id: string): Claim =>
  ({ ...base, id, parent: base.id, attribution });

describe('apparent sources ("B only knows what attribution survived")', () => {
  it('vague attribution: the teller is the apparent source', () => {
    expect(apparentSourceOf({ tick: 0, speaker: 'osric', claim: { attribution: SOMEONE } as Claim }))
      .toBe('osric');
  });

  it('named attribution: the cited origin is the apparent source, not the teller', () => {
    expect(apparentSourceOf({ tick: 0, speaker: 'osric', claim: { attribution: 'jonet' } as Claim }))
      .toBe('jonet');
  });

  it('two tellers citing the SAME origin do not stack corroboration', () => {
    const world = buildWorld(TESTFORD, 'prov-1');
    const injected = applyInject(world, 'rafe', spec);
    const b = world.beliefs['rafe']![injected.family]!;
    ingest(world, 'rafe', { tick: at(0, 9), speaker: 'mara', claim: claimWith(injected, 'jonet', 'c8') }, true, STANDARD_RULES);
    const after1 = b.credence;
    expect(b.apparentSources).toEqual(['jonet']);
    ingest(world, 'rafe', { tick: at(0, 10), speaker: 'osric', claim: claimWith(injected, 'jonet', 'c9') }, true, STANDARD_RULES);
    expect(b.apparentSources).toEqual(['jonet']);   // same apparent origin — no stack
    expect(b.credence).toBe(after1);                 // no bump
    expect(b.heardAt).toBe(at(0, 9));                // no freshness refresh
    expect(b.timesHeard).toBe(3);                    // still counted as heard
  });

  it('MANUFACTURED CORROBORATION: different surviving attributions stack', () => {
    const world = buildWorld(TESTFORD, 'prov-2');
    const injected = applyInject(world, 'rafe', spec);
    const b = world.beliefs['rafe']![injected.family]!;
    ingest(world, 'rafe', { tick: at(0, 9), speaker: 'mara', claim: claimWith(injected, 'jonet', 'c8') }, true, STANDARD_RULES);
    ingest(world, 'rafe', { tick: at(1, 9), speaker: 'osric', claim: claimWith(injected, SOMEONE, 'c9') }, true, STANDARD_RULES);
    expect(b.apparentSources).toEqual(['jonet', 'osric']); // two apparent origins
    expect(b.heardAt).toBe(at(1, 9));                      // freshness refreshed
    expect(freshness(b, at(1, 9))).toBeCloseTo(1);
  });

  it('firstHeardAt is set once and never moves; injection seeds it', () => {
    const world = buildWorld(TESTFORD, 'prov-3');
    const injected = applyInject(world, 'rafe', spec);
    const b = world.beliefs['rafe']![injected.family]!;
    expect(b.firstHeardAt).toBe(0);
    expect(b.apparentSources).toEqual([]);
    ingest(world, 'rafe', { tick: at(1, 9), speaker: 'mara', claim: claimWith(injected, SOMEONE, 'c8') }, true, STANDARD_RULES);
    expect(b.firstHeardAt).toBe(0);      // unchanged
    expect(b.heardAt).toBe(at(1, 9));    // corroboration moved the freshness clock
  });

  it('first hearing records firstHeardAt = heardAt and one apparent source', () => {
    const world = buildWorld(TESTFORD, 'prov-4');
    const injected = applyInject(world, 'mara', spec);
    ingest(world, 'rafe', { tick: at(0, 9), speaker: 'mara', claim: claimWith(injected, SOMEONE, 'c8') }, true, STANDARD_RULES);
    const b = world.beliefs['rafe']![injected.family]!;
    expect(b.firstHeardAt).toBe(at(0, 9));
    expect(b.heardAt).toBe(at(0, 9));
    expect(b.apparentSources).toEqual(['mara']);
  });
});

describe('nobody is their own corroborator', () => {
  it('a claim citing the hearer as its origin counts for nothing', () => {
    const world = buildWorld(TESTFORD, 'prov-5');
    const injected = applyInject(world, 'mara', spec);
    ingest(world, 'rafe', { tick: at(0, 9), speaker: 'osric', claim: claimWith(injected, 'rafe', 'c8') }, true, STANDARD_RULES);
    const b = world.beliefs['rafe']![injected.family]!;
    expect(b.apparentSources).toEqual([]);          // self-source not seeded
    const c0 = b.credence;
    ingest(world, 'rafe', { tick: at(1, 9), speaker: 'mara', claim: claimWith(injected, 'rafe', 'c9') }, true, STANDARD_RULES);
    expect(b.apparentSources).toEqual([]);          // self-source never corroborates
    expect(b.credence).toBe(c0);
    expect(b.heardAt).toBe(at(0, 9));               // no freshness refresh
    ingest(world, 'rafe', { tick: at(1, 12), speaker: 'osric', claim: claimWith(injected, SOMEONE, 'c10') }, true, STANDARD_RULES);
    expect(b.apparentSources).toEqual(['osric']);   // real origins still count
  });

  it('PROPERTY: no mind lists itself as an apparent source over a 2-day town run', () => {
    const world = buildWorld(TESTFORD, 'prov-6');
    runUntil(world, at(0, 8), STANDARD_RULES);
    applyInject(world, 'mara', spec);
    runUntil(world, at(2, 0), STANDARD_RULES);
    for (const npcId of Object.keys(world.npcs)) {
      for (const family of Object.keys(world.beliefs[npcId]!)) {
        expect(world.beliefs[npcId]![family]!.apparentSources).not.toContain(npcId);
      }
    }
  });
});
