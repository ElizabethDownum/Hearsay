import { NAMES } from '../../src/content/gen/names';
import { OCCUPATIONS, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, VENUE_ARCHETYPES } from '../../src/content/gen/standard';
import { TRAITS } from '../../src/content/traits';

describe('generator content tables', () => {
  it('name pool: ≥120, unique even lowercased (lowercased names become npc ids)', () => {
    expect(NAMES.length).toBeGreaterThanOrEqual(120);
    expect(new Set(NAMES.map((n) => n.toLowerCase())).size).toBe(NAMES.length);
    expect(NAMES.length).toBeGreaterThanOrEqual(STANDARD_GEN_CONFIG.npcCount);
  });

  it('venue archetypes: unique ids, at least one singleton and one per-district', () => {
    expect(new Set(VENUE_ARCHETYPES.map((a) => a.id)).size).toBe(VENUE_ARCHETYPES.length);
    expect(VENUE_ARCHETYPES.some((a) => a.scope === 'singleton')).toBe(true);
    expect(VENUE_ARCHETYPES.some((a) => a.scope === 'per-district')).toBe(true);
  });

  it('occupations: unique ids, real workplaces, sane shifts, positive weights', () => {
    const archIds = new Set(VENUE_ARCHETYPES.map((a) => a.id));
    expect(new Set(OCCUPATIONS.map((o) => o.id)).size).toBe(OCCUPATIONS.length);
    for (const o of OCCUPATIONS) {
      expect(archIds.has(o.workplace)).toBe(true);
      expect(o.from).toBeGreaterThanOrEqual(0);
      expect(o.from).toBeLessThan(o.to);
      expect(o.to).toBeLessThanOrEqual(1440);
      expect(o.weight).toBeGreaterThan(0);
    }
  });

  it('trait pool draws only from the shipped glossary, with positive weights', () => {
    for (const t of STANDARD_GEN_CONTENT.traitPool) {
      expect(TRAITS[t.id]).toBeDefined();
      expect(t.weight).toBeGreaterThan(0);
    }
    expect(STANDARD_GEN_CONTENT.traitPool.length).toBeGreaterThanOrEqual(4); // trait draws need ≥4 distinct
  });

  it('factions cover the Npc union with positive weights', () => {
    expect(STANDARD_GEN_CONTENT.factions.map((f) => f.id).sort()).toEqual(['crown', 'guild', 'none']);
    for (const f of STANDARD_GEN_CONTENT.factions) expect(f.weight).toBeGreaterThan(0);
  });

  it('standard config is in spec range', () => {
    expect(STANDARD_GEN_CONFIG.npcCount).toBeGreaterThanOrEqual(60);
    expect(STANDARD_GEN_CONFIG.npcCount).toBeLessThanOrEqual(90);
    expect(STANDARD_GEN_CONFIG.districtCount).toBeGreaterThanOrEqual(1);
    expect(STANDARD_GEN_CONFIG.maxAttempts).toBeGreaterThanOrEqual(1);
    expect(STANDARD_GEN_CONFIG.keystoneCount).toBeGreaterThan(0);
    expect(STANDARD_GEN_CONFIG.bridgesPerAdjacentPair).toBeGreaterThan(0);
  });

  it('guardsPerDistrict is a positive integer', () => {
    expect(Number.isInteger(STANDARD_GEN_CONFIG.guardsPerDistrict)).toBe(true);
    expect(STANDARD_GEN_CONFIG.guardsPerDistrict).toBeGreaterThan(0);
  });

  it("guardOccupation is id 'guard' with a real workplace archetype", () => {
    const archIds = new Set(VENUE_ARCHETYPES.map((a) => a.id));
    expect(STANDARD_GEN_CONTENT.guardOccupation.id).toBe('guard');
    expect(archIds.has(STANDARD_GEN_CONTENT.guardOccupation.workplace)).toBe(true);
    expect(STANDARD_GEN_CONTENT.guardOccupation.workplace).toBe('guard-post');
  });
});
