import type { EntityId, RumorId } from './rumors/claim';
import type { ChronicleEntry, WorldState } from './types';

/**
 * Every recorded event belonging to one story family, in recorded (tick) order. Only
 * claimId-bearing records (tellings, injects) belong to a single family — endings carry a
 * `claimIds` list spanning families, so the `'claimId' in e` guard rightly excludes them and
 * the narrowed return type keeps callers from reaching for fields an InstitutionRecord lacks.
 */
export function threadOf(world: WorldState, family: RumorId): Extract<ChronicleEntry, { claimId: string }>[] {
  return world.chronicle.filter(
    (e): e is Extract<ChronicleEntry, { claimId: string }> =>
      'claimId' in e && world.claims[e.claimId]?.family === family,
  );
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
  if (belief.heardFrom === 'injected' || belief.heardFrom === 'witnessed') {
    return world.chronicle.find(
      (e) => e.kind === 'inject' && e.target === npcId && e.claimId === belief.claim.id,
    ) ?? null;
  }
  return world.chronicle.find(
    (e) => e.kind === 'telling' && e.claimId === belief.claim.id &&
      e.speaker === belief.heardFrom && e.heardBy.some((h) => h.id === npcId),
  ) ?? null;
}
