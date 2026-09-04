import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type Action, type ActionLog } from '../../src/sim/campaign';
import { explainBelief } from '../../src/sim/chronicle';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { prepareTick, stepTransaction } from '../../src/sim/phases';
import {
  CONVERSATION_BEAT, HEARSAY_CEILING, STANCE, chooseTelling, ingest,
} from '../../src/sim/rumors/propagation';
import { SOMEONE } from '../../src/sim/rumors/claim';
import {
  ARTIFACT_CREDENCE, applyForge, artifactById, artifactsOf, isUsable,
} from '../../src/sim/artifacts';
import { applyInject, type InjectSpec } from '../../src/sim/actions';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import type { Belief, TownFixture, WorldState } from '../../src/sim/types';
import { localParticipants, type NonLocalActionIntent } from '../../app/src/loop/session';
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
interface Person {
  id: string;
  venue: string;
  /** Directional trust edges out of this person, by target id. */
  edges?: Record<string, number>;
  traits?: string[];
}

function townOf(people: readonly Person[]): TownFixture {
  return {
    venues: [
      { id: 'square', district: 'd0', access: 'public' as const },
      { id: 'market', district: 'd0', access: 'public' as const },
      { id: 'home-0', district: 'd0', access: 'private' as const },
    ],
    npcs: people.map((person) => ({
      id: person.id, name: person.id, home: 'home-0', occupation: 'grocer',
      faction: 'none' as const, traits: person.traits ?? ['literalist'], rivals: [],
      schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: person.venue }],
      edges: Object.entries(person.edges ?? {})
        .map(([to, trust]) => ({ to, kind: 'friend' as const, trust })),
    })),
  };
}

function artifactTown(): TownFixture {
  return townOf([
    { id: 'ada', venue: 'square', edges: { bez: 0.8 } },
    { id: 'bez', venue: 'square', edges: { ada: 0.5 } },
    { id: 'cyn', venue: 'market' },
    { id: 'dov', venue: 'market' },
  ]);
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

// ── THE BEAT TAIL: pickup and conviction circulation ──────────────────────────────────────────────

const artifactActs = (world: WorldState) =>
  world.chronicle.filter((entry) => entry.kind === 'artifact');

/**
 * Resolve the current tick plus the next `count` conversation beats, through the real tick
 * transaction — the only production path (P11-9; `step` is a compatibility wrapper over it).
 */
function beats(world: WorldState, count: number): void {
  for (let i = 0; i <= count * CONVERSATION_BEAT; i += 1) stepTransaction(world, RULES);
}

/**
 * The belief this mind got from the PAGE, as opposed to from talk about it. A viewer commonly holds
 * both: the paper anchored one family at 0.97, and the town's ordinary gossip about the same words
 * arrives separately, mutating and ceiling-capped. That is the plan's split, not a leak.
 */
const paperBelief = (world: WorldState, npcId: string): Belief | undefined =>
  Object.values(world.beliefs[npcId] ?? {}).find((b) => b.credence === ARTIFACT_CREDENCE);

const hasSeenPaper = (world: WorldState, npcId: string): boolean =>
  paperBelief(world, npcId) !== undefined;

describe('venue pickup — the first person in the room, chosen the same way every replay', () => {
  it('the lexicographically first NPC in that circle picks it up at the NEXT beat, never this one', () => {
    const world = withDocument(SPEC, 'artifact-pickup');
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: null }]);
    // The planting beat itself resolves with the letter still on the table: "the NEXT beat".
    expect(artifactById(world, 'a0')!.plantedAt).toBe('square');

    beats(world, 1);
    expect(artifactById(world, 'a0')).toMatchObject({ heldBy: 'ada', plantedAt: null });
    expect(artifactActs(world).at(-1)).toMatchObject({ act: 'pickup', by: 'ada', to: null });
    const found = soleBelief(world, 'ada');
    expect(found.credence).toBe(ARTIFACT_CREDENCE);
    expect(found.heardFrom).toBe('ada');       // you found it yourself
    expect(found.apparentSources).toEqual([]); // and nobody is their own corroborator
  });

  it('picks the lexicographic first even when the room fills in another order', () => {
    const world = buildWorld(townOf([
      { id: 'zed', venue: 'square' }, { id: 'ada', venue: 'square' }, { id: 'mik', venue: 'square' },
    ]), 'artifact-lex', RULES);
    enrollPlayer(world, { home: 'square' });
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = DAY1;
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: null }]);
    beats(world, 1);
    expect(artifactById(world, 'a0')!.heldBy).toBe('ada');
  });

  it('a letter left in an empty room simply waits', () => {
    // `home-0` is everyone's registered home but nobody's scheduled venue — a genuinely empty room.
    // The avatar must already be standing there when the beat is prepared: the frame freezes the
    // offered venue, so a same-tick walk cannot compose a plant somewhere the offer never was.
    const empty = withDocument(SPEC, 'artifact-empty-room');
    empty.playerVenue = 'home-0';
    framed(empty, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'home-0', to: null }]);
    beats(empty, 4);
    expect(artifactById(empty, 'a0')).toMatchObject({ heldBy: null, plantedAt: 'home-0' });
    expect(artifactActs(empty).filter((entry) => entry.act === 'pickup')).toEqual([]);
  });
});

