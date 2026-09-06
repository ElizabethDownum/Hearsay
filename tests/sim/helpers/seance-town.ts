import { STANDARD_GEN_CONFIG } from '../../../src/content/gen/standard';
import { STANDARD_RULES } from '../../../src/content/rules';
import { enrollPlayer } from '../../../src/sim/world';
import type { Npc, WorldState } from '../../../src/sim/types';
import { worldFromTown } from '../../../src/world/attach';
import { generateDeparted } from '../../../src/world/departed';
import type { GeneratedTown, GenConfig } from '../../../src/world/types';

export const SEANCE_CONFIG: GenConfig = {
  ...STANDARD_GEN_CONFIG, npcCount: 4, districtCount: 1, keystoneCount: 0,
  bridgesPerAdjacentPair: 0, guardsPerDistrict: 1, secretCount: 1,
};
export function seanceTown(withDeparted = true): GeneratedTown {
  const ids = ['ada', 'bez', 'guard', 'boss'];
  const npcs: Npc[] = ids.map((id, index) => ({
    id, name: id, home: 'square', occupation: id === 'guard' ? 'guard' : 'grocer',
    faction: 'none', traits: ['literalist', 'skeptic'], rivals: [],
    schedule: [{ days: 'all', from: 0, to: 1440, venue: 'square' }],
    edges: [{ to: ids[(index + 1) % ids.length]!, kind: 'friend', trust: 0.8 }],
  }));
  const town: GeneratedTown = {
    fixture: {
      venues: [
        { id: 'square', district: 'd0', access: 'public' },
        { id: 'chapel-d0', district: 'd0', access: 'public' },
        { id: 'cathedral', district: 'd0', access: 'public' },
        { id: 'hq', district: 'd0', access: 'invitational' },
        { id: 'guard-home', district: 'd0', access: 'private' },
      ], npcs,
    },
    districts: [{ id: 'd0', venueIds: ['square', 'chapel-d0', 'cathedral', 'hq', 'guard-home'], npcIds: ids }],
    keystones: [], guards: [{ id: 'guard', vigilance: 1 }],
    secrets: [{ id: 's0', subject: 'ada', predicate: 'stole', object: null,
      place: 'square', severity: 4, witnesses: ['bez'] }],
    dossier: null,
  };
  if (withDeparted) town.departed = generateDeparted('seance-stage', town.fixture, town.secrets, ['Mira']);
  return town;
}
export function seanceWorld(): WorldState {
  const world = worldFromTown(seanceTown(), 'seance-stage', STANDARD_RULES);
  enrollPlayer(world, { home: 'chapel-d0' });
  return world;
}
export function nightVisitWorld(): WorldState {
  const world = seanceWorld();
  world.network.spymaster = 'boss';
  world.npcs.guard!.schedule = [
    { days: 'all', from: 0, to: 15, venue: 'chapel-d0' },
    { days: 'all', from: 15, to: 45, venue: 'guard-home' },
    { days: 'all', from: 45, to: 60, venue: 'hq' },
    { days: 'all', from: 60, to: 1440, venue: 'square' },
  ];
  world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }];
  return world;
}
