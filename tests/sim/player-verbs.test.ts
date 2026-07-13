import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { attachScenario } from '../../src/sim/scenario/referee';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { applyInject, applyTell, type InjectSpec } from '../../src/sim/actions';
import { applyAction } from '../../src/sim/campaign';
import { circlesAt, type Circle } from '../../src/sim/agents';
import { runUntil, step } from '../../src/sim/step';
import { juiciness } from '../../src/sim/rumors/propagation';
import { reportThrough } from '../../src/sim/reporting';
import { at } from '../../src/core/time';
import { SOMEONE, type Claim, type EntityId } from '../../src/sim/rumors/claim';
import type { GeneratedTown } from '../../src/world/types';
import type { AskingRecord, InstitutionRecord, TellingRecord, WorldState } from '../../src/sim/types';

const RULES = STANDARD_RULES;

/** The 7 content fields shared by a Claim, a ReportedClaim, and an InjectSpec — the comparable core. */
type Content = Pick<Claim, 'subject' | 'predicate' | 'object' | 'count' | 'severity' | 'place' | 'attribution'>;
const bareOf = (c: Content): Content => {
  const { subject, predicate, object, count, severity, place, attribution } = c;
  return { subject, predicate, object, count, severity, place, attribution };
};

/** A damaging spec whose valence is real dirt — used to prove telling lands under physics. */
const dirt: InjectSpec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 1, severity: 4, place: null, attribution: SOMEONE,
};

/** The gravest dirt in the game — juiciness 1.0, so it clears any guard's vigilance gate. */
const poison = (subject: EntityId): InjectSpec => ({
  subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE,
});

/** A whole Claim from a spec, for pure reads (juiciness/reportThrough) that never touch id/lineage. */
const asClaim = (spec: InjectSpec): Claim => ({ id: 'probe', family: 'probe', parent: null, ...spec });

/** The first beat of day 0 where the avatar's circle holds at least `minMembers` — read, not staged. */
function avatarCircleAt(world: WorldState, minMembers: number): { t: number; circle: Circle } {
  for (let h = 0; h < 24; h++) {
    const t = at(0, h);
    const c = circlesAt(world, t).find((circle) => circle.members.includes('you'));
    if (c && c.members.length >= minMembers) return { t, circle: c };
  }
  throw new Error('avatarCircleAt: no beat in day 0 gave the avatar a circle that large');
}

const tellingBy = (world: WorldState, who: EntityId): TellingRecord | undefined =>
  world.chronicle.find((e): e is TellingRecord => e.kind === 'telling' && e.speaker === who);

/** Procgen staging: valid town → live world → avatar (+ campaign referee when endings matter). */
function stage(seed: string, opts: { scenario: boolean }): { world: WorldState; town: GeneratedTown } {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, RULES);
  const world = worldFromTown(town, seed);
  attachPlayer(world, town);
  if (opts.scenario) attachScenario(world, town, CORONATION);
  return { world, town };
}

/** Pin an NPC to one venue for all of day 0 — the enemy-watch idiom, used to stage circles. */
function pinTo(world: WorldState, id: EntityId, venue: string): void {
  world.scheduleOverrides[id] = [{ fromDay: 0, toDay: null, from: 0, to: 1440, venue, source: 'enemy' }];
}

