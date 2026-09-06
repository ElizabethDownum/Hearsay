import { CLAIM_FIELDS, type EntityId, type RumorId } from './rumors/claim';
import type { Belief, ChronicleEntry, WorldState } from './types';

/**
 * Every recorded event belonging to one story family, in recorded (tick) order. Only
 * claimId-bearing records (tellings, injects and séances) belong to a single family; membership
 * does not imply a human `heardBy` list. Endings carry a `claimIds` list spanning families, so the
 * `'claimId' in e` guard rightly excludes them and the narrowed return type keeps callers from
 * reaching for fields an InstitutionRecord lacks.
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
   * was put in front of this mind (`firstHeardAt`, which artifact ingestion sets to the act's tick),
   * the viewer — named as `to` for a show/hand-over/re-show, and as `by` for a pickup, where the finder
   * is their own source — AND the page itself.
   *
   * The page is the third term because the first two are not enough (review finding I-4): a beat can
   * deliver TWO documents to one mind — a pickup and another holder's re-show resolve in the same
   * beat-tail pass — and both beliefs then carry the same `firstHeardAt`. Matching on tick and viewer
   * alone handed both of them the first record, so one belief was explained by a page it never read.
   * The record's artifact must say what the belief says, field for field.
   *
   * Residual, lawful and deliberate: two documents with IDENTICAL text delivered to one viewer in one
   * beat are indistinguishable BY CONTENT, so which of the two explanations each belief gets is
   * arbitrary. Both answers are true statements about a page that really did put those words in that
   * mind at that tick. Distinct pages, or distinct beats, resolve exactly.
   */
  return world.chronicle.find(
    (e) => e.kind === 'artifact' && e.tick === belief.firstHeardAt
      && (e.to === npcId || (e.act === 'pickup' && e.by === npcId))
      && pageSays(world, e.artifact, belief),
  ) ?? null;
}

/** Does the document this record names carry exactly the words this belief carries? */
function pageSays(world: WorldState, artifactId: string, belief: Belief): boolean {
  const page = world.artifacts?.find((artifact) => artifact.id === artifactId);
  if (page === undefined) return false;
  return CLAIM_FIELDS.every((field) => belief.claim[field] === page.spec[field]);
}
