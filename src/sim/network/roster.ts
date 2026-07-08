import { dayOf } from '../../core/time';
import type { EntityId } from '../rumors/claim';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import type { AssetRecord } from './types';
import { trustBetween } from '../world';

/**
 * The asset record for `id` on either roster — the player's side first, then the enemy's mirror
 * (Task 7). One machinery: recording facts and reading dispositions work the same on both sides.
 * Returns null when `id` is nobody's asset.
 */
export function findAsset(world: WorldState, id: EntityId): AssetRecord | null {
  return world.network.assets.find((a) => a.id === id)
    ?? world.network.enemyAssets.find((a) => a.id === id)
    ?? null;
}

/**
 * Disposition IS the trust edge (asset → player) — amendment #4c, one physics: there is no separate
 * disposition store, so a debrief strike or a landed rumor that moves the edge moves the disposition.
 * 0 in a headless (player-free) world, where the edge has no target.
 */
export function dispositionOf(world: WorldState, asset: EntityId): number {
  return world.playerId === null ? 0 : trustBetween(world, asset, world.playerId);
}

/**
 * The one spending predicate every player VERB checks before it mutates (validate-before-mutate):
 * a recruit/courier/host/drop that can't be covered REFUSES with zero residue. Distinct from the
 * nightly WAGE shortfall, which never refuses — it slides disposition instead (see payWagesNightly).
 */
export function canAfford(world: WorldState, cost: number): boolean {
  return world.coin >= cost;
}

/**
 * Debit the treasury. The caller must already have refused when `!canAfford` — this asserts that
 * contract rather than letting a verb silently drive coin negative (a spend is never a slow leak).
 */
export function debitCoin(world: WorldState, cost: number): void {
  if (world.coin < cost) throw new Error(`debitCoin: unaffordable spend of ${cost} (treasury holds ${world.coin})`);
  world.coin -= cost;
}

/**
 * Set the asset → player disposition edge (amendment #4c: disposition IS this edge). Creates a
 * 'friend' edge (Task 3's disclosed convention for player-facing trust) at `trust` when absent, or
 * raises the existing edge to `trust`. EDGES-ONLY: recruit never writes traits/schedule/rivals, so
 * the fixture-aliasing clone (M1) stays sound. No-op in a headless world (nobody to trust).
 */
export function setDispositionEdge(world: WorldState, asset: EntityId, trust: number): void {
  const playerId = world.playerId;
  if (playerId === null) return;
  const npc = world.npcs[asset];
  if (!npc) return;
  const edge = npc.edges.find((e) => e.to === playerId);
  if (edge) edge.trust = trust;
  else npc.edges.push({ to: playerId, kind: 'friend', trust });
}

/** Nudge an asset's disposition edge by `delta`, clamped to [0, 1]. Only an existing edge moves —
 *  a missing edge already reads 0 (dispositionOf), which a negative slide can't go below. */
function slideDisposition(world: WorldState, asset: EntityId, delta: number): void {
  const playerId = world.playerId;
  if (playerId === null) return;
  const edge = world.npcs[asset]?.edges.find((e) => e.to === playerId);
  if (edge) edge.trust = Math.max(0, Math.min(1, edge.trust + delta));
}

/**
 * The weekly payroll, run on the rest-day nightly (step.ts) AFTER the stipend credits — the pinned
 * order: a treasury the stipend just topped up covers payroll that same night. Every player-side
 * asset (dossier freebies included — a uniform rule) draws `wagePerInformantPerWeek`, in ascending
 * id order (deterministic). A shortfall NEVER refuses: the unpaid asset takes a strike and its
 * disposition slides −0.05 (toward Task 8's flip window). No-op in a headless world.
 */
export function payWagesNightly(world: WorldState, rules: Rules): void {
  if (world.playerId === null) return;
  const wage = rules.economy.wagePerInformantPerWeek;
  const day = dayOf(world.tick);
  for (const asset of [...world.network.assets].sort((a, b) => a.id.localeCompare(b.id))) {
    if (world.coin >= wage) {
      world.coin -= wage;
      asset.wagePaidThroughDay = day;
    } else {
      asset.strikes += 1;
      slideDisposition(world, asset.id, -0.05);
    }
  }
}
