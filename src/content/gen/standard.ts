import type { GenConfig, GenContent, OccupationDef, VenueArchetypeDef } from '../../world/types';
import { NAMES } from './names';

export const STANDARD_GEN_CONFIG: GenConfig = {
  npcCount: 72,               // spec v1: 60–90
  districtCount: 3,
  keystoneCount: 3,
  bridgesPerAdjacentPair: 2,  // two designated bridges = two independent routes across each firebreak
  maxAttempts: 8,
};

/** Fixed grammar (spec): players learn archetypes, never an answer key. */
export const VENUE_ARCHETYPES: VenueArchetypeDef[] = [
  { id: 'tavern', scope: 'per-district', access: 'public' },
  { id: 'market', scope: 'per-district', access: 'public' },
  { id: 'chapel', scope: 'per-district', access: 'public' },
  { id: 'workshop', scope: 'per-district', access: 'public' },
  { id: 'well', scope: 'per-district', access: 'public' },
  { id: 'guard-post', scope: 'per-district', access: 'invitational' }, // terrain for the enemy AI (Plan 4)
  { id: 'cathedral', scope: 'singleton', access: 'public' },
  { id: 'docks', scope: 'singleton', access: 'public' },
];

/** Singleton workplaces (docks, cathedral) pull workers across districts — organic bridges. */
export const OCCUPATIONS: OccupationDef[] = [
  { id: 'grocer',      workplace: 'market',    from: 360, to: 840,  eveningTavern: true,  weight: 3 },
  { id: 'stallholder', workplace: 'market',    from: 360, to: 840,  eveningTavern: false, weight: 3 },
  { id: 'dockworker',  workplace: 'docks',     from: 480, to: 1080, eveningTavern: true,  weight: 4 },
  { id: 'net-mender',  workplace: 'docks',     from: 480, to: 1080, eveningTavern: false, weight: 2 },
  { id: 'joiner',      workplace: 'workshop',  from: 480, to: 1020, eveningTavern: true,  weight: 3 },
  { id: 'smith',       workplace: 'workshop',  from: 480, to: 1020, eveningTavern: false, weight: 2 },
  { id: 'laundress',   workplace: 'well',      from: 420, to: 660,  eveningTavern: false, weight: 2 },
  { id: 'bartender',   workplace: 'tavern',    from: 960, to: 1439, eveningTavern: false, weight: 1 },
  { id: 'priest',      workplace: 'cathedral', from: 420, to: 720,  eveningTavern: false, weight: 1 },
];

export const STANDARD_GEN_CONTENT: GenContent = {
  names: NAMES,
  venueArchetypes: VENUE_ARCHETYPES,
  occupations: OCCUPATIONS,
  traitPool: [
    { id: 'exaggerator', weight: 3 }, { id: 'attributor', weight: 3 },
    { id: 'moralizer', weight: 3 },   { id: 'partisan', weight: 3 },
    { id: 'literalist', weight: 2 },  { id: 'skeptic', weight: 1 }, // gatekeepers rare — they kill rumors
  ],
  factions: [
    { id: 'guild', weight: 7 }, { id: 'crown', weight: 6 }, { id: 'none', weight: 7 },
  ],
};
