import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_ECONOMY } from '../../src/content/economy';
import { applySetDrop, applyCourier, type InjectSpec } from '../../src/sim/actions';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { circlesAt } from '../../src/sim/agents';
import { runUntil } from '../../src/sim/step';
import { deliverCouriers } from '../../src/sim/network/couriers';
import { reportThrough } from '../../src/sim/reporting';
import { compartmentOf } from '../../src/sim/network/compartment';
import { assetFor } from '../../src/sim/network/roster';
import { hashWorld } from '../../src/sim/hash';
import { appendCourierPlan } from '../../src/sim/fieldwork';
import { at, dayOf, minuteOfDay } from '../../src/core/time';
import { CONVERSATION_BEAT } from '../../src/sim/rumors/propagation';
import { SOMEONE, type Claim, type EntityId } from '../../src/sim/rumors/claim';
import { TRAITS } from '../../src/content/traits';
import type { TraitContext } from '../../src/sim/rumors/traits';
import type { Mice } from '../../src/sim/network/types';
import type { TownFixture, WorldState } from '../../src/sim/types';

const RULES = STANDARD_RULES;

/** A TESTFORD world with the avatar at the market — no scenario, no observers (headless enroll). */
function testWorld(seed: string): WorldState {
  const world = buildWorld(TESTFORD, seed, RULES);
  enrollPlayer(world, { home: 'market' });
  return world;
}

/** Force `id` onto the roster as an asset (the wage-test direct-construct idiom) so a focused courier
 *  test needn't run the whole recruit flow. Records `recruited-by:player` — the chain interrogation
 *  reads — and the disposition edge, exactly as applyRecruit would. */
function makeAsset(world: WorldState, id: EntityId, mice: Mice): void {
  world.network.assets.push({
    id, mice, wagePaidThroughDay: 0, strikes: 0,
    facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }],
  });
  world.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust: 0.6 });
}

/** The 7 content fields (ids/lineage are not content) — the shape trait transforms touch. */
const pick7 = (c: Claim): Pick<Claim, 'subject' | 'predicate' | 'object' | 'count' | 'severity' | 'place' | 'attribution'> => {
  const { subject, predicate, object, count, severity, place, attribution } = c;
  return { subject, predicate, object, count, severity, place, attribution };
};

/**
 * COMPUTE the delivery beat from the world's REAL schedules (escalation license: never hand-guess it).
 * The first conversation beat strictly after `afterTick` where `a` and `b` share a circle — exactly
 * the condition deliverCouriers fires on. Throws if the pair never meets (fix the vehicle, not the physics).
 */
function firstCoCircle(world: WorldState, a: EntityId, b: EntityId, afterTick: number): number {
  for (let t = afterTick + 1; t < at(4, 0); t++) {
    if (minuteOfDay(t) % CONVERSATION_BEAT !== 0) continue;
    const c = circlesAt(world, t).find((cc) => cc.members.includes(a) && cc.members.includes(b));
    if (c) return t;
  }
  throw new Error(`firstCoCircle: ${a}+${b} never share a circle — fix the vehicle`);
}

const asClaim = (spec: InjectSpec): Claim => ({ id: 'probe', family: 'probe', parent: null, ...spec });
const ctxFor = (world: WorldState, id: EntityId): TraitContext => ({
  ownerId: id, faction: world.npcs[id]!.faction, rivals: world.npcs[id]!.rivals,
  factionOf: (e) => world.npcs[e]?.faction ?? null,
});

