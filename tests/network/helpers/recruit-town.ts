import { STANDARD_RULES } from '../../../src/content/rules';
import { buildTownMap, buildWorld, enrollPlayer } from '../../../src/sim/world';
import type { Npc, TownFixture, Venue, WorldState } from '../../../src/sim/types';
import type { EntityId, VenueId } from '../../../src/sim/rumors/claim';
import type { Mice } from '../../../src/sim/network/types';

/**
 * Recruitford — the Task-11 recruitment testbed. Every resident defaults to their OWN private home
 * (an isolated one-person "circle"), so a test co-locates EXACTLY the people it means to and nothing
 * else. Circles are therefore fully predictable without touching the shuffle.
 *
 * The cast covers every hidden recruitment category the plan's table test names:
 *   cass  — plain civilian          gil  — 'guard' occupation (a watch occupation) + enemy observer
 *   cora  — scenario council member vane — scenario usurper
 *   sly   — the embodied spymaster  ewan — an enemy-roster asset
 *   dane  — the player's asset (the sound-out recruiter)
 *   nell  — a bystander/witness     twin — the honest-twin control
 */
export const PEOPLE = ['cass', 'dane', 'gil', 'vane', 'cora', 'sly', 'ewan', 'nell', 'twin'] as const;

const person = (id: string, occupation = 'grocer', traits: string[] = ['literalist']): Npc => ({
  id, name: id, home: `home-${id}`, occupation, faction: 'none',
  traits, rivals: [], schedule: [], edges: [],
});

const homes: Venue[] = PEOPLE.map((id) => ({
  id: `home-${id}`, district: 'd0', access: 'private' as const,
}));

export const RECRUITFORD: TownFixture = {
  venues: [
    { id: 'square', district: 'd0', access: 'public' },
    { id: 'annex', district: 'd0', access: 'public' },
    { id: 'safehouse', district: 'd0', access: 'public' },
    { id: 'post', district: 'd0', access: 'invitational' },
    ...homes,
  ],
  npcs: [
    person('cass'), person('dane'), person('gil', 'guard'), person('vane'),
    person('cora'), person('sly', 'clerk'), person('ewan'), person('nell'),
    person('twin'),
  ],
};

/** A staged Recruitford: enemy map + observers, the embodied spymaster, a scenario cast, the avatar. */
export function recruitWorld(seed: string): WorldState {
  const world = buildWorld(RECRUITFORD, seed, STANDARD_RULES);
  world.enemy.map = buildTownMap(RECRUITFORD);
  world.enemy.observers = [{ id: 'gil', vigilance: 0.9 }];
  world.network.spymaster = 'sly';
  world.network.enemyAssets.push({
    id: 'ewan', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
  });
  enrollPlayer(world, { home: 'square' });
  world.scenario = {
    defId: 'test-cast', days: 12, win: { kind: 'council-turns', quorum: 2 },
    cast: { usurper: 'vane', council: ['cora'] }, status: 'running', resolution: null,
  };
  return world;
}

/** Put every named person at `venue` for days 0..19 — the test-authored schedule-override idiom. */
export function pin(world: WorldState, venue: VenueId, ...ids: EntityId[]): void {
  for (const id of ids) {
    if (id === world.playerId) {
      world.playerVenue = venue;
      continue;
    }
    world.scheduleOverrides[id] = [{
      fromDay: 0, toDay: 20, from: 0, to: 1440, venue,
      source: 'player', sourceRef: `test:pin:${id}`,
    }];
  }
}

/** Set a directional trust edge (the disposition physics recruitment reads). */
export function trust(world: WorldState, from: EntityId, to: EntityId, value: number): void {
  const npc = world.npcs[from]!;
  const edge = npc.edges.find((e) => e.to === to);
  if (edge) edge.trust = value;
  else npc.edges.push({ to, kind: 'friend', trust: value });
}

/** Force `id` onto the PLAYER roster without running the recruit flow (the wage-test idiom). */
export function makePlayerAsset(world: WorldState, id: EntityId, mice: Mice | null = 'money'): void {
  world.network.assets.push({ id, mice, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.intel.informants.push({ id, assignedVenue: null });
  trust(world, id, world.playerId!, 0.8);
}
