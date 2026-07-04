import { campaignMetrics, familiesOf, playerFamiliesOf } from '../../src/harness/metrics';
import { runCampaign, type Save } from '../../src/sim/campaign';
import { buildWorld } from '../../src/sim/world';
import { applyInject } from '../../src/sim/actions';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import { SOMEONE, mintClaim } from '../../src/sim/rumors/claim';

const save: Save = {
  seed: 'met-1',
  log: [{ tick: at(0, 8), kind: 'inject', target: 'mara', spec: {
    subject: SOMEONE, predicate: 'stole', object: null,
    count: 2, severity: 4, place: 'market', attribution: SOMEONE,
  } }],
};
const world = runCampaign(TESTFORD, STANDARD_RULES, save, at(3, 0));

describe('campaignMetrics', () => {
  it('familiesOf finds the injected story', () => {
    // Amended in Plan 4 Task 3 (amendment #3): counter-spin self-injects mint real root
    // families, so exact equality over-pinned a single-root world. The intent — the
    // injected story is among the roots — is what's asserted; counter-spin families
    // are NOT excluded from familiesOf (they are real roots).
    expect(familiesOf(world)).toContain('f0');
  });

  it('reach matches an independent count of holders', () => {
    const m = campaignMetrics(world, 'f0');
    const holders = Object.keys(world.npcs)
      .filter((id) => world.beliefs[id]?.['f0'] !== undefined).length;
    expect(m.reach).toBeCloseTo(holders / 12);
    expect(m.reach).toBeGreaterThan(0.5); // three days: the story owns the town
  });

  it('believers is a subset of reach; distortion is a nonnegative mean', () => {
    const m = campaignMetrics(world, 'f0');
    expect(m.believers).toBeLessThanOrEqual(m.reach);
    expect(m.believers).toBeGreaterThanOrEqual(0);
    expect(m.meanDistortion).not.toBeNull();
    expect(m.meanDistortion!).toBeGreaterThanOrEqual(0);
  });

  it('halfTownTick comes from the chronicle and is inside the run', () => {
    const m = campaignMetrics(world, 'f0');
    expect(m.halfTownTick).not.toBeNull();
    expect(m.halfTownTick!).toBeGreaterThan(at(0, 8));
    expect(m.halfTownTick!).toBeLessThan(at(3, 0));
  });

  it('unknown family throws loudly', () => {
    expect(() => campaignMetrics(world, 'f99')).toThrow(/f99/);
  });
});

describe('playerFamiliesOf', () => {
  const SPEC = {
    subject: SOMEONE, predicate: 'stole' as const, object: null,
    count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
  };

  it('keeps player injections and drops genesis + counter-spin root families', () => {
    const w = buildWorld(TESTFORD, 'pf-1');
    const player = applyInject(w, 'mara', SPEC); // by 'player' (default) — the bot's hand

    // Genesis secret, mimicking worldFromTown: a real parentless root, chronicled as 'genesis'.
    const genesis = mintClaim(w, { family: 'sekret', parent: null, ...SPEC });
    w.claims[genesis.id] = genesis;
    w.chronicle.push({ kind: 'inject', tick: 0, target: 'mara', claimId: genesis.id, by: 'genesis' });

    // Counter-spin self-inject, mimicking reactToSelfRumor: a real root chronicled as the NPC.
    const spun = mintClaim(w, { family: 'spun', parent: null, ...SPEC });
    w.claims[spun.id] = spun;
    w.chronicle.push({ kind: 'inject', tick: 0, target: 'osric', claimId: spun.id, by: 'osric' });

    // familiesOf sees all three real roots; playerFamiliesOf sees only the player's story —
    // secrets and counter-spin never dilute the bot's pacing numbers.
    expect(familiesOf(w)).toEqual(expect.arrayContaining([player.family, 'sekret', 'spun']));
    expect(playerFamiliesOf(w)).toEqual([player.family]);
  });
});
