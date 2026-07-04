import type { EntityId } from './rumors/claim';
import type { TownFixture, WorldState } from './types';

export function buildWorld(fixture: TownFixture, seed: string): WorldState {
  const venues = Object.fromEntries(fixture.venues.map((v) => [v.id, v]));
  const npcs = Object.fromEntries(fixture.npcs.map((n) => [n.id, n]));

  for (const n of fixture.npcs) {
    const check = (venueId: string): void => {
      if (!venues[venueId]) throw new Error(`npc ${n.id}: unknown venue '${venueId}'`);
    };
    check(n.home);
    n.schedule.forEach((s) => check(s.venue));
    for (const e of n.edges) {
      if (!npcs[e.to]) throw new Error(`npc ${n.id}: edge to unknown npc '${e.to}'`);
    }
  }

  return {
    seed,
    tick: 0,
    claimCounter: 0,
    npcs,
    venues,
    beliefs: Object.fromEntries(fixture.npcs.map((n) => [n.id, {}])),
    lastTold: {},
  };
}

export function trustBetween(world: WorldState, from: EntityId, to: EntityId): number {
  const edge = world.npcs[from]?.edges.find((e) => e.to === to);
  return edge ? edge.trust : 0;
}
