import { campaignMetrics, familiesOf } from '../../src/harness/metrics';
import { runCampaign, type Save } from '../../src/sim/campaign';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';

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
    expect(familiesOf(world)).toEqual(['f0']);
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
