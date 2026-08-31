import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type ActionLog } from '../../src/sim/campaign';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { HEARSAY_CEILING } from '../../src/sim/rumors/propagation';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { ARTIFACT_CREDENCE, applyForge, artifactsOf, isUsable } from '../../src/sim/artifacts';
import type { InjectSpec } from '../../src/sim/actions';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import type { WorldState } from '../../src/sim/types';
import { miniTown } from './helpers/minitown';

/**
 * Plan 9 Task 1 — ARTIFACTS: the paper that outranks every mouth.
 *
 * This file pins the FORGE half of the verb set: what a forged document IS (fixed text, replay-stable
 * id, exactly one of held/planted), what it costs, when it becomes usable, and the lazy-state law that
 * keeps an unforged world byte-identical to the one Plan 11 shipped.
 */
const RULES = STANDARD_RULES;

const SPEC = {
  subject: 'cyn', predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'square', attribution: SOMEONE,
};

function staged(seed = 'artifact-1'): WorldState {
  const world = buildWorld(miniTown(), seed, RULES);
  enrollPlayer(world, { home: 'square' });
  return world;
}

describe('the evidence hierarchy — ARTIFACT_CREDENCE is the ONE number above the ceiling', () => {
  it('is exactly 0.97 and sits strictly above HEARSAY_CEILING', () => {
    expect(ARTIFACT_CREDENCE).toBe(0.97);
    expect(ARTIFACT_CREDENCE).toBeGreaterThan(HEARSAY_CEILING);
  });
});

describe('forge — a document is priced, replay-stable, and lazily stored', () => {
  it('an untouched world carries NO artifact state at all (the lazy-state law)', () => {
    const world = staged();
    expect(world.artifacts).toBeUndefined();
    expect(world.artifactCounter).toBeUndefined();
    const serialized = stableStringify(world);
    expect(serialized).not.toContain('"artifacts"');
    expect(serialized).not.toContain('"artifactCounter"');
    expect(artifactsOf(world)).toEqual([]);
  });

  it('debits economy.forgery and mints a0, a1 … in forge order', () => {
    const world = staged();
    const before = world.coin;
    applyForge(world, SPEC, at(0, 8), RULES);
    applyForge(world, { ...SPEC, severity: 5 }, at(0, 9), RULES);
    expect(world.coin).toBe(before - 2 * RULES.economy.forgery);
    expect(RULES.economy.forgery).toBe(6);
    expect(artifactsOf(world).map((a) => a.id)).toEqual(['a0', 'a1']);
    expect(world.artifactCounter).toBe(2);
  });

  it('the fresh document is held by the avatar, planted nowhere, and authored by the player', () => {
    const world = staged();
    applyForge(world, SPEC, at(0, 8), RULES);
    const artifact = artifactsOf(world)[0]!;
    expect(artifact.heldBy).toBe('you');
    expect(artifact.plantedAt).toBeNull();
    expect(artifact.author).toBe('player');
    expect(artifact.forgedTick).toBe(at(0, 8));
    expect(artifact.spec).toEqual(SPEC);
  });

  it('the spec is COPIED, not aliased — documents do not mutate under their author', () => {
    const world = staged();
    const mutable: InjectSpec = { ...SPEC };
    applyForge(world, mutable, at(0, 8), RULES);
    mutable.severity = 1;
    expect(artifactsOf(world)[0]!.spec.severity).toBe(4);
  });

  it('records the forgery in the chronicle as an artifact record', () => {
    const world = staged();
    applyForge(world, SPEC, at(0, 8), RULES);
    const record = world.chronicle.find((entry) => entry.kind === 'artifact')!;
    expect(record).toEqual({
      kind: 'artifact', tick: at(0, 8), act: 'forge', artifact: 'a0', by: 'you', to: null,
    });
  });

  it('an unaffordable forgery REFUSES with zero residue', () => {
    const world = staged();
    world.coin = RULES.economy.forgery - 1;
    expect(() => applyForge(world, SPEC, at(0, 8), RULES)).toThrow(/treasury/);
    expect(world.coin).toBe(RULES.economy.forgery - 1);
    expect(world.artifacts).toBeUndefined();
    expect(world.chronicle).toEqual([]);
  });

  it('a headless world has nobody to hold the paper', () => {
    const world = buildWorld(miniTown(), 'artifact-headless', RULES);
    expect(() => applyForge(world, SPEC, at(0, 8), RULES)).toThrow(/no player/);
  });
});

describe("the forger's lead time — a document is usable the day AFTER it is made", () => {
  it('is unusable all through the forging day and usable from the next dawn', () => {
    const world = staged();
    applyForge(world, SPEC, at(0, 8), RULES);
    const artifact = artifactsOf(world)[0]!;
    expect(isUsable(artifact, at(0, 8))).toBe(false);
    expect(isUsable(artifact, at(0, 23, 45))).toBe(false);
    expect(isUsable(artifact, at(1, 0))).toBe(true);
    expect(isUsable(artifact, at(5, 12))).toBe(true);
  });
});

describe('forge through the dispatcher — one typed verb, replay-stable', () => {
  it('applyAction routes the forge kind and refuses without rules (economy prices)', () => {
    const world = staged();
    applyAction(world, { tick: 0, kind: 'forge', spec: SPEC }, RULES);
    expect(artifactsOf(world)).toHaveLength(1);

    const bare = staged('artifact-bare');
    expect(() => applyAction(bare, { tick: 0, kind: 'forge', spec: SPEC }))
      .toThrow(/forge requires rules/);
  });

  it('live ≡ replay: two runs of a forging log hash identically', () => {
    const log: ActionLog = [
      { tick: at(0, 8), kind: 'forge', spec: SPEC },
      { tick: at(0, 9), kind: 'forge', spec: { ...SPEC, severity: 5 } },
    ];
    const run = (): WorldState => runLogOn(staged('artifact-replay'), RULES, log, at(1, 0));
    const a = run();
    const b = run();
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(artifactsOf(a).map((artifact) => artifact.id)).toEqual(['a0', 'a1']);
  });
});
