import { describe, expect, it } from 'vitest';
import { buildWorld } from '../../src/sim/world';
import { worldFromTown } from '../../src/world/attach';
import { runEnemyDay, captureEvidence } from '../../src/sim/counterintel';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { applyInject } from '../../src/sim/actions';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { emptyEnemyState, type EnemyState, type EvidenceEntry, type ReportedClaim, type TownMap } from '../../src/sim/enemy/state';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import { at, dayOf } from '../../src/core/time';
import { stableStringify } from '../../src/sim/hash';
import type { TickEvents } from '../../src/sim/perception';
import type { Belief, WorldState } from '../../src/sim/types';

const RULES = STANDARD_RULES;
const gen = (seed: string): ReturnType<typeof generateValidTown>['town'] =>
  generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, RULES,
    { knownTraitIds: Object.keys(TRAITS), knownPredicateIds: Object.keys(RULES.predicates) }).town;

describe('worldFromTown — his network is townspeople', () => {
  it('wires the spymaster + his 3 assets as enemy observers (vigilance 0.5) alongside the guards', () => {
    const town = gen('spy-wire');
    const world = worldFromTown(town, 'spy-wire', RULES);
    const net = town.enemyNet!;

    expect(world.network.spymaster).toBe(net.spymaster);

    // His 3 assets are observers at a flat 0.5 — the SAME machinery as guards, ADDED to them.
    for (const guard of town.guards) {
      expect(world.enemy.observers.some((o) => o.id === guard.id)).toBe(true);
    }
    for (const asset of net.assets) {
      const spec = world.enemy.observers.find((o) => o.id === asset);
      expect(spec, `asset ${asset} is an observer`).toBeTruthy();
      expect(spec!.vigilance).toBe(0.5);
    }
    expect(world.enemy.observers.length).toBe(town.guards.length + net.assets.length);

    // The enemy-side roster mirror gets his assets as AssetRecords (same shapes — one machinery).
    expect(world.network.enemyAssets.map((a) => a.id).sort()).toEqual([...net.assets].sort());
  });

  it("an asset's overheard juicy talk lands in enemy evidence (his coverage grows beyond guards)", () => {
    const town = gen('spy-capture');
    const world = worldFromTown(town, 'spy-capture', RULES);
    const asset = town.enemyNet!.assets[0]!;
    const others = town.fixture.npcs.map((n) => n.id).filter((id) => id !== asset);
    const speaker = others[0]!;
    const addressee = others[1]!;
    const venue = town.fixture.venues.find((v) => v.access === 'public')!.id;

    const claim = applyInject(world, speaker, {
      subject: addressee, predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: SOMEONE,
    });
    const events: TickEvents = {
      tick: world.tick, positions: {}, askings: [],
      utterances: [{ tick: world.tick, venue, circleMembers: [speaker, addressee, asset], speaker, addressedTo: addressee, claim, mode: 'telling' }],
    };
    captureEvidence(world, events, RULES);

    // stole (juiciness 0.8) clears the flat-0.5 ear: 0.8 >= 1 - 0.5. The asset captured it.
    expect(world.enemy.evidence.some((e) => e.observer === asset && e.kind === 'utterance' && e.overheard)).toBe(true);
  });
});

// ── The nightly budget spend (world-side seam in runEnemyDay, reading HIS belief store) ──

const MAP: TownMap = {
  venues: [
    { id: 'square-w0', district: 'w0', access: 'public' },
    { id: 'guard-post-w0', district: 'w0', access: 'invitational' },
  ],
  directory: [
    { id: 'gale', occupation: 'guard', district: 'w0' }, { id: 'hugo', occupation: 'guard', district: 'w0' },
    { id: 'mira', occupation: 'grocer', district: 'w0' }, { id: 'otto', occupation: 'joiner', district: 'w0' },
    { id: 'sten', occupation: 'carter', district: 'w0' },
  ],
};

function heard(over: Partial<EvidenceEntry>): EvidenceEntry {
  return {
    tick: 500, venue: 'square-w0', observer: 'gale', overheard: true,
    speaker: 'mira', addressedTo: 'otto', kind: 'utterance', mode: 'telling',
    claimId: 'c1', family: 'f0',
    reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: SOMEONE },
    about: null, ...over,
  };
}

/** A staged enemy state whose evidence makes the digest order EXACTLY one interrogation of 'sten'. */
function stagedEnemy(): EnemyState {
  return {
    ...emptyEnemyState(),
    observers: [{ id: 'gale', vigilance: 0.9 }, { id: 'hugo', vigilance: 0.3 }],
    map: MAP,
    evidence: [
      heard({}),
      heard({ tick: 900, claimId: 'c3', speaker: 'otto', mode: 'answer', addressedTo: 'gale', overheard: false,
        reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: 'sten' } }),
    ],
  };
}

