import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type Action, type ActionLog } from '../../src/sim/campaign';
import { explainBelief } from '../../src/sim/chronicle';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { prepareTick } from '../../src/sim/phases';
import { HEARSAY_CEILING, ingest } from '../../src/sim/rumors/propagation';
import { SOMEONE } from '../../src/sim/rumors/claim';
import {
  ARTIFACT_CREDENCE, applyForge, artifactById, artifactsOf, isUsable,
} from '../../src/sim/artifacts';
import { applyInject, type InjectSpec } from '../../src/sim/actions';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import type { Belief, TownFixture, WorldState } from '../../src/sim/types';
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

// ── SHOW / PLANT: the paper reaches a mind ────────────────────────────────────────────────────────

/**
 * Three people share `square` every hour of every day, so the avatar's circle is deterministic and
 * total; `market` is an empty public room the avatar can legally walk to mid-beat (the offered-state
 * divergence); `cyn`/`dov` sit at `market` purely as extra corroborating mouths for the hierarchy
 * twin, never in the avatar's circle.
 */
function artifactTown(): TownFixture {
  const allDay = (venue: string) => [{ days: 'all' as const, from: 0, to: 1439, venue }];
  const person = (id: string, venue: string, edges: { to: string; trust: number }[] = []) => ({
    id, name: id, home: 'home-0', occupation: 'grocer', faction: 'none' as const,
    traits: ['literalist'], rivals: [], schedule: allDay(venue),
    edges: edges.map((edge) => ({ ...edge, kind: 'friend' as const })),
  });
  return {
    venues: [
      { id: 'square', district: 'd0', access: 'public' as const },
      { id: 'market', district: 'd0', access: 'public' as const },
      { id: 'home-0', district: 'd0', access: 'private' as const },
    ],
    npcs: [
      person('ada', 'square', [{ to: 'bez', trust: 0.8 }]),
      person('bez', 'square', [{ to: 'ada', trust: 0.5 }]),
      person('cyn', 'market'),
      person('dov', 'market'),
    ],
  };
}

const DAY1 = at(1, 8);

/** A forged, lead-time-elapsed document in the avatar's hand, with the world parked on day 1. */
function withDocument(spec: InjectSpec = SPEC, seed = 'artifact-show'): WorldState {
  const world = buildWorld(artifactTown(), seed, RULES);
  enrollPlayer(world, { home: 'square' });
  world.npcs['ada']!.edges.push({ to: 'you', kind: 'friend', trust: 0.6 });
  applyForge(world, spec, at(0, 8), RULES);
  world.tick = DAY1;
  return world;
}

/** The production shape: one PreparedTick, every same-tick action applied inside it. */
function framed(world: WorldState, actions: readonly Action[]): void {
  const frame = prepareTick(world, RULES);
  for (const action of actions) applyAction(world, action, RULES, frame);
}

/** The pre-existing frameless compatibility call — live locality, exactly as before. */
function frameless(world: WorldState, actions: readonly Action[]): void {
  for (const action of actions) applyAction(world, action, RULES);
}

const soleBelief = (world: WorldState, npcId: string): Belief => {
  const store = world.beliefs[npcId]!;
  const families = Object.keys(store);
  expect(families).toHaveLength(1);
  return store[families[0]!]!;
};

