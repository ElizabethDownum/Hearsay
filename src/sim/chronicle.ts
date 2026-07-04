import type { EntityId, RumorId } from './rumors/claim';
import type { ChronicleEntry, WorldState } from './types';

/** Every recorded event belonging to one story family, in recorded (tick) order. */
export function threadOf(world: WorldState, family: RumorId): ChronicleEntry[] {
  return world.chronicle.filter((e) => world.claims[e.claimId]?.family === family);
}

/**
 * The exact recorded event that delivered the version this mind holds —
 * the fair-cop law says this must exist for every belief.
 */
export function explainBelief(
  world: WorldState, npcId: EntityId, family: RumorId,
): ChronicleEntry | null {
  const belief = world.beliefs[npcId]?.[family];
  if (!belief) return null;
  if (belief.heardFrom === 'injected') {
    return world.chronicle.find(
      (e) => e.kind === 'inject' && e.target === npcId && e.claimId === belief.claim.id,
    ) ?? null;
  }
  return world.chronicle.find(
    (e) => e.kind === 'telling' && e.claimId === belief.claim.id &&
      e.speaker === belief.heardFrom && e.heardBy.some((h) => h.id === npcId),
  ) ?? null;
}
