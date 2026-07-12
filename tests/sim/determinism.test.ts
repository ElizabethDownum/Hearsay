import { cloneSerializable, stableStringify, hashWorld } from '../../src/sim/hash';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
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

  it('cloneSerializable makes a detached stable JSON data copy', () => {
    const source = { z: [{ b: 2, a: 1 }] };
    const clone = cloneSerializable(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.z).not.toBe(source.z);
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

describe('PILLAR: live ≡ replay with scenario + vignettes + enemy + intel ALL active', () => {
  const SEED = 'all-on-seed-1';
  const DEF: ScenarioDef = {
    id: 'det-all-on', name: 'Det All On', days: 40,
    objectiveTerm: 'objective-topple', win: { kind: 'council-turns', quorum: 2 },
  };
  const { town } = generateValidTown(SEED, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  const cast = town.cast!;
  const damaging = (subject: string) => ({
    subject, predicate: 'poisoned', object: SOMEONE, count: null,
    severity: 5 as const, place: null, attribution: SOMEONE,
  });
  // Two non-usurper NPCs staged into a mutual quarrel so a vignette actually FIRES — replay must
  // hold through the vignette nightly writes, not merely with an empty vignettesFired.
  const [p, q] = town.fixture.npcs.map((n) => n.id).filter((id) => id !== cast.usurper).sort();

  // All four seams live: enemy (worldFromTown roster), scenario (attachScenario), intel/avatar
  // (attachPlayer informants + feed), vignettes (STANDARD_RULES.vignettes).
  const build = (): WorldState => {
    const world = worldFromTown(town, SEED);
    attachScenario(world, town, DEF);
    attachPlayer(world, town);
    return world;
  };
  const log: ActionLog = [
    { tick: at(0, 8), kind: 'inject', target: cast.council[0]!, spec: damaging(cast.usurper) },
    { tick: at(0, 8), kind: 'inject', target: p!, spec: damaging(q!) }, // p believes q damaging...
    { tick: at(0, 9), kind: 'inject', target: cast.council[1]!, spec: damaging(cast.usurper) },
    { tick: at(0, 9), kind: 'inject', target: q!, spec: damaging(p!) }, // ...and q believes p damaging
  ];

  it('all four systems active — two runs hash-identical over 3 days, with a vignette fired', () => {
    const a = runLogOn(build(), STANDARD_RULES, log, at(3, 0));
    const b = runLogOn(build(), STANDARD_RULES, log, at(3, 0));
    expect(hashWorld(a)).toBe(hashWorld(b));
    // Every seam actually engaged — otherwise "all active" proves nothing.
    expect(a.scenario!.status).toBe('won');                          // referee fired
    expect(a.chronicle.some((e) => e.kind === 'vignette')).toBe(true); // a vignette fired
    expect(a.playerId).not.toBeNull();                               // intel/avatar attached
    expect(a.enemy.observers.length).toBeGreaterThan(0);             // enemy roster wired
  });
});

describe('PILLAR: live ≡ replay with the player speech verbs (goTo/tell/ask) + assign/codex/card', () => {
  const SEED = 'verbs-replay-1';
  // ada is pinned into the avatar's backroom circle so the tell/ask targets are always in earshot;
  // both directions of trust let the avatar ask ada and ada answer. Staged identically per build.
  const build = (): WorldState => {
    const world = buildWorld(miniTown(), SEED);
    enrollPlayer(world, { home: 'backroom' });
    world.npcs['you']!.edges = [{ to: 'ada', kind: 'friend', trust: 0.8 }];
    world.npcs['ada']!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });
    world.intel.informants = [{ id: 'bez', assignedVenue: null }];
    world.scheduleOverrides['ada'] = [
      { fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'backroom', source: 'enemy' },
    ];
    applyInject(world, 'ada', {
      subject: 'cyn', predicate: 'stole', object: null, count: 1, severity: 3, place: null, attribution: SOMEONE,
    });
    return world;
  };
  const log: ActionLog = [
    { tick: 0, kind: 'goTo', venue: 'backroom' },
    { tick: 0, kind: 'card', op: 'add', id: 'k1', text: 'note', confidence: 0.5, links: [] },
    { tick: 0, kind: 'codex', op: 'propose', npc: 'ada', trait: 'skeptic' },
    { tick: 0, kind: 'assignInformant', informant: 'bez', venue: 'square' },
    { tick: 0, kind: 'tell', to: 'ada', spec: {
      subject: 'cyn', predicate: 'stole', object: null, count: 1, severity: 4, place: null, attribution: SOMEONE } },
    { tick: 15, kind: 'ask', to: 'ada', about: { subject: 'cyn' } },
  ];

  it('two runs hash-identical over 2 days, with the tell and ask actually fired', () => {
    const a = runLogOn(build(), STANDARD_RULES, log, at(2, 0));
    const b = runLogOn(build(), STANDARD_RULES, log, at(2, 0));
    expect(hashWorld(a)).toBe(hashWorld(b));
    // The new verbs really engaged — otherwise the replay proves nothing about them.
    expect(a.chronicle.some((e) => e.kind === 'telling' && e.speaker === 'you')).toBe(true);
    expect(a.chronicle.some((e) => e.kind === 'asking' && e.speaker === 'you')).toBe(true);
  });
});
