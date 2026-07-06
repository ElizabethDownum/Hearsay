import { buildWorld, enrollPlayer, trustBetween } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { miniTown } from './helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyInject, type InjectSpec } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { runVignettes } from '../../src/sim/vignettes/engine';
import { positionOf } from '../../src/sim/agents';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { VignetteRecord, WorldState } from '../../src/sim/types';

/**
 * Pillar 7 made real: declarative preconditions over sim state, consequences written back as
 * ORDINARY world facts. The engine is sim-side — it reads the world directly (beliefs, edges),
 * so tests stage state (applyInject / hand-built edges) and drive through REAL nightlies via
 * runUntil across a day boundary. Only the determinism unit calls runVignettes directly.
 *
 * PREMISE DUTIES (fixture pairs):
 *  (a) The brief names mara/jonet, but in TESTFORD they are rivals with NO mutual trust edges
 *      (mara.edges → tomas,pia,rafe,osric,anselm; jonet.edges → osric,hew — neither points at the
 *      other). trust-delta needs a real relationship, so we substitute the nearest mutual-edge
 *      pair keeping mara a party: mara↔osric (friend, trust 0.7 each). Vehicle, not physics.
 *  (d) TESTFORD carries NO lover edges (scanned all 12 npcs — every edge is kin/friend/colleague).
 *      Per the brief's fallback we stage broken-betrothal in miniTown with a hand-added lover edge.
 */

const damaging = (subject: string): InjectSpec => ({
  subject, predicate: 'stole', object: null, count: null, severity: 3, place: null, attribution: SOMEONE,
});
const bankrupt = (subject: string): InjectSpec => ({
  subject, predicate: 'is-bankrupt', object: null, count: null, severity: 3, place: null, attribution: SOMEONE,
});
const vignettesIn = (world: WorldState, defId: string): VignetteRecord[] =>
  world.chronicle.filter((e): e is VignetteRecord => e.kind === 'vignette' && e.defId === defId);