describe('conviction circulation — a believing holder shows the paper on, exactly once', () => {
  /** The letter handed to `ada`, whose strongest edge (excluding the avatar) is `bez`. */
  function handedToAda(seed: string): WorldState {
    const world = withDocument(SPEC, seed);
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: 'ada' }]);
    return world;
  }

  it('re-shows to the highest-trust edge at the NEXT shared beat, re-anchoring them at 0.97', () => {
    const world = handedToAda('artifact-reshow');
    expect(artifactActs(world).filter((entry) => entry.act === 'reshow')).toEqual([]);

    beats(world, 1);
    const reshows = artifactActs(world).filter((entry) => entry.act === 'reshow');
    expect(reshows).toHaveLength(1);
    expect(reshows[0]).toMatchObject({ act: 'reshow', by: 'ada', to: 'bez', artifact: 'a0' });
    const seen = paperBelief(world, 'bez')!;
    expect(seen.credence).toBe(ARTIFACT_CREDENCE);
    expect(seen.heardFrom).toBe('ada');
    expect(seen.claim).toMatchObject(SPEC);
    // The paper stays in the shower's hand — a re-show is a showing, never a hand-over.
    expect(artifactById(world, 'a0')!.heldBy).toBe('ada');
  });

  it('fires ONCE per holder, however many shared beats follow', () => {
    const world = handedToAda('artifact-reshow-once');
    beats(world, 8);
    expect(artifactActs(world).filter((entry) => entry.act === 'reshow')).toHaveLength(1);
  });

  it('a holder who does not BELIEVE the page keeps it to themselves', () => {
    // `ada` is a skeptic here, whose retell gate needs two apparent sources — so she never gossips
    // the page onward and can never be corroborated back up over the BELIEVE line. That isolates
    // the gate under test: conviction, and nothing else, is what puts paper in front of a second
    // pair of eyes.
    const world = buildWorld(townOf([
      { id: 'ada', venue: 'square', edges: { bez: 0.8 }, traits: ['skeptic'] },
      { id: 'bez', venue: 'square', edges: { ada: 0.5 } },
    ]), 'artifact-reshow-doubt', RULES);
    enrollPlayer(world, { home: 'square' });
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = DAY1;
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: 'ada' }]);

    const family = Object.keys(world.beliefs['ada']!)[0]!;
    world.beliefs['ada']![family]!.credence = STANCE.BELIEVE - 0.01; // 'repeating', not 'believing'
    beats(world, 4);
    expect(artifactActs(world).filter((entry) => entry.act === 'reshow')).toEqual([]);
    expect(hasSeenPaper(world, 'bez')).toBe(false);

    // Positive control on the SAME staging: nudge her over the line and the letter moves.
    world.beliefs['ada']![family]!.credence = STANCE.BELIEVE;
    beats(world, 1);
    expect(artifactActs(world).filter((entry) => entry.act === 'reshow'))
      .toMatchObject([{ by: 'ada', to: 'bez' }]);
    expect(hasSeenPaper(world, 'bez')).toBe(true);
  });

  it('reads the HIGHEST-trust edge, not the first one listed', () => {
    const world = buildWorld(townOf([
      { id: 'ada', venue: 'square', edges: { bez: 0.4, cyn: 0.9 } },
      { id: 'bez', venue: 'square' },
      { id: 'cyn', venue: 'square' },
    ]), 'artifact-top-edge', RULES);
    enrollPlayer(world, { home: 'square' });
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = DAY1;
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: null, to: 'ada' }]);
    beats(world, 1);
    expect(artifactActs(world).filter((entry) => entry.act === 'reshow').at(-1))
      .toMatchObject({ by: 'ada', to: 'cyn' });
    expect(hasSeenPaper(world, 'cyn')).toBe(true);
    expect(hasSeenPaper(world, 'bez')).toBe(false); // the weaker edge only ever gets the talk
  });
});

