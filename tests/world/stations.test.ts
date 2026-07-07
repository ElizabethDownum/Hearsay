import { describe, expect, it } from 'vitest';
import { generateTown } from '../../src/world/gen';
import { validateTown } from '../../src/world/validate';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import type { EntityId } from '../../src/sim/rumors/claim';
import type { GeneratedTown } from '../../src/world/types';

const CFG = STANDARD_GEN_CONFIG;
const CONTENT = STANDARD_GEN_CONTENT;
const OPTS = { knownTraitIds: Object.keys(TRAITS) };
const genTown = (seed: string): GeneratedTown => generateTown(seed, CFG, CONTENT);

/** First seed (scanning a family) whose deal is `want` — keeps both cohorts covered. */
function townWithStation(prefix: string, want: 'noble' | 'lowlife'): GeneratedTown {
  for (let i = 0; i < 60; i++) {
    const t = genTown(`${prefix}-${i}`);
    if (t.stationDeal === want) return t;
  }
  throw new Error(`townWithStation: no ${want} seed in 60 tries`);
}

describe('stations — the seed deals a standing', () => {
  // (a) the deal
  it('deals a stationDeal of noble | lowlife, deterministically per seed', () => {
    for (const seed of ['st-1', 'st-2', 'st-3', 'st-4', 'st-5']) {
      const deal = genTown(seed).stationDeal;
      expect(deal === 'noble' || deal === 'lowlife').toBe(true);
      expect(genTown(seed).stationDeal).toBe(deal); // same seed → same deal
    }
  });

  it('the deal is a fresh stream: both standings appear across seeds', () => {
    const deals = new Set<string>();
    for (let i = 0; i < 30; i++) deals.add(genTown(`st-cohort-${i}`).stationDeal!);
    expect(deals.has('noble')).toBe(true);
    expect(deals.has('lowlife')).toBe(true);
  });

  // (b) the station-hosted venues (gen §12): one singleton salon in d0 + one back-room per district
  it('stamps the salon (singleton, d0, invitational) and a back-room per district (invitational)', () => {
    const town = genTown('st-venues');
    const byId = new Map(town.fixture.venues.map((v) => [v.id, v]));
    const salon = byId.get('salon');
    expect(salon).toBeDefined();
    expect(salon!.access).toBe('invitational');
    expect(salon!.district).toBe(town.districts[0]!.id);
    for (const d of town.districts) {
      const br = byId.get(`back-room-${d.id}`);
      expect(br, `back-room for ${d.id}`).toBeDefined();
      expect(br!.access).toBe('invitational');
      expect(br!.district).toBe(d.id);
    }
  });

  // (c) validator station-sane: green on generated, red on each hand-break
  describe('validator station-sane', () => {
    const built = generateValidTown('st-validator', CFG, CONTENT, STANDARD_RULES, OPTS).town;
    const invariantsOf = (t: GeneratedTown): string[] =>
      validateTown(t, CFG, OPTS).failures.map((f) => f.invariant);

    it('a generated town passes station-sane', () => {
      expect(validateTown(built, CFG, OPTS).ok).toBe(true);
      expect(invariantsOf(built)).not.toContain('station-sane');
    });

    it('a null deal fails station-sane (deal present)', () => {
      expect(invariantsOf({ ...built, stationDeal: null })).toContain('station-sane');
    });

    it('a town missing the salon fails station-sane (venues exist)', () => {
      const noSalon: GeneratedTown = {
        ...built,
        fixture: { ...built.fixture, venues: built.fixture.venues.filter((v) => v.id !== 'salon') },
      };
      expect(invariantsOf(noSalon)).toContain('station-sane');
    });

    it('a town missing a back-room fails station-sane', () => {
      const d0 = built.districts[0]!.id;
      const noBackRoom: GeneratedTown = {
        ...built,
        fixture: { ...built.fixture, venues: built.fixture.venues.filter((v) => v.id !== `back-room-${d0}`) },
      };
      expect(invariantsOf(noBackRoom)).toContain('station-sane');
    });

    it('a hand-built town without a deal (undefined) is skipped, not failed', () => {
      const handBuilt: GeneratedTown = {
        fixture: built.fixture, districts: built.districts, keystones: [], guards: [],
        secrets: [], dossier: null, cast: undefined,
      };
      expect(invariantsOf(handBuilt)).not.toContain('station-sane');
    });
  });

  // (d) attachPlayer writes world.station: defaults to the deal, override param wins
  describe('attachPlayer writes world.station', () => {
    it('defaults world.station to the town deal', () => {
      const town = genTown('st-attach-default');
      const world = worldFromTown(town, 'st-attach-default');
      attachPlayer(world, town);
      expect(world.station).toBe(town.stationDeal);
    });

    it('an explicit station param overrides the deal (for tests/staging)', () => {
      const town = genTown('st-attach-override');
      const other = town.stationDeal === 'noble' ? 'lowlife' : 'noble';
      const world = worldFromTown(town, 'st-attach-override');
      attachPlayer(world, town, other);
      expect(world.station).toBe(other);
    });
  });

  // (e) station-shaped dossier (gen §10/§11 filter pass) — BY MECHANISM, not by rate.
  // Stable-sort-then-slice: every selected trait-read subject ranks no worse than every
  // non-selected candidate, under the station's ordering. Same counts, same caps, same stream.
  describe('station-shaped dossier — the ordering bias, by mechanism', () => {
    const workplaceOf = new Map<string, string>(CONTENT.occupations.map((o) => [o.id, o.workplace]));
    workplaceOf.set(CONTENT.guardOccupation.id, CONTENT.guardOccupation.workplace);

    const assertOrderingBias = (town: GeneratedTown): void => {
      const station = town.stationDeal!;
      const byId = new Map(town.fixture.npcs.map((n) => [n.id, n]));
      const districtOf = new Map<EntityId, string>(
        town.districts.flatMap((d) => d.npcIds.map((id) => [id, d.id] as const)),
      );
      const d0 = town.districts[0]!.id;
      const rank = (id: EntityId): number => {
        const npc = byId.get(id)!;
        const district = districtOf.get(id);
        if (station === 'noble') {
          return (npc.faction === 'crown' ? 0 : 2) + (district === d0 ? 0 : 1);
        }
        return (workplaceOf.get(npc.occupation) === 'docks' ? 0 : 2) + (district !== d0 ? 0 : 1);
      };

      const selected = town.dossier!.traitReads.map((t) => t.npc);
      const selectedSet = new Set(selected);
      const nonSelected = town.fixture.npcs.map((n) => n.id).filter((id) => !selectedSet.has(id));

      // Non-vacuity: the pool actually has rank variety, so the ordering means something here.
      const allRanks = town.fixture.npcs.map((n) => rank(n.id));
      expect(Math.min(...allRanks)).toBeLessThan(Math.max(...allRanks));

      // The mechanism: selected subjects occupy the lowest ranks (highest station priority).
      const worstSelected = Math.max(...selected.map(rank));
      const bestNonSelected = Math.min(...nonSelected.map(rank));
      expect(worstSelected).toBeLessThanOrEqual(bestNonSelected);
    };

    it('a NOBLE town orders trait-reads crown-faction-first, then district-0-first', () => {
      assertOrderingBias(townWithStation('st-noble', 'noble'));
    });

    it('a LOWLIFE town orders trait-reads docks-workplace-first, then non-district-0-first', () => {
      assertOrderingBias(townWithStation('st-lowlife', 'lowlife'));
    });

    it('shaping preserves the dossier caps — trait/edge reads stay within configured bounds', () => {
      const town = genTown('st-caps');
      const d = town.dossier!;
      expect(d.traitReads.length).toBeGreaterThanOrEqual(1);
      expect(d.traitReads.length).toBeLessThanOrEqual(CFG.dossierTraitReadMax);
      expect(d.edgeReads.length).toBeLessThanOrEqual(CFG.dossierEdgeReadMax);
      const byId = new Map(town.fixture.npcs.map((n) => [n.id, n]));
      for (const tr of d.traitReads) expect(byId.get(tr.npc)!.traits).toContain(tr.trait); // still truthful
      for (const er of d.edgeReads) {
        expect(byId.get(er.from)!.edges.some((e) => e.to === er.to && e.kind === er.kind)).toBe(true);
      }
    });
  });
});
