import { describe, expect, it } from 'vitest';
import { runUntil, step } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import { observationsFor } from '../../src/sim/perception';
import { at } from '../../src/core/time';
import { stableStringify } from '../../src/sim/hash';
import { watchfordWorld } from './helpers/watchford-world';
import type { Belief } from '../../src/sim/types';
import type { SketchFeature } from '../../src/sim/enemy/state';

/**
 * The no-omniscience pillar is decomposed into three provable prongs, NOT a single
 * full-run comparison. A full-run comparison would be INVALID: perturbing a belief and
 * re-running legitimately butterflies the whole town — credence feeds tellability, so a
 * changed belief changes what gets said, which changes what observers capture, which
 * changes the digest. That divergence is honest causality, not the enemy peeking.
 *
 * The honest decomposition:
 *   1. capture-lawfulness  — the enemy reads only observer feeds (Task 7, counterintel.test).
 *   2. digest input-boundedness — the digest is a pure fold over the evidence LOG; hidden
 *      belief state it never sampled cannot move its decision (THIS test, prong 1).
 *   3. the import lint — the digest module cannot even name WorldState (Task 1,
 *      determinism-law.test: "the enemy never imports WorldState").
 * Together they close omniscience without ever asserting a butterfly away.
 */
describe('no omniscience — the digest is bounded to what was observed', () => {
  it('perturbing beliefs the enemy never sampled leaves its decision bit-identical', () => {
    const world = watchfordWorld('omni-1');
    applyInject(world, 'mira', { subject: 'otto', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: SOMEONE });
    // a w1 story too, so rosa (district w1) actually holds beliefs to perturb.
    applyInject(world, 'quill', { subject: 'hugo', predicate: 'is-having-an-affair-with', object: 'rosa',
      count: null, severity: 3, place: null, attribution: SOMEONE });
    runUntil(world, at(2, 0), STANDARD_RULES);

    // A perfect twin, then perturb ONLY hidden minds — never the evidence log.
    const twin = structuredClone(world);

    // (a) move a real belief's credence to an arbitrary hidden value.
    const rosaFamilies = Object.keys(twin.beliefs['rosa']!);
    expect(rosaFamilies.length).toBeGreaterThan(0); // rosa holds beliefs the enemy never captured
    for (const fam of rosaFamilies) twin.beliefs['rosa']![fam]!.credence = 0.11;

    // (b) fabricate an entire belief for a family with ZERO evidence entries — maximally
    //     unobserved: nothing in the evidence log references it.
    const ghostFamily = 'f-ghost';
    expect(world.enemy.evidence.some((e) => e.family === ghostFamily)).toBe(false);
    const ghostClaim: Claim = { id: 'c-ghost', family: ghostFamily, parent: null,
      subject: 'otto', predicate: 'stole', object: null, count: 9, severity: 5, place: null, attribution: 'sten' };
    const ghost: Belief = { claim: ghostClaim, credence: 0.99, heardFrom: 'injected',
      heardAt: 0, firstHeardAt: 0, timesHeard: 3, apparentSources: ['sten'], discretion: false, counterSpun: false };
    twin.beliefs['quill']![ghostFamily] = ghost;

    // The perturbation is real — the two mind-states genuinely differ…
    expect(stableStringify(twin.beliefs)).not.toBe(stableStringify(world.beliefs));
    // …the evidence log the digest folds over does NOT…
    expect(stableStringify(twin.enemy.evidence)).toBe(stableStringify(world.enemy.evidence));
    // …so the decision is bit-for-bit identical.
    expect(stableStringify(enemyDigest(twin.enemy, 2, STANDARD_RULES)))
      .toBe(stableStringify(enemyDigest(world.enemy, 2, STANDARD_RULES)));
  });
});

describe('the mirror — the enemy mind leaks nothing until a countermeasure LANDS', () => {
  it('a sketch feature pushed straight onto the enemy state is invisible to every civilian', () => {
    const build = (): ReturnType<typeof watchfordWorld> => {
      const w = watchfordWorld('mirror-1');
      // give rosa's district something to talk about, identically in both worlds.
      applyInject(w, 'quill', { subject: 'hugo', predicate: 'is-having-an-affair-with', object: 'rosa',
        count: null, severity: 3, place: null, attribution: SOMEONE });
      return w;
    };
    const plain = build();
    const marked = build();

    // Push a sub-threshold feature (one district-activity, no origin-vague anywhere)
    // DIRECTLY onto the enemy state. Non-colliding id, and we do NOT advance
    // featureCounter — this is a raw mind-state poke, not a landed decision.
    const feature: SketchFeature = {
      id: 'sf-test-mirror', kind: 'district-activity', day: 0, family: 'f0', subject: null,
      district: 'w1', detail: 'test-injected feature — never lands as a world fact',
      evidence: [{ tick: 500, observer: 'hugo', claimId: 'c0' }],
    };
    marked.enemy.sketch.push(feature);

    // Drive BOTH through day 0, collecting a civilian's per-step observation stream.
    // The sim never reads enemy.sketch during a step (only the 23:59 digest does, and it
    // only lands overrides for FUTURE days) — so the streams must be byte-identical.
    const stream = (w: ReturnType<typeof watchfordWorld>): string[] => {
      const feeds: string[] = [];
      while (w.tick < at(1, 0)) feeds.push(stableStringify(observationsFor('rosa', step(w, STANDARD_RULES))));
      return feeds;
    };
    expect(stableStringify(stream(marked))).toBe(stableStringify(stream(plain)));
  });
});
