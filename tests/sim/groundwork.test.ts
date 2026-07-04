import { describe, expect, it } from 'vitest';
import { emptyEnemyState } from '../../src/sim/enemy/state';
import { venueAt } from '../../src/sim/agents';
import { observationsFor, type TickEvents } from '../../src/sim/perception';
import { applyInject } from '../../src/sim/actions';
import { buildTownMap, buildWorld } from '../../src/sim/world';
import { stableStringify } from '../../src/sim/hash';
import { explainBelief } from '../../src/sim/chronicle';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { at } from '../../src/core/time';

describe('groundwork: new WorldState surface', () => {
  it('buildWorld initializes enemy, inquiries, and scheduleOverrides — all serializable', () => {
    const world = buildWorld(TESTFORD, 'gw-1');
    expect(world.enemy).toEqual(emptyEnemyState());
    expect(world.inquiries).toEqual({});
    expect(world.scheduleOverrides).toEqual({});
    expect(() => stableStringify(world)).not.toThrow();
  });

  it('applyInject defaults by=player, records it, and sets the new belief flags', () => {
    const world = buildWorld(TESTFORD, 'gw-2');
    const npcId = Object.keys(world.npcs).sort()[0]!;
    applyInject(world, npcId, {
      subject: 'someone', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: 'someone',
    });
    const record = world.chronicle[0]!;
    expect(record.kind).toBe('inject');
    if (record.kind === 'inject') expect(record.by).toBe('player');
    const belief = Object.values(world.beliefs[npcId]!)[0]!;
    expect(belief.discretion).toBe(false);
    expect(belief.counterSpun).toBe(false);
    expect(explainBelief(world, npcId, belief.claim.family)).toEqual(record);
  });
});

describe('groundwork: schedule overrides', () => {
  it('an override wins over the schedule only inside its day and minute window', () => {
    const world = buildWorld(TESTFORD, 'gw-3');
    const npc = Object.values(world.npcs).sort((a, b) => (a.id < b.id ? -1 : 1))[0]!;
    const base = venueAt(npc, at(1, 9));
    const overrides = [{ fromDay: 1, toDay: 2, from: 540, to: 660, venue: npc.home }];
    // inside the window: override wins
    expect(venueAt(npc, at(1, 9), overrides)).toBe(npc.home);
    // outside the minute window and outside the day window: base schedule
    expect(venueAt(npc, at(1, 11), overrides)).toBe(venueAt(npc, at(1, 11)));
    expect(venueAt(npc, at(2, 9), overrides)).toBe(base === npc.home ? base : venueAt(npc, at(2, 9)));
    // open-ended override (toDay null) applies on any later day
    const open = [{ fromDay: 1, toDay: null, from: 540, to: 660, venue: npc.home }];
    expect(venueAt(npc, at(5, 9), open)).toBe(npc.home);
  });
});

describe('groundwork: askings in perception', () => {
  const askEvents: TickEvents = {
    tick: at(0, 12),
    positions: { asker: 'tavern', target: 'tavern', bystander: 'tavern', faraway: 'market' },
    utterances: [],
    askings: [{
      tick: at(0, 12), venue: 'tavern', circleMembers: ['asker', 'target', 'bystander'],
      speaker: 'asker', addressedTo: 'target', about: { family: 'f0' },
    }],
  };

  it('circle members observe an asking; the addressee is not "overheard"', () => {
    const feed = observationsFor('target', askEvents);
    const asking = feed.observations.find((o) => o.kind === 'asking');
    expect(asking).toMatchObject({ speaker: 'asker', overheard: false, about: { family: 'f0' } });
    const bystanderFeed = observationsFor('bystander', askEvents);
    expect(bystanderFeed.observations.find((o) => o.kind === 'asking')).toMatchObject({ overheard: true });
  });

  it('non-members observe nothing of the asking', () => {
    const feed = observationsFor('faraway', askEvents);
    expect(feed.observations.some((o) => o.kind === 'asking')).toBe(false);
  });
});

describe('groundwork: town map', () => {
  it('buildTownMap exposes only public facts — venues and the directory', () => {
    const map = buildTownMap(TESTFORD);
    expect(map.venues.length).toBe(TESTFORD.venues.length);
    expect(map.directory.length).toBe(TESTFORD.npcs.length);
    const person = map.directory[0]!;
    expect(Object.keys(person).sort()).toEqual(['district', 'id', 'occupation']);
  });
});