describe('courier delivery — the real schedule intersection does the walking', () => {
  it('delivers at the beat COMPUTED from the world (anselm carries market→northside on his own schedule)', () => {
    const world = testWorld('courier-deliver');
    makeAsset(world, 'anselm', 'money'); // anselm bridges town (market 12:00-14:00) → northside (chapel 17:00-19:00)
    const taskTick = at(0, 12); // 720 — anselm is at the market with the avatar
    runUntil(world, taskTick, RULES);
    // Sanity: the face handoff is possible — anselm is in the avatar's circle this beat.
    const handoffCircle = circlesAt(world, taskTick).find((c) => c.members.includes('you'));
    expect(handoffCircle!.members).toContain('anselm');

    const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };
    // dara is a northside-only NPC (never met at the market) — the delivery MUST wait for anselm's walk.
    applyCourier(world, 'anselm', spec, 'dara', null, taskTick, RULES);

    const expected = firstCoCircle(world, 'anselm', 'dara', taskTick);
    // Derived, not hand-guessed: it is a real conversation beat on day 0, after the handoff.
    expect(minuteOfDay(expected) % CONVERSATION_BEAT).toBe(0);
    expect(dayOf(expected)).toBe(0);
    expect(expected).toBeGreaterThan(taskTick);

    runUntil(world, expected + 1, RULES);

    // Delivered EXACTLY at the computed intersection: the carried-story fact stamps that tick,
    // and the target now holds the freshly-minted family.
    const carried = compartmentOf(world, 'player', 'anselm').filter((f) => f.kind === 'carried-story');
    expect(carried).toHaveLength(1);
    expect(carried[0]!.tick).toBe(expected);
    const family = carried[0]!.ref;
    expect(world.beliefs['dara']![family]).toBeDefined();
    // The run is consumed — deterministically, once.
    expect(world.network.pendingCouriers).toHaveLength(0);
  });

  it('does NOT deliver before the intersection — the payload is not in the target until the carrier arrives', () => {
    const world = testWorld('courier-not-early');
    makeAsset(world, 'anselm', 'money');
    const taskTick = at(0, 12);
    runUntil(world, taskTick, RULES);
    const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };
    applyCourier(world, 'anselm', spec, 'dara', null, taskTick, RULES);
    const expected = firstCoCircle(world, 'anselm', 'dara', taskTick);

    // One beat SHORT of the intersection: nothing delivered, the run still pending.
    runUntil(world, expected, RULES);
    expect(compartmentOf(world, 'player', 'anselm').some((f) => f.kind === 'carried-story')).toBe(false);
    expect(world.network.pendingCouriers).toHaveLength(1);
  });
});

describe('courier delivery — trait-transformed BY THE ASSET on the way out (couriers are minds, not pipes)', () => {
  it('an exaggerator courier doubles the payload count — assert BY MECHANISM', () => {
    const world = testWorld('courier-exaggerate');
    expect(world.npcs['mara']!.traits).toContain('exaggerator'); // her REAL firmware inflates
    makeAsset(world, 'mara', 'money'); // money recruit — NO ego overlay; the real trait does the work
    const taskTick = at(0, 8); // 480 — mara + rafe both at the market on a weekday
    runUntil(world, taskTick, RULES);

    // Named subject + attribution so mara's attributor stays inert — the count/severity move is the exaggerator's alone.
    const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 2, severity: 2, place: null, attribution: 'seth' };
    applyCourier(world, 'mara', spec, 'rafe', null, taskTick, RULES);
    const expected = firstCoCircle(world, 'mara', 'rafe', taskTick);
    runUntil(world, expected + 1, RULES);

    const family = compartmentOf(world, 'player', 'mara').find((f) => f.kind === 'carried-story')!.ref;
    const delivered = world.beliefs['rafe']![family]!.claim;
    expect(delivered.count).toBe(spec.count! * 2);      // 4 — doubled
    expect(delivered.severity).toBe(spec.severity + 1); // 3 — bumped by one

    // BY MECHANISM: EXACTLY the registered exaggerator transform applied to the payload.
    const expectedDelta = TRAITS['exaggerator']!.transform(asClaim(spec), ctxFor(world, 'mara'));
    expect(pick7(delivered)).toEqual(pick7({ ...asClaim(spec), ...expectedDelta } as Claim));
  });

  it('an ego courier delivers by REAL traits ONLY — the ego overlay distorts their REPORTS, not their telling', () => {
    // Controller-note-3 disclosure made a test: outbound telling transforms by real traits; the ego
    // overlay is a REPORTING distortion (reportThrough), never a speech pattern.
    const world = testWorld('courier-ego');
    expect(world.npcs['anselm']!.traits).not.toContain('exaggerator'); // NOT a natural exaggerator
    const taskTick = at(0, 12);
    runUntil(world, taskTick, RULES);
    applyAction(world, { tick: taskTick, kind: 'recruit', target: 'anselm', mice: 'ego', leverageFamily: null }, RULES);
    expect(assetFor(world, 'player', 'anselm')!.mice).toBe('ego');

    const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 4, severity: 2, place: null, attribution: SOMEONE };
    // Their REPORT of this very claim WOULD inflate (the ego overlay is live on their channel)...
    expect(reportThrough(world, 'anselm', asClaim(spec), RULES, 'player').count).toBe(spec.count! * 2); // 8

    // ...but the courier TELLING carries the payload with their REAL firmware only (anselm: literalist +
    // moralizer, both inert on a no-sinVersion 'stole' count) — so the delivered count is UNCHANGED.
    applyCourier(world, 'anselm', spec, 'dara', null, taskTick, RULES);
    const expected = firstCoCircle(world, 'anselm', 'dara', taskTick);
    runUntil(world, expected + 1, RULES);
    const family = compartmentOf(world, 'player', 'anselm').find((f) => f.kind === 'carried-story')!.ref;
    expect(world.beliefs['dara']![family]!.claim.count).toBe(spec.count); // 4 — NOT doubled
  });
});

