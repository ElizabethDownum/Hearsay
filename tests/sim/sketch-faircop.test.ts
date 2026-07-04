import { describe, expect, it } from 'vitest';
import { runUntil } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { watchfordWorld } from './helpers/watchford-world';

/**
 * The sketch fair-cop audit — a permanent property test in the spirit of the Plan-2
 * provenance audit. Every accusation the enemy will ever put on the Counter-Sketch
 * board must be EXPLAINABLE from the chronicle: each feature carries ≥1 evidence ref,
 * and every ref resolves both to a captured EvidenceEntry AND to the chronicle record
 * the named observer actually heard. This is the debrief substrate guarantee — no
 * feature may float free of a witnessed event.
 */
describe('sketch fair-cop — every feature traces to a chronicle record the observer heard', () => {
  it('holds over an emergent multi-day Watchford world', () => {
    const world = watchfordWorld('faircop-1');
    applyInject(world, 'mira', { subject: 'otto', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: SOMEONE });
    applyInject(world, 'quill', { subject: 'hugo', predicate: 'is-having-an-affair-with', object: 'rosa',
      count: null, severity: 3, place: null, attribution: SOMEONE });
    runUntil(world, at(4, 0), STANDARD_RULES);

    // Non-vacuous: the emergent run must actually have grown a sketch to audit.
    expect(world.enemy.sketch.length).toBeGreaterThan(0);

    for (const feature of world.enemy.sketch) {
      // Fair-cop law: never empty.
      expect(feature.evidence.length, `feature ${feature.id} (${feature.kind}) has no evidence`).toBeGreaterThanOrEqual(1);

      for (const ref of feature.evidence) {
        // (1) the ref resolves to a captured EvidenceEntry (same tick/observer/claimId).
        const entry = world.enemy.evidence.find(
          (e) => e.tick === ref.tick && e.observer === ref.observer && e.claimId === ref.claimId);
        expect(entry, `feature ${feature.id} ref ${JSON.stringify(ref)} matches no EvidenceEntry`).toBeDefined();

        // (2) the ref resolves to a chronicle record the observer HEARD at that tick.
        if (ref.claimId !== null) {
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
  });
});