/** A world staged so the nightly digest orders one interrogation, with `spymaster` as the world-side handle. */
function stagedWorld(spymaster: string): WorldState {
  const world = buildWorld(TESTFORD, 'spy-budget');
  world.enemy = stagedEnemy();
  world.network.spymaster = spymaster;
  world.tick = at(1, 23, 59); // day 1, minute 1439 — the nightly beat runEnemyDay reads
  return world;
}

/** A damaging self-rumor belief on the spymaster at `credence`, counter-spun or not. */
function selfRumor(subject: string, credence: number, counterSpun: boolean): Belief {
  const claim: Claim = { id: 'c-scandal', family: 'f-scandal', parent: null,
    subject, predicate: 'stole', object: null, count: null, severity: 4, place: null, attribution: SOMEONE };
  return { claim, credence, heardFrom: 'injected', heardAt: 0, firstHeardAt: 0, timesHeard: 2,
    apparentSources: [], discretion: false, counterSpun };
}

describe('the budget spend — his scandals spend his nights', () => {
  it('an un-counter-spun damaging self-rumor at REPEAT+ consumes the interrogation slot (twin-world diff)', () => {
    const spymaster = 'edmund';
    const control = stagedWorld(spymaster);
    const scandalized = stagedWorld(spymaster);
    scandalized.beliefs[spymaster] = { 'f-scandal': selfRumor(spymaster, 0.6, false) };

    // BOUNDARY: the self-rumor lives in HIS beliefs, never in the evidence log the digest folds over.
    expect(stableStringify(scandalized.enemy.evidence)).toBe(stableStringify(control.enemy.evidence));
    // …so the digest's own decision is bit-identical (no-omniscience: the digest cannot see his mind).
    expect(stableStringify(enemyDigest(scandalized.enemy, dayOf(scandalized.tick), RULES)))
      .toBe(stableStringify(enemyDigest(control.enemy, dayOf(control.tick), RULES)));

    // …yet the world-side seam diverges: control interrogates, the scandalized spymaster does not.
    runEnemyDay(control, RULES);
    runEnemyDay(scandalized, RULES);
    expect(control.enemy.decisions.at(-1)!.interrogations).toHaveLength(1);
    expect(scandalized.enemy.decisions.at(-1)!.interrogations).toHaveLength(0);
  });

  it('a COUNTER-SPUN self-rumor does not spend the slot (he already answered it)', () => {
    const w = stagedWorld('edmund');
    w.beliefs['edmund'] = { 'f-scandal': selfRumor('edmund', 0.9, true) };
    runEnemyDay(w, RULES);
    expect(w.enemy.decisions.at(-1)!.interrogations).toHaveLength(1);
  });

  it('a self-rumor BELOW repeating stance does not spend the slot', () => {
    const w = stagedWorld('edmund');
    w.beliefs['edmund'] = { 'f-scandal': selfRumor('edmund', 0.4, false) };
    runEnemyDay(w, RULES);
    expect(w.enemy.decisions.at(-1)!.interrogations).toHaveLength(1);
  });

  it('no spymaster wired (headless / fixture world) leaves the decision untouched', () => {
    const w = buildWorld(TESTFORD, 'spy-none');
    w.enemy = stagedEnemy();
    w.tick = at(1, 23, 59);
    runEnemyDay(w, RULES);
    expect(w.enemy.decisions.at(-1)!.interrogations).toHaveLength(1);
  });
});

// ── O1 (T7 Minor a): the both-slots spend — two qualifying scandals consume BOTH slots, in order ──
// The T7 budget shipped under reading (C): one slot per scandal, interrogation-FIRST. The two-slot
// case (two scandals in one night) was UNTESTED. The full-ladder e2e stages budget outcomes and needs
// the slot ORDER stable, so pin it: interrogation-first, then watch.
const MAP2: TownMap = {
  venues: [
    { id: 'pub-A', district: 'dA', access: 'public' },
    { id: 'inv-A', district: 'dA', access: 'invitational' },
    { id: 'pub-B', district: 'dB', access: 'public' },
    { id: 'inv-B', district: 'dB', access: 'invitational' },
  ],
  directory: [
    { id: 'g1', occupation: 'guard', district: 'dA' }, { id: 'g2', occupation: 'guard', district: 'dB' },
    { id: 'src', occupation: 'grocer', district: 'dA' },
    { id: 'carrier', occupation: 'joiner', district: 'dB' },
    { id: 'spk', occupation: 'carter', district: 'dA' },
  ],
};