describe('courier handoff — face vs drop record EXACTLY different facts (compartmentalization you can point to)', () => {
  const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };

  it('a FACE handoff records met-asset (and no knows-drop); a DROP handoff records knows-drop (and no met-asset)', () => {
    // FACE: the avatar and the courier co-locate — the handoff is a meeting → met-asset on the courier.
    const wf = testWorld('courier-face');
    makeAsset(wf, 'mara', 'money');
    const t = at(0, 8);
    runUntil(wf, t, RULES);
    applyCourier(wf, 'mara', spec, 'rafe', null, t, RULES);
    const face = compartmentOf(wf, 'player', 'mara');
    expect(face.some((f) => f.kind === 'met-asset' && f.ref === 'you')).toBe(true); // met the avatar
    expect(face.some((f) => f.kind === 'knows-drop')).toBe(false);

    // DROP: no co-location required (the whole point) — the handoff leg is SKIPPED: no met-asset;
    // the courier learns the drop and the drop's knownBy grows.
    const wd = testWorld('courier-drop');
    makeAsset(wd, 'mara', 'money');
    applySetDrop(wd, 'drop-1', 'market', RULES);
    wd.playerVenue = 'chapel'; // the avatar is elsewhere — irrelevant to a drop, which is the point
    applyCourier(wd, 'mara', spec, 'rafe', 'drop-1', 0, RULES);
    const drop = compartmentOf(wd, 'player', 'mara');
    expect(drop.some((f) => f.kind === 'met-asset')).toBe(false);
    expect(drop.some((f) => f.kind === 'knows-drop' && f.ref === 'drop-1')).toBe(true);
    expect(wd.network.drops.find((d) => d.id === 'drop-1')!.knownBy).toContain('mara'); // the drop remembers who touched it
  });
});

describe('courier ideology refusal — they will not smear their own faction', () => {
  const t = at(0, 8);

  it('REFUSES a damaging claim whose subject shares the asset\'s faction (throws, zero residue)', () => {
    const world = testWorld('courier-ideology');
    makeAsset(world, 'mara', 'ideology'); // mara is faction 'guild'
    expect(world.npcs['mara']!.faction).toBe('guild');
    expect(world.npcs['rafe']!.faction).toBe('guild');       // same side as the courier
    expect(RULES.predicates['stole']!.valence).toBe('damaging');
    runUntil(world, t, RULES);

    const ownSide: InjectSpec = { subject: 'rafe', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE };
    const before = hashWorld(world);
    expect(() => applyCourier(world, 'mara', ownSide, 'rafe', null, t, RULES)).toThrow(/ideology|own faction/);
    expect(hashWorld(world)).toBe(before); // validate-before-mutate: no coin move, no queue, no fact
  });

  it('CARRIES a damaging claim about ANOTHER faction, and a flattering claim about its own', () => {
    const world = testWorld('courier-ideology-ok');
    makeAsset(world, 'mara', 'ideology');
    runUntil(world, t, RULES);

    // Another faction (tomas is crown): a damaging smear is fine — not her side.
    expect(world.npcs['tomas']!.faction).toBe('crown');
    const otherSide: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE };
    applyCourier(world, 'mara', otherSide, 'rafe', null, t, RULES);
    expect(world.network.pendingCouriers).toHaveLength(1);

    // Her own side, but FLATTERING: only damaging is refused.
    expect(RULES.predicates['blessed-the-harvest']!.valence).toBe('flattering');
    const flatterOwn: InjectSpec = { subject: 'rafe', predicate: 'blessed-the-harvest', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };
    applyCourier(world, 'mara', flatterOwn, 'rafe', null, t, RULES);
    expect(world.network.pendingCouriers).toHaveLength(2);
  });
});

