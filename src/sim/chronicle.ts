import { CLAIM_FIELDS, type EntityId, type RumorId } from './rumors/claim';
import type { Belief, ChronicleEntry, WorldState } from './types';

/**
 * Injections, tellings and séances belonging to one story family, in recorded order.
 * Family membership does not imply a human heardBy list. Optional artifact claim
 * links remain separate debrief associations and do not join this family helper.
 */
export function threadOf(world: WorldState, family: RumorId): Extract<ChronicleEntry, { claimId: string }>[] {
  return world.chronicle.filter(
    (e): e is Extract<ChronicleEntry, { claimId: string }> =>
      (e.kind === 'inject' || e.kind === 'telling' || e.kind === 'seance')
      && world.claims[e.claimId]?.family === family,
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
   * New document viewings carry the exact minted claim identity. Legacy records lack
   * that association and retain the older tick/viewer/page-content fallback. Never use
   * content to override an explicit different claim id: identical pages can be viewed
   * by the same person in one beat and still mint distinct roots. This is explanation
   * only; paper remains private and does not become an overheard utterance.
   */
  return world.chronicle.find(
    (e) => e.kind === 'artifact' && e.tick === belief.firstHeardAt
      && (e.to === npcId || (e.act === 'pickup' && e.by === npcId))
      && (e.claimId === undefined ? pageSays(world, e.artifact, belief)
        : e.claimId === belief.claim.id),
  ) ?? null;
}

/** Does the document this record names carry exactly the words this belief carries? */
function pageSays(world: WorldState, artifactId: string, belief: Belief): boolean {
  const page = world.artifacts?.find((artifact) => artifact.id === artifactId);
  if (page === undefined) return false;
  return CLAIM_FIELDS.every((field) => belief.claim[field] === page.spec[field]);
}
