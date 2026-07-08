import { buildWorld, enrollPlayer, trustBetween } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { dispositionOf } from '../../src/sim/network/roster';
import { hashWorld } from '../../src/sim/hash';
import { runLogOn } from '../../src/sim/campaign';
import { at } from '../../src/core/time';
import type { GeneratedTown } from '../../src/world/types';
import type { WorldState } from '../../src/sim/types';

const CFG = STANDARD_GEN_CONFIG;
const CONTENT = STANDARD_GEN_CONTENT;
const townFor = (seed: string): GeneratedTown =>
  generateValidTown(seed, CFG, CONTENT, STANDARD_RULES).town;

describe('dispositionOf — disposition IS the trust edge (asset → player), amendment #4c one physics', () => {
  it('reads the real trust edge value toward the player', () => {
    const world = buildWorld(TESTFORD, 'disp-1');
    enrollPlayer(world, { home: 'market' });
    world.npcs['mara']!.edges.push({ to: 'you', kind: 'friend', trust: 0.42 });
    expect(dispositionOf(world, 'mara')).toBe(0.42);
    expect(dispositionOf(world, 'mara')).toBe(trustBetween(world, 'mara', 'you'));
  });

  it('is 0 when the asset holds no edge toward the player', () => {
    const world = buildWorld(TESTFORD, 'disp-2');
    enrollPlayer(world, { home: 'market' });
    expect(dispositionOf(world, 'osric')).toBe(0);
  });

  it('is 0 in a headless (player-free) world', () => {
    const world = buildWorld(TESTFORD, 'disp-3');
    expect(world.playerId).toBeNull();
    expect(dispositionOf(world, 'mara')).toBe(0);
  });

  it('tracks the edge as it moves — there is no separate disposition store', () => {
    const world = buildWorld(TESTFORD, 'disp-4');
    enrollPlayer(world, { home: 'market' });
    const edge = { to: 'you', kind: 'friend' as const, trust: 0.6 };
    world.npcs['mara']!.edges.push(edge);
    expect(dispositionOf(world, 'mara')).toBe(0.6);
    edge.trust = 0.3;
    expect(dispositionOf(world, 'mara')).toBe(0.3);
  });
});

describe('attach migration — the two dossier freebies become roster AssetRecords, on the record', () => {
  it('each dossier informant: mice null, recruited-by player @ tick 0, disposition 0.75', () => {
    const town = townFor('net-migrate');
    const world = worldFromTown(town, 'net-migrate');
    attachPlayer(world, town);

    const ids = town.dossier!.informants;
    // roster is a superset of intel.informants ids (here: exactly the dossier freebies)
    expect(world.network.assets.map((a) => a.id).sort()).toEqual([...ids].sort());
    expect(world.intel.informants.map((i) => i.id).sort()).toEqual([...ids].sort());

    for (const id of ids) {
      const rec = world.network.assets.find((a) => a.id === id)!;
      expect(rec.mice).toBeNull();
      expect(rec.strikes).toBe(0);
      expect(rec.wagePaidThroughDay).toBe(0);
      expect(rec.facts).toEqual([{ tick: 0, kind: 'recruited-by', ref: 'player' }]);
      // disposition IS a real 0.75 trust edge toward the player — above the 0.7 confide line
      expect(dispositionOf(world, id)).toBe(0.75);
      expect(trustBetween(world, id, 'you')).toBe(0.75);
    }
  });

  it('a fresh world starts with an empty network roster (init)', () => {
    const world = buildWorld(TESTFORD, 'net-empty');
    expect(world.network).toEqual({ assets: [], drops: [], enemyAssets: [], spymaster: null, pendingCouriers: [] });
  });
});

describe('network state — serializable, hashed, replay-stable', () => {
  it('network participates in the state hash — a lone strike difference hashes differently', () => {
    const town = townFor('net-hash');
    const a = worldFromTown(town, 'net-hash'); attachPlayer(a, town);
    const b = worldFromTown(town, 'net-hash'); attachPlayer(b, town);
    expect(hashWorld(a)).toBe(hashWorld(b));
    b.network.assets[0]!.strikes += 1;
    expect(hashWorld(a)).not.toBe(hashWorld(b));
  });

  it('JSON round-trip preserves the network roster and the state hash', () => {
    const town = townFor('net-json');
    const world = worldFromTown(town, 'net-json'); attachPlayer(world, town);
    const revived = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(revived.network).toEqual(world.network);
    expect(hashWorld(revived)).toBe(hashWorld(world));
  });

  it('live ≡ replay: a network-carrying campaign hashes identically over 2 days', () => {
    const town = townFor('net-replay');
    const build = (): WorldState => {
      const w = worldFromTown(town, 'net-replay');
      attachPlayer(w, town);
      return w;
    };
    const a = runLogOn(build(), STANDARD_RULES, [], at(2, 0));
    const b = runLogOn(build(), STANDARD_RULES, [], at(2, 0));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.network.assets.length).toBe(town.dossier!.informants.length);
  });
});
