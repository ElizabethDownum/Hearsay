import { describe, expect, it } from 'vitest';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { worldFromTown } from '../../src/world/attach';
import { attachScenario, scenarioNightly } from '../../src/sim/scenario/referee';
import { applyInject, type InjectSpec } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { ScenarioDef } from '../../src/sim/scenario/types';
import type { InstitutionRecord, WorldState } from '../../src/sim/types';

// The real content def lands in Task 11; this local literal exercises the engine (Task 3 types).
const DEF: ScenarioDef = {
  id: 'test-coronation', name: 'Test Coronation', days: 40,
  objectiveTerm: 'objective-topple', win: { kind: 'council-turns', quorum: 2 },
};

// ref-seed-1: castable, baseline council-turns == 0 (verified emergent — a keystone witnessing the
// usurper's damaging secret would seed a turn; this seed seeds none, so staging alone drives quorum).
const SEED = 'ref-seed-1';
const { town: TOWN } = generateValidTown(SEED, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
const USURPER = TOWN.cast!.usurper;
const COUNCIL = [...TOWN.cast!.council];

/** Fresh live world with the campaign enrolled. TOWN is immutable across builds (secrets.test idiom). */
function fresh(): WorldState {
  const world = worldFromTown(TOWN, SEED);
  attachScenario(world, TOWN, DEF);
  return world;
}

const damaging = (subject: string): InjectSpec => ({
  subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE,
});
const flattering = (subject: string): InjectSpec => ({
  subject, predicate: 'is-favored-at-court', object: SOMEONE, count: null, severity: 3, place: null, attribution: SOMEONE,
});

const institutionsOf = (world: WorldState): InstitutionRecord[] =>
  world.chronicle.filter((e): e is InstitutionRecord => e.kind === 'institution');

describe('scenario referee — council turns, doom clock, institutional endings', () => {
  it('(a) attach guards: double-attach throws; castless town throws', () => {
    const world = worldFromTown(TOWN, SEED);
    attachScenario(world, TOWN, DEF);
    expect(() => attachScenario(world, TOWN, DEF)).toThrow(/already attached/);

    const castless = worldFromTown(TOWN, SEED);
    expect(() => attachScenario(castless, { ...TOWN, cast: null }, DEF)).toThrow(/no scenario cast/);
  });

  it('(b) staged quorum → won; the denounce record carries the turned actors + their claims', () => {
    const world = fresh();
    runUntil(world, at(0, 23, 59), STANDARD_RULES);          // silent day, tick -> 1439
    applyInject(world, COUNCIL[0]!, damaging(USURPER));
    applyInject(world, COUNCIL[1]!, damaging(USURPER));
    runUntil(world, at(1, 0), STANDARD_RULES);               // day-0 nightly fires the referee

    const s = world.scenario!;
    expect(s.status).toBe('won');
    expect(s.resolution?.kind).toBe('won');
    if (s.resolution?.kind === 'won') {
      expect(s.resolution.turned.length).toBeGreaterThanOrEqual(2);
      for (const t of s.resolution.turned) expect(world.claims[t.claimId]).toBeDefined();
    }
    const last = institutionsOf(world).at(-1)!;
    expect(last.action).toBe('denounce');
    expect(last.subject).toBe(USURPER);
    expect(new Set(last.actors)).toEqual(new Set([COUNCIL[0], COUNCIL[1]]));
    expect(last.claimIds.length).toBeGreaterThan(0);
  });

  it('(c) one turned member is not a quorum → still running', () => {
    const world = fresh();
    runUntil(world, at(0, 23, 59), STANDARD_RULES);
    applyInject(world, COUNCIL[0]!, damaging(USURPER));
    runUntil(world, at(1, 0), STANDARD_RULES);
    expect(world.scenario!.status).toBe('running');
  });

  it('(d) flattering + off-subject damaging beliefs never count → still running', () => {
    const world = fresh();
    runUntil(world, at(0, 23, 59), STANDARD_RULES);
    applyInject(world, COUNCIL[0]!, flattering(USURPER));     // flattering about the usurper
    applyInject(world, COUNCIL[1]!, damaging(COUNCIL[2]!));   // damaging about a NON-usurper
    runUntil(world, at(1, 0), STANDARD_RULES);
    expect(world.scenario!.status).toBe('running');
  });

  it('(e) clock expires with no quorum → lost-clock + coronation record', { timeout: 30000 }, () => {
    const world = fresh();
    runUntil(world, at(DEF.days, 0), STANDARD_RULES);         // = at(days-1, 1439)+1: fires day (days-1) nightly
    const s = world.scenario!;
    expect(s.status).toBe('lost-clock');
    expect(s.resolution?.kind).toBe('lost-clock');
    if (s.resolution?.kind === 'lost-clock') {
      expect(s.resolution.day).toBe(DEF.days - 1);
      expect(Array.isArray(s.resolution.turned)).toBe(true);
    }
    const last = institutionsOf(world).at(-1)!;
    expect(last.action).toBe('coronation');
    expect(last.subject).toBe(USURPER);
  });

  it('(f) quorum on the final night → won (win beats the clock, same night)', () => {
    const world = fresh();
    runUntil(world, at(DEF.days - 1, 23, 59), STANDARD_RULES);
    applyInject(world, COUNCIL[0]!, damaging(USURPER));
    applyInject(world, COUNCIL[1]!, damaging(USURPER));
    runUntil(world, at(DEF.days, 0), STANDARD_RULES);         // final nightly: both eligible -> won wins
    expect(world.scenario!.status).toBe('won');
  });

  it('(g) win latches: further nights add no records and never re-decide', () => {
    const world = fresh();
    runUntil(world, at(0, 23, 59), STANDARD_RULES);
    applyInject(world, COUNCIL[0]!, damaging(USURPER));
    applyInject(world, COUNCIL[1]!, damaging(USURPER));
    runUntil(world, at(1, 0), STANDARD_RULES);
    expect(world.scenario!.status).toBe('won');

    runUntil(world, at(3, 0), STANDARD_RULES);               // two more nights
    expect(world.scenario!.status).toBe('won');
    const denounces = institutionsOf(world).filter((e) => e.action === 'denounce');
    expect(denounces).toHaveLength(1);
  });

  it('(h) unknown win kind default-throws (saves are untrusted JSON)', () => {
    const world = {
      tick: at(2, 0),
      scenario: {
        defId: 'x', days: 5, win: { kind: 'x' },
        cast: { usurper: 'u', council: [] }, status: 'running', resolution: null,
      },
      beliefs: {}, chronicle: [],
    } as unknown as WorldState;
    expect(() => scenarioNightly(world, STANDARD_RULES)).toThrow(/unknown win condition/);
  });
});
