import { describe, expect, it } from 'vitest';
import { buildWorld } from '../../src/sim/world';
import { runEnemyDay } from '../../src/sim/counterintel';
import { enemyDigest, pressureFor, PRESSURE_TIERS, WATCH_CAP, INTERROGATION_CAP } from '../../src/sim/enemy/digest';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { emptyEnemyState, type EnemyState, type EvidenceEntry, type SketchFeature, type TownMap } from '../../src/sim/enemy/state';
import type { WorldState } from '../../src/sim/types';

/**
 * Task 10 — exposure escalation tiers (P6 deferral #2). `runEnemyDay` (world-side; reading
 * `exposureStatus` the way the referee does — the no-omniscience law's "same class as the
 * referee" carve-out) computes `pressure: 0|1|2` from the player's OWN exposure score and
 * threads it into the digest, whose OWN cap logic (interrogations, watches) honors it.
 * Constants live in ONE place: src/sim/enemy/digest.ts.
 */
const RULES = STANDARD_RULES;

// ── A MAP + evidence pool with TWO valid interrogation candidates AND TWO watchable
// districts — so cap 1 vs cap 2 is actually observable (a single-candidate pool can't tell
// the difference). Built exactly like enemy-digest.test.ts / enemy-spymaster.test.ts's own
// hand-rolled EnemyState fixtures — a real mechanism, never a stubbed score. ──
const MAP: TownMap = {
  venues: [
    { id: 'square-w0', district: 'w0', access: 'public' },
    { id: 'square-w1', district: 'w1', access: 'public' },
    { id: 'guard-post-w0', district: 'w0', access: 'invitational' },
    { id: 'guard-post-w1', district: 'w1', access: 'invitational' },
  ],
  directory: [
    { id: 'gale', occupation: 'guard', district: 'w0' },
    { id: 'hugo', occupation: 'guard', district: 'w1' },
    { id: 'mira', occupation: 'grocer', district: 'w0' },
    { id: 'otto', occupation: 'joiner', district: 'w0' },
    { id: 'sten', occupation: 'carter', district: 'w0' },
    { id: 'rosa', occupation: 'weaver', district: 'w1' },
    { id: 'quill', occupation: 'scribe', district: 'w1' },
  ],
};

function e(over: Partial<EvidenceEntry>): EvidenceEntry {
  return {
    tick: 500, venue: 'square-w0', observer: 'gale', overheard: true,
    speaker: 'mira', addressedTo: 'otto', kind: 'utterance', mode: 'telling',
    claimId: 'c0', family: 'f0',
    reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
      place: null, attribution: SOMEONE },
    about: null, ...over,
  };
}

/** Evidence producing exactly TWO interrogation candidates (f0->sten, f1->mira) and TWO
 *  watchable districts (w0 via family f2, w1 via family f3). */
function combinedEvidence(): EvidenceEntry[] {
  return [
    // candidate 1: family f0, named source 'sten'.
    e({ tick: 500, claimId: 'c1', family: 'f0', speaker: 'otto', addressedTo: 'gale',
      mode: 'answer', overheard: false,
      reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: 'sten' } }),
    // candidate 2: family f1, named source 'mira'.
    e({ tick: 520, venue: 'square-w1', claimId: 'c2', family: 'f1', observer: 'hugo',
      speaker: 'quill', addressedTo: 'hugo', mode: 'answer', overheard: false,
      reported: { subject: 'rosa', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: 'mira' } }),
    // family f2 (w0): entry-point + district-activity (mira, otto) + a vague answer (sten) -> origin-vague + carrier-profile.
    e({ tick: 480, claimId: 'c3', family: 'f2', speaker: 'mira', addressedTo: 'otto' }),
    e({ tick: 540, claimId: 'c4', family: 'f2', speaker: 'otto', addressedTo: 'mira' }),
    e({ tick: 560, claimId: 'c5', family: 'f2', speaker: 'sten', addressedTo: 'gale', mode: 'answer', overheard: false }),
    // family f3 (w1): entry-point + district-activity (rosa, quill).
    e({ tick: 580, venue: 'square-w1', observer: 'hugo', claimId: 'c6', family: 'f3', speaker: 'rosa', addressedTo: 'quill' }),
    e({ tick: 600, venue: 'square-w1', observer: 'hugo', claimId: 'c7', family: 'f3', speaker: 'quill', addressedTo: 'rosa' }),
  ];
}

