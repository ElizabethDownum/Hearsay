import { STANDARD_RULES as R } from '../../../src/content/rules';
import { buildTownMap, buildWorld, enrollPlayer } from '../../../src/sim/world';
import type { Npc, TownFixture } from '../../../src/sim/types';

export function scryWorld() {
  const npc = (id: string, venue: string, occupation = 'grocer'): Npc => ({
    id, name: id, home: venue, occupation, faction: 'none', traits: ['literalist'], rivals: [],
    schedule: [{ days: 'all', from: 0, to: 1440, venue }], edges: [],
  });
  const guard = npc('guard', 'hq', 'guard');
  guard.schedule = [
    { days: 'all', from: 0, to: 45, venue: 'hall' },
    { days: 'all', from: 45, to: 1440, venue: 'hq' },
  ];
  guard.edges.push({ to: 'boss', kind: 'colleague', trust: 0.8 });
  const citizen = npc('citizen', 'hall');
  citizen.edges.push({ to: 'guard', kind: 'colleague', trust: 0.8 });
  const fixture: TownFixture = {
    venues: [
      { id: 'hall', district: 'd0', access: 'public' },
      { id: 'hq', district: 'd0', access: 'private' },
      { id: 'away', district: 'd1', access: 'public' },
    ],
    npcs: [guard, npc('boss', 'hq', 'clerk'), citizen],
  };
  const world = buildWorld(fixture, 'scry-mechanisms', R);
  enrollPlayer(world, { home: 'away' });
  world.network.spymaster = 'boss';
  world.enemy.observers = [{ id: 'guard', vigilance: 1 }];
  world.enemy.map = buildTownMap(fixture);
  return world;
}
