import { buildWorld, trustBetween } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';

describe('Testford fixture', () => {
  const world = buildWorld(TESTFORD, 'test-seed');

  it('has 12 NPCs, all with 2-4 traits and valid venue/edge references', () => {
    const npcs = Object.values(world.npcs);
    expect(npcs).toHaveLength(12);
    for (const n of npcs) {
      expect(n.traits.length).toBeGreaterThanOrEqual(2);
      expect(n.traits.length).toBeLessThanOrEqual(4);
      expect(world.venues[n.home]).toBeDefined();
      for (const s of n.schedule) expect(world.venues[s.venue]).toBeDefined();
      for (const e of n.edges) expect(world.npcs[e.to]).toBeDefined();
    }
  });

  it('kin trust runs high, colleagues moderate', () => {
    expect(trustBetween(world, 'mara', 'tomas')).toBeGreaterThanOrEqual(0.9);
    expect(trustBetween(world, 'mara', 'rafe')).toBeCloseTo(0.6);
    expect(trustBetween(world, 'mara', 'brigid')).toBe(0); // no edge across the firebreak
  });

  it('FIREBREAK: only anselm uses venues in both districts', () => {
    const districtsUsed = (id: string): Set<string> => {
      const n = world.npcs[id]!;
      const vs = new Set([n.home, ...n.schedule.map((s) => s.venue)]);
      return new Set([...vs].map((v) => world.venues[v]!.district));
    };
    for (const n of Object.values(world.npcs)) {
      if (n.id === 'anselm') expect(districtsUsed(n.id)).toEqual(new Set(['town', 'northside']));
      else expect(districtsUsed(n.id).size).toBe(1);
    }
  });

  it('buildWorld throws on dangling venue ids', () => {
    const broken = { ...TESTFORD, npcs: [{ ...TESTFORD.npcs[0]!, home: 'nowhere' }] };
    expect(() => buildWorld(broken, 's')).toThrow(/nowhere/);
  });
});
