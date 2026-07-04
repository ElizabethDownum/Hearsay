import type { Npc, TownFixture, Venue } from '../../sim/types';

const V = (id: string, district: 'town' | 'northside', access: Venue['access'] = 'public'): Venue =>
  ({ id, district, access });

const venues: Venue[] = [
  V('market', 'town'), V('tavern', 'town'), V('chapel', 'town'),
  V('docks', 'town'), V('workshop', 'town'),
  V('home-mara', 'town', 'private'), V('home-osric', 'town', 'private'),
  V('home-hew', 'town', 'private'), V('home-jonet', 'town', 'private'),
  V('home-rafe', 'town', 'private'), V('home-seth', 'town', 'private'),
  V('home-anselm', 'town', 'private'),
  V('northside-well', 'northside'), V('northside-chapel', 'northside'),
  V('home-brigid', 'northside', 'private'), V('home-dara', 'northside', 'private'),
];

type NpcSpec = Omit<Npc, 'edges'> & { edges?: Npc['edges'] };
const N = (spec: NpcSpec): Npc => ({ edges: [], ...spec });

const npcs: Npc[] = [
  N({ id: 'mara', name: 'Mara', home: 'home-mara', occupation: 'grocer', faction: 'guild',
      traits: ['exaggerator', 'attributor'], rivals: ['jonet'],
      schedule: [
        { days: 'weekday', from: 360, to: 840, venue: 'market' },      // 06:00-14:00
        { days: 'all', from: 1170, to: 1290, venue: 'tavern' },        // 19:30-21:30
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [
        { to: 'tomas', kind: 'kin', trust: 0.9 }, { to: 'pia', kind: 'kin', trust: 0.9 },
        { to: 'rafe', kind: 'colleague', trust: 0.6 }, { to: 'osric', kind: 'friend', trust: 0.7 },
        { to: 'anselm', kind: 'friend', trust: 0.5 },
      ] }),
  N({ id: 'tomas', name: 'Tomas', home: 'home-mara', occupation: 'dockworker', faction: 'crown',
      traits: ['literalist', 'partisan'], rivals: [],
      schedule: [
        { days: 'weekday', from: 480, to: 1080, venue: 'docks' },      // 08:00-18:00
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [
        { to: 'mara', kind: 'kin', trust: 0.9 }, { to: 'pia', kind: 'kin', trust: 0.9 },
        { to: 'seth', kind: 'colleague', trust: 0.6 },
      ] }),
  N({ id: 'pia', name: 'Pia', home: 'home-mara', occupation: 'student', faction: 'none',
      traits: ['exaggerator', 'moralizer'], rivals: [],
      schedule: [
        { days: 'weekday', from: 480, to: 720, venue: 'chapel' },      // 08:00-12:00 school
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [{ to: 'mara', kind: 'kin', trust: 0.9 }, { to: 'tomas', kind: 'kin', trust: 0.9 }] }),
  N({ id: 'osric', name: 'Osric', home: 'home-osric', occupation: 'bartender', faction: 'guild',
      traits: ['attributor', 'moralizer'], rivals: ['rafe'],
      schedule: [
        { days: 'all', from: 960, to: 1439, venue: 'tavern' },         // 16:00-23:59
      ],
      edges: [
        { to: 'mara', kind: 'friend', trust: 0.7 }, { to: 'hew', kind: 'friend', trust: 0.7 },
        { to: 'jonet', kind: 'friend', trust: 0.6 }, { to: 'seth', kind: 'friend', trust: 0.6 },
      ] }),
  N({ id: 'hew', name: 'Hew', home: 'home-hew', occupation: 'joiner', faction: 'guild',
      traits: ['skeptic', 'literalist'], rivals: [],
      schedule: [
        { days: 'weekday', from: 480, to: 1020, venue: 'workshop' },   // 08:00-17:00
        { days: 'all', from: 1080, to: 1320, venue: 'tavern' },        // 18:00-22:00
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [{ to: 'osric', kind: 'friend', trust: 0.7 }, { to: 'jonet', kind: 'colleague', trust: 0.6 }] }),
  N({ id: 'jonet', name: 'Jonet', home: 'home-jonet', occupation: 'joiner', faction: 'crown',
      traits: ['partisan', 'exaggerator'], rivals: ['mara'],
      schedule: [
        { days: 'weekday', from: 480, to: 1020, venue: 'workshop' },
        { days: 'all', from: 1080, to: 1320, venue: 'tavern' },
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [{ to: 'osric', kind: 'friend', trust: 0.6 }, { to: 'hew', kind: 'colleague', trust: 0.6 }] }),
  N({ id: 'rafe', name: 'Rafe', home: 'home-rafe', occupation: 'stallholder', faction: 'guild',
      traits: ['moralizer', 'literalist'], rivals: [],
      schedule: [
        { days: 'weekday', from: 360, to: 840, venue: 'market' },
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [{ to: 'mara', kind: 'colleague', trust: 0.6 }, { to: 'osric', kind: 'friend', trust: 0.5 }] }),
  N({ id: 'seth', name: 'Seth', home: 'home-seth', occupation: 'dockhand', faction: 'crown',
      traits: ['exaggerator', 'partisan'], rivals: [],
      schedule: [
        { days: 'weekday', from: 480, to: 1080, venue: 'docks' },
        { days: 'all', from: 1110, to: 1260, venue: 'tavern' },        // 18:30-21:00
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [{ to: 'tomas', kind: 'colleague', trust: 0.6 }, { to: 'osric', kind: 'friend', trust: 0.6 }] }),
  N({ id: 'anselm', name: 'Anselm', home: 'home-anselm', occupation: 'priest', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [],
      schedule: [
        { days: 'weekday', from: 420, to: 720, venue: 'chapel' },      // 07:00-12:00
        { days: 'weekday', from: 720, to: 840, venue: 'market' },      // 12:00-14:00 (the bridge inward)
        { days: 'all', from: 1020, to: 1140, venue: 'northside-chapel' }, // 17:00-19:00 (the bridge outward)
        { days: 'restday', from: 540, to: 660, venue: 'chapel' },
      ],
      edges: [
        { to: 'mara', kind: 'friend', trust: 0.5 }, { to: 'pia', kind: 'friend', trust: 0.5 },
        { to: 'brigid', kind: 'friend', trust: 0.7 }, { to: 'cole', kind: 'friend', trust: 0.6 },
        { to: 'dara', kind: 'friend', trust: 0.6 },
      ] }),
  N({ id: 'brigid', name: 'Brigid', home: 'home-brigid', occupation: 'washerwoman', faction: 'none',
      traits: ['attributor', 'exaggerator'], rivals: ['cole'],
      schedule: [
        { days: 'all', from: 420, to: 540, venue: 'northside-well' },  // 07:00-09:00
        { days: 'all', from: 1020, to: 1140, venue: 'northside-chapel' },
      ],
      edges: [
        { to: 'anselm', kind: 'friend', trust: 0.7 }, { to: 'cole', kind: 'friend', trust: 0.7 },
        { to: 'dara', kind: 'friend', trust: 0.6 },
      ] }),
  N({ id: 'cole', name: 'Cole', home: 'home-brigid', occupation: 'charcoal-burner', faction: 'none',
      traits: ['partisan', 'literalist'], rivals: [],
      schedule: [
        { days: 'all', from: 420, to: 540, venue: 'northside-well' },
        { days: 'all', from: 1020, to: 1140, venue: 'northside-chapel' },
      ],
      edges: [{ to: 'brigid', kind: 'friend', trust: 0.7 }, { to: 'anselm', kind: 'friend', trust: 0.6 }] }),
  N({ id: 'dara', name: 'Dara', home: 'home-dara', occupation: 'net-mender', faction: 'none',
      traits: ['skeptic', 'moralizer'], rivals: [],
      schedule: [{ days: 'all', from: 1020, to: 1140, venue: 'northside-chapel' }],
      edges: [{ to: 'brigid', kind: 'friend', trust: 0.6 }, { to: 'anselm', kind: 'friend', trust: 0.6 }] }),
];

export const TESTFORD: TownFixture = { venues, npcs };