describe('show — the document anchors a fresh family at evidence weight', () => {
  it('anchors the viewer at ARTIFACT_CREDENCE with the avatar as the mouth that held it up', () => {
    const world = withDocument();
    framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    const belief = soleBelief(world, 'ada');
    expect(belief.credence).toBe(ARTIFACT_CREDENCE);
    expect(belief.heardFrom).toBe('you');
    expect(belief.timesHeard).toBe(1);
    expect(belief.firstHeardAt).toBe(DAY1);
    expect(belief.claim).toMatchObject(SPEC);
    expect(belief.claim.parent).toBeNull();          // a fresh family, never a retelling
  });

  it('the paper is its own witness: a NAMED attribution is the apparent source, not the shower', () => {
    const named = withDocument({ ...SPEC, attribution: 'bez' }, 'artifact-named');
    framed(named, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    expect(soleBelief(named, 'ada').apparentSources).toEqual(['bez']);

    // …and a document that names nobody falls back to the person holding it up (the existing rule).
    const vague = withDocument(SPEC, 'artifact-vague');
    framed(vague, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    expect(soleBelief(vague, 'ada').apparentSources).toEqual(['you']);
  });

  it('the artifact stays with the shower and the act is chronicled', () => {
    const world = withDocument();
    framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    expect(artifactById(world, 'a0')).toMatchObject({ heldBy: 'you', plantedAt: null });
    expect(world.chronicle.filter((entry) => entry.kind === 'artifact').at(-1)).toEqual({
      kind: 'artifact', tick: DAY1, act: 'show', artifact: 'a0', by: 'you', to: 'ada',
    });
  });

  it('refuses an unknown document, one the avatar does not hold, and an off-beat flourish', () => {
    const world = withDocument();
    expect(() => framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a9', to: 'ada' }]))
      .toThrow(/unknown/);

    const planted = withDocument(SPEC, 'artifact-not-held');
    framed(planted, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: null }]);
    expect(() => framed(planted, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]))
      .toThrow(/do not hold|don't hold/);

    const offBeat = withDocument(SPEC, 'artifact-offbeat');
    offBeat.tick = DAY1 + 1;
    expect(() => framed(offBeat, [{ tick: DAY1 + 1, kind: 'show', artifact: 'a0', to: 'ada' }]))
      .toThrow(/conversation beats/);
  });

  it('refuses before the ink is dry — the one-day forgery lead time', () => {
    const world = buildWorld(artifactTown(), 'artifact-lead', RULES);
    enrollPlayer(world, { home: 'square' });
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = at(0, 9);
    expect(() => framed(world, [{ tick: at(0, 9), kind: 'show', artifact: 'a0', to: 'ada' }]))
      .toThrow(/lead|not usable|day/i);
    expect(world.beliefs['ada']).toEqual({});
  });
});

describe('THE EVIDENCE HIERARCHY — the paper outranks a fully corroborated mouth', () => {
  it('a thrice-corroborated hearsay twin lands on 0.95; the same claim on paper lands on 0.97', () => {
    const world = withDocument(SPEC, 'artifact-hierarchy');
    // The hearsay twin: the identical claim reaching `ada` from three apparently independent mouths.
    const injected = applyInject(world, 'bez', SPEC);
    for (const speaker of ['bez', 'cyn', 'dov']) {
      ingest(world, 'ada', { tick: DAY1, speaker, claim: injected }, true, RULES);
    }
    const twin = world.beliefs['ada']![injected.family]!;
    expect(twin.apparentSources).toHaveLength(3);
    expect(twin.credence).toBe(HEARSAY_CEILING);

    framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    const onPaper = Object.entries(world.beliefs['ada']!)
      .find(([family]) => family !== injected.family)![1];
    expect(onPaper.claim).toMatchObject(SPEC);              // the very same words
    expect(onPaper.credence).toBe(ARTIFACT_CREDENCE);
    expect(onPaper.credence).toBeGreaterThan(twin.credence); // evidence >> hearsay, structurally
  });
});

describe('plant — venue XOR hand-over', () => {
  it('a hand-over transfers the paper AND anchors the new holder, exactly as a show does', () => {
    const world = withDocument(SPEC, 'artifact-handover');
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: 'ada' }]);
    expect(artifactById(world, 'a0')).toMatchObject({ heldBy: 'ada', plantedAt: null });
    expect(soleBelief(world, 'ada').credence).toBe(ARTIFACT_CREDENCE);
    expect(world.chronicle.filter((entry) => entry.kind === 'artifact').at(-1)).toEqual({
      kind: 'artifact', tick: DAY1, act: 'plant', artifact: 'a0', by: 'you', to: 'ada',
    });
  });

  it('a venue plant leaves the paper waiting and puts it into nobody yet', () => {
    const world = withDocument(SPEC, 'artifact-venue-plant');
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: null }]);
    expect(artifactById(world, 'a0')).toMatchObject({ heldBy: null, plantedAt: 'square' });
    expect(world.beliefs['ada']).toEqual({});
    expect(world.beliefs['bez']).toEqual({});
    expect(world.chronicle.filter((entry) => entry.kind === 'artifact').at(-1)).toEqual({
      kind: 'artifact', tick: DAY1, act: 'plant', artifact: 'a0', by: 'you', to: 'square',
    });
  });

  it('venue XOR to is enforced in both directions, with zero residue', () => {
    const neither = withDocument(SPEC, 'artifact-neither');
    expect(() => framed(neither, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: null }]))
      .toThrow(/venue|hands/);
    expect(artifactById(neither, 'a0')).toMatchObject({ heldBy: 'you', plantedAt: null });

    const both = withDocument(SPEC, 'artifact-both');
    expect(() => framed(both, [
      { tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: 'ada' },
    ])).toThrow(/venue|hands/);
    expect(artifactById(both, 'a0')).toMatchObject({ heldBy: 'you', plantedAt: null });
    expect(both.beliefs['ada']).toEqual({});
  });

  it('a venue plant requires the avatar to be standing in that room', () => {
    const world = withDocument(SPEC, 'artifact-elsewhere');
    expect(() => framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'market', to: null }]))
      .toThrow(/must be at/);
  });
});