describe('courier expiry — a run undelivered after 3 days lapses, and the coin is NOT refunded', () => {
  it('drops the pending run at day 3 with no delivery and no refund (priced failure)', () => {
    const world = testWorld('courier-expiry');
    makeAsset(world, 'dara', 'money');
    applySetDrop(world, 'drop-x', 'market', RULES); // via a drop so no co-location is needed to task
    const coinAfterDrop = world.coin;
    // dara (northside only) and tomas (docks/town only) NEVER share a venue — no intersection, ever.
    const spec: InjectSpec = { subject: 'mara', predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };
    applyCourier(world, 'dara', spec, 'tomas', 'drop-x', 0, RULES);
    const coinAfterTask = world.coin;
    expect(coinAfterTask).toBe(coinAfterDrop - STANDARD_ECONOMY.courierRun);
    expect(world.network.pendingCouriers).toHaveLength(1);

    runUntil(world, at(3, 0, 1), RULES); // through the first day-3 beat, where the 3-day clock lapses
    expect(world.network.pendingCouriers).toHaveLength(0);                                  // expired, removed
    expect(compartmentOf(world, 'player', 'dara').some((f) => f.kind === 'carried-story')).toBe(false); // never delivered
    expect(world.coin).toBe(coinAfterTask); // NO refund — and no rest-day nightly falls in days 0-2 to move coin
  });
});

describe('courier heat — a guard hearing the delivery attributes the CARRIER, and the compartment is the chain', () => {
  it('the guard captures the COURIER as speaker (not the avatar); interrogation would read carried-story + recruited-by:player', () => {
    const world = testWorld('courier-heat');
    world.enemy.observers.push({ id: 'cole', vigilance: 1 }); // a guard on the northside-chapel beat
    world.network.spymaster = 'cole'; // embodied handler hears this delivery in person
    const t = at(0, 12);
    runUntil(world, t, RULES);
    // Recruit anselm for real so recruited-by:player is genuinely on the record (the chain the enemy pulls).
    applyAction(world, { tick: t, kind: 'recruit', target: 'anselm', mice: 'money', leverageFamily: null }, RULES);
    const spec: InjectSpec = { subject: 'tomas', predicate: 'poisoned', object: null, count: 1, severity: 5, place: null, attribution: SOMEONE };
    applyCourier(world, 'anselm', spec, 'dara', null, t, RULES);
    const expected = firstCoCircle(world, 'anselm', 'dara', t);
    const evBefore = world.enemy.evidence.length;
    runUntil(world, expected + 1, RULES);

    // Heat lands on the carrier: the guard's capture names anselm — never the avatar.
    const captured = world.enemy.evidence.slice(evBefore).filter((e) => e.kind === 'utterance');
    expect(captured.some((e) => e.speaker === 'anselm')).toBe(true);
    expect(captured.every((e) => e.speaker !== 'you')).toBe(true);

    // The chain: interrogating the carrier reads their compartment — the story they carried, and who tasked them.
    const chain = compartmentOf(world, 'player', 'anselm');
    expect(chain.some((f) => f.kind === 'carried-story')).toBe(true);
    expect(chain.some((f) => f.kind === 'recruited-by' && f.ref === 'player')).toBe(true);
    expect(chain.some((f) => f.kind === 'met-asset' && f.ref === 'you')).toBe(true); // the face handoff, on the record
  });
});

