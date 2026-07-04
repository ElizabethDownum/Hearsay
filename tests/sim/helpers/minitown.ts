import type { TownFixture } from '../../../src/sim/types';

/** 4 NPCs in one all-day venue + an invitational backroom nobody visits by default. */
export function miniTown(): TownFixture {
  const allDay = (venue: string) => [{ days: 'all' as const, from: 0, to: 1439, venue }];
  return {
    venues: [
      { id: 'square', district: 'd0', access: 'public' as const },
      { id: 'backroom', district: 'd0', access: 'invitational' as const },
      { id: 'home-0', district: 'd0', access: 'private' as const },
    ],
    npcs: [
      { id: 'ada', name: 'Ada', home: 'home-0', occupation: 'grocer', faction: 'none' as const,
        traits: ['literalist', 'skeptic'], rivals: [], schedule: allDay('square'),
        edges: [{ to: 'bez', kind: 'friend' as const, trust: 0.8 }, { to: 'cyn', kind: 'friend' as const, trust: 0.6 },
                { to: 'dov', kind: 'friend' as const, trust: 0.4 }] },
      { id: 'bez', name: 'Bez', home: 'home-0', occupation: 'grocer', faction: 'none' as const,
        traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square'),
        edges: [{ to: 'ada', kind: 'friend' as const, trust: 0.8 }] },
      { id: 'cyn', name: 'Cyn', home: 'home-0', occupation: 'grocer', faction: 'none' as const,
        traits: ['attributor', 'literalist'], rivals: ['dov'], schedule: allDay('square'),
        edges: [{ to: 'ada', kind: 'friend' as const, trust: 0.9 }] },
      { id: 'dov', name: 'Dov', home: 'home-0', occupation: 'grocer', faction: 'none' as const,
        traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square'),
        edges: [{ to: 'ada', kind: 'friend' as const, trust: 0.4 }] },
    ],
  };
}
