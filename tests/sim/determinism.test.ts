import { stableStringify, hashWorld } from '../../src/sim/hash';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown } from '../../src/world/attach';
import { attachScenario } from '../../src/sim/scenario/referee';
import { applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { runLogOn, type ActionLog } from '../../src/sim/campaign';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { ScenarioDef } from '../../src/sim/scenario/types';
import type { WorldState } from '../../src/sim/types';

const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
};

/** One scripted campaign: inject at day0 08:00, run to endDay 00:00. */
const campaign = (seed: string, endDay: number, injectAt = at(0, 8)): WorldState => {
  const world = buildWorld(TESTFORD, seed);
  runUntil(world, injectAt, STANDARD_RULES);
  applyInject(world, 'mara', spec);
  runUntil(world, at(endDay, 0), STANDARD_RULES);
  return world;
};

describe('stableStringify', () => {
  it('is insensitive to key insertion order', () => {
    expect(stableStringify({ a: 1, b: [{ y: 2, x: 3 }] }))
      .toBe(stableStringify({ b: [{ x: 3, y: 2 }], a: 1 }));
  });

  it('throws on undefined anywhere — self-revealing, never a silent hash skew', () => {
    expect(() => stableStringify(undefined)).toThrow(/undefined/);
    expect(() => stableStringify([1, undefined])).toThrow(/undefined/);
    expect(() => stableStringify({ a: undefined })).toThrow(/undefined/);
  });
});

describe('PILLAR: same seed + same actions => identical state hash', () => {
  it('holds at every day boundary across 5 days, two fresh runs', () => {
    for (let day = 1; day <= 5; day++) {
      expect(hashWorld(campaign('det-seed', day))).toBe(hashWorld(campaign('det-seed', day)));
    }
  });

  it('different seed diverges', () => {
    expect(hashWorld(campaign('det-seed', 3))).not.toBe(hashWorld(campaign('det-other', 3)));
  });

  it('BUTTERFLY: same words, different tick => different campaign', () => {
    expect(hashWorld(campaign('det-seed', 3, at(0, 8))))
      .not.toBe(hashWorld(campaign('det-seed', 3, at(0, 8, 15))));
  });
});

describe('PILLAR: all state is serializable', () => {
  it('JSON round-trip preserves the state hash', () => {
    const world = campaign('det-seed', 3);
    const revived = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(hashWorld(revived)).toBe(hashWorld(world));
  });
});

describe('PILLAR: live ≡ replay with the scenario referee active', () => {
  const SEED = 'ref-seed-1';
  const DEF: ScenarioDef = {
    id: 'det-coronation', name: 'Det Coronation', days: 40,
    objectiveTerm: 'objective-topple', win: { kind: 'council-turns', quorum: 2 },
  };
  const { town } = generateValidTown(SEED, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  const cast = town.cast!;
  const damaging = (subject: string) => ({
    subject, predicate: 'poisoned', object: SOMEONE, count: null,
    severity: 5 as const, place: null, attribution: SOMEONE,
  });
  // A scenario-attached procgen world plus a small action log that drives the referee to a win.
  const build = (): WorldState => {
    const world = worldFromTown(town, SEED);
    attachScenario(world, town, DEF);
    return world;
  };
  const log: ActionLog = [
    { tick: at(0, 8), kind: 'inject', target: cast.council[0]!, spec: damaging(cast.usurper) },
    { tick: at(0, 9), kind: 'inject', target: cast.council[1]!, spec: damaging(cast.usurper) },
  ];

  it('referee writes are replay-stable — two runs hash-identical over 3 days', () => {
    const a = runLogOn(build(), STANDARD_RULES, log, at(3, 0));
    const b = runLogOn(build(), STANDARD_RULES, log, at(3, 0));
    expect(hashWorld(a)).toBe(hashWorld(b));
    // The referee actually fired and wrote its ending — otherwise this proves nothing.
    expect(a.scenario!.status).toBe('won');
    expect(a.chronicle.some((e) => e.kind === 'institution')).toBe(true);
  });
});