describe('player verbs — the avatar speaks under full physics', () => {
  // (a) tell lands under physics
  it('a telling lands: the target ingests, a bystander overhears, and it is a hop-zero claim', () => {
    const world = buildWorld(miniTown(), 'pv-tell');
    enrollPlayer(world, { home: 'square' });
    const { t, circle } = avatarCircleAt(world, 3);
    const others = circle.members.filter((m) => m !== 'you');
    const [target, bystander] = [others[0]!, others[1]!];

    runUntil(world, t, RULES);
    applyAction(world, { tick: t, kind: 'tell', to: target, spec: dirt });
    expect(world.pendingTell).not.toBeNull(); // set at apply-time, consumed by this same tick's step
    step(world, RULES);

    const telling = tellingBy(world, 'you');
    expect(telling).toBeDefined();
    expect(telling).toMatchObject({ addressedTo: target, mode: 'telling' });
    expect(telling!.heardBy.map((h) => h.id)).toContain(bystander);

    const claim = world.claims[telling!.claimId];
    expect(claim).toBeDefined();               // registered in world.claims
    expect(claim!.parent).toBeNull();          // hop zero — the avatar's word is an origin
    const family = claim!.family;

    // The target ingested it (addressed) and a co-circle bystander overheard the same claim.
    expect(world.beliefs[target]![family]?.claim.id).toBe(claim!.id);
    expect(world.beliefs[bystander]![family]?.claim.id).toBe(claim!.id);
    // The human is not a mind: the avatar never ingests its own (or anyone's) words.
    expect(world.beliefs['you']).toEqual({});
    expect(world.pendingTell).toBeNull();
  });

  // (b) validation walls
  it('validation walls: no player, off-beat, non-circle target throw; pendingTell clears on step', () => {
    const noPlayer = buildWorld(miniTown(), 'pv-b1');
    expect(() => applyTell(noPlayer, 'ada', dirt, 0)).toThrow(/no player/);

    const world = buildWorld(miniTown(), 'pv-b2');
    enrollPlayer(world, { home: 'square' });
    // Off-beat ticks are silent by law — speech only on conversation beats.
    expect(() => applyTell(world, 'ada', dirt, 7)).toThrow(/beat/);
    // A target outside the avatar's actual circle at this beat cannot be told (read the circle first).
    const t0 = at(0, 0);
    const myCircle = circlesAt(world, t0).find((c) => c.members.includes('you'))!;
    const outsider = ['ada', 'bez', 'cyn', 'dov'].find((id) => !myCircle.members.includes(id))!;
    expect(() => applyTell(world, outsider, dirt, t0)).toThrow(/circle/);

    // The pending handoff is consumed by the following step (no telling leaks into the next beat).
    const fresh = buildWorld(miniTown(), 'pv-b2');
    enrollPlayer(fresh, { home: 'square' });
    const { t, circle } = avatarCircleAt(fresh, 2);
    const mate = circle.members.find((m) => m !== 'you')!;
    runUntil(fresh, t, RULES);
    applyTell(fresh, mate, dirt, t);
    expect(fresh.pendingTell).not.toBeNull();
    step(fresh, RULES);
    expect(fresh.pendingTell).toBeNull();
  });

  // (c) the canary flows (amendment #4 proof-of-life)
  it('the canary flows: an informant told alone reports your story back through their own firmware', () => {
    const { world } = stage('cor-1', { scenario: false });
    const informants = world.intel.informants.map((i) => i.id);
    expect(informants.length).toBeGreaterThan(0);

    const spec = poison(SOMEONE);
    const bare = bareOf(asClaim(spec));
    const distorts = (id: EntityId): boolean =>
      JSON.stringify(bareOf(reportThrough(world, id, asClaim(spec), RULES, 'player'))) !== JSON.stringify(bare);
    // Pick a distorting informant when one exists — that is the canary's whole point (a fingerprint).
    const X = informants.find(distorts) ?? informants[0]!;

    pinTo(world, X, 'safehouse');
    const circle = circlesAt(world, 0).find((c) => c.venue === 'safehouse')!;
    expect(new Set(circle.members)).toEqual(new Set(['you', X])); // told ALONE (2-person circle)

    applyAction(world, { tick: 0, kind: 'tell', to: X, spec });
    runUntil(world, at(1, 0), RULES); // run a day

    const back = world.intel.log.find((e) => e.via === X && e.kind === 'utterance' && e.speaker === 'you');
    expect(back).toBeDefined(); // X filed a report of what YOU told them

    const claim = world.claims[tellingBy(world, 'you')!.claimId]!;
    expect(back!.reported).toEqual(reportThrough(world, X, claim, RULES, 'player')); // BY MECHANISM: X's trait-filtered view
    if (distorts(X)) {
      expect(back!.reported).not.toEqual(bareOf(claim)); // a trait-carrying X visibly distorts
    }
  });

  // (d) caught in the act
  it('caught in the act: a guard overhearing the avatar speak ends the campaign that very tick', () => {
    const { world, town } = stage('cor-2', { scenario: true });
    const observer = world.enemy.observers[0]!; // a real guard, with a real vigilance
    const g = observer.id;
    const guardIds = new Set(world.enemy.observers.map((o) => o.id));
    const bystander = Object.keys(world.npcs).filter((id) => id !== 'you' && !guardIds.has(id)).sort()[0]!;

    pinTo(world, g, 'safehouse');
    pinTo(world, bystander, 'safehouse');
    const spec = poison(town.cast!.usurper);
    // The dirt clears this guard's overhear gate — computed from the world's actual guard.
    expect(juiciness(asClaim(spec), RULES)).toBeGreaterThanOrEqual(1 - observer.vigilance);

    const T = at(0, 8);
    runUntil(world, T, RULES);
    const circle = circlesAt(world, T).find((c) => c.members.includes('you'))!;
    expect(circle.members).toEqual(expect.arrayContaining([g, bystander]));

    applyAction(world, { tick: T, kind: 'tell', to: bystander, spec }); // told to the civilian; the guard OVERHEARS
    step(world, RULES);

    const s = world.scenario!;
    expect(s.status).toBe('lost-caught');
    expect(s.resolution).toMatchObject({ kind: 'lost-caught', day: 0, heardBy: g, venue: 'safehouse' });
    const arrest = world.chronicle.find(
      (e): e is InstitutionRecord => e.kind === 'institution' && e.action === 'arrest',
    );
    expect(arrest).toBeDefined();
    expect(arrest).toMatchObject({ subject: 'you', actors: [g] });

    // Status is data — the world keeps stepping if the driver steps it, and the ending stays latched.
    const before = world.tick;
    step(world, RULES);
    expect(world.tick).toBe(before + 1);
    expect(world.scenario!.status).toBe('lost-caught');
    expect(world.chronicle.filter((e) => e.kind === 'institution' && e.action === 'arrest')).toHaveLength(1);
  });

  // (e) not caught when unheard
  it('not caught when unheard: the same telling in a guardless circle leaves the campaign running', () => {
    const { world, town } = stage('cor-3', { scenario: true });
    const guardIds = new Set(world.enemy.observers.map((o) => o.id));
    const bystander = Object.keys(world.npcs).filter((id) => id !== 'you' && !guardIds.has(id)).sort()[0]!;

    pinTo(world, bystander, 'safehouse');
    const spec = poison(town.cast!.usurper);
    const T = at(0, 8);
    runUntil(world, T, RULES);
    const circle = circlesAt(world, T).find((c) => c.members.includes('you'))!;
    expect(circle.members.some((m) => guardIds.has(m))).toBe(false); // no guard in earshot

    applyAction(world, { tick: T, kind: 'tell', to: bystander, spec });
    step(world, RULES);

    expect(world.scenario!.status).toBe('running');
    expect(world.chronicle.some((e) => e.kind === 'institution' && e.action === 'arrest')).toBe(false);
    // The telling still LANDED — a guard's absence changes capture, never physics.
    const claim = world.claims[tellingBy(world, 'you')!.claimId]!;
    expect(world.beliefs[bystander]![claim.family]).toBeDefined();
  });

  // (f) ask emits and answers arrive
  it('an ask emits a non-authority question and the answer reaches the avatar via self', () => {
    const world = buildWorld(miniTown(), 'pv-ask');
    enrollPlayer(world, { home: 'backroom' });
    world.npcs['you']!.edges = [{ to: 'ada', kind: 'friend', trust: 0.8 }]; // the avatar must trust to ask
    world.npcs['ada']!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 }); // ada must trust to answer
    pinTo(world, 'ada', 'backroom');
    applyInject(world, 'ada', {
      subject: 'cyn', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
    });
    const circle = circlesAt(world, 0).find((c) => c.venue === 'backroom')!;
    expect(new Set(circle.members)).toEqual(new Set(['you', 'ada']));

    applyAction(world, { tick: 0, kind: 'ask', to: 'ada', about: { subject: 'cyn' } });
    step(world, RULES);

    const asking = world.chronicle.find((e): e is AskingRecord => e.kind === 'asking' && e.speaker === 'you');
    expect(asking).toBeDefined();
    expect(asking).toMatchObject({ addressedTo: 'ada', authority: false }); // a civilian question, not the watch's

    const answer = world.intel.log.find(
      (e) => e.via === 'self' && e.kind === 'utterance' && e.speaker === 'ada'
        && e.addressedTo === 'you' && e.mode === 'answer',
    );
    expect(answer).toBeDefined(); // the answer arrived on the avatar's own feed
  });

  it('empty inquiry queue: the avatar never asks (positive control — the skip-law holds)', () => {
    const world = buildWorld(miniTown(), 'pv-ask-empty');
    enrollPlayer(world, { home: 'backroom' });
    world.npcs['you']!.edges = [{ to: 'ada', kind: 'friend', trust: 0.8 }];
    world.npcs['ada']!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });
    pinTo(world, 'ada', 'backroom');
    applyInject(world, 'ada', {
      subject: 'cyn', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
    });
    runUntil(world, at(1, 0), RULES); // a full day, but no ask verb was ever logged

    expect(world.inquiries['you']).toBeUndefined();
    expect(world.chronicle.some((e) => e.kind === 'asking' && e.speaker === 'you')).toBe(false);
  });
});
