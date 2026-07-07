import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { applyGoTo, canEnter } from '../../src/sim/actions';
import type { TownFixture, WorldState } from '../../src/sim/types';

/**
 * Access law (Plan 8 Task 2): station standing decides which venue doors open without suspicion.
 * public always · safehouse always · invitational: noble → salon only (guard-post + back-rooms
 * never), lowlife → back-rooms only · private never (engineered invitations are post-v1). When no
 * standing has been dealt (world.station === null) the law is inert — the P7 pre-station behavior.
 */
const lawFixture = (): TownFixture => ({
  venues: [
    { id: 'safehouse', district: 'd0', access: 'private' },
    { id: 'tavern-d0', district: 'd0', access: 'public' },
    { id: 'salon', district: 'd0', access: 'invitational' },
    { id: 'back-room-d0', district: 'd0', access: 'invitational' },
    { id: 'guard-post-d0', district: 'd0', access: 'invitational' },
    { id: 'home-x', district: 'd0', access: 'private' },
  ],
  npcs: [
    { id: 'nyx', name: 'Nyx', home: 'home-x', occupation: 'grocer', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: [{ days: 'all', from: 0, to: 1439, venue: 'tavern-d0' }],
      edges: [] },
  ],
});

const enrolled = (station: WorldState['station']): WorldState => {
  const world = buildWorld(lawFixture(), 'law');
  enrollPlayer(world, { home: 'safehouse' });
  world.station = station;
  return world;
};

const go = (station: WorldState['station'], venue: string): void =>
  applyGoTo(enrolled(station), venue);

describe('applyGoTo access law', () => {
  it('unknown venue throws; no enrolled player throws (pre-existing behavior held)', () => {
    const noPlayer = buildWorld(lawFixture(), 'law-np');
    expect(() => applyGoTo(noPlayer, 'tavern-d0')).toThrow(/no player/);
    expect(() => go('noble', 'nowhere')).toThrow(/unknown venue/);
  });

  it('NOBLE opens the salon + public + safehouse; guard-post, back-rooms, private homes are shut', () => {
    expect(() => go('noble', 'tavern-d0')).not.toThrow();
    expect(() => go('noble', 'safehouse')).not.toThrow();
    expect(() => go('noble', 'salon')).not.toThrow();
    expect(() => go('noble', 'back-room-d0')).toThrow(/standing|conspicuous/i);
    expect(() => go('noble', 'guard-post-d0')).toThrow(/standing|conspicuous/i);
    expect(() => go('noble', 'home-x')).toThrow(/private|invitation/i);
  });

  it('LOWLIFE opens the back-rooms + public + safehouse; the salon, guard-post, homes are shut', () => {
    expect(() => go('lowlife', 'tavern-d0')).not.toThrow();
    expect(() => go('lowlife', 'safehouse')).not.toThrow();
    expect(() => go('lowlife', 'back-room-d0')).not.toThrow();
    expect(() => go('lowlife', 'salon')).toThrow(/standing|conspicuous/i);
    expect(() => go('lowlife', 'guard-post-d0')).toThrow(/standing|conspicuous/i);
    expect(() => go('lowlife', 'home-x')).toThrow(/private|invitation/i);
  });

  it('a null station leaves the law inert: every real venue opens (P7 pre-station behavior)', () => {
    for (const v of ['tavern-d0', 'safehouse', 'salon', 'back-room-d0', 'guard-post-d0', 'home-x']) {
      expect(() => go(null, v), v).not.toThrow();
    }
  });

  it('applyGoTo sets playerVenue on success', () => {
    const world = enrolled('noble');
    applyGoTo(world, 'salon');
    expect(world.playerVenue).toBe('salon');
  });

  // canEnter mirrors the law as a boolean (no throw) — the probe/UI seam reuses ONE predicate.
  it('canEnter reports the same law as a boolean and is inert under a null station', () => {
    const noble = enrolled('noble');
    expect(canEnter(noble, 'salon')).toBe(true);
    expect(canEnter(noble, 'back-room-d0')).toBe(false);
    expect(canEnter(noble, 'nowhere')).toBe(false); // unknown venue
    const none = enrolled(null);
    expect(canEnter(none, 'home-x')).toBe(true);
    expect(canEnter(none, 'guard-post-d0')).toBe(true);
  });
});