describe('setDrop — public venues only, priced, avatar-known implicitly', () => {
  it('refuses non-public + unknown venues + duplicate ids; the happy path debits and seeds knownBy with the avatar', () => {
    const world = testWorld('drop-precond');
    const coin0 = world.coin;
    expect(() => applySetDrop(world, 'd1', 'home-mara', RULES)).toThrow(/public/);   // private venue
    expect(() => applySetDrop(world, 'd1', 'nowhere', RULES)).toThrow(/unknown venue/);

    applySetDrop(world, 'd1', 'market', RULES);
    const drop = world.network.drops.find((d) => d.id === 'd1')!;
    expect(drop.venue).toBe('market');
    expect(drop.knownBy).toEqual(['you']); // placer = avatar, implicitly
    expect(world.coin).toBe(coin0 - STANDARD_ECONOMY.deadDropSetup);

    expect(() => applySetDrop(world, 'd1', 'tavern', RULES)).toThrow(/duplicate/); // id reuse

    world.coin = STANDARD_ECONOMY.deadDropSetup - 1; // one short
    const before = hashWorld(world);
    expect(() => applySetDrop(world, 'd2', 'market', RULES)).toThrow(/treasury|cover/);
    expect(hashWorld(world)).toBe(before); // zero residue
  });
});

describe('courier preconditions — validate-before-mutate refusals', () => {
  const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };

  it('refuses a non-asset, an unknown target, an unknown/unknown-to-you drop, an off-beat and off-circle face handoff', () => {
    const world = testWorld('courier-precond');
    const t = at(0, 8);
    runUntil(world, t, RULES);

    expect(() => applyCourier(world, 'mara', spec, 'rafe', null, t, RULES)).toThrow(/not one of your assets/);
    makeAsset(world, 'mara', 'money');
    expect(() => applyCourier(world, 'mara', spec, 'ghost', null, t, RULES)).toThrow(/unknown npc/);
    expect(() => applyCourier(world, 'mara', spec, 'rafe', 'no-drop', t, RULES)).toThrow(/unknown dead drop/);
    expect(() => applyCourier(world, 'mara', spec, 'rafe', null, 7, RULES)).toThrow(/beat/); // off a conversation beat

    world.playerVenue = 'docks'; // the avatar leaves the market — mara is no longer in the handoff circle
    expect(() => applyCourier(world, 'mara', spec, 'rafe', null, t, RULES)).toThrow(/circle|handoff/);
  });

  it('insufficient coin REFUSES a face handoff with zero residue', () => {
    const world = testWorld('courier-broke');
    makeAsset(world, 'mara', 'money');
    const t = at(0, 8);
    runUntil(world, t, RULES);
    world.coin = STANDARD_ECONOMY.courierRun - 1; // one short
    const before = hashWorld(world);
    expect(() => applyCourier(world, 'mara', spec, 'rafe', null, t, RULES)).toThrow(/treasury|cover/);
    expect(hashWorld(world)).toBe(before);
    expect(world.network.pendingCouriers).toHaveLength(0);
    expect(compartmentOf(world, 'player', 'mara').some((f) => f.kind === 'met-asset')).toBe(false);
  });
});