function stateWith(evidence: EvidenceEntry[]): EnemyState {
  return {
    ...emptyEnemyState(),
    observers: [{ id: 'gale', vigilance: 0.9 }, { id: 'hugo', vigilance: 0.3 }],
    map: MAP, evidence,
  };
}

describe('pressureFor — the exact score bands (0-2 -> 0; 3-4 -> 1; >=5 -> 2)', () => {
  it('is pinned exactly at the boundaries', () => {
    expect(pressureFor(0)).toBe(0);
    expect(pressureFor(2)).toBe(0);
    expect(pressureFor(PRESSURE_TIERS.tier1 - 1)).toBe(0);
    expect(pressureFor(PRESSURE_TIERS.tier1)).toBe(1);     // 3
    expect(pressureFor(4)).toBe(1);
    expect(pressureFor(PRESSURE_TIERS.tier2 - 1)).toBe(1); // 4
    expect(pressureFor(PRESSURE_TIERS.tier2)).toBe(2);     // 5
    expect(pressureFor(9)).toBe(2);
  });
});

describe('enemyDigest — the cap tables (digest-internal, pure)', () => {
  it('pressure 0 (default, no 4th arg): interrogation cap 1, watch cap 1 — byte-identical to the pre-Task-10 shape', () => {
    const state = stateWith(combinedEvidence());
    const withDefault = enemyDigest(state, 1, RULES);
    const withExplicit0 = enemyDigest(state, 1, RULES, 0);
    expect(withDefault).toEqual(withExplicit0);
    expect(withDefault.interrogations).toHaveLength(1);
    expect(withDefault.watches).toHaveLength(1);
    // the SAME single candidate/district the old cap-1 code always picked (lexicographic first).
    expect(withDefault.interrogations[0]).toMatchObject({ target: 'mira', guard: 'gale' });
    expect(withDefault.watches[0]).toMatchObject({ district: 'w0' });
  });

  it('pressure 1 lifts the WATCH cap to 2 but leaves the interrogation cap at 1', () => {
    const state = stateWith(combinedEvidence());
    const d = enemyDigest(state, 1, RULES, 1);
    expect(d.interrogations).toHaveLength(1);
    expect(d.watches).toHaveLength(2);
    expect(d.watches.map((w) => w.district).sort()).toEqual(['w0', 'w1']);
  });

  it('pressure 2 lifts BOTH caps to 2 (escalation stacks — pressure 2 keeps pressure 1\'s watch relief)', () => {
    const state = stateWith(combinedEvidence());
    const d = enemyDigest(state, 1, RULES, 2);
    expect(d.interrogations).toHaveLength(2);
    expect(d.watches).toHaveLength(2);
    // the SAME candidate pool, just more of it — lexicographic order preserved.
    expect(d.interrogations.map((i) => i.target).sort()).toEqual(['mira', 'sten']);
    // distinct guards used for the two interrogations when >1 observer exists (no forced
    // 3-way circle at one guard/venue — a guard can only interrogate one target at a time).
    expect(new Set(d.interrogations.map((i) => i.guard)).size).toBe(2);
  });

  it('cap tables: WATCH_CAP/INTERROGATION_CAP live in ONE place and match the plan\'s literal bumps', () => {
    expect(WATCH_CAP).toEqual({ 0: 1, 1: 2, 2: 2 });
    expect(INTERROGATION_CAP).toEqual({ 0: 1, 1: 1, 2: 2 });
  });

  it('a scarce-guard town (only 1 observer) degrades gracefully at pressure 2 — no crash, guard reused', () => {
    const scarce: EnemyState = { ...stateWith(combinedEvidence()), observers: [{ id: 'gale', vigilance: 0.9 }] };
    const d = enemyDigest(scarce, 1, RULES, 2);
    expect(d.interrogations.length).toBeGreaterThan(0);
    expect(d.interrogations.every((i) => i.guard === 'gale')).toBe(true);
  });
});