describe('interpretations are not fixed — talk ABOUT the letter is ordinary, ceiling-capped hearsay', () => {
  it('the twin: the viewer holds the page at 0.97 while their retelling mutates and caps at 0.95', () => {
    const world = buildWorld(townOf([
      { id: 'ada', venue: 'square', edges: { bez: 0.8 }, traits: ['exaggerator'] },
      { id: 'bez', venue: 'square', edges: { ada: 0.9 } },
    ]), 'artifact-retelling', RULES);
    enrollPlayer(world, { home: 'square' });
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = DAY1;
    framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);

    const onPaper = soleBelief(world, 'ada');
    expect(onPaper.credence).toBe(ARTIFACT_CREDENCE);

    // ada now TALKS about it — the ordinary telling path, through her own traits.
    const circle = { venue: 'square', members: ['ada', 'bez', 'you'] };
    const telling = chooseTelling(world, 'ada', circle, DAY1, RULES)!;
    expect(telling).not.toBeNull();
    expect(telling.claim.family).toBe(onPaper.claim.family);
    // Documents don't mutate; interpretations do — the exaggerator's fingerprint on the retelling.
    expect(telling.claim.count).toBe(SPEC.count * 2);
    expect(telling.claim.severity).toBe(5);
    expect(onPaper.claim.count).toBe(SPEC.count);       // the page itself is untouched
    expect(onPaper.claim.severity).toBe(SPEC.severity);

    ingest(world, 'bez', { tick: DAY1, speaker: 'ada', claim: telling.claim }, true, RULES);
    const heard = world.beliefs['bez']![telling.claim.family]!;
    expect(heard.credence).toBeLessThanOrEqual(HEARSAY_CEILING);
    expect(heard.credence).toBeLessThan(ARTIFACT_CREDENCE);
  });
});

/**
 * Plan 9 ships these verbs ENGINE-FIRST (docket A7): no composer lands this plan, so the session /
 * action-log path is the ONLY way they are driven, and the Task-8 e2es will drive them there. This
 * pins that surface — which of the three are beat-circle acts, and who each one must be standing with
 * — against the SHIPPED extractor rather than a mirror of it that can drift.
 */
