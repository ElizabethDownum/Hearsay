import { describe, expect, it } from 'vitest';
import { buildWorld, buildTownMap } from '../../src/sim/world';
import { captureEvidence } from '../../src/sim/counterintel';
import { runUntil } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import { WATCHFORD, WATCHFORD_GUARDS } from '../../src/content/fixtures/watchford';
import { at } from '../../src/core/time';
import type { TickEvents } from '../../src/sim/perception';
import { stableStringify } from '../../src/sim/hash';

function watchfordWorld(seed: string) {
  const world = buildWorld(WATCHFORD, seed);
  world.enemy.observers = WATCHFORD_GUARDS.map((g) => ({ ...g }));
  world.enemy.map = buildTownMap(WATCHFORD);
  return world;
}

function claimOf(world: ReturnType<typeof watchfordWorld>, predicate: string, severity: 1|2|3|4|5): Claim {
  // helper: mint via applyInject to keep ids replay-stable, then read it back
  const c = applyInject(world, 'mira', { subject: 'otto', predicate, object: null,
    count: 2, severity, place: null, attribution: SOMEONE });
  return c;
}

function eventsWith(world: ReturnType<typeof watchfordWorld>, u: Partial<TickEvents['utterances'][number]>): TickEvents {
  return {
    tick: world.tick, positions: {}, askings: [],
    utterances: [{
      tick: world.tick, venue: 'square-w1', circleMembers: ['hugo', 'quill', 'rosa'],
      speaker: 'quill', addressedTo: 'rosa', claim: claimOf(world, 'owes-money-to', 3),
      mode: 'telling', ...u,
    }],
  };
}

describe('vigilance and addressing', () => {
  it('a dull guard misses boring overheard talk; the same words addressed to him are always recorded', () => {
    const worldA = watchfordWorld('cap-1');
    captureEvidence(worldA, eventsWith(worldA, {}), STANDARD_RULES);
    // owes-money-to: juiciness 0.35 < 1 - 0.3 → hugo (overhearing) records nothing
    expect(worldA.enemy.evidence).toHaveLength(0);

    const worldB = watchfordWorld('cap-2');
    captureEvidence(worldB, eventsWith(worldB, { addressedTo: 'hugo' }), STANDARD_RULES);
    expect(worldB.enemy.evidence).toHaveLength(1);
    expect(worldB.enemy.evidence[0]!).toMatchObject({ observer: 'hugo', overheard: false, kind: 'utterance' });
  });

  it('juicy talk clears a dull ear: stole (0.8) ≥ 1 − 0.3', () => {
    const world = watchfordWorld('cap-3');
    const events = eventsWith(world, { claim: claimOf(world, 'stole', 3) });
    captureEvidence(world, events, STANDARD_RULES);
    expect(world.enemy.evidence).toHaveLength(1);
  });
});

describe('reports pass through trait physics', () => {
  it("an exaggerator guard's report doubles counts and bumps severity — the true claim is untouched", () => {
    const world = watchfordWorld('cap-4');
    const claim = claimOf(world, 'stole', 3);
    const events: TickEvents = {
      tick: world.tick, positions: {}, askings: [],
      utterances: [{ tick: world.tick, venue: 'square-w0', circleMembers: ['gale', 'mira', 'otto'],
        speaker: 'mira', addressedTo: 'otto', claim, mode: 'telling' }],
    };
    captureEvidence(world, events, STANDARD_RULES);
    const entry = world.enemy.evidence[0]!;
    expect(entry.observer).toBe('gale');
    expect(entry.reported!.count).toBe(4);       // 2 × 2
    expect(entry.reported!.severity).toBe(4);    // 3 + 1
    expect(world.claims[claim.id]!.severity).toBe(3);
  });
});

describe('capture is lawful — feeds only', () => {
  it('a telling in a circle containing no observer leaves zero evidence', () => {
    const world = watchfordWorld('cap-5');
    const claim = claimOf(world, 'stole', 5);
    const events: TickEvents = {
      tick: world.tick, positions: {}, askings: [],
      utterances: [{ tick: world.tick, venue: 'home-mo', circleMembers: ['mira', 'otto'],
        speaker: 'mira', addressedTo: 'otto', claim, mode: 'telling' }],
    };
    captureEvidence(world, events, STANDARD_RULES);
    expect(world.enemy.evidence).toHaveLength(0);
  });

  it('askings are always evidence', () => {
    const world = watchfordWorld('cap-6');
    const events: TickEvents = {
      tick: world.tick, positions: {}, utterances: [],
      askings: [{ tick: world.tick, venue: 'square-w1', circleMembers: ['hugo', 'quill', 'rosa'],
        speaker: 'quill', addressedTo: 'rosa', about: { family: 'f0' }, authority: false }],
    };
    captureEvidence(world, events, STANDARD_RULES);
    expect(world.enemy.evidence).toHaveLength(1);
    expect(world.enemy.evidence[0]!).toMatchObject({ kind: 'asking', claimId: null, family: 'f0' });
  });
});

describe('integration through step', () => {
  it('a juicy injection into Watchford leaves guard evidence within a day, deterministically', () => {
    const run = () => {
      const world = watchfordWorld('cap-7');
      applyInject(world, 'mira', { subject: 'otto', predicate: 'stole', object: null,
        count: 2, severity: 4, place: null, attribution: SOMEONE });
      runUntil(world, at(1, 0), STANDARD_RULES);
      return world;
    };
    const world = run();
    expect(world.enemy.evidence.length).toBeGreaterThan(0);
    expect(stableStringify(run().enemy.evidence)).toBe(stableStringify(world.enemy.evidence));
  });
});