/**
 * THE FRAME LAW for the two new beat-circle acts (P11-18 + docket A6, the law `offered-state.test.ts`
 * spells for the nine verbs that predate this plan). `show` and `plant`-with-`to` are beat-circle
 * acts, so they must validate locality against the OFFERED frame, never a live projection an earlier
 * same-tick `goTo` has already moved. The venue plant asks the second locality question — where the
 * avatar is standing — and answers it from the frozen frame too, exactly as the dead-drop courier
 * handoff does. Each pin is paired with the frameless liveness half, whose refusal is what makes the
 * framed half non-vacuous.
 *
 * (These live here rather than in `offered-state.test.ts` only because that file's fixture runs the
 * whole law at tick 0, where no document has yet cleared its one-day forgery lead.)
 */
describe('the new local verbs execute against the frozen offered state', () => {
  const WALK_AWAY: Action = { tick: DAY1, kind: 'goTo', venue: 'market' };

  const CASES: { kind: string; intent: Action; applied(world: WorldState): void }[] = [
    {
      kind: 'show',
      intent: { tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' },
      applied: (world) => expect(soleBelief(world, 'ada').credence).toBe(ARTIFACT_CREDENCE),
    },
    {
      kind: 'plant (hand-over)',
      intent: { tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: 'ada' },
      applied: (world) => expect(artifactById(world, 'a0')!.heldBy).toBe('ada'),
    },
  ];

  it.each(CASES)('$kind reads the offered frame, not the live circle it was moved out of',
    ({ intent, applied }) => {
      const world = withDocument(SPEC, 'artifact-framed');
      framed(world, [WALK_AWAY, intent]);
      applied(world);
    });

  it.each(CASES)('$kind: the same pair is still refused on live locality with no frame',
    ({ intent }) => {
      const world = withDocument(SPEC, 'artifact-frameless');
      expect(() => frameless(world, [WALK_AWAY, intent])).toThrow(/circle/);
    });

  it('a venue plant offered at the square survives a same-tick walk away from it', () => {
    const plant: Action = { tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: null };
    const world = withDocument(SPEC, 'artifact-venue-framed');
    framed(world, [WALK_AWAY, plant]);
    expect(artifactById(world, 'a0')).toMatchObject({ heldBy: null, plantedAt: 'square' });

    const live = withDocument(SPEC, 'artifact-venue-frameless');
    expect(() => frameless(live, [WALK_AWAY, plant])).toThrow(/must be at/);
    expect(artifactById(live, 'a0')).toMatchObject({ heldBy: 'you', plantedAt: null });
  });
});

describe('the fair-cop law reaches evidence too', () => {
  it('a belief the paper anchored is explained by the artifact act that held it up', () => {
    const shown = withDocument(SPEC, 'artifact-faircop-show');
    framed(shown, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    expect(explainBelief(shown, 'ada', soleBelief(shown, 'ada').claim.family))
      .toMatchObject({ kind: 'artifact', act: 'show', by: 'you', to: 'ada' });

    const handed = withDocument(SPEC, 'artifact-faircop-plant');
    framed(handed, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: 'ada' }]);
    expect(explainBelief(handed, 'ada', soleBelief(handed, 'ada').claim.family))
      .toMatchObject({ kind: 'artifact', act: 'plant', by: 'you', to: 'ada' });
  });
});
