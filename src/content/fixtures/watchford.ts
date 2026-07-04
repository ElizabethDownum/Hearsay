import type { ObserverSpec } from '../../sim/enemy/state';
import type { TownFixture } from '../../sim/types';

const allDay = (venue: string) => [{ days: 'all' as const, from: 480, to: 1230, venue }];

/**
 * Watchford: the enemy-AI testbed. District w0: guard gale (keen, 0.9) + mira + otto + sten.
 * District w1: guard hugo (dull, 0.3) + quill + rosa (+ sten in the evening — the bridge).
 * Squares hold at most 4 people, so circle composition is fully predictable.
 */
export const WATCHFORD: TownFixture = {
  venues: [
    { id: 'square-w0', district: 'w0', access: 'public' },
    { id: 'square-w1', district: 'w1', access: 'public' },
    { id: 'guard-post-w0', district: 'w0', access: 'invitational' },
    { id: 'home-mo', district: 'w0', access: 'private' },
    { id: 'home-gs', district: 'w0', access: 'private' },
    { id: 'home-qr', district: 'w1', access: 'private' },
    { id: 'home-h', district: 'w1', access: 'private' },
  ],
  npcs: [
    { id: 'gale', name: 'Gale', home: 'home-gs', occupation: 'guard', faction: 'crown',
      traits: ['exaggerator', 'literalist'], rivals: [], schedule: allDay('square-w0'),
      edges: [{ to: 'mira', kind: 'colleague', trust: 0.5 }] },
    { id: 'mira', name: 'Mira', home: 'home-mo', occupation: 'grocer', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square-w0'),
      edges: [{ to: 'otto', kind: 'kin', trust: 0.9 }, { to: 'gale', kind: 'colleague', trust: 0.5 },
              { to: 'sten', kind: 'friend', trust: 0.6 }] },
    { id: 'otto', name: 'Otto', home: 'home-mo', occupation: 'joiner', faction: 'guild',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square-w0'),
      edges: [{ to: 'mira', kind: 'kin', trust: 0.9 }, { to: 'sten', kind: 'friend', trust: 0.6 }] },
    { id: 'sten', name: 'Sten', home: 'home-gs', occupation: 'carter', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: [
        { days: 'all', from: 480, to: 1080, venue: 'square-w0' },
        { days: 'all', from: 1080, to: 1230, venue: 'square-w1' },
      ],
      edges: [{ to: 'otto', kind: 'friend', trust: 0.6 }, { to: 'mira', kind: 'friend', trust: 0.6 },
              { to: 'quill', kind: 'friend', trust: 0.7 }] },
    { id: 'quill', name: 'Quill', home: 'home-qr', occupation: 'scribe', faction: 'guild',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square-w1'),
      edges: [{ to: 'rosa', kind: 'kin', trust: 0.9 }, { to: 'sten', kind: 'friend', trust: 0.7 }] },
    { id: 'rosa', name: 'Rosa', home: 'home-qr', occupation: 'laundress', faction: 'none',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square-w1'),
      edges: [{ to: 'quill', kind: 'kin', trust: 0.9 }] },
    { id: 'hugo', name: 'Hugo', home: 'home-h', occupation: 'guard', faction: 'crown',
      traits: ['literalist', 'moralizer'], rivals: [], schedule: allDay('square-w1'),
      edges: [{ to: 'quill', kind: 'colleague', trust: 0.5 }] },
  ],
};

export const WATCHFORD_GUARDS: ObserverSpec[] = [
  { id: 'gale', vigilance: 0.9 },
  { id: 'hugo', vigilance: 0.3 },
];
