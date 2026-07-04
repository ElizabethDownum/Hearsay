import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { at } from '../../src/core/time';
import { diffClaims, SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';

// Severity 4: juicy enough that the day-1 bridge hop (mara -> anselm at the
// market, freshness ~0.6) still clears TELL_THRESHOLD. Do the math before
// changing any of these numbers.
const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
};

const knows = (w: WorldState, npc: string, family: string): boolean =>
  w.beliefs[npc]?.[family] !== undefined;

const hopChain = (w: WorldState, c: Claim): number => {
  let hops = 0;
  for (let cur: Claim | undefined = c; cur?.parent; cur = w.claims[cur.parent]) hops++;
  return hops;
};

describe("Ellie's day: told at 8am in the market, across the city by evening", () => {
  const world = buildWorld(TESTFORD, 'acceptance-1');
  runUntil(world, at(0, 8));
  const injected = applyInject(world, 'mara', spec);
  const family = injected.family;

  it('by 22:00 day 0: family at home, work buddy at market, the tavern has heard', () => {
    runUntil(world, at(0, 22));
    expect(knows(world, 'tomas', family)).toBe(true);  // her family, told at home
    expect(knows(world, 'pia', family)).toBe(true);
    expect(knows(world, 'rafe', family)).toBe(true);   // work buddy, same morning
    expect(knows(world, 'osric', family)).toBe(true);  // the bartender where she drinks
  });

  it('by day 1 night the patrons hold it too — multi-hop, not broadcast', () => {
    runUntil(world, at(1, 23));
    const patrons = ['hew', 'jonet', 'seth'].filter((p) => knows(world, p, family));
    expect(patrons.length).toBeGreaterThanOrEqual(2);
    const secondHand = ['tomas', 'pia', 'rafe', 'osric', ...patrons]
      .map((n) => world.beliefs[n]![family]!.claim)
      .map((c) => hopChain(world, c));
    expect(Math.max(...secondHand)).toBeGreaterThanOrEqual(2); // someone is 2+ hops out
  });

  it('versions mutated in flight and diffing fingerprints the changes', () => {
    const tomasBelief = world.beliefs['tomas']![family]!;
    const d = diffClaims(injected, tomasBelief.claim);
    expect(d.length).toBeGreaterThanOrEqual(1); // upstream traits fired somewhere on the route
    // Route is emergent: tomas hears it inside the household — from mara directly
    // or relayed by pia. Pinning the exact teller would over-specify the physics.
    expect(['mara', 'pia']).toContain(tomasBelief.heardFrom);
  });
});

describe('firebreak and bridge: Northside hears only through Anselm', () => {
  const world = buildWorld(TESTFORD, 'acceptance-2');
  runUntil(world, at(0, 8));
  const { family } = applyInject(world, 'mara', spec);

  it('firebreak holds until the bridge physically crosses (17:00 day 0)', () => {
    // Anselm hears it at the noon market; his first Northside contact is the
    // 17:00 chapel service. One tick before that, Northside must still be dark.
    runUntil(world, at(0, 17));
    for (const n of ['brigid', 'cole', 'dara']) expect(knows(world, n, family)).toBe(false);
  });

  it('by day 2 evening the story crossed — and only via the bridge', () => {
    runUntil(world, at(2, 23));
    const northsiders = ['brigid', 'cole', 'dara'].filter((n) => knows(world, n, family));
    expect(northsiders.length).toBeGreaterThanOrEqual(1);
    for (const n of northsiders) {
      const src = world.beliefs[n]![family]!.heardFrom;
      expect(['anselm', 'brigid', 'cole', 'dara']).toContain(src); // anselm or onward Northside hops
    }
  });
});
