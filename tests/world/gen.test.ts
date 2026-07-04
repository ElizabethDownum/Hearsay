import { generateTown } from '../../src/world/gen';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { buildWorld } from '../../src/sim/world';
import { stableStringify } from '../../src/sim/hash';

const gen = (seed: string) => generateTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);

describe('generateTown — one seed string determines the whole world', () => {
  it('same seed → byte-identical output (and no undefined anywhere: stableStringify round-trips)', () => {
    expect(stableStringify(gen('alpha'))).toBe(stableStringify(gen('alpha')));
  });

  it('different seeds → different towns', () => {
    expect(stableStringify(gen('alpha'))).not.toBe(stableStringify(gen('beta')));
  });

  it('honors the cast contract: npcCount, unique ids, 2–4 unique traits, keystones valid', () => {
    const town = gen('gamma');
    expect(town.fixture.npcs).toHaveLength(STANDARD_GEN_CONFIG.npcCount);
    const ids = town.fixture.npcs.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of town.fixture.npcs) {
      expect(n.traits.length).toBeGreaterThanOrEqual(2);
      expect(n.traits.length).toBeLessThanOrEqual(4);
      expect(new Set(n.traits).size).toBe(n.traits.length);
      expect(n.edges.length).toBeGreaterThan(0);
    }
    expect(town.keystones).toHaveLength(STANDARD_GEN_CONFIG.keystoneCount);
    for (const k of town.keystones) expect(ids).toContain(k);
    expect(new Set(town.keystones).size).toBe(town.keystones.length);
  });

  it('stamps the fixed grammar: per-district archetypes everywhere, singletons once in d0', () => {
    const town = gen('delta');
    const venueIds = new Set(town.fixture.venues.map((v) => v.id));
    expect(town.districts).toHaveLength(STANDARD_GEN_CONFIG.districtCount);
    for (const d of town.districts) {
      for (const arch of ['tavern', 'market', 'chapel', 'workshop', 'well', 'guard-post']) {
        expect(venueIds.has(`${arch}-${d.id}`)).toBe(true);
      }
    }
    expect(venueIds.has('cathedral')).toBe(true);
    expect(venueIds.has('docks')).toBe(true);
    expect(town.fixture.venues.find((v) => v.id === 'cathedral')!.district).toBe(town.districts[0]!.id);
  });

  it('output feeds the sim kernel unchanged: buildWorld accepts every seed in a batch', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => buildWorld(gen(`batch-${i}`).fixture, `batch-${i}`)).not.toThrow();
    }
  });

  it('designated bridges exist: some NPC schedules an all-days block at another district tavern', () => {
    const town = gen('epsilon');
    const districtOf = new Map(town.districts.flatMap((d) => d.npcIds.map((id) => [id, d.id] as const)));
    const bridges = town.fixture.npcs.filter((n) =>
      n.schedule.some((s) => s.days === 'all' && s.venue.startsWith('tavern-') &&
        s.venue !== `tavern-${districtOf.get(n.id)}`));
    expect(bridges.length).toBeGreaterThan(0);
    // every designated bridge can SPEAK on the far side: a trusted friend among that tavern's regulars
    for (const b of bridges) {
      const farBlock = b.schedule.find((s) => s.days === 'all' && s.venue.startsWith('tavern-') &&
        s.venue !== `tavern-${districtOf.get(b.id)}`)!;
      const far = farBlock.venue.slice('tavern-'.length);
      expect(b.edges.some((e) => e.trust > 0 && districtOf.get(e.to) === far)).toBe(true);
    }
  });
});