describe('vignette: public-quarrel (pair)', () => {
  it('(a) fires through the real nightly — chronicle record, mutual trust drop, one shared claim', () => {
    const world = buildWorld(TESTFORD, 'vg-quarrel');
    // Premise: the substitute pair genuinely holds mutual edges.
    expect(world.npcs['mara']!.edges.find((e) => e.to === 'osric')).toBeDefined();
    expect(world.npcs['osric']!.edges.find((e) => e.to === 'mara')).toBeDefined();
    const beforeMO = trustBetween(world, 'mara', 'osric');
    const beforeOM = trustBetween(world, 'osric', 'mara');
    expect(beforeMO).toBeCloseTo(0.7, 10);

    // Stage mutual damage: mara believes osric damaging and vice versa (arrive at 0.85 ≥ 0.5).
    applyInject(world, 'mara', damaging('osric'));
    applyInject(world, 'osric', damaging('mara'));

    runUntil(world, at(1, 0), STANDARD_RULES); // one night boundary

    const recs = vignettesIn(world, 'public-quarrel');
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ kind: 'vignette', defId: 'public-quarrel', a: 'mara', b: 'osric' });

    // mara→osric and osric→mara each dropped by exactly 0.2.
    expect(trustBetween(world, 'mara', 'osric')).toBeCloseTo(beforeMO - 0.2, 10);
    expect(trustBetween(world, 'osric', 'mara')).toBeCloseTo(beforeOM - 0.2, 10);

    // Both minds hold a publicly-quarreled-with claim sharing ONE family (one minted claim).
    const fam = 'vg:public-quarrel:mara:osric'; // pair-granular family (canonical a:b)
    const mb = world.beliefs['mara']![fam];
    const ob = world.beliefs['osric']![fam];
    expect(mb?.claim.predicate).toBe('publicly-quarreled-with');
    expect(ob?.claim.predicate).toBe('publicly-quarreled-with');
    expect(mb!.claim.family).toBe(ob!.claim.family);
    expect(mb!.claim.id).toBe(ob!.claim.id); // literally the same minted claim in both minds
  });

  it('(b) latch: the canonical (mara,osric) pair fires ONCE across three nights — no reversed double-fire', () => {
    const world = buildWorld(TESTFORD, 'vg-latch');
    const beforeMO = trustBetween(world, 'mara', 'osric');
    const beforeOM = trustBetween(world, 'osric', 'mara');
    applyInject(world, 'mara', damaging('osric'));
    applyInject(world, 'osric', damaging('mara'));

    runUntil(world, at(3, 0), STANDARD_RULES); // three night boundaries, beliefs never removed

    const key = 'public-quarrel:mara:osric';
    expect(world.vignettesFired.filter((k) => k === key)).toHaveLength(1);
    // The (osric,mara) reverse is never enumerated — exactly ONE vignette record total for the run.
    expect(world.chronicle.filter((e) => e.kind === 'vignette')).toHaveLength(1);
    const recs = vignettesIn(world, 'public-quarrel').filter((e) => e.a === 'mara' && e.b === 'osric');
    expect(recs).toHaveLength(1);
    // Consequences applied exactly once: each side drops by exactly 0.2, not 0.4 (double-fire).
    expect(trustBetween(world, 'mara', 'osric')).toBeCloseTo(beforeMO - 0.2, 10);
    expect(trustBetween(world, 'osric', 'mara')).toBeCloseTo(beforeOM - 0.2, 10);
  });

  it('(e) one firing per def per night — a second qualifying pair waits for the next night', () => {
    const world = buildWorld(TESTFORD, 'vg-pacing');
    // Two mutual-damaging pairs (both hold mutual edges: hew↔jonet colleague, mara↔osric friend).
    applyInject(world, 'hew', damaging('jonet'));
    applyInject(world, 'jonet', damaging('hew'));
    applyInject(world, 'mara', damaging('osric'));
    applyInject(world, 'osric', damaging('mara'));

    runUntil(world, at(1, 0), STANDARD_RULES); // night 0
    const afterNight0 = vignettesIn(world, 'public-quarrel');
    expect(afterNight0).toHaveLength(1); // pacing cap: exactly one per night
    // Lexicographically-first qualifying canonical pair fires first (hew<jonet, hew<mara).
    expect(afterNight0[0]).toMatchObject({ a: 'hew', b: 'jonet' });

    runUntil(world, at(2, 0), STANDARD_RULES); // night 1
    const afterNight1 = vignettesIn(world, 'public-quarrel');
    expect(afterNight1).toHaveLength(2); // exactly one more fired, one night later
    // Record identity: day-0 gossip spreads the staged `stole` claims, so hew↔mara also become
    // mutually-damaging. Night 1 fires the lexicographically-first STILL-qualifying canonical pair —
    // (hew,mara) queue-jumps (mara,osric) because hew < mara — proving canonical (a<b) ordering.
    expect(afterNight1[1]).toMatchObject({ a: 'hew', b: 'mara' });
    expect(afterNight1[1]!.a < afterNight1[1]!.b!).toBe(true); // canonical: a strictly before b
  });
});

describe('vignette: merchant-ruin (solo)', () => {
  it('(c) fires: schedule-home override, home position next morning, self shuttered-the-shop claim', () => {
    const world = buildWorld(miniTown(), 'vg-ruin');
    // is-bankrupt about ada into 3 other minds (bez, cyn, dov) at 0.85 ≥ 0.75.
    for (const holder of ['bez', 'cyn', 'dov']) applyInject(world, holder, bankrupt('ada'));

    runUntil(world, at(1, 0), STANDARD_RULES);

    const recs = vignettesIn(world, 'merchant-ruin');
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ a: 'ada', b: null });

    const ov = world.scheduleOverrides['ada']?.find((o) => o.source === 'vignette');
    expect(ov).toBeDefined();
    expect(ov).toMatchObject({ fromDay: 1, toDay: 3, from: 0, to: 1439, venue: 'home-0', source: 'vignette' });

    // positionOf honors the full-day override next morning.
    expect(positionOf(world, world.npcs['ada']!, at(1, 8))).toBe('home-0');

    // Self-rumor interplay tolerated — assert the belief exists, do not pin inquiry side-effects.
    const fam = 'vg:merchant-ruin:ada';
    expect(world.beliefs['ada']![fam]?.claim.predicate).toBe('shuttered-the-shop');
    expect(world.beliefs['ada']![fam]?.claim.subject).toBe('ada');
  });
});

