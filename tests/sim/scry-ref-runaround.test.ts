import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { step } from '../../src/sim/step';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import type { EnemyState, SketchEvidenceRef, SketchFeature } from '../../src/sim/enemy/state';
import { scryWorld } from './helpers/scry-world';

function paidPhysicalRefs(): { enemy: EnemyState; refs: SketchEvidenceRef[] } {
  const world = scryWorld();
  world.coin = 30;
  for (let i = 0; i < 2; i += 1) applyAction(world,
    { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 15 }, R);
  world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
  world.tick = 1440;
  step(world, R);
  const captured = world.enemy.evidence.filter((entry) => entry.kind === 'arcane-residue');
  expect(captured).toHaveLength(2);
  const refs = captured.map((entry) => {
    // Project each captured trace independently through the shipped ref(e) consumer.
    // This does not change the real rule's one-feature-per-venue dedupe.
    const feature = enemyDigest({ ...world.enemy, evidence: [entry], sketch: [] }, 1, R)
      .features.find((row) => row.kind === 'arcane-residue');
    expect(feature).toMatchObject({ subject: null, family: null, venue: 'hall' });
    const ref = feature?.evidence[0];
    if (ref === undefined) throw new Error('fixture needs a captured physical reference');
    return ref;
  });
  expect(refs.map((ref) => ref.residue?.id)).toEqual(['s0', 's1']);
  for (const ref of refs) expect(ref).toMatchObject({
    tick: 1440, observer: 'boss', claimId: null, messageId: null,
    residue: { witness: 'boss', observedAt: 1440 },
  });
  return { enemy: world.enemy, refs };
}

/** Generic subjectful ref/copy contract, not a claim that Task 3 emitted these leads. */
function stagedRunaroundState(enemy: EnemyState, refs: readonly SketchEvidenceRef[]): EnemyState {
  const sketch: SketchFeature[] = refs.map((ref, index) => ({
    id: `physical-lead-${index}`, kind: 'carrier-profile', day: 1, family: null,
    subject: 'citizen', district: 'd0', detail: 'staged physical-reference contract lead',
    evidence: [cloneSerializable(ref)],
  }));
  return {
    ...enemy, sketch, featureCounter: sketch.length,
    actionLedger: sketch.map((lead, index) => ({
      orderKey: `watch:d0#${index}`, kind: 'watch', directiveIds: [`staged-receipt-${index}`],
      leadFeatureId: lead.id, subject: 'citizen', about: { subject: 'citizen' }, district: 'd0',
      scheduleStartDay: 2, posts: [{ guard: 'guard', venue: 'hall' }],
      workedDays: [2, 3], askedAt: null,
    })),
  };
}

describe('physical reference identity through the real runaround consumer', () => {
  it.each(['exact-physical-clone', 'different-residue', 'physical-versus-legacy', 'exact-legacy-clone'] as const)(
    'prices each distinct reference trail once: %s', (mode) => {
      const { enemy, refs } = paidPhysicalRefs();
      const physical = refs[0]!;
      const legacy: SketchEvidenceRef = {
        tick: physical.tick, observer: physical.observer, claimId: null, messageId: null,
      };
      const first = mode === 'exact-legacy-clone' ? legacy : physical;
      const second = mode === 'different-residue' ? refs[1]!
        : mode === 'physical-versus-legacy' ? legacy : cloneSerializable(first);
      expect([second.tick, second.observer, second.claimId, second.messageId])
        .toEqual([first.tick, first.observer, first.claimId, first.messageId]);
      if (mode === 'exact-physical-clone' || mode === 'exact-legacy-clone') {
        expect(second).toEqual(first);
        expect(second).not.toBe(first);
      } else if (mode === 'different-residue') {
        expect(second.residue).toEqual({ ...first.residue!, id: 's1' });
        expect(first.residue!.id).toBe('s0');
      } else {
        expect(Object.hasOwn(first, 'residue')).toBe(true);
        expect(Object.hasOwn(second, 'residue')).toBe(false);
      }
      const state = stagedRunaroundState(enemy, [first, second]);
      const before = stableStringify(state);
      const decision = enemyDigest(state, 4, R);
      const runarounds = decision.features.filter((row) => row.kind === 'runaround');
      const distinct = mode === 'different-residue' || mode === 'physical-versus-legacy';
      expect(runarounds).toHaveLength(distinct ? 2 : 1);
      expect(runarounds.map((row) => row.evidence))
        .toEqual(distinct ? [[first], [second]] : [[first]]);
      expect((decision.tailDrops ?? []).map((row) => row.leadFeatureId))
        .toEqual(distinct ? ['physical-lead-0', 'physical-lead-1'] : ['physical-lead-0']);
      if (mode === 'exact-legacy-clone') {
        expect(Object.hasOwn(runarounds[0]!.evidence[0]!, 'residue')).toBe(false);
      }
      expect(stableStringify(state)).toBe(before);
    },
  );

  it('derived residue refs retain equal values in independent nested objects', () => {
    const { enemy, refs } = paidPhysicalRefs();
    const state = stagedRunaroundState(enemy, [refs[0]!]);
    const lead = state.sketch[0]!;
    const originalRefs = cloneSerializable(lead.evidence);
    const before = stableStringify(state);
    const decision = enemyDigest(state, 4, R);
    const derived = decision.features.find((row) => row.kind === 'runaround');
    if (derived === undefined) throw new Error('fixture needs a derived runaround');
    expect(derived.evidence).toEqual(originalRefs);
    expect(derived.evidence).not.toBe(lead.evidence);
    expect(derived.evidence[0]).not.toBe(lead.evidence[0]);
    const copy = derived.evidence[0]!.residue;
    const original = lead.evidence[0]!.residue;
    if (copy === undefined || original === undefined) throw new Error('fixture needs nested residue refs');
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    copy.id = 'changed-after-derivation';
    copy.witness = 'changed-witness';
    copy.observedAt += 15;
    expect(lead.evidence).toEqual(originalRefs);
    expect(stableStringify(state)).toBe(before);
  });
});
