import type { EntityId } from '../rumors/claim';
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
