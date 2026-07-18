import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { emptyEnemyState, type EnemyDecision } from '../../src/sim/enemy/state';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { stableStringify } from '../../src/sim/hash';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function enemyWorld() {
  const world = buildWorld(miniTown(), 'enemy-orders', STANDARD_RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push(
    { id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
    { id: 'cyn', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
  );
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }, { id: 'cyn', vigilance: 1 }];
  world.enemy.map = {
    venues: Object.values(world.venues).map(({ id, district, access }) => ({ id, district, access })),
    directory: Object.values(world.npcs).map((npc) => ({ id: npc.id, occupation: npc.occupation, district: 'd0' })),
  };
  return world;
}

const decision: EnemyDecision = {
  day: 0, features: [],
  inquiries: [{ asker: 'bez', about: { subject: 'dov' }, expiresDay: 3 }],
  interrogations: [{ target: 'dov', guard: 'bez', day: 1, about: { subject: 'dov' }, venue: 'backroom' }],
  watches: [{ district: 'd0', posts: [{ guard: 'cyn', venue: 'square' }], startDay: 1 }],
};

describe('enemy orders use physical directives', () => {
  it('queues order groups without immediate inquiry, schedule, or completion markers', () => {
    const world = enemyWorld();
    applyEnemyDecision(world, decision);
    expect(world.inquiries).toEqual({});
    expect(world.scheduleOverrides).toEqual({});
    expect(world.enemy.inquiriesIssued).toEqual([]);
    expect(world.enemy.interrogated).toEqual([]);
    expect(world.enemy.watchedDistricts).toEqual([]);
    expect(world.enemy.pendingOrders?.map((row) => row.key).sort()).toEqual([
      'inquiry:s:dov', 'interrogation:dov:s:dov', 'watch:d0',
    ]);
    expect(world.network.directiveState!.messages.every((message) => message.payload.kind === 'directive')).toBe(true);
  });

  it('keeps the pure digest byte-identical for identical EnemyState input', () => {
    const state = emptyEnemyState();
    const before = stableStringify(state);
    expect(enemyDigest(state, 0, STANDARD_RULES)).toEqual(enemyDigest(state, 0, STANDARD_RULES));
    expect(stableStringify(state)).toBe(before);
  });
});
