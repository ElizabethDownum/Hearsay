import { describe, expect, it } from 'vitest';
import { runUntil } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import type { DirectiveBrief } from '../../src/sim/directives/types';
import type { Npc, TownFixture, WorldState } from '../../src/sim/types';
import { watchfordWorld } from './helpers/watchford-world';

/**
 * The sketch fair-cop audit — a permanent property test in the spirit of the Plan-2
 * provenance audit. Every accusation the enemy will ever put on the Counter-Sketch
 * board must be EXPLAINABLE from the chronicle: each feature carries ≥1 evidence ref,
 * and every ref resolves both to a captured EvidenceEntry AND to the chronicle record
 * the named observer actually heard. This is the debrief substrate guarantee — no
 * feature may float free of a witnessed event.
 *
 * Task 12 widens the audit to the SECOND channel a ref can name: a network ref resolves by
 * `(tick, observer, messageId)` against a `network-speech` chronicle row the observer heard.
 */
function auditSketch(world: WorldState): void {
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

describe('sketch fair-cop — every feature traces to a chronicle record the observer heard', () => {
  it('holds over an emergent multi-day Watchford world', () => {
    const world = watchfordWorld('faircop-1');
    world.network.spymaster = 'gale'; // embodied handler's own heard feed drives the fair-cop chain
    applyInject(world, 'mira', { subject: 'otto', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: SOMEONE });
    applyInject(world, 'quill', { subject: 'hugo', predicate: 'is-having-an-affair-with', object: 'rosa',
      count: null, severity: 3, place: null, attribution: SOMEONE });
    runUntil(world, at(4, 0), STANDARD_RULES);

    // Non-vacuous: the emergent run must actually have grown a sketch to audit.
    expect(world.enemy.sketch.length).toBeGreaterThan(0);
    auditSketch(world);
  });

  it('holds for a NETWORK ref too — a brief lead resolves to the speech the spymaster heard', () => {
    const npc = (id: string, home: string, occupation = 'grocer'): Npc => ({
      id, name: id, home, occupation, faction: 'none', traits: ['literalist'],
      rivals: [], schedule: [{ days: 'all', from: 0, to: 1439, venue: home }], edges: [],
    });
    const fixture: TownFixture = {
      venues: [
        { id: 'square', district: 'd0', access: 'public' },
        { id: 'home-mira', district: 'd0', access: 'private' },
      ],
      npcs: [npc('boss', 'square', 'clerk'), npc('gale', 'square', 'guard'),
        npc('mira', 'home-mira'), npc('mole', 'square')],
    };
    const world = buildWorld(fixture, 'faircop-network', STANDARD_RULES);
    world.enemy.map = buildTownMap(fixture);
    world.enemy.observers = [{ id: 'gale', vigilance: 1 }];
    world.network.spymaster = 'boss';
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push({
      id: 'mole', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true,
    });
    world.npcs.mole!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });

    const brief: DirectiveBrief = {
      mission: { kind: 'shape', operation: 'spread', redirectTo: null,
        audience: { kind: 'person', id: 'mira' },
        payload: { family: 'f-decoy', parent: null, claim: { subject: 'mira', predicate: 'stole',
          object: null, count: 2, severity: 4, place: null, attribution: SOMEONE } } },
      priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 0, until: at(0, 23, 59) },
      report: 'outcome', reportBy: null, purpose: null,
    };
    const log: Action[] = [{ tick: 0, kind: 'directive', recipient: 'mole',
      handoff: { outboundVia: [], reportVia: [] }, brief }];
    runLogOn(world, STANDARD_RULES, log, at(1, 0));

    // Non-vacuous in the exact new way: at least one ref names a MESSAGE, not a claim.
    const networkRefs = world.enemy.sketch.flatMap((f) => f.evidence)
      .filter((ref) => ref.messageId !== null);
    expect(networkRefs.length).toBeGreaterThan(0);
    expect(world.enemy.sketch.some((f) => f.subject === 'mira')).toBe(true);
    auditSketch(world);
  });
});
