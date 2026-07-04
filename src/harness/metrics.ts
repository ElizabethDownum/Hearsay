import type { Tick } from '../core/time';
import { threadOf } from '../sim/chronicle';
import { diffClaims, type RumorId } from '../sim/rumors/claim';
import { stanceOf } from '../sim/rumors/propagation';
import type { WorldState } from '../sim/types';

export interface CampaignMetrics {
  family: RumorId;
  reach: number;
  believers: number;
  meanDistortion: number | null;
  halfTownTick: Tick | null;
}

/** Root (parentless) story families in this world, sorted. */
export function familiesOf(world: WorldState): RumorId[] {
  return Object.values(world.claims)
    .filter((c) => c.parent === null)
    .map((c) => c.family)
    .sort();
}

export function campaignMetrics(world: WorldState, family: RumorId): CampaignMetrics {
  const root = Object.values(world.claims).find((c) => c.family === family && c.parent === null);
  if (!root) throw new Error(`campaignMetrics: unknown family '${family}'`);

  const npcIds = Object.keys(world.npcs);
  const holders = npcIds.filter((id) => world.beliefs[id]?.[family] !== undefined);
  const believers = holders.filter((id) => stanceOf(world.beliefs[id]![family]!) === 'believing');
  const distortions = holders.map((id) => diffClaims(root, world.beliefs[id]![family]!.claim).length);

  // First-appearance walk: an NPC's first mention in the thread (inject target or
  // heardBy) is the tick they first held the story — speakers always appear as
  // hearers or targets earlier, so this is exact, not an approximation.
  const seen = new Set<string>();
  const half = Math.ceil(npcIds.length / 2);
  let halfTownTick: Tick | null = null;
  for (const entry of threadOf(world, family)) {
    if (entry.kind === 'inject') seen.add(entry.target);
    else for (const h of entry.heardBy) seen.add(h.id);
    if (halfTownTick === null && seen.size >= half) halfTownTick = entry.tick;
  }

  return {
    family,
    reach: holders.length / npcIds.length,
    believers: believers.length / npcIds.length,
    meanDistortion: distortions.length === 0
      ? null
      : distortions.reduce((a, b) => a + b, 0) / distortions.length,
    halfTownTick,
  };
}
