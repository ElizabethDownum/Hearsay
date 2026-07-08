import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { recordFact, compartmentOf } from '../../src/sim/network/compartment';
import type { AssetRecord } from '../../src/sim/network/types';
import type { WorldState } from '../../src/sim/types';

/** A headless world carrying one bare asset ('mara') on the player-side roster. */
function worldWithAsset(): WorldState {
  const world = buildWorld(TESTFORD, 'net-compartment');
  const asset: AssetRecord = { id: 'mara', mice: 'money', wagePaidThroughDay: 0, strikes: 0, facts: [] };
  world.network.assets.push(asset);
  return world;
}

describe('recordFact — tick-stamped, ordered, deduped-exact', () => {
  it('stamps world.tick and appends in call order', () => {
    const world = worldWithAsset();
    world.tick = 10;
    recordFact(world, 'mara', { kind: 'knows-drop', ref: 'd1' });
    world.tick = 20;
    recordFact(world, 'mara', { kind: 'met-asset', ref: 'osric' });
    expect(compartmentOf(world, 'mara')).toEqual([
      { tick: 10, kind: 'knows-drop', ref: 'd1' },
      { tick: 20, kind: 'met-asset', ref: 'osric' },
    ]);
  });

  it('dedupes an EXACT repeat (same tick, kind, ref) — recorded exactly once', () => {
    const world = worldWithAsset();
    world.tick = 5;
    recordFact(world, 'mara', { kind: 'paid-at', ref: 'market' });
    recordFact(world, 'mara', { kind: 'paid-at', ref: 'market' });
    expect(compartmentOf(world, 'mara')).toEqual([{ tick: 5, kind: 'paid-at', ref: 'market' }]);
  });

  it('same kind+ref at a DIFFERENT tick is a distinct fact (both kept — dedup is exact, not by content)', () => {
    const world = worldWithAsset();
    world.tick = 5;
    recordFact(world, 'mara', { kind: 'met-asset', ref: 'osric' });
    world.tick = 6;
    recordFact(world, 'mara', { kind: 'met-asset', ref: 'osric' });
    expect(compartmentOf(world, 'mara')).toEqual([
      { tick: 5, kind: 'met-asset', ref: 'osric' },
      { tick: 6, kind: 'met-asset', ref: 'osric' },
    ]);
  });

  it('throws when recording a fact on someone off every roster', () => {
    const world = worldWithAsset();
    expect(() => recordFact(world, 'nobody', { kind: 'knows-drop', ref: 'd1' })).toThrow(/asset/);
  });
});

describe('compartmentOf — the record verbatim, as byte-copies', () => {
  it('returns exactly what was recorded, in order, nothing more or less', () => {
    const world = worldWithAsset();
    world.tick = 1;
    recordFact(world, 'mara', { kind: 'recruited-by', ref: 'player' });
    world.tick = 2;
    recordFact(world, 'mara', { kind: 'carried-story', ref: 'coronation-1' });
    expect(compartmentOf(world, 'mara')).toEqual([
      { tick: 1, kind: 'recruited-by', ref: 'player' },
      { tick: 2, kind: 'carried-story', ref: 'coronation-1' },
    ]);
  });

  it('yields a deep copy — mutating the result never touches the underlying record', () => {
    const world = worldWithAsset();
    world.tick = 1;
    recordFact(world, 'mara', { kind: 'knows-drop', ref: 'd1' });
    const out = compartmentOf(world, 'mara');
    out.push({ tick: 99, kind: 'met-asset', ref: 'tampered' });
    out[0]!.ref = 'TAMPERED';
    expect(compartmentOf(world, 'mara')).toEqual([{ tick: 1, kind: 'knows-drop', ref: 'd1' }]);
  });

  it('an interrogation of a non-asset yields nothing', () => {
    const world = worldWithAsset();
    expect(compartmentOf(world, 'nobody')).toEqual([]);
  });
});
