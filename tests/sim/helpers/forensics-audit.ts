import { expect } from 'vitest';
import type { WorldState } from '../../../src/sim/types';

// Exact copy of the unchanged pillar auditor. Task 3 will consolidate both callers.
export function auditSketch(world: WorldState): void {
  for (const feature of world.enemy.sketch) {
    // Fair-cop law: never empty.
    expect(feature.evidence.length, `feature ${feature.id} (${feature.kind}) has no evidence`).toBeGreaterThanOrEqual(1);

    for (const ref of feature.evidence) {
      // Exactly one id field identifies a ref — a claim ref or a network ref, never both.
      expect(ref.claimId === null || ref.messageId === null,
        `feature ${feature.id} ref ${JSON.stringify(ref)} names two channels at once`).toBe(true);

      // (1) the ref resolves to a captured EvidenceEntry (same tick/observer/claimId/messageId).
      const entry = world.enemy.evidence.find(
        (e) => e.tick === ref.tick && e.observer === ref.observer && e.claimId === ref.claimId
          && (e.network?.messageId ?? null) === ref.messageId);
      expect(entry, `feature ${feature.id} ref ${JSON.stringify(ref)} matches no EvidenceEntry`).toBeDefined();

      // (2) the ref resolves to a chronicle record the observer HEARD at that tick.
      if (ref.messageId !== null) {
        // a network ref → a network-speech row with that id/tick whose heardBy names the observer.
        const speech = world.chronicle.find(
          (c) => c.kind === 'network-speech' && c.tick === ref.tick && c.messageId === ref.messageId
            && c.heardBy.some((h) => h.id === ref.observer));
        expect(speech, `feature ${feature.id} network-ref ${JSON.stringify(ref)} matches no speech heard by ${ref.observer}`).toBeDefined();
      } else if (ref.claimId !== null) {
        // an utterance/answer ref → a telling of that claim whose heardBy names the observer.
        const telling = world.chronicle.find(
          (c) => c.kind === 'telling' && c.tick === ref.tick && c.claimId === ref.claimId &&
            c.heardBy.some((h) => h.id === ref.observer));
        expect(telling, `feature ${feature.id} ref ${JSON.stringify(ref)} matches no telling heard by ${ref.observer}`).toBeDefined();
      } else {
        // an asking ref → an asking at that tick whose heardBy names the observer.
        const asking = world.chronicle.find(
          (c) => c.kind === 'asking' && c.tick === ref.tick && c.heardBy.some((h) => h.id === ref.observer));
        expect(asking, `feature ${feature.id} asking-ref ${JSON.stringify(ref)} matches no asking heard by ${ref.observer}`).toBeDefined();
      }
    }
  }
}
