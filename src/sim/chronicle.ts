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
  const telling = world.chronicle.find(
    (e) => e.kind === 'telling' && e.claimId === belief.claim.id &&
      e.speaker === belief.heardFrom && e.heardBy.some((h) => h.id === npcId),
  );
  if (telling) return telling;
  /**
   * Plan 9: the fair-cop law reaches EVIDENCE too. A belief a document anchored was delivered by an
   * artifact act, which is not a telling — showing paper is not speech, so `ArtifactRecord` carries
   * neither a claim id nor a `heardBy` list. It is matched on what it does carry: the tick the page
   * was put in front of this mind (`firstHeardAt`, which artifact ingestion sets to the act's tick)
   * and the viewer — named as `to` for a show/hand-over/re-show, and as `by` for a pickup, where the
   * finder is their own source.
   */
  return world.chronicle.find(
    (e) => e.kind === 'artifact' && e.tick === belief.firstHeardAt
      && (e.to === npcId || (e.act === 'pickup' && e.by === npcId)),
  ) ?? null;
}