const dmg = (subject: string, attribution: string): ReportedClaim =>
  ({ subject, predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution });

/** A staged enemy whose nightly digest orders EXACTLY one interrogation (fA names 'src') AND one
 *  watch (district dB, driven by fB's origin-vague) — the both-slots premise. */
function twoSlotEnemy(): EnemyState {
  return {
    ...emptyEnemyState(),
    observers: [{ id: 'g1', vigilance: 0.9 }, { id: 'g2', vigilance: 0.9 }],
    map: MAP2,
    evidence: [
      // fA — a suspicious story + an answer NAMING a source ('src'): the interrogation candidate.
      { tick: 480, venue: 'pub-A', observer: 'g1', overheard: true, speaker: 'spk', addressedTo: 'src', kind: 'utterance', mode: 'telling', claimId: 'cA1', family: 'fA', reported: dmg('src', SOMEONE), about: null },
      { tick: 905, venue: 'inv-A', observer: 'g1', overheard: false, speaker: 'spk', addressedTo: 'g1', kind: 'utterance', mode: 'answer', claimId: 'cA2', family: 'fA', reported: dmg('src', 'src'), about: null },
      // fB — a suspicious story + a VAGUE answer (origin-vague): carrier-profile + a watchable district dB.
      { tick: 481, venue: 'pub-B', observer: 'g2', overheard: true, speaker: 'carrier', addressedTo: 'g2', kind: 'utterance', mode: 'telling', claimId: 'cB1', family: 'fB', reported: dmg('carrier', SOMEONE), about: null },
      { tick: 906, venue: 'pub-B', observer: 'g2', overheard: false, speaker: 'carrier', addressedTo: 'g2', kind: 'utterance', mode: 'answer', claimId: 'cB2', family: 'fB', reported: dmg('carrier', SOMEONE), about: null },
    ],
  };
}

/** A damaging self-rumor family the spymaster holds at `credence`, un-counter-spun by default. */
function selfScandal(family: string, spymaster: string, credence: number): Belief {
  const claim: Claim = { id: `c-${family}`, family, parent: null, subject: spymaster,
    predicate: 'stole', object: null, count: null, severity: 4, place: null, attribution: SOMEONE };
  return { claim, credence, heardFrom: 'injected', heardAt: 0, firstHeardAt: 0, timesHeard: 2,
    apparentSources: [], discretion: false, counterSpun: false };
}

describe('the budget spend — two scandals consume BOTH slots, interrogation-first (O1)', () => {
  const SPY = 'edmund';
  const stage2 = (scandals: number): WorldState => {
    const w = buildWorld(TESTFORD, 'o1-budget');
    w.enemy = twoSlotEnemy();
    w.network.spymaster = SPY;
    w.tick = at(1, 23, 59);
    if (scandals > 0) {
      w.beliefs[SPY] = {};
      for (let i = 0; i < scandals; i++) w.beliefs[SPY]![`f-s${i}`] = selfScandal(`f-s${i}`, SPY, 0.6);
    }
    return w;
  };

  it('control (0 scandals): the digest orders EXACTLY one interrogation AND one watch (the premise)', () => {
    const w = stage2(0);
    runEnemyDay(w, RULES);
    const d = w.enemy.decisions.at(-1)!;
    expect(d.interrogations).toHaveLength(1);
    expect(d.watches).toHaveLength(1);
  });

  it('ONE scandal drops ONLY the interrogation — the watch survives (interrogation-first order)', () => {
    const w = stage2(1);
    // BOUNDARY: the scandal lives in HIS beliefs, never the evidence — the raw digest is bit-identical.
    expect(stableStringify(enemyDigest(w.enemy, dayOf(w.tick), RULES)))
      .toBe(stableStringify(enemyDigest(stage2(0).enemy, dayOf(w.tick), RULES)));
    runEnemyDay(w, RULES);
    const d = w.enemy.decisions.at(-1)!;
    expect(d.interrogations).toHaveLength(0); // slot 1 → the interrogation
    expect(d.watches).toHaveLength(1);        // …the watch is untouched
  });

  it('TWO scandals consume BOTH slots — interrogation AND watch dropped', () => {
    const w = stage2(2);
    runEnemyDay(w, RULES);
    const d = w.enemy.decisions.at(-1)!;
    expect(d.interrogations).toHaveLength(0);
    expect(d.watches).toHaveLength(0);
  });
});
