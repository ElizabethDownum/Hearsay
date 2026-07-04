import type { EntityId } from './rumors/claim';
import type { TownFixture, WorldState } from './types';

/** First id that appears twice, or null — dup detection before records collapse duplicates. */
function firstDuplicate(ids: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

export function buildWorld(fixture: TownFixture, seed: string): WorldState {
  const dupVenue = firstDuplicate(fixture.venues.map((v) => v.id));
  if (dupVenue) throw new Error(`buildWorld: duplicate venue id '${dupVenue}'`);
  const dupNpc = firstDuplicate(fixture.npcs.map((n) => n.id));
  if (dupNpc) throw new Error(`buildWorld: duplicate npc id '${dupNpc}'`);

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
    claims: {},
    lastTold: {},
  };
}

export function trustBetween(world: WorldState, from: EntityId, to: EntityId): number {
  const edge = world.npcs[from]?.edges.find((e) => e.to === to);
  return edge ? edge.trust : 0;
}