// ── O5b: same-beat distinct-family minting (guards the P6-T7 keyed-collision class) ───────────────
describe('courier delivery — same-beat distinct-family minting (O5b)', () => {
  it('two runs delivering in ONE beat mint DISTINCT families off the global counter — never a keyed collision', () => {
    // A single public venue with exactly 4 residents → circlesAt forms ONE circle of all four, so both
    // (asset → target) pairs co-locate the SAME beat: the two-delivery-in-one-call condition, by construction.
    const fixture: TownFixture = {
      venues: [{ id: 'sq', district: 'd0', access: 'public' }],
      npcs: ['a1', 't1', 'a2', 't2'].map((id) => ({
        id, name: id, home: 'sq', occupation: 'grocer', faction: 'none' as const,
        traits: ['literalist' as const], rivals: [], edges: [],
        schedule: [{ days: 'all' as const, from: 0, to: 1439, venue: 'sq' }],
      })),
    };
    const world = buildWorld(fixture, 'o5b', RULES);
    for (const id of ['a1', 'a2']) {
      world.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }] });
    }
    const mk = (subject: string): InjectSpec => ({ subject, predicate: 'stole', object: null, count: 2, severity: 3, place: null, attribution: SOMEONE });
    const t = at(0, 8);       // a conversation beat
    const queued = at(0, 7);  // strictly before t, same day (no expiry, delivery fires t > queuedTick)
    world.network.pendingCouriers.push({ planId: 'plan-0', asset: 'a1', spec: mk('t2'), target: 't1', viaDrop: null, queuedTick: queued });
    world.network.pendingCouriers.push({ planId: 'plan-1', asset: 'a2', spec: mk('t1'), target: 't2', viaDrop: null, queuedTick: queued });

    const before = world.claimCounter;
    const delivered = deliverCouriers(world, t, RULES);

    expect(delivered).toHaveLength(2); // NON-VACUOUS: BOTH runs delivered this same beat
    const families = delivered.map((u) => u.claim.family).sort();
    // Distinct families is the whole guard — a keyed scheme (vignettes' pair-granular ids) could collide;
    // the global counter can't. They are exactly the two consecutive mints f{n}, f{n+1}.
    expect(new Set(families).size).toBe(2);
    expect(families).toEqual([`f${before}`, `f${before + 1}`]);
    // …and each courier's compartment recorded its OWN carried family, distinct from the other's.
    const f1 = compartmentOf(world, 'player', 'a1').find((f) => f.kind === 'carried-story')!.ref;
    const f2 = compartmentOf(world, 'player', 'a2').find((f) => f.kind === 'carried-story')!.ref;
    expect(f1).not.toBe(f2);
  });
});

describe('courier planning ids', () => {
  const mark = {
    asset: 'mara', target: 'rafe', from: 'market', to: 'market',
    authoredAt: 0, acknowledgedAt: null,
  } as const;

  it('allocates from append-only length and survives JSON round-trip', () => {
    const world = testWorld('courier-plan-json');
    expect(appendCourierPlan(world, mark)).toBe('plan-0');
    const copy = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(appendCourierPlan(copy, { ...mark, authoredAt: 15 })).toBe('plan-1');
    expect(copy.intel.courierPlans!.map((row) => row.id)).toEqual(['plan-0', 'plan-1']);
  });

  it('refuses a malformed substrate that would collide with the next length id', () => {
    const world = testWorld('courier-plan-collision');
    world.intel.courierPlans = [{ id: 'plan-1', ...mark }];
    expect(() => appendCourierPlan(world, mark)).toThrow(/duplicate id 'plan-1'/);
  });
});

describe('courier routing — save = seed + action log', () => {
  const spec: InjectSpec = { subject: 'tomas', predicate: 'stole', object: null, count: 1, severity: 2, place: null, attribution: SOMEONE };

  it('setDrop and courier join the Action union; both refuse without rules; unknown kinds still throw', () => {
    const world = testWorld('courier-route');
    makeAsset(world, 'mara', 'money');
    applySetDrop(world, 'd1', 'market', RULES);
    expect(() => applyAction(world, { tick: 0, kind: 'setDrop', id: 'd2', venue: 'market' })).toThrow(/rules/);
    expect(() => applyAction(world, { tick: 0, kind: 'courier', asset: 'mara', spec, target: 'rafe', viaDrop: 'd1' })).toThrow(/rules/);
    expect(() => applyAction(world, { tick: 0, kind: 'teleport' } as unknown as Action, RULES)).toThrow(/unknown action kind/);
  });

  it('live ≡ replay: a setDrop + courier in the log regrows byte-identically across a nightly, and delivers', () => {
    const build = (): WorldState => testWorld('courier-replay');
    const log: Action[] = [
      { tick: at(0, 12), kind: 'recruit', target: 'anselm', mice: 'money', leverageFamily: null },
      { tick: at(0, 12), kind: 'setDrop', id: 'd1', venue: 'market' },
      { tick: at(0, 12), kind: 'courier', asset: 'anselm', spec, target: 'dara', viaDrop: null },
    ];
    const a = runLogOn(build(), RULES, log, at(1, 6));
    const b = runLogOn(build(), RULES, log, at(1, 6));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(compartmentOf(a, 'player', 'anselm').some((f) => f.kind === 'carried-story')).toBe(true); // the delivery replayed
  });
});
