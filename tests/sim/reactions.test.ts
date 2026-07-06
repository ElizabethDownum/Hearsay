import { describe, expect, it } from 'vitest';
import { buildWorld } from '../../src/sim/world';
import { runUntil } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { ingest } from '../../src/sim/rumors/propagation';
import { reactToSelfRumor, counterSpinPredicate } from '../../src/sim/reactions';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { miniTown } from './helpers/minitown';

const RULES = STANDARD_RULES;

describe('investigate: damaging self-rumor pulls an observable asking', () => {
  it('the subject hears dirt about themselves and starts asking their circle who told them', () => {
    const world = buildWorld(miniTown(), 'react-1');
    // bez hears a damaging story about DOV, retells it in the square circle; dov ingests → reacts
    applyInject(world, 'bez', { subject: 'dov', predicate: 'stole', object: null,
      count: 3, severity: 4, place: null, attribution: SOMEONE });
    runUntil(world, at(0, 2), RULES);
    // dov now holds a belief about himself and has enqueued a self-inquiry…
    expect(world.beliefs['dov']!['f0']).toBeDefined();
    expect((world.inquiries['dov'] ?? []).some((task) => 'family' in task.about && task.about.family === 'f0')).toBe(true);
    // …and the asking lands in the chronicle, observable to bystanders (the bait exploit)
    runUntil(world, at(0, 8), RULES);
    const asking = world.chronicle.find((e) => e.kind === 'asking' && e.speaker === 'dov');
    expect(asking).toBeDefined();
    if (asking?.kind === 'asking') expect(asking.heardBy.length).toBeGreaterThan(0);
  });

  it('re-hearing does not stack duplicate inquiry tasks', () => {
    const world = buildWorld(miniTown(), 'react-2');
    applyInject(world, 'bez', { subject: 'dov', predicate: 'stole', object: null,
      count: 3, severity: 4, place: null, attribution: SOMEONE });
    runUntil(world, at(0, 12), RULES);
    const tasks = (world.inquiries['dov'] ?? []).filter((task) => 'family' in task.about && task.about.family === 'f0');
    expect(tasks.length).toBeLessThanOrEqual(1);
  });
});

describe('counter-spin: a corroborated damaging self-rumor pulls a counter-story', () => {
  function corroboratedSelfRumor() {
    const world = buildWorld(miniTown(), 'react-3');
    const claim = { id: 'c50', family: 'f50', parent: null, subject: 'dov' as const,
      predicate: 'stole', object: null, count: null, severity: 3 as const, place: null, attribution: SOMEONE };
    world.claims['c50'] = claim;
    ingest(world, 'dov', { tick: 0, speaker: 'ada', claim }, true, RULES);
    reactToSelfRumor(world, 'dov', 'f50', 0, RULES);           // first hearing → investigate only
    expect(world.chronicle.filter((e) => e.kind === 'inject')).toHaveLength(0);
    ingest(world, 'dov', { tick: 30, speaker: 'bez', claim }, true, RULES); // corroboration
    reactToSelfRumor(world, 'dov', 'f50', 30, RULES);
    return world;
  }

  it('fires exactly once, as a flattering self-inject recorded with by=dov', () => {
    const world = corroboratedSelfRumor();
    const spins = world.chronicle.filter((e) => e.kind === 'inject');
    expect(spins).toHaveLength(1);
    const spin = spins[0]!;
    if (spin.kind === 'inject') {
      expect(spin.by).toBe('dov');
      expect(spin.target).toBe('dov');
      const claim = world.claims[spin.claimId]!;
      expect(claim.subject).toBe('dov');
      // Re-encoded (P6-T1): the old always-rescued-the-drowning-child pin was an
      // artifact of the pre-spread convergence bug. Assert the spun story is
      // flattering and that the picker is stable for this (family, owner) pair.
      expect(RULES.predicates[claim.predicate]?.valence).toBe('flattering');
      expect(counterSpinPredicate(RULES, 'f50', 'dov')).toBe(claim.predicate);
      expect(claim.attribution).toBe(SOMEONE);
    }
    expect(world.beliefs['dov']!['f50']!.counterSpun).toBe(true);
    // a third hearing must NOT spin again
    ingest(world, 'dov', { tick: 60, speaker: 'cyn', claim: world.claims['c50']! }, true, RULES);
    reactToSelfRumor(world, 'dov', 'f50', 60, RULES);
    expect(world.chronicle.filter((e) => e.kind === 'inject')).toHaveLength(1);
  });

  it('the counter-story actually travels (integration through step)', () => {
    const world = corroboratedSelfRumor();
    runUntil(world, at(1, 0), RULES);
    const spinFamily = Object.values(world.claims).find(
      (c) => c.parent === null && c.subject === 'dov' && RULES.predicates[c.predicate]?.valence === 'flattering',
    )!.family;
    const holders = Object.keys(world.npcs).filter((id) => id !== 'dov' && world.beliefs[id]?.[spinFamily]);
    expect(holders.length).toBeGreaterThan(0);
  });
});