// ── The world-side seam: runEnemyDay computes pressure from exposureStatus(world).score and
// threads it in. `exposureStatus` is adjudicator-only, but runEnemyDay is world-side (the
// referee's own class), so reading it here is lawful — see plan8-constraints.md's digest
// boundary note + the brief's controller note 1. ──

function stagedWorld(scoreN: number): WorldState {
  const world = buildWorld(TESTFORD, `pressure-world-${scoreN}`);
  world.enemy = stateWith(combinedEvidence());
  world.tick = at(1, 23, 59); // day 1, minute 1439 — the nightly beat runEnemyDay reads
  // Stage exposureStatus(world).score to EXACTLY scoreN via N distinct (kind, subject) sketch
  // features, subject = a "mine" id (an informant) — staged through applyEnemyDecision, never
  // a raw push, so featureCounter stays coherent (the scenario-exposure.test.ts idiom).
  for (let i = 0; i < scoreN; i++) {
    const id = `ghost${i}`;
    world.intel.informants.push({ id, assignedVenue: null });
    const feature: SketchFeature = {
      id: `sf-score-${world.enemy.featureCounter}`, kind: 'carrier-profile', day: 0, family: null,
      subject: id, district: null, detail: 'staged for pressure test — score only, no district',
      evidence: [{ tick: 0, observer: 'gale', claimId: null }],
    };
    applyEnemyDecision(world, { day: 0, features: [feature], inquiries: [], watches: [], interrogations: [] });
  }
  return world;
}

describe('runEnemyDay — twin-world at staged scores (the retune baseline)', () => {
  it('score 2 (pressure 0): both caps stay at 1', () => {
    const world = stagedWorld(2);
    runEnemyDay(world, RULES);
    const d = world.enemy.decisions.at(-1)!;
    expect(d.interrogations).toHaveLength(1);
    expect(d.watches).toHaveLength(1);
  });

  it('score 3 (pressure 1): watch cap lifts to 2, interrogation cap stays 1', () => {
    const world = stagedWorld(3);
    runEnemyDay(world, RULES);
    const d = world.enemy.decisions.at(-1)!;
    expect(d.interrogations).toHaveLength(1);
    expect(d.watches).toHaveLength(2);
  });

  it('score 5 (pressure 2): both caps lift to 2', () => {
    const world = stagedWorld(5);
    runEnemyDay(world, RULES);
    const d = world.enemy.decisions.at(-1)!;
    expect(d.interrogations).toHaveLength(2);
    expect(d.watches).toHaveLength(2);
  });

  it('an enemy-off world (no observers) is a no-op regardless of score — enemy-off pins never move', () => {
    const world = buildWorld(TESTFORD, 'pressure-off');
    world.tick = at(1, 23, 59);
    for (let i = 0; i < 6; i++) world.intel.informants.push({ id: `ghost${i}`, assignedVenue: null });
    expect(world.enemy.observers).toHaveLength(0);
    runEnemyDay(world, RULES);
    expect(world.enemy.decisions).toHaveLength(0);
  });
});

describe('no-omniscience — pressure never lets the digest see hidden state either', () => {
  it('perturbing informant membership alone (never the evidence log) leaves the digest bit-identical for a FIXED pressure', () => {
    // pressure is threaded as a plain integer argument, same class as `day`/`rules` — the
    // digest still cannot see world.intel.informants or exposureStatus; it only ever sees the
    // integer runEnemyDay hands it. Proven directly: two calls with the SAME state+pressure,
    // regardless of what (unseen) world produced that pressure, are bit-identical.
    const state = stateWith(combinedEvidence());
    const a = enemyDigest(state, 1, RULES, 2);
    const b = enemyDigest(state, 1, RULES, 2);
    expect(a).toEqual(b);
  });
});
