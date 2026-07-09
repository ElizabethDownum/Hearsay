import type { EntityId, VenueId } from './rumors/claim';
import type { Npc, TownFixture, WorldState } from './types';
import { emptyEnemyState } from './enemy/state';
import type { TownMap } from './enemy/state';
import { emptyNetworkState } from './network/types';
import type { Rules } from './rules';

/** First id that appears twice, or null — dup detection before records collapse duplicates. */
function firstDuplicate(ids: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

/**
 * `rules` is optional and used only to seed the treasury (`rules.economy.startingCoin`);
 * every other call site that doesn't touch coin is untouched by this parameter. Omitted
 * → coin starts at 0 (the neutral absence value, matching `playerId: null` etc. — not a
 * price, never read from the one price table).
 */
export function buildWorld(fixture: TownFixture, seed: string, rules?: Rules): WorldState {
  const dupVenue = firstDuplicate(fixture.venues.map((v) => v.id));
  if (dupVenue) throw new Error(`buildWorld: duplicate venue id '${dupVenue}'`);
  const dupNpc = firstDuplicate(fixture.npcs.map((n) => n.id));
  if (dupNpc) throw new Error(`buildWorld: duplicate npc id '${dupNpc}'`);

  const venues = Object.fromEntries(fixture.venues.map((v) => [v.id, v]));
  // The world OWNS its npcs — clone each (and its edges) so post-build edge writes (Plan 8
  // disposition/recruit/turncoat physics) never leak back into the shared fixture. Without this,
  // reusing one town across builds (the determinism/replay idiom) would pollute the fixture.
  const npcs = Object.fromEntries(
    fixture.npcs.map((n) => [n.id, { ...n, edges: n.edges.map((e) => ({ ...e })) }]),
  );

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
    coin: rules ? rules.economy.startingCoin : 0,
    station: null,
    playerId: null,
    playerVenue: null,
    pendingTell: null,
    pendingSell: null,
    intel: { informants: [], log: [], cards: [], codex: [], tags: [] },
    network: emptyNetworkState(),
    scenario: null,
    npcs,
    venues,
    beliefs: Object.fromEntries(fixture.npcs.map((n) => [n.id, {}])),
    claims: {},
    lastTold: {},
    chronicle: [],
    inquiries: {},
    scheduleOverrides: {},
    enemy: emptyEnemyState(),
    vignettesFired: [],
  };
}

/**
 * Attach the avatar to a built world: a real Npc under physics (observable, circle-joining)
 * that never carries a schedule — its venue is driven by `playerVenue` (rule 2). Seeds an
 * empty belief store and records `playerId`/`playerVenue`. Throws on an unknown home venue,
 * a double enrollment, or an id already taken by an NPC.
 */
export function enrollPlayer(
  world: WorldState, opts: { id?: string; name?: string; home: VenueId },
): void {
  if (world.playerId !== null) throw new Error('enrollPlayer: a player is already enrolled');
  if (!world.venues[opts.home]) throw new Error(`enrollPlayer: unknown home venue '${opts.home}'`);
  const id = opts.id ?? 'you';
  if (world.npcs[id]) throw new Error(`enrollPlayer: id '${id}' is already an npc`);
  const avatar: Npc = {
    id, name: opts.name ?? id, home: opts.home, occupation: 'none', faction: 'none',
    traits: [], rivals: [], schedule: [], edges: [],
  };
  world.npcs[id] = avatar;
  world.beliefs[id] = {};
  world.playerId = id;
  world.playerVenue = opts.home;
}

export function trustBetween(world: WorldState, from: EntityId, to: EntityId): number {
  const edge = world.npcs[from]?.edges.find((e) => e.to === to);
  return edge ? edge.trust : 0;
}

/** Street knowledge only: what any resident could tell you about who is who. */
export function buildTownMap(fixture: TownFixture): TownMap {
  const districtOf = Object.fromEntries(fixture.venues.map((v) => [v.id, v.district]));
  return {
    venues: fixture.venues.map((v) => ({ id: v.id, district: v.district, access: v.access })),
    directory: fixture.npcs.map((n) => ({
      id: n.id, occupation: n.occupation, district: districtOf[n.home] ?? 'unknown',
    })),
  };
}