describe('amplify and shrug', () => {
  it('flattering self-rumor: credence floors at REPEAT and the subject spreads their own flattery', () => {
    const world = buildWorld(miniTown(), 'react-4');
    applyInject(world, 'bez', { subject: 'dov', predicate: 'rescued-the-drowning-child', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    runUntil(world, at(0, 6), RULES);
    const belief = world.beliefs['dov']!['f0'];
    expect(belief).toBeDefined();
    expect(belief!.credence).toBeGreaterThanOrEqual(0.5);
    runUntil(world, at(1, 0), RULES);
    expect(world.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'dov')).toBe(true);
  });

  it('neutral valence: no reaction at all', () => {
    const world = buildWorld(miniTown(), 'react-5');
    const neutralRules = {
      ...RULES,
      predicates: { ...RULES.predicates, 'was-seen-at': { id: 'was-seen-at', juiciness: 0.4, sinVersion: null, factionRelevant: false, valence: 'neutral' as const } },
    };
    const claim = { id: 'c60', family: 'f60', parent: null, subject: 'dov' as const,
      predicate: 'was-seen-at', object: null, count: null, severity: 2 as const, place: null, attribution: SOMEONE };
    world.claims['c60'] = claim;
    ingest(world, 'dov', { tick: 0, speaker: 'ada', claim }, true, neutralRules);
    const before = JSON.stringify([world.inquiries, world.chronicle.length, world.beliefs['dov']!['f60']!.credence]);
    reactToSelfRumor(world, 'dov', 'f60', 0, neutralRules);
    const after = JSON.stringify([world.inquiries, world.chronicle.length, world.beliefs['dov']!['f60']!.credence]);
    expect(after).toBe(before);
  });
});

describe('counter-spin spread: (family, owner) keyed, no town-wide convergence', () => {
  it('counter-spin varies by (family, owner) — no town-wide convergence on one story', () => {
    const picks = new Set<string>();
    for (const family of ['fam-a', 'fam-b', 'fam-c', 'fam-d', 'fam-e', 'fam-f']) {
      for (const owner of ['ada', 'bez', 'cyn']) {
        const p = counterSpinPredicate(STANDARD_RULES, family, owner);
        expect(p).not.toBeNull();
        expect(STANDARD_RULES.predicates[p!]!.valence).toBe('flattering');
        picks.add(p!);
      }
    }
    // 18 draws over the top-3 flattering pool: at least 2 distinct stories must appear.
    expect(picks.size).toBeGreaterThanOrEqual(2);
  });

  it('counter-spin is stable per (family, owner)', () => {
    expect(counterSpinPredicate(STANDARD_RULES, 'fam-x', 'ada'))
      .toBe(counterSpinPredicate(STANDARD_RULES, 'fam-x', 'ada'));
  });
});