describe('the session surface knows the three new verbs', () => {
  it('show and a hand-over plant name their circle participant; a venue plant names nobody', () => {
    expect(localParticipants({ kind: 'show', artifact: 'a0', to: 'ada' })).toEqual(['ada']);
    expect(localParticipants({ kind: 'plant', artifact: 'a0', venue: null, to: 'ada' }))
      .toEqual(['ada']);
    expect(localParticipants({ kind: 'plant', artifact: 'a0', venue: 'square', to: null }))
      .toEqual([]);
  });

  it('forge is NOT a local action — it has no circle precondition (a compile-time pin)', () => {
    const solitary: NonLocalActionIntent = { kind: 'forge', spec: SPEC };
    expect(solitary.kind).toBe('forge');
  });
});

describe('PILLAR: a whole artifact campaign is replay-stable', () => {
  const LOG: ActionLog = [
    { tick: at(0, 8), kind: 'forge', spec: SPEC },
    { tick: at(1, 8), kind: 'plant', artifact: 'a0', venue: 'square', to: null },
  ];

  const build = (): WorldState => {
    const world = buildWorld(artifactTown(), 'artifact-campaign', RULES);
    enrollPlayer(world, { home: 'square' });
    world.npcs['ada']!.edges.push({ to: 'you', kind: 'friend', trust: 0.6 });
    return world;
  };

  it('forge → venue plant → pickup → re-show regrows byte-identically, and every act really fired', () => {
    const a = runLogOn(build(), RULES, LOG, at(1, 12));
    const b = runLogOn(build(), RULES, LOG, at(1, 12));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(artifactActs(a).map((entry) => entry.act))
      .toEqual(['forge', 'plant', 'pickup', 'reshow']);
    expect(artifactById(a, 'a0')!.heldBy).toBe('ada');
  });
});

// ── DOCKET P9-2 + P9-3: what mints an anchor, and what may never take one away ─────────────────────

/**
 * The plan's global clause reads "an artifact IN HAND anchors at 0.97 … only while the holder
 * physically holds it", while its own exact SHOW physics anchors a NON-holder at 0.97 "while the
 * artifact stays with the shower", and its Task-8 victory condition wants a council member left
 * anchored at ≥ 0.97 by circulation. Controller adjudication **P9-2** resolves that: the clause
 * constrains WHICH EVENTS may mint an anchor — paper-present viewings, and nothing else — never how
 * long a minted anchor lives. Adjudication **P9-3** closes the other direction: talk ABOUT the page
 * can never drag the page's own weight down.
 *
 * Both halves are pinned here rather than left to a reading: a positive pin (the page can leave the
 * room), a negative pin (nothing but a viewing ever mints an above-ceiling belief), and the monotone
 * corroboration guard with its ordinary-hearsay control.
 */
const VIEWING_ACTS = ['show', 'plant', 'pickup', 'reshow'];

