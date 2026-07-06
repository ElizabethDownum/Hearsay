import { describe, expect, it } from 'vitest';
import { watchfordWorld } from './helpers/watchford-world';
import { enrollPlayer } from '../../src/sim/world';
import { attachScenario } from '../../src/sim/scenario/referee';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { applyInject, type InjectSpec } from '../../src/sim/actions';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { runUntil } from '../../src/sim/step';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import type { ScenarioDef } from '../../src/sim/scenario/types';
import type { EnemyDecision, SketchFeature } from '../../src/sim/enemy/state';
import type { GeneratedTown } from '../../src/world/types';
import type { InstitutionRecord, WorldState } from '../../src/sim/types';

/**
 * Reachability honesty (brief, plan6-constraints, Plan-7 tell-verb dependency): in v1
 * physics the avatar can never BE the origin-vague answer-speaker a carrier-profile keys
 * off of — carrier-profile fires on a compelled/queried ANSWER speaker (see
 * tests/sim/enemy-integration.test.ts), and the avatar never auto-answers under
 * interrogation (the skip-law at src/sim/step.ts:33 only skips volunteered TELLING, but
 * there is still no verb through which the avatar answers today). So `identified: true`
 * is UNREACHABLE through emergent play until Plan 7's tell verb lets the player speak.
 * Every test below STAGES the identifying carrier-profile feature directly through
 * `applyEnemyDecision` to prove the scoring/latch machinery works; only the
 * informant-subject path (score > 0, identified: false) is reachable today, because
 * informants DO answer under interrogation.
 */

const DEF: ScenarioDef = {
  id: 'test-exposure', name: 'Test Exposure', days: 40,
  objectiveTerm: 'objective-topple', win: { kind: 'council-turns', quorum: 2 },
};

// Watchford is a hand-authored TownFixture, not a GeneratedTown — there is no procgen cast
// to pull from. attachScenario (src/sim/scenario/referee.ts) only ever reads `town.cast`
// (see tests/sim/scenario-referee.test.ts's idiom from Task 5), so hand-build the minimal
// shape it needs rather than route through generateValidTown.
const CAST_TOWN = { cast: { usurper: 'otto', council: ['mira', 'sten'] } } as unknown as GeneratedTown;

/** Fresh Watchford world: enemy observers wired, avatar enrolled, one informant, scenario attached. */
function fresh(seed: string): WorldState {
  const world = watchfordWorld(seed);
  enrollPlayer(world, { home: 'home-gs' });
  world.intel.informants.push({ id: 'rosa', assignedVenue: null });
  attachScenario(world, CAST_TOWN, DEF);
  return world;
}

/**
 * Stage a sketch feature through `applyEnemyDecision` — never a raw push onto
 * `world.enemy.sketch` — so `featureCounter` stays coherent with the sketch length. Evidence
 * carries a non-empty ref even in a stage: the fair-cop type contract holds everywhere.
 */
function stage(world: WorldState, overrides: Partial<SketchFeature>): void {
  const feature: SketchFeature = {
    id: `sf-stage-${world.enemy.featureCounter}`, kind: 'carrier-profile', day: 0, family: 'f0',
    subject: null, district: null, detail: 'staged for exposure test',
    evidence: [{ tick: world.tick, observer: 'gale', claimId: null }],
    ...overrides,
  };
  const decision: EnemyDecision = { day: 0, features: [feature], inquiries: [], watches: [], interrogations: [] };
  applyEnemyDecision(world, decision);
}

const institutionsOf = (world: WorldState): InstitutionRecord[] =>
  world.chronicle.filter((e): e is InstitutionRecord => e.kind === 'institution');

const damaging = (subject: string): InjectSpec => ({
  subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE,
});

describe('exposure — the sketch-identification loss', () => {
  it('(a) empty sketch → zero score, not identified, no features', () => {
    const world = fresh('exp-a');
    expect(exposureStatus(world)).toEqual({ score: 0, identified: false, features: [] });
  });

  it('(b) a carrier-profile on the informant scores but does not identify; a nightly leaves it running (exposure is data, not yet loss)', () => {
    const world = fresh('exp-b');
    stage(world, { subject: 'rosa' }); // rosa is the pushed informant

    const status = exposureStatus(world);
    expect(status.score).toBe(1);
    expect(status.identified).toBe(false);

    runUntil(world, at(1, 0), STANDARD_RULES); // day-0 nightly
    expect(world.scenario!.status).toBe('running');
  });

  it('(c) a carrier-profile on the avatar identifies; the next nightly ends the campaign lost-exposed with an unmasking record', () => {
    const world = fresh('exp-c');
    stage(world, { subject: world.playerId! }); // the ghost has your face

    const status = exposureStatus(world);
    expect(status.identified).toBe(true);

    runUntil(world, at(1, 0), STANDARD_RULES);
    const s = world.scenario!;
    expect(s.status).toBe('lost-exposed');
    expect(s.resolution?.kind).toBe('lost-exposed');
    if (s.resolution?.kind === 'lost-exposed') {
      expect(s.resolution.features.length).toBeGreaterThan(0);
      for (const f of s.resolution.features) {
        expect(world.enemy.sketch.some((sf) => sf.id === f.featureId)).toBe(true);
      }
    }
    const last = institutionsOf(world).at(-1)!;
    expect(last.action).toBe('unmasking');
  });

  it('(d) two features sharing the same (kind, subject) key count once — saturation-proof score', () => {
    const world = fresh('exp-d');
    stage(world, { subject: 'rosa' });
    stage(world, { subject: 'rosa' }); // duplicate key: same kind + same subject
    expect(exposureStatus(world).score).toBe(1);
  });

  it('(e) features about strangers — a non-player-linked NPC, or a null subject — never count', () => {
    const world = fresh('exp-e');
    stage(world, { subject: 'otto' }); // the usurper: neither the avatar nor an informant
    stage(world, { subject: null });
    expect(exposureStatus(world)).toEqual({ score: 0, identified: false, features: [] });
  });

  it('(f) precedence pinned: staged win quorum AND identification the same night → won (ties go to the player; PROVISIONAL for Ellie’s ratification)', () => {
    const world = fresh('exp-f');
    applyInject(world, 'mira', damaging('otto'));
    applyInject(world, 'sten', damaging('otto'));
    stage(world, { subject: world.playerId! });

    runUntil(world, at(1, 0), STANDARD_RULES);
    expect(world.scenario!.status).toBe('won');
  });
});
