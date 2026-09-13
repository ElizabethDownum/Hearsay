import { describe, expect, it } from 'vitest';
import { buildWorld, buildTownMap, enrollPlayer } from '../../src/sim/world';
import { claimNames } from '../../src/sim/fieldwork';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { miniTown } from './helpers/minitown';

describe('claim labels expose public names without changing the simulation', () => {
  it('uses stored person names, existing venue labels, and the avatar label', () => {
    const world = buildWorld(miniTown(), 'claim-names');
    enrollPlayer(world, { home: 'square' });
    expect(claimNames(world)).toMatchObject({ ada: 'Ada', bez: 'Bez', you: 'you', 'home-0': 'home 0' });
    world.npcs['ada']!.name = 'Adelaide';
    expect(claimNames(world)['ada']).toBe('Adelaide');
  });

  it('returns no hidden roster names outside the public directory', () => {
    const fixture = miniTown();
    const world = buildWorld(fixture, 'claim-name-scope');
    world.enemy.map = buildTownMap(fixture);
    world.enemy.map.directory = world.enemy.map.directory.filter((person) => person.id !== 'dov');
    expect(claimNames(world)).not.toHaveProperty('dov');
  });

  it('ignores hidden traits, relationships, schedules and enemy activity', () => {
    const world = buildWorld(miniTown(), 'claim-name-twins');
    const twin = cloneSerializable(world);
    for (const npc of Object.values(twin.npcs)) {
      npc.traits = ['vaguener']; npc.rivals = []; npc.edges = []; npc.schedule = [];
    }
    twin.enemy.observers = [{ id: 'ada', vigilance: 1 }];
    expect(claimNames(twin)).toEqual(claimNames(world));
  });

  it('is a pure transient projection with no new serialized state', () => {
    const world = buildWorld(miniTown(), 'claim-name-pure');
    const before = stableStringify(world);
    const names = claimNames(world);
    names['ada'] = 'scribbled on the view';
    expect(stableStringify(world)).toBe(before);
    expect(claimNames(world)['ada']).toBe('Ada');
  });
});

import { renderClaim } from '../../src/content/render';

describe('actual enrolled-avatar public labels compose with claim prose', () => {
  function enrolledLabels() {
    const world = buildWorld(miniTown(), 'claim-name-avatar-agreement');
    enrollPlayer(world, { home: 'square' });
    const labels = claimNames(world);
    expect(labels[world.playerId!]).toBe('you');
    return { playerId: world.playerId!, nameOf: (id: string) =>
      Object.prototype.hasOwnProperty.call(labels, id) ? labels[id]! : id };
  }

  it('renders the actual public avatar subject with second-person agreement', () => {
    const { playerId, nameOf } = enrolledLabels();
    const text = renderClaim({ subject: playerId, predicate: 'is-bankrupt', object: null,
      count: null, severity: 3, place: null, attribution: 'someone' }, nameOf);
    expect(text).toBe('They plainly say that you have fallen into bankruptcy. The source is unnamed.');
  });

  it('renders the actual public avatar attribution with second-person agreement', () => {
    const { playerId, nameOf } = enrolledLabels();
    const text = renderClaim({ subject: 'ada', predicate: 'poisoned', object: 'bez',
      count: null, severity: 3, place: null, attribution: playerId }, nameOf);
    expect(text).toBe('They plainly say that Ada poisoned Bez. You swear it.');
  });
});