describe('P9-2 — viewings mint the anchor; nothing demotes it', () => {
  it('a shown belief survives the page leaving the room entirely (heldBy === null)', () => {
    const world = withDocument(SPEC, 'artifact-p9-2-lifetime');
    framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    expect(soleBelief(world, 'ada').credence).toBe(ARTIFACT_CREDENCE);

    // Venue-plant it: the avatar no longer holds it, and neither does anyone else.
    framed(world, [{ tick: DAY1, kind: 'plant', artifact: 'a0', venue: 'square', to: null }]);
    expect(artifactById(world, 'a0')).toMatchObject({ heldBy: null, plantedAt: 'square' });
    expect(soleBelief(world, 'ada').credence).toBe(ARTIFACT_CREDENCE);

    // …and it survives the page being read by somebody else, days later.
    beats(world, 4);
    expect(artifactById(world, 'a0')!.heldBy).not.toBe('you');
    expect(paperBelief(world, 'ada')!.credence).toBe(ARTIFACT_CREDENCE);
  });

  it('NOTHING but a paper-present viewing act ever mints a belief above the ceiling', () => {
    // One campaign, all four viewing acts, ordinary gossip running underneath the whole time.
    const world = withDocument(SPEC, 'artifact-p9-2-mint');
    applyForge(world, { ...SPEC, severity: 5 }, at(0, 8), RULES);   // a1 — the venue plant
    applyForge(world, { ...SPEC, count: 9 }, at(0, 8), RULES);      // a2 — the hand-over
    world.tick = DAY1;
    framed(world, [
      { tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' },
      { tick: DAY1, kind: 'plant', artifact: 'a1', venue: 'square', to: null },
      { tick: DAY1, kind: 'plant', artifact: 'a2', venue: null, to: 'bez' },
    ]);
    beats(world, 3);

    const acts = new Set(artifactActs(world).map((entry) => entry.act));
    for (const act of VIEWING_ACTS) expect(acts, `act '${act}' really fired`).toContain(act);

    let anchors = 0;
    for (const [npcId, store] of Object.entries(world.beliefs)) {
      for (const [family, belief] of Object.entries(store)) {
        if (belief.credence <= HEARSAY_CEILING) continue;
        anchors += 1;
        expect(belief.credence, `${npcId}/${family} is above the ceiling`).toBe(ARTIFACT_CREDENCE);
        const record = explainBelief(world, npcId, family);
        expect(record, `${npcId}/${family} names the act that minted it`)
          .toMatchObject({ kind: 'artifact' });
        expect(VIEWING_ACTS).toContain((record as { act: string }).act);
      }
    }
    expect(anchors, 'the sweep is not vacuous').toBeGreaterThanOrEqual(4);
  });
});

describe('P9-3 — hearsay corroboration is monotone: it never lowers a credence', () => {
  it('a corroborating telling of the page\'s own family leaves a 0.97 anchor at 0.97', () => {
    const world = withDocument(SPEC, 'artifact-p9-3');
    framed(world, [{ tick: DAY1, kind: 'show', artifact: 'a0', to: 'ada' }]);
    const paper = soleBelief(world, 'ada');
    expect(paper.credence).toBe(ARTIFACT_CREDENCE);
    const sourcesBefore = paper.apparentSources.length;

    // A third mouth repeats the page's own words back to her — a NEW apparent source for a family
    // she already holds, which is the ordinary corroboration branch of `ingest`.
    ingest(world, 'ada', { tick: DAY1, speaker: 'cyn', claim: paper.claim }, true, RULES);

    const after = soleBelief(world, 'ada');
    expect(after.credence).toBe(ARTIFACT_CREDENCE);           // never dragged down to the ceiling
    expect(after.timesHeard).toBe(2);
    expect(after.apparentSources).toHaveLength(sourcesBefore + 1);
    expect(after.apparentSources).toContain('cyn');           // the bookkeeping still happens
    expect(after.heardAt).toBe(DAY1);                         // and stale news still revives
  });

  it('ordinary hearsay is untouched: it still rises by 0.15 per new source and still caps at 0.95', () => {
    const world = withDocument(SPEC, 'artifact-p9-3-control');
    const claim = applyInject(world, 'bez', SPEC);
    ingest(world, 'ada', { tick: DAY1, speaker: 'bez', claim }, true, RULES);
    const belief = world.beliefs['ada']![claim.family]!;
    const first = belief.credence;
    expect(first).toBeLessThan(HEARSAY_CEILING);

    ingest(world, 'ada', { tick: DAY1, speaker: 'cyn', claim }, true, RULES);
    expect(belief.credence).toBe(Math.min(HEARSAY_CEILING, first + 0.15));
    expect(belief.credence).toBeGreaterThan(first);

    ingest(world, 'ada', { tick: DAY1, speaker: 'dov', claim }, true, RULES);
    expect(belief.credence).toBe(HEARSAY_CEILING);            // the cap still binds
    ingest(world, 'ada', { tick: DAY1, speaker: 'you', claim }, true, RULES);
    expect(belief.credence).toBe(HEARSAY_CEILING);            // and never climbs past it
    expect(belief.apparentSources).toEqual(['bez', 'cyn', 'dov', 'you']);
  });
});
