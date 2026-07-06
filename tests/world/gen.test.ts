import { generateTown } from '../../src/world/gen';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import type { GenContent } from '../../src/world/types';
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

  it('weightedPick throws rather than returning undefined when a custom trait pool runs dry', () => {
    const thinContent: GenContent = { ...STANDARD_GEN_CONTENT, traitPool: [{ id: 'literalist', weight: 1 }] };
    expect(() => generateTown('thin-traits', STANDARD_GEN_CONFIG, thinContent)).toThrow(/weightedPick: empty pool/);
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

describe('designated guards', () => {
  const town = generateTown('guards-seed', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
  const byId = new Map(town.fixture.npcs.map((n) => [n.id, n]));

  it('exactly guardsPerDistrict guards per district, deterministic, occupation=guard', () => {
    expect(town.guards).toHaveLength(STANDARD_GEN_CONFIG.districtCount * STANDARD_GEN_CONFIG.guardsPerDistrict);
    const again = generateTown('guards-seed', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    expect(again.guards).toEqual(town.guards);
    for (const g of town.guards) expect(byId.get(g.id)!.occupation).toBe('guard');
    for (const d of town.districts) {
      const homed = town.guards.filter((g) => d.npcIds.includes(g.id));
      expect(homed).toHaveLength(STANDARD_GEN_CONFIG.guardsPerDistrict);
    }
  });

  it('guard schedules follow the patrol contract and stay 15-aligned', () => {
    for (const g of town.guards) {
      const npc = byId.get(g.id)!;
      const venuesOf = (from: number, to: number) =>
        npc.schedule.filter((s) => s.from === from && s.to === to).map((s) => s.venue);
      expect(venuesOf(480, 600).some((v) => v.startsWith('guard-post'))).toBe(true);
      expect(venuesOf(600, 840).some((v) => v.startsWith('market'))).toBe(true);
      expect(venuesOf(1080, 1230).some((v) => v.startsWith('tavern'))).toBe(true);
      for (const s of npc.schedule) { expect(s.from % 15).toBe(0); expect(s.to === 1439 || s.to % 15 === 0).toBe(true); }
    }
  });

  it('vigilance is in (0,1] and bridges are never conscripted', () => {
    for (const g of town.guards) { expect(g.vigilance).toBeGreaterThan(0); expect(g.vigilance).toBeLessThanOrEqual(1); }
    // bridges keep their far-tavern evening block 1080–1200; guards use 1080–1230 —
    // structural non-overlap is only guaranteed if designation excluded bridges.
    for (const g of town.guards) {
      const npc = byId.get(g.id)!;
      const eveningBlocks = npc.schedule.filter((s) => s.days === 'all' && s.from >= 1080);
      expect(eveningBlocks).toHaveLength(1);
    }
  });

  it('eveningTavern ⇒ to ≤ 1080 is asserted as a content invariant', () => {
    const bad = {
      ...STANDARD_GEN_CONTENT,
      occupations: [...STANDARD_GEN_CONTENT.occupations,
        { id: 'night-owl', workplace: 'tavern', from: 960, to: 1200, eveningTavern: true, weight: 1 }],
    };
    expect(() => generateTown('x', STANDARD_GEN_CONFIG, bad)).toThrow(/eveningTavern/);
  });
});

describe('scenario cast — the coronation principals', () => {
  it('deals a scenario cast deterministically: crown usurper, council = keystones', () => {
    const a = generateTown('cast-seed-1', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    const b = generateTown('cast-seed-1', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    expect(a.cast).toEqual(b.cast);                        // same seed, same principals
    expect(a.cast).not.toBeNull();
    const cast = a.cast!;
    expect(a.fixture.npcs.find((n) => n.id === cast.usurper)!.faction).toBe('crown');
    expect(cast.council).toEqual(a.keystones);             // the keystones wear the robes
    expect(cast.council).not.toContain(cast.usurper);
    expect(a.guards.map((g) => g.id)).not.toContain(cast.usurper);
  });

  it('guarantees the investigation route: every cast town has a usurper secret with a witness', () => {
    for (const seed of ['cast-seed-1', 'cast-seed-2', 'cast-seed-3']) {
      const town = generateTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
      if (town.cast === null || town.cast === undefined) continue; // uncastable towns are the validator's problem
      const dirt = town.secrets.filter((s) => s.subject === town.cast!.usurper);
      expect(dirt.length).toBeGreaterThanOrEqual(1);
      expect(dirt[0]!.witnesses.length).toBeGreaterThanOrEqual(1);
    }
  });
});
