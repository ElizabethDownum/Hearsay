import { stableStringify, hashWorld } from '../../src/sim/hash';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';

const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
};

/** One scripted campaign: inject at day0 08:00, run to endDay 00:00. */
const campaign = (seed: string, endDay: number, injectAt = at(0, 8)): WorldState => {
  const world = buildWorld(TESTFORD, seed);
  runUntil(world, injectAt);
  applyInject(world, 'mara', spec);
  runUntil(world, at(endDay, 0));
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
