import { describe, expect, it } from 'vitest';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import type { ScenarioState } from '../../src/sim/scenario/types';

describe('scenario state — pure data on WorldState', () => {
  it('buildWorld initializes scenario as null (headless worlds are scenario-free)', () => {
    const world = buildWorld(TESTFORD, 'scen-types-1');
    expect(world.scenario).toBeNull();
  });

  it('a populated ScenarioState survives JSON round-trip byte-exact (serializability law)', () => {
    const s: ScenarioState = {
      defId: 'coronation', days: 40, win: { kind: 'council-turns', quorum: 2 },
      cast: { usurper: 'u1', council: ['k1', 'k2', 'k3'] },
      status: 'won',
      resolution: { kind: 'won', day: 12, turned: [{ npc: 'k1', family: 'f0', claimId: 'c9', credence: 0.85 }] },
    };
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