describe('vignette: broken-betrothal (pair)', () => {
  it('(d) fires: lover edge re-kinds to rival, trust −0.4 clamped ≥ 0, broke-a-betrothal in a', () => {
    // Premise substitution: TESTFORD has no lover edges, so stage one in miniTown. ada already
    // holds a single friend edge to bez — re-kind THAT edge to lover (trust 0.3 so −0.4 clamps to
    // 0), rather than pushing a duplicate that .find would shadow. Vehicle, not physics.
    const fixture = miniTown();
    const adaEdge = fixture.npcs.find((n) => n.id === 'ada')!.edges.find((e) => e.to === 'bez')!;
    adaEdge.kind = 'lover';
    adaEdge.trust = 0.3;
    const world = buildWorld(fixture, 'vg-betrothal');

    // ada believes bez is having an affair with cyn (object ≠ ada) at 0.85 ≥ 0.75.
    applyInject(world, 'ada', {
      subject: 'bez', predicate: 'is-having-an-affair-with', object: 'cyn',
      count: null, severity: 3, place: null, attribution: SOMEONE,
    });

    runUntil(world, at(1, 0), STANDARD_RULES);

    expect(vignettesIn(world, 'broken-betrothal')).toHaveLength(1);
    const edge = world.npcs['ada']!.edges.find((e) => e.to === 'bez')!;
    expect(edge.kind).toBe('rival');
    expect(edge.trust).toBe(0); // clamp01(0.3 − 0.4) === 0

    const fam = 'vg:broken-betrothal:ada:bez'; // pair-granular family (canonical a:b)
    const belief = world.beliefs['ada']![fam];
    expect(belief?.claim.predicate).toBe('broke-a-betrothal');
    expect(belief?.claim.subject).toBe('bez');
    expect(belief?.claim.object).toBe('ada');
  });
});

describe('vignette: avatar exclusion', () => {
  it('(f) never binds the avatar — the human’s drama belongs to the human', () => {
    const world = buildWorld(miniTown(), 'vg-avatar');
    enrollPlayer(world, { home: 'home-0' }); // id defaults to 'you'
    // Stage a mutual quarrel between the avatar and ada — qualifying at data level.
    const you = applyInject(world, 'you', damaging('ada'));
    const ada = applyInject(world, 'ada', damaging('you'));
    expect(world.beliefs['you']![you.family]!.credence).toBeGreaterThanOrEqual(0.5);
    expect(world.beliefs['ada']![ada.family]!.credence).toBeGreaterThanOrEqual(0.5);

    runUntil(world, at(1, 0), STANDARD_RULES);

    // The only qualifying pair involves the avatar → nothing binds.
    expect(world.chronicle.filter((e) => e.kind === 'vignette')).toHaveLength(0);
    expect(world.vignettesFired).toHaveLength(0);
  });
});

describe('vignette: determinism', () => {
  it('(g) identical worlds + identical staging → byte-identical vignettesFired + chronicle', () => {
    const stage = (seed: string): WorldState => {
      const w = buildWorld(miniTown(), seed);
      for (const holder of ['bez', 'cyn', 'dov']) applyInject(w, holder, bankrupt('ada')); // merchant-ruin(ada)
      applyInject(w, 'bez', damaging('cyn')); // public-quarrel(bez,cyn)
      applyInject(w, 'cyn', damaging('bez'));
      return w;
    };
    const w1 = stage('vg-det');
    const w2 = stage('vg-det');
    runVignettes(w1, STANDARD_RULES); // determinism unit: the only sanctioned direct call
    runVignettes(w2, STANDARD_RULES);

    expect(JSON.stringify(w1.vignettesFired)).toBe(JSON.stringify(w2.vignettesFired));
    expect(JSON.stringify(w1.chronicle)).toBe(JSON.stringify(w2.chronicle));
    // Both defs actually fired — otherwise determinism proves nothing.
    expect(w1.vignettesFired).toContain('public-quarrel:bez:cyn');
    expect(w1.vignettesFired).toContain('merchant-ruin:ada:-');
  });
});
